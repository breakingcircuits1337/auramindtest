
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  energyLevel: 'high' | 'medium' | 'low';
  duration: number; // in minutes
  category: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delegated';
  createdAt: Date;
  dueDate?: Date;
  scheduledTime?: Date;
  delegateTo?: string;
  tags: string[];
  parentTaskId?: string; // for subtasks
  dependencies: string[]; // task IDs this task depends on
  estimatedEffort: number; // 1-10 scale
  actualTimeSpent?: number;
  completedAt?: Date;
  reminders: TaskReminder[];
}

export interface TaskReminder {
  id: string;
  taskId: string;
  type: 'time_based' | 'location_based' | 'context_based';
  triggerTime?: Date;
  triggerLocation?: string;
  triggerContext?: string;
  message: string;
  isActive: boolean;
  createdAt: Date;
}

export interface DailyPlan {
  date: Date;
  totalEstimatedTime: number;
  energyDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  scheduledTasks: ScheduledTask[];
  unscheduledTasks: string[]; // task IDs
}

export interface ScheduledTask {
  taskId: string;
  startTime: Date;
  endTime: Date;
  bufferTime: number; // minutes
}

export interface UserProductivityProfile {
  peakEnergyHours: number[];
  preferredTaskDuration: number;
  workPattern: 'morning_person' | 'night_owl' | 'balanced';
  breakFrequency: number; // minutes between breaks
  focusSessionLength: number; // minutes
  taskCompletionHistory: TaskCompletionData[];
}

export interface TaskCompletionData {
  taskId: string;
  estimatedTime: number;
  actualTime: number;
  energyLevelUsed: 'high' | 'medium' | 'low';
  timeOfDay: number;
  completedOnTime: boolean;
}

class TaskManagementSystem {
  private tasks: Map<string, Task> = new Map();
  private dailyPlans: Map<string, DailyPlan> = new Map();
  private userProfile: UserProductivityProfile;
  private reminders: Map<string, TaskReminder> = new Map();

  constructor() {
    this.userProfile = this.initializeDefaultProfile();
    this.loadFromStorage();
  }

  private initializeDefaultProfile(): UserProductivityProfile {
    return {
      peakEnergyHours: [9, 10, 11, 14, 15],
      preferredTaskDuration: 30,
      workPattern: 'balanced',
      breakFrequency: 90,
      focusSessionLength: 45,
      taskCompletionHistory: []
    };
  }

  // Task Creation and Management
  public createTask(taskData: Partial<Task>): Task {
    const task: Task = {
      id: this.generateId(),
      title: taskData.title || '',
      description: taskData.description,
      priority: taskData.priority || 'medium',
      energyLevel: taskData.energyLevel || 'medium',
      duration: taskData.duration || 30,
      category: taskData.category || 'Personal',
      status: 'pending',
      createdAt: new Date(),
      dueDate: taskData.dueDate,
      scheduledTime: taskData.scheduledTime,
      delegateTo: taskData.delegateTo,
      tags: taskData.tags || [],
      dependencies: taskData.dependencies || [],
      estimatedEffort: taskData.estimatedEffort || 5,
      reminders: []
    };

    this.tasks.set(task.id, task);
    this.saveToStorage();
    
    // Auto-schedule if due date is provided
    if (task.dueDate && !task.scheduledTime) {
      this.suggestScheduling(task.id);
    }

    return task;
  }

  public updateTask(taskId: string, updates: Partial<Task>): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const updatedTask = { ...task, ...updates };
    this.tasks.set(taskId, updatedTask);
    this.saveToStorage();

