import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Brain, 
  Calendar, 
  Clock, 
  Battery, 
  Users, 
  Focus, 
  CheckCircle2,
  AlertCircle,
  Zap,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Bell,
  Target,
  TrendingUp,
  CalendarDays,
  Timer
} from 'lucide-react';
import { taskManager, Task, DailyPlan } from '../lib/taskManager';

interface TaskManagerProps {
  currentEnergyLevel: 'high' | 'medium' | 'low';
  setCurrentEnergyLevel: (level: 'high' | 'medium' | 'low') => void;
  focusModeActive: boolean;
  setFocusModeActive: (active: boolean) => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({
  currentEnergyLevel,
  setCurrentEnergyLevel,
  focusModeActive,
  setFocusModeActive
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [recommendations, setRecommendations] = useState<Task[]>([]);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    // Load tasks and daily plan
    const allTasks = taskManager.getAllTasks();
    setTasks(allTasks);
    
    const plan = taskManager.getDailyPlan(selectedDate) || taskManager.createDailyPlan(selectedDate);
    setDailyPlan(plan);
    
    // Get energy-based recommendations
    const recs = taskManager.getEnergyBasedRecommendations(currentEnergyLevel);
    setRecommendations(recs);
  }, [selectedDate, currentEnergyLevel]);

  useEffect(() => {
    // Update recommendations when energy level changes
    const recs = taskManager.getEnergyBasedRecommendations(currentEnergyLevel);
    setRecommendations(recs);
  }, [currentEnergyLevel]);

