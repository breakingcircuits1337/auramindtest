
import { generateResponse } from './gemini';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  isAllDay?: boolean;
  recurrence?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  reminders?: number[]; // minutes before event
  metadata?: {
    meetingType?: 'standup' | 'review' | 'planning' | 'social' | 'interview';
    preparationTime?: number; // minutes needed for prep
    travelTime?: number; // minutes needed for travel
    energyLevel?: 'low' | 'medium' | 'high';
  };
}

export interface ConflictDetection {
  hasConflict: boolean;
  conflicts: CalendarEvent[];
  type: 'overlap' | 'back_to_back' | 'travel_time' | 'preparation_time';
  severity: 'warning' | 'error';
  suggestion?: string;
}

export interface MeetingPreparation {
  event: CalendarEvent;
  preparationTasks: PreparationTask[];
  documentsNeeded: string[];
  keyPoints: string[];
  suggestedArrivalTime: Date;
  travelInstructions?: string;
}

export interface PreparationTask {
  id: string;
  title: string;
  description: string;
  estimatedTime: number; // minutes
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  dueTime: Date;
}

class CalendarManager {
  private events: CalendarEvent[] = [];
  private connectedApis: Set<string> = new Set();

  // Google Calendar Integration
  async connectGoogleCalendar(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const googleEvents = data.items?.map(this.convertGoogleEvent) || [];
        this.mergeEvents(googleEvents, 'google');
        this.connectedApis.add('google');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Google Calendar connection error:', error);
      return false;
    }
  }

  // Outlook Calendar Integration
  async connectOutlookCalendar(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const outlookEvents = data.value?.map(this.convertOutlookEvent) || [];
        this.mergeEvents(outlookEvents, 'outlook');
        this.connectedApis.add('outlook');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Outlook Calendar connection error:', error);
      return false;
    }
  }

  private convertGoogleEvent(googleEvent: any): CalendarEvent {
    return {
      id: `google_${googleEvent.id}`,
      title: googleEvent.summary || 'Untitled Event',
      description: googleEvent.description,
      start: new Date(googleEvent.start?.dateTime || googleEvent.start?.date),
      end: new Date(googleEvent.end?.dateTime || googleEvent.end?.date),
      location: googleEvent.location,
      attendees: googleEvent.attendees?.map((a: any) => a.email) || [],
      isAllDay: !googleEvent.start?.dateTime,
      status: googleEvent.status === 'cancelled' ? 'cancelled' : 
              googleEvent.status === 'tentative' ? 'tentative' : 'confirmed',
      priority: 'medium',
      reminders: googleEvent.reminders?.overrides?.map((r: any) => r.minutes) || [15],
    };
  }

  private convertOutlookEvent(outlookEvent: any): CalendarEvent {
    return {
      id: `outlook_${outlookEvent.id}`,
      title: outlookEvent.subject || 'Untitled Event',
      description: outlookEvent.bodyPreview,
      start: new Date(outlookEvent.start?.dateTime),
      end: new Date(outlookEvent.end?.dateTime),
      location: outlookEvent.location?.displayName,
      attendees: outlookEvent.attendees?.map((a: any) => a.emailAddress?.address) || [],
      isAllDay: outlookEvent.isAllDay,
      status: outlookEvent.isCancelled ? 'cancelled' : 
              outlookEvent.responseStatus?.response === 'tentativelyAccepted' ? 'tentative' : 'confirmed',
      priority: outlookEvent.importance === 'high' ? 'high' : 
               outlookEvent.importance === 'low' ? 'low' : 'medium',
      reminders: [15], // Default reminder
    };
  }

  private mergeEvents(newEvents: CalendarEvent[], source: string): void {
    // Remove existing events from this source
    this.events = this.events.filter(event => !event.id.startsWith(`${source}_`));
    
    // Add new events
    this.events.push(...newEvents);
    
    // Sort by start time
    this.events.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  // Scheduling Conflict Detection
  detectConflicts(newEvent: Partial<CalendarEvent>): ConflictDetection {
    if (!newEvent.start || !newEvent.end) {
      return { hasConflict: false, conflicts: [], type: 'overlap', severity: 'warning' };
    }

    const conflicts: CalendarEvent[] = [];
    let conflictType: ConflictDetection['type'] = 'overlap';
    let severity: ConflictDetection['severity'] = 'warning';

    for (const existingEvent of this.events) {
      if (existingEvent.status === 'cancelled') continue;

      // Direct overlap check
      if (this.eventsOverlap(newEvent as CalendarEvent, existingEvent)) {
        conflicts.push(existingEvent);
        conflictType = 'overlap';
        severity = 'error';
        continue;
      }

      // Back-to-back meeting check
      const timeBetween = Math.abs(newEvent.start!.getTime() - existingEvent.end.getTime()) / (1000 * 60);
      if (timeBetween < 5) { // Less than 5 minutes between meetings
        conflicts.push(existingEvent);
        conflictType = 'back_to_back';
        severity = 'warning';
      }

      // Travel time consideration
      if (existingEvent.location && newEvent.location && 
          existingEvent.location !== newEvent.location) {
        const estimatedTravelTime = this.estimateTravelTime(existingEvent.location, newEvent.location);
        const availableTime = Math.abs(newEvent.start!.getTime() - existingEvent.end.getTime()) / (1000 * 60);
        
        if (availableTime < estimatedTravelTime) {
          conflicts.push(existingEvent);
          conflictType = 'travel_time';
          severity = 'error';
        }
      }

      // Preparation time check
      const prepTime = newEvent.metadata?.preparationTime || this.getDefaultPrepTime(newEvent.title || '');
      const timeBeforeEvent = Math.abs(newEvent.start!.getTime() - existingEvent.end.getTime()) / (1000 * 60);
      
      if (prepTime > 0 && timeBeforeEvent < prepTime) {
        conflicts.push(existingEvent);
        conflictType = 'preparation_time';
        severity = 'warning';
      }
    }

    const suggestion = this.generateConflictSuggestion(conflicts, conflictType);

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      type: conflictType,
      severity,
      suggestion
    };
  }

  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return event1.start < event2.end && event2.start < event1.end;
  }

  private estimateTravelTime(from: string, to: string): number {
    // Simple heuristic - in production, you'd use Google Maps API or similar
    if (from.toLowerCase().includes('home') || to.toLowerCase().includes('home')) {
      return 20; // 20 minutes for home-based travel
    }
    if (from.toLowerCase().includes('office') && to.toLowerCase().includes('office')) {
      return 5; // Same building/campus
    }
    return 30; // Default travel time between locations
  }

  private getDefaultPrepTime(title: string): number {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('interview')) return 15;
    if (titleLower.includes('presentation') || titleLower.includes('demo')) return 30;
    if (titleLower.includes('review') || titleLower.includes('planning')) return 10;
    if (titleLower.includes('standup') || titleLower.includes('daily')) return 2;
    return 5; // Default 5 minutes
  }

  private generateConflictSuggestion(conflicts: CalendarEvent[], type: ConflictDetection['type']): string {
    if (conflicts.length === 0) return '';

    switch (type) {
      case 'overlap':
        return `This meeting overlaps with "${conflicts[0].title}". Consider rescheduling to avoid conflicts.`;
      case 'back_to_back':
        return `This meeting is scheduled immediately after "${conflicts[0].title}". Consider adding a 5-10 minute buffer.`;
      case 'travel_time':
        return `Insufficient travel time from "${conflicts[0].location}" to the new meeting location. Consider adjusting the start time.`;
      case 'preparation_time':
        return `Limited preparation time after "${conflicts[0].title}". Consider scheduling earlier or blocking prep time.`;
      default:
        return 'Schedule conflict detected. Please review your calendar.';
    }
  }

  // Meeting Preparation Assistant
  async generateMeetingPreparation(event: CalendarEvent): Promise<MeetingPreparation> {
    const preparationTasks = await this.generatePreparationTasks(event);
    const documentsNeeded = this.identifyNeededDocuments(event);
    const keyPoints = await this.generateKeyPoints(event);
    const suggestedArrivalTime = this.calculateOptimalArrivalTime(event);
    const travelInstructions = event.location ? await this.generateTravelInstructions(event.location) : undefined;

    return {
      event,
      preparationTasks,
      documentsNeeded,
      keyPoints,
      suggestedArrivalTime,
      travelInstructions
    };
  }

  private async generatePreparationTasks(event: CalendarEvent): Promise<PreparationTask[]> {
    const tasks: PreparationTask[] = [];
    const meetingType = this.identifyMeetingType(event);

    // Base preparation tasks
    tasks.push({
      id: `prep_${event.id}_review`,
      title: 'Review meeting agenda',
      description: `Review the agenda and objectives for "${event.title}"`,
      estimatedTime: 5,
      priority: 'high',
      completed: false,
      dueTime: new Date(event.start.getTime() - 30 * 60 * 1000) // 30 min before
    });

    // Meeting-type specific tasks
    switch (meetingType) {
      case 'interview':
        tasks.push(
          {
            id: `prep_${event.id}_research`,
            title: 'Research candidate/company',
            description: 'Review background information and prepare questions',
            estimatedTime: 15,
            priority: 'high',
            completed: false,
            dueTime: new Date(event.start.getTime() - 60 * 60 * 1000)
          },
          {
            id: `prep_${event.id}_questions`,
            title: 'Prepare interview questions',
            description: 'Draft relevant questions based on role requirements',
            estimatedTime: 10,
            priority: 'medium',
            completed: false,
            dueTime: new Date(event.start.getTime() - 45 * 60 * 1000)
          }
        );
        break;

      case 'review':
        tasks.push({
          id: `prep_${event.id}_materials`,
          title: 'Gather review materials',
          description: 'Collect relevant documents, reports, and data for review',
          estimatedTime: 10,
          priority: 'high',
          completed: false,
          dueTime: new Date(event.start.getTime() - 45 * 60 * 1000)
        });
        break;

      case 'planning':
        tasks.push({
          id: `prep_${event.id}_objectives`,
          title: 'Define meeting objectives',
          description: 'Clarify goals and desired outcomes for the planning session',
          estimatedTime: 8,
          priority: 'high',
          completed: false,
          dueTime: new Date(event.start.getTime() - 60 * 60 * 1000)
        });
        break;
    }

    // Add technology check for virtual meetings
    if (event.location?.includes('zoom') || event.location?.includes('teams') || event.location?.includes('meet')) {
      tasks.push({
        id: `prep_${event.id}_tech`,
        title: 'Test video/audio setup',
        description: 'Verify camera, microphone, and internet connection',
        estimatedTime: 3,
        priority: 'medium',
        completed: false,
        dueTime: new Date(event.start.getTime() - 15 * 60 * 1000)
      });
    }

    return tasks;
  }

  private identifyMeetingType(event: CalendarEvent): string {
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();
    const combined = `${title} ${description}`;

    if (combined.includes('interview')) return 'interview';
    if (combined.includes('review') || combined.includes('retrospective')) return 'review';
    if (combined.includes('planning') || combined.includes('roadmap')) return 'planning';
    if (combined.includes('standup') || combined.includes('daily')) return 'standup';
    if (combined.includes('social') || combined.includes('lunch') || combined.includes('coffee')) return 'social';
    
    return 'general';
  }

  private identifyNeededDocuments(event: CalendarEvent): string[] {
    const documents: string[] = [];
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();

    if (title.includes('review') || description.includes('review')) {
      documents.push('Performance metrics', 'Previous review notes', 'Goal tracking spreadsheet');
    }
    
    if (title.includes('planning') || description.includes('planning')) {
      documents.push('Project timeline', 'Resource allocation sheet', 'Budget information');
    }
    
    if (title.includes('interview')) {
      documents.push('Resume/CV', 'Job description', 'Interview question template');
    }

    // Always suggest calendar and notes
    documents.push('Meeting agenda', 'Previous meeting notes');

    return [...new Set(documents)]; // Remove duplicates
  }

  private async generateKeyPoints(event: CalendarEvent): Promise<string[]> {
    try {
      const prompt = `Generate 3-5 key discussion points for a meeting titled "${event.title}" ${event.description ? `with description: ${event.description}` : ''}. Focus on actionable items and important topics to cover.`;
      
      const response = await generateResponse(prompt, {
        currentTask: 'meeting_preparation',
        timeContext: this.getTimeContext(event.start)
      });

      // Parse AI response into bullet points
      const points = response.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[\d\.\-\*\s]+/, '').trim())
        .filter(line => line.length > 10)
        .slice(0, 5);

      return points.length > 0 ? points : this.getDefaultKeyPoints(event);
    } catch (error) {
      console.error('Error generating key points:', error);
      return this.getDefaultKeyPoints(event);
    }
  }

  private getDefaultKeyPoints(event: CalendarEvent): string[] {
    const meetingType = this.identifyMeetingType(event);
    
    switch (meetingType) {
      case 'standup':
        return ['What did you accomplish yesterday?', 'What are you working on today?', 'Any blockers or challenges?'];
      case 'review':
        return ['Review progress against goals', 'Discuss achievements and challenges', 'Plan next steps and improvements'];
      case 'planning':
        return ['Define objectives and scope', 'Identify resources and timeline', 'Assign responsibilities and next actions'];
      case 'interview':
        return ['Review candidate background', 'Assess technical and cultural fit', 'Discuss role expectations and growth'];
      default:
        return ['Review agenda items', 'Discuss current status and updates', 'Identify action items and owners', 'Plan follow-up activities'];
    }
  }

  private calculateOptimalArrivalTime(event: CalendarEvent): Date {
    let bufferMinutes = 5; // Default buffer

    // Adjust based on meeting type
    const meetingType = this.identifyMeetingType(event);
    switch (meetingType) {
      case 'interview':
        bufferMinutes = 10;
        break;
      case 'review':
      case 'planning':
        bufferMinutes = 8;
        break;
      case 'standup':
        bufferMinutes = 2;
        break;
    }

    // Add travel time if location specified
    if (event.location && !event.location.includes('zoom') && !event.location.includes('teams')) {
      bufferMinutes += this.estimateTravelTime('current_location', event.location);
    }

    return new Date(event.start.getTime() - bufferMinutes * 60 * 1000);
  }

  private async generateTravelInstructions(location: string): Promise<string> {
    if (location.includes('zoom') || location.includes('teams') || location.includes('meet')) {
      return 'Virtual meeting - ensure stable internet connection and test audio/video beforehand.';
    }

    // In production, integrate with mapping services
    return `Navigate to: ${location}. Consider checking traffic conditions and parking availability before departure. Allow extra time for security/check-in if visiting a new building.`;
  }

  private getTimeContext(eventTime: Date): string {
    const hour = eventTime.getHours();
    const dayOfWeek = eventTime.toLocaleDateString('en-US', { weekday: 'long' });
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    return `${timeOfDay} on ${dayOfWeek}`;
  }

  // Utility methods for external access
  public getEvents(startDate?: Date, endDate?: Date): CalendarEvent[] {
    let filteredEvents = this.events.filter(event => event.status !== 'cancelled');
    
    if (startDate) {
      filteredEvents = filteredEvents.filter(event => event.start >= startDate);
    }
    
    if (endDate) {
      filteredEvents = filteredEvents.filter(event => event.start <= endDate);
    }
    
    return filteredEvents;
  }

  public getUpcomingEvents(hoursAhead: number = 24): CalendarEvent[] {
    const now = new Date();
    const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    
    return this.events.filter(event => 
      event.start >= now && 
      event.start <= cutoff && 
      event.status !== 'cancelled'
    );
  }

  public findOptimalMeetingTime(
    duration: number, // minutes
    participants: string[],
    preferredTimeRanges: { start: Date; end: Date }[]
  ): Date[] {
    // Implementation for finding optimal meeting times
    // This would analyze participant availability and suggest the best times
    const suggestions: Date[] = [];
    // Complex algorithm would go here
    return suggestions;
  }

  public getConnectedCalendars(): string[] {
    return Array.from(this.connectedApis);
  }
}

export const calendarManager = new CalendarManager();