    return updatedTask;
  }

  public deleteTask(taskId: string): boolean {
    const deleted = this.tasks.delete(taskId);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  public completeTask(taskId: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const completedTask = {
      ...task,
      status: 'completed' as const,
      completedAt: new Date(),
      actualTimeSpent: task.actualTimeSpent || task.duration
    };

    this.tasks.set(taskId, completedTask);
    this.updateProductivityProfile(completedTask);
    this.saveToStorage();

    return completedTask;
  }

  // Priority-based Scheduling
  public getTasksByPriority(): { high: Task[], medium: Task[], low: Task[] } {
    const tasks = Array.from(this.tasks.values()).filter(t => t.status === 'pending');
    
    return {
      high: tasks.filter(t => t.priority === 'high').sort(this.sortByDueDate),
      medium: tasks.filter(t => t.priority === 'medium').sort(this.sortByDueDate),
      low: tasks.filter(t => t.priority === 'low').sort(this.sortByDueDate)
    };
  }

  private sortByDueDate = (a: Task, b: Task): number => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  };

  public scheduleTask(taskId: string, startTime: Date): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    const endTime = new Date(startTime.getTime() + task.duration * 60000);
    
    // Check for conflicts
    if (this.hasScheduleConflict(startTime, endTime)) {
      return false;
    }

    this.updateTask(taskId, { scheduledTime: startTime });
    this.updateDailyPlan(startTime, taskId);
    
    return true;
  }

  private hasScheduleConflict(startTime: Date, endTime: Date): boolean {
    const dateKey = this.getDateKey(startTime);
    const dailyPlan = this.dailyPlans.get(dateKey);
    
    if (!dailyPlan) return false;

    return dailyPlan.scheduledTasks.some(scheduled => {
      const scheduledStart = scheduled.startTime;
      const scheduledEnd = scheduled.endTime;
      
      return (startTime < scheduledEnd && endTime > scheduledStart);
    });
  }

  // Energy Level-based Recommendations
  public getEnergyBasedRecommendations(currentEnergyLevel: 'high' | 'medium' | 'low'): Task[] {
    const availableTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'pending' && !t.scheduledTime);

    const currentHour = new Date().getHours();
    const isEnergyPeakTime = this.userProfile.peakEnergyHours.includes(currentHour);

    // Adjust recommendations based on current energy and time
    let recommendedEnergyLevel = currentEnergyLevel;
    if (isEnergyPeakTime && currentEnergyLevel !== 'low') {
      recommendedEnergyLevel = 'high';
    }

    return availableTasks
      .filter(task => {
        // Match energy levels or allow downward adjustment
        if (recommendedEnergyLevel === 'high') return task.energyLevel === 'high';
        if (recommendedEnergyLevel === 'medium') return task.energyLevel === 'medium' || task.energyLevel === 'high';
        return true; // low energy can do any task
      })
      .sort((a, b) => {
        // Sort by priority first, then by energy match
        const priorityScore = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityScore[a.priority];
        const bPriority = priorityScore[b.priority];
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        // Prefer exact energy matches
        const aEnergyMatch = a.energyLevel === currentEnergyLevel ? 1 : 0;
        const bEnergyMatch = b.energyLevel === currentEnergyLevel ? 1 : 0;
        
        return bEnergyMatch - aEnergyMatch;
      })
      .slice(0, 5);
  }

  // Daily Planning
  public createDailyPlan(date: Date): DailyPlan {
    const dateKey = this.getDateKey(date);
    const existingPlan = this.dailyPlans.get(dateKey);
    
    if (existingPlan) return existingPlan;

    const tasksForDay = this.getTasksForDate(date);
    const scheduledTasks = this.autoScheduleTasks(tasksForDay, date);
    
    const plan: DailyPlan = {
      date,
      totalEstimatedTime: tasksForDay.reduce((sum, task) => sum + task.duration, 0),
      energyDistribution: this.calculateEnergyDistribution(tasksForDay),
      priorityDistribution: this.calculatePriorityDistribution(tasksForDay),
      scheduledTasks,
      unscheduledTasks: tasksForDay
        .filter(task => !scheduledTasks.find(st => st.taskId === task.id))
        .map(task => task.id)
    };

    this.dailyPlans.set(dateKey, plan);
    this.saveToStorage();
    
    return plan;
  }

  private autoScheduleTasks(tasks: Task[], date: Date): ScheduledTask[] {
    const scheduled: ScheduledTask[] = [];
    const workingHours = { start: 9, end: 17 }; // 9 AM to 5 PM
    let currentTime = new Date(date);
    currentTime.setHours(workingHours.start, 0, 0, 0);

    // Sort tasks by priority and energy requirements
    const sortedTasks = tasks
      .filter(task => !task.scheduledTime)
      .sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });

    for (const task of sortedTasks) {
      const taskEndTime = new Date(currentTime.getTime() + task.duration * 60000);
      
      // Check if task fits in working hours
      if (taskEndTime.getHours() > workingHours.end) {
        break; // Can't fit more tasks today
      }

      scheduled.push({
        taskId: task.id,
        startTime: new Date(currentTime),
        endTime: taskEndTime,
        bufferTime: Math.min(task.duration * 0.2, 15) // 20% buffer, max 15 minutes
      });

      // Move to next slot with buffer
      currentTime = new Date(taskEndTime.getTime() + 15 * 60000); // 15-minute buffer
    }

    return scheduled;
  }

  // Intelligent Reminders System
  public createReminder(taskId: string, reminderData: Partial<TaskReminder>): TaskReminder {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');

    const reminder: TaskReminder = {
      id: this.generateId(),
      taskId,
      type: reminderData.type || 'time_based',
      triggerTime: reminderData.triggerTime,
      triggerLocation: reminderData.triggerLocation,
      triggerContext: reminderData.triggerContext,
      message: reminderData.message || `Reminder: ${task.title}`,
      isActive: true,
      createdAt: new Date()
    };

    this.reminders.set(reminder.id, reminder);
    
    // Add to task
    const updatedTask = { ...task };
    updatedTask.reminders.push(reminder);
    this.tasks.set(taskId, updatedTask);
    
    this.scheduleReminder(reminder);
    this.saveToStorage();
    
    return reminder;
  }

  private scheduleReminder(reminder: TaskReminder): void {
    if (reminder.type === 'time_based' && reminder.triggerTime) {
      const delay = reminder.triggerTime.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          this.triggerReminder(reminder.id);
        }, delay);
      }
    }
  }

  private triggerReminder(reminderId: string): void {
    const reminder = this.reminders.get(reminderId);
    if (!reminder || !reminder.isActive) return;

    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('task-reminder', {
      detail: { reminder }
    }));

    // Mark as triggered (for time-based reminders)
    if (reminder.type === 'time_based') {
      reminder.isActive = false;
      this.reminders.set(reminderId, reminder);
    }
  }

  public getActiveReminders(): TaskReminder[] {
    return Array.from(this.reminders.values()).filter(r => r.isActive);
  }

  public snoozeReminder(reminderId: string, snoozeMinutes: number): void {
    const reminder = this.reminders.get(reminderId);
    if (!reminder) return;

    const newTriggerTime = new Date(Date.now() + snoozeMinutes * 60000);
    reminder.triggerTime = newTriggerTime;
    this.scheduleReminder(reminder);
  }

  // Analytics and Learning
  private updateProductivityProfile(completedTask: Task): void {
    const completionData: TaskCompletionData = {
      taskId: completedTask.id,
      estimatedTime: completedTask.duration,
      actualTime: completedTask.actualTimeSpent || completedTask.duration,
      energyLevelUsed: completedTask.energyLevel,
      timeOfDay: completedTask.completedAt?.getHours() || 0,
      completedOnTime: completedTask.dueDate ? 
        (completedTask.completedAt?.getTime() || 0) <= completedTask.dueDate.getTime() : true
    };

    this.userProfile.taskCompletionHistory.push(completionData);
    
    // Keep only recent history
    if (this.userProfile.taskCompletionHistory.length > 100) {
      this.userProfile.taskCompletionHistory = 
        this.userProfile.taskCompletionHistory.slice(-100);
    }

    this.analyzeProductivityPatterns();
  }

  private analyzeProductivityPatterns(): void {
    const history = this.userProfile.taskCompletionHistory;
    if (history.length < 10) return;

    // Analyze peak productivity hours
    const hourlyProductivity = new Map<number, number>();
    history.forEach(data => {
      const hour = data.timeOfDay;
      const efficiency = data.estimatedTime / data.actualTime;
      hourlyProductivity.set(hour, (hourlyProductivity.get(hour) || 0) + efficiency);
    });

    const topHours = Array.from(hourlyProductivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour]) => hour);

    this.userProfile.peakEnergyHours = topHours;
  }

  // Utility methods
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getTasksForDate(date: Date): Task[] {
    return Array.from(this.tasks.values()).filter(task => {
      if (task.status === 'completed') return false;
      if (task.dueDate) {
        return task.dueDate.toDateString() === date.toDateString();
      }
      return task.scheduledTime?.toDateString() === date.toDateString();
    });
  }

  private calculateEnergyDistribution(tasks: Task[]): { high: number, medium: number, low: number } {
    const distribution = { high: 0, medium: 0, low: 0 };
    tasks.forEach(task => distribution[task.energyLevel]++);
    return distribution;
  }

  private calculatePriorityDistribution(tasks: Task[]): { high: number, medium: number, low: number } {
    const distribution = { high: 0, medium: 0, low: 0 };
    tasks.forEach(task => distribution[task.priority]++);
    return distribution;
  }

  private updateDailyPlan(date: Date, taskId: string): void {
    // Implementation for updating daily plan when task is scheduled
    const dateKey = this.getDateKey(date);
    const plan = this.dailyPlans.get(dateKey);
    if (plan) {
      // Update the plan...
      this.saveToStorage();
    }
  }

  private suggestScheduling(taskId: string): void {
    // Auto-suggest optimal scheduling based on user patterns
    const task = this.tasks.get(taskId);
    if (!task || !task.dueDate) return;

    const optimalHour = this.userProfile.peakEnergyHours[0] || 10;
    const suggestedTime = new Date(task.dueDate);
    suggestedTime.setDate(suggestedTime.getDate() - 1); // Day before due date
    suggestedTime.setHours(optimalHour, 0, 0, 0);

    // Dispatch suggestion event
    window.dispatchEvent(new CustomEvent('scheduling-suggestion', {
      detail: { taskId, suggestedTime }
    }));
  }

  // Storage methods
  private saveToStorage(): void {
    try {
      const data = {
        tasks: Array.from(this.tasks.entries()),
        dailyPlans: Array.from(this.dailyPlans.entries()),
        reminders: Array.from(this.reminders.entries()),
        userProfile: this.userProfile
      };
      localStorage.setItem('auramind_tasks', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save task data:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('auramind_tasks');
      if (!stored) return;

      const data = JSON.parse(stored);
      
      this.tasks = new Map(data.tasks);
      this.dailyPlans = new Map(data.dailyPlans);
      this.reminders = new Map(data.reminders);
      
      if (data.userProfile) {
        this.userProfile = data.userProfile;
      }

      // Reschedule active reminders
      this.getActiveReminders().forEach(reminder => {
        this.scheduleReminder(reminder);
      });
    } catch (error) {
      console.error('Failed to load task data:', error);
    }
  }

  // Public getters
  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  public getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  public getDailyPlan(date: Date): DailyPlan | undefined {
    return this.dailyPlans.get(this.getDateKey(date));
  }

  public getUserProfile(): UserProductivityProfile {
    return { ...this.userProfile };
  }
}

// Create singleton instance
export const taskManager = new TaskManagementSystem();