  const getEnergyLevelColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'bg-success-500 dark:bg-success-600';
      case 'medium': return 'bg-warning-500 dark:bg-warning-600';
      case 'low': return 'bg-error-500 dark:bg-error-600';
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-error-500 dark:text-error-400';
      case 'medium': return 'text-warning-500 dark:text-warning-400';
      case 'low': return 'text-success-500 dark:text-success-400';
    }
  };

  const addTask = useCallback((title: string) => {
    const newTask = taskManager.createTask({
      title,
      priority: 'medium',
      energyLevel: currentEnergyLevel,
      duration: 30,
      category: 'Personal'
    });
    setTasks(taskManager.getAllTasks());
    setNewTaskTitle('');
    setShowCreateModal(false);
  }, [currentEnergyLevel]);

  const deleteTask = useCallback((taskId: string) => {
    taskManager.deleteTask(taskId);
    setTasks(taskManager.getAllTasks());
  }, []);

  const toggleTaskCompletion = useCallback((taskId: string) => {
    const task = taskManager.getTask(taskId);
    if (task) {
      if (task.status === 'completed') {
        taskManager.updateTask(taskId, { status: 'pending' });
      } else {
        taskManager.completeTask(taskId);
      }
      setTasks(taskManager.getAllTasks());
    }
  }, []);

  const setTaskPriority = useCallback((taskId: string, priority: 'high' | 'medium' | 'low') => {
    taskManager.updateTask(taskId, { priority });
    setTasks(taskManager.getAllTasks());
  }, []);

  const scheduleTask = useCallback((taskId: string, time: Date) => {
    if (taskManager.scheduleTask(taskId, time)) {
      setTasks(taskManager.getAllTasks());
      const plan = taskManager.getDailyPlan(selectedDate) || taskManager.createDailyPlan(selectedDate);
      setDailyPlan(plan);
    }
  }, [selectedDate]);

  const createReminder = useCallback((taskId: string, minutes: number) => {
    const reminderTime = new Date(Date.now() + minutes * 60000);
    taskManager.createReminder(taskId, {
      type: 'time_based',
      triggerTime: reminderTime,
      message: `Don't forget: ${taskManager.getTask(taskId)?.title}`
    });
  }, []);

  const getOptimalTasks = () => {
    return tasks.filter(task => 
      task.status === 'pending' && 
      (focusModeActive ? task.priority === 'high' : true) &&
      (currentEnergyLevel === 'low' ? task.energyLevel !== 'high' : true)
    ).sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return 0;
    });
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/50 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400">
            <Brain size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Intelligent Task Manager</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Adapts to your energy and focus levels</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFocusModeActive(!focusModeActive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              focusModeActive 
                ? 'bg-primary-600 dark:bg-primary-500 text-white' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Focus size={18} />
            Focus Mode
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Battery size={16} className="text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Energy Level</span>
        </div>
        <div className="flex gap-3">
          {(['high', 'medium', 'low'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setCurrentEnergyLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentEnergyLevel === level
                  ? `${getEnergyLevelColor(level)} text-white`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Add Task Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
        >
          <Plus size={18} />
          Add New Task
        </button>
      </div>

      {/* Daily Plan Overview */}
      {dailyPlan && (
        <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarDays size={18} />
              Today's Plan
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {dailyPlan.totalEstimatedTime} minutes total
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-error-500 dark:text-error-400 font-medium">
                {dailyPlan.priorityDistribution.high}
              </div>
              <div className="text-gray-500 dark:text-gray-400">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-warning-500 dark:text-warning-400 font-medium">
                {dailyPlan.priorityDistribution.medium}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Medium Priority</div>
            </div>
            <div className="text-center">
              <div className="text-success-500 dark:text-success-400 font-medium">
                {dailyPlan.priorityDistribution.low}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Low Priority</div>
            </div>
          </div>
        </div>
      )}

      {/* Energy-Based Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-primary-600 dark:text-primary-400" />
            <span className="font-medium text-primary-700 dark:text-primary-300">
              Recommended for Your Current Energy Level ({currentEnergyLevel})
            </span>
          </div>
          <div className="space-y-2">
            {recommendations.slice(0, 3).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</span>
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)} bg-opacity-10`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock size={12} />
                  {task.duration}m
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-4">
        {getOptimalTasks().map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-100 dark:hover:border-primary-800 transition-colors bg-white dark:bg-gray-800"
          >
            <button
              onClick={() => toggleTaskCompletion(task.id)}
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                task.status === 'completed'
                  ? 'bg-primary-500 dark:bg-primary-600 border-primary-500 dark:border-primary-600'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400'
              }`}
            >
              {task.status === 'completed' && <CheckCircle2 size={16} className="text-white" />}
            </button>
            
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-white">{task.title}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTaskPriority(task.id, 'high')}
                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      task.priority === 'high' ? 'text-error-500' : 'text-gray-400'
                    }`}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => setTaskPriority(task.id, 'low')}
                    className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      task.priority === 'low' ? 'text-success-500' : 'text-gray-400'
                    }`}
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <span className={`text-sm ${getPriorityColor(task.priority)}`}>
                  • {task.priority} priority
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock size={14} />
                  {task.duration}m
                </div>
                <div className="flex items-center gap-1">
                  <Zap size={14} />
                  {task.energyLevel} energy
                </div>
                {task.delegateTo && (
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    {task.delegateTo}
                  </div>
                )}
                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    {task.dueDate.toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => createReminder(task.id, 30)}
                className="p-2 text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Set 30min reminder"
              >
                <Bell size={16} />
              </button>
              <button
                onClick={() => scheduleTask(task.id, new Date(Date.now() + 3600000))}
                className="p-2 text-gray-400 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Schedule for 1 hour from now"
              >
                <Timer size={16} />
              </button>
              {task.delegateTo && (
                <button className="px-3 py-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/50 rounded-md transition-colors">
                  Delegate
                </button>
              )}
              <button
                onClick={() => deleteTask(task.id)}
                className="p-2 text-gray-400 hover:text-error-500 dark:hover:text-error-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-90vw">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Create New Task</h3>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => addTask(newTaskTitle)}
                disabled={!newTaskTitle.trim()}
                className="flex-1 py-2 px-4 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Task
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTaskTitle('');
                }}
                className="flex-1 py-2 px-4 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-primary-50 dark:bg-primary-900/50 rounded-lg border border-primary-100 dark:border-primary-800">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={16} className="text-primary-600 dark:text-primary-400" />
          <span className="font-medium text-primary-700 dark:text-primary-300">AI Suggestions</span>
        </div>
        <p className="text-sm text-primary-600 dark:text-primary-300">
          Based on your current energy level ({currentEnergyLevel}) and {focusModeActive ? 'focus mode being active' : 'schedule'},
          I recommend tackling high-priority tasks that match your energy state.
        </p>
      </div>
    </motion.div>
  );
};

export default TaskManager;