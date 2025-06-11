import { generateResponse, aiManager } from './gemini';

interface CommandRoute {
  pattern: RegExp;
  handler: (matches: RegExpMatchArray, fullCommand: string) => Promise<string>;
  description: string;
}

class VoiceAssistant {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private commandRoutes: CommandRoute[] = [];
  private conversationContext: string[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
      }

      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
        this.loadVoices();
      }
      
      this.initializeCommandRoutes();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3;

    this.recognition.onresult = async (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcript;
          maxConfidence = Math.max(maxConfidence, confidence || 0);
        } else {
          interimTranscript += transcript;
        }
      }

      // Dispatch interim results
      if (interimTranscript) {
        window.dispatchEvent(new CustomEvent('transcript-update', {
          detail: { text: interimTranscript, interim: true, confidence: 0 }
        }));
      }

      // Process final results
      if (finalTranscript) {
        const cleanTranscript = this.cleanTranscript(finalTranscript);
        
        window.dispatchEvent(new CustomEvent('transcript-update', {
          detail: { text: cleanTranscript, interim: false, confidence: maxConfidence }
        }));

        // Add to conversation context
        this.conversationContext.push(`User: ${cleanTranscript}`);
        if (this.conversationContext.length > 10) {
          this.conversationContext = this.conversationContext.slice(-10);
        }

        window.dispatchEvent(new CustomEvent('processing-start'));
        
        try {
          const response = await this.handleCommand(cleanTranscript);
          this.conversationContext.push(`Assistant: ${response}`);
          
          window.dispatchEvent(new CustomEvent('assistant-response', {
            detail: response
          }));
        } catch (error) {
          console.error('Command processing error:', error);
        } finally {
          window.dispatchEvent(new CustomEvent('processing-end'));
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      window.dispatchEvent(new CustomEvent('processing-end'));
      
      if (event.error === 'not-allowed') {
        this.speak("Please allow microphone access to use voice commands.");
      } else if (event.error === 'no-speech') {
        this.speak("I didn't hear anything. Please try again.");
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        setTimeout(() => {
          this.recognition?.start();
        }, 100);
      }
    };
  }

  private cleanTranscript(transcript: string): string {
    return transcript
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?-]/g, '')
      .toLowerCase();
  }

  private loadVoices() {
    if (!this.synthesis) return;

    const loadVoices = () => {
      this.voices = this.synthesis?.getVoices() || [];
      this.preferredVoice = this.voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.toLowerCase().includes('natural')
      ) || this.voices.find(voice => 
        voice.lang.startsWith('en')
      ) || null;
    };

    loadVoices();
    this.synthesis.onvoiceschanged = loadVoices;
  }

  private initializeCommandRoutes() {
    this.commandRoutes = [
      {
        pattern: /^(what's|what is|tell me about) (on )?my (schedule|calendar|agenda)( today| tomorrow| this week)?/i,
        handler: this.handleScheduleQuery.bind(this),
        description: "Check schedule and calendar events"
      },
      {
        pattern: /^(schedule|book|create) (a )?(meeting|appointment) (with )?(.*) (at|for) (.+)/i,
        handler: this.handleScheduleMeeting.bind(this),
        description: "Schedule new meetings and appointments"
      },
      {
        pattern: /^(check|find|look for) (scheduling )?conflicts? (for|with) (.+)/i,
        handler: this.handleConflictCheck.bind(this),
        description: "Check for scheduling conflicts"
      },
      {
        pattern: /^(prepare|prep|get ready) for (my )?(next )?meeting/i,
        handler: this.handleMeetingPrep.bind(this),
        description: "Get meeting preparation assistance"
      },
      {
        pattern: /^(when is|what time is) my (next|upcoming) (meeting|appointment)/i,
        handler: this.handleNextMeeting.bind(this),
        description: "Find next upcoming meeting"
      },
      {
        pattern: /^(set|create|add) (a )?(reminder|alert|notification) (.*) (at|for) (.+)/i,
        handler: this.handleSetReminder.bind(this),
        description: "Set reminders and alerts"
      },
      {
        pattern: /^(what's|what is) the (time|current time|date|current date)/i,
        handler: this.handleTimeQuery.bind(this),
        description: "Get current time and date"
      },
      {
        pattern: /^(help|what can you do|commands|capabilities)/i,
        handler: this.handleHelpQuery.bind(this),
        description: "Show available commands and capabilities"
      },
      {
        pattern: /^(stop|pause|quiet|silence|shut up)/i,
        handler: this.handleStopCommand.bind(this),
        description: "Stop current operation"
      },
      {
        pattern: /^(cancel|never mind|forget it)/i,
        handler: this.handleCancelCommand.bind(this),
        description: "Cancel current operation"
      },
      {
        pattern: /^(weather|what's the weather|temperature)( today| tomorrow| this week)?/i,
        handler: this.handleWeatherQuery.bind(this),
        description: "Get weather information"
      }
    ];
  }

  private async handleCommand(command: string): Promise<string> {
    try {
      // Check for command routes first
      for (const route of this.commandRoutes) {
        const matches = command.match(route.pattern);
        if (matches) {
          return await route.handler(matches, command);
        }
      }

      // If no specific route matches, use enhanced AI response with context
      const currentTask = this.getCurrentTaskContext(command);
      const timeContext = this.getTimeContext();
      
      const responseContext = {
        conversationHistory: this.getFormattedConversationHistory(),
        currentTask,
        timeContext,
        userProfile: {
          preferences: this.getUserPreferences(),
          communicationStyle: 'concise' as const,
          expertise: []
        }
      };
      
      const response = await generateResponse(command, responseContext);
      this.speak(response);
      return response;
    } catch (error) {
      console.error('Error processing command:', error);
      const errorMessage = this.getContextualErrorMessage();
      this.speak(errorMessage);
      return errorMessage;
    }
  }

  private getCurrentTaskContext(command: string): string {
    const commandLower = command.toLowerCase();
    if (commandLower.includes('schedule') || commandLower.includes('calendar')) {
      return 'schedule_management';
    }
    if (commandLower.includes('reminder') || commandLower.includes('remind')) {
      return 'reminder_setting';
    }
    if (commandLower.includes('email') || commandLower.includes('message')) {
      return 'communication_management';
    }
    return 'general_assistance';
  }

  private getTimeContext(): string {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    return `${timeOfDay} on ${dayOfWeek}`;
  }

  private getFormattedConversationHistory(): any[] {
    return this.conversationContext.slice(-6).map((msg, index) => {
      const [role, content] = msg.split(': ', 2);
      return {
        role: role.toLowerCase() === 'user' ? 'user' : 'assistant',
        content: content || msg,
        timestamp: new Date(Date.now() - (this.conversationContext.length - index) * 60000)
      };
    });
  }

  private getUserPreferences(): string[] {
    // In a real implementation, this would come from user profile data
    return ['productivity_focused', 'concise_responses', 'proactive_suggestions'];
  }

  private getContextualErrorMessage(): string {
    const timeOfDay = new Date().getHours() < 12 ? 'morning' : 
                     new Date().getHours() < 17 ? 'afternoon' : 'evening';
    
    const messages = [
      `I apologize, but I'm having some technical difficulties this ${timeOfDay}. Let me try to help you in a different way.`,
      "I encountered an issue processing your request. Could you try rephrasing it?",
      "Sorry about that technical hiccup. I'm here to help - what would you like to try?"
    ];
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private async handleScheduleQuery(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    try {
      const { calendarManager } = await import('./calendar');
      const timeframe = matches[4]?.trim() || 'today';
      
      let startDate = new Date();
      let endDate = new Date();
      
      if (timeframe.includes('today')) {
        endDate.setHours(23, 59, 59, 999);
      } else if (timeframe.includes('tomorrow')) {
        startDate.setDate(startDate.getDate() + 1);
        endDate.setDate(endDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (timeframe.includes('week')) {
        endDate.setDate(endDate.getDate() + 7);
      }
      
      const events = calendarManager.getEvents(startDate, endDate);
      
      if (events.length === 0) {
        const response = `You have no scheduled events ${timeframe}. Your schedule is completely free!`;
        this.speak(response);
        return response;
      }
      
      const eventSummary = events.slice(0, 5).map(event => {
        const time = event.start.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        return `${event.title} at ${time}`;
      }).join(', ');
      
      const response = `You have ${events.length} event${events.length > 1 ? 's' : ''} ${timeframe}: ${eventSummary}${events.length > 5 ? ' and more' : ''}`;
      this.speak(response);
      return response;
    } catch (error) {
      const response = `I would check your ${matches[4]?.trim() || 'today'} schedule, but calendar integration isn't fully connected yet. This would typically show your appointments, meetings, and scheduled tasks.`;
      this.speak(response);
      return response;
    }
  }

  private async handleScheduleMeeting(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    try {
      const { calendarManager } = await import('./calendar');
      const participant = matches[5]?.trim() || '';
      const timeSpec = matches[7]?.trim() || '';
      
      // Parse the time specification (simplified)
      const meetingTime = this.parseTimeSpecification(timeSpec);
      
      if (!meetingTime) {
        const response = `I couldn't understand the time specification. Please try saying something like "schedule a meeting with John at 3 PM tomorrow"`;
        this.speak(response);
        return response;
      }
      
      // Create a temporary event to check for conflicts
      const tempEvent = {
        title: participant ? `Meeting with ${participant}` : 'New Meeting',
        start: meetingTime,
        end: new Date(meetingTime.getTime() + 60 * 60 * 1000), // 1 hour default
        attendees: participant ? [participant] : [],
      };
      
      const conflictCheck = calendarManager.detectConflicts(tempEvent);
      
      if (conflictCheck.hasConflict) {
        const response = `I found a scheduling conflict: ${conflictCheck.suggestion} Would you like me to suggest alternative times?`;
        this.speak(response);
        return response;
      }
      
      const response = `I would schedule the meeting${participant ? ` with ${participant}` : ''} for ${timeSpec}, but full calendar integration isn't implemented yet. No conflicts detected for that time slot.`;
      this.speak(response);
      return response;
    } catch (error) {
      const response = `I would schedule that meeting, but calendar integration isn't fully implemented yet. This would typically create a new calendar event and check for conflicts.`;
      this.speak(response);
      return response;
    }
  }

  private async handleConflictCheck(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    try {
      const { calendarManager } = await import('./calendar');
      const timeSpec = matches[4]?.trim() || '';
      
      const meetingTime = this.parseTimeSpecification(timeSpec);
      
      if (!meetingTime) {
        const response = `Please specify a time to check for conflicts, like "check conflicts for 2 PM tomorrow"`;
        this.speak(response);
        return response;
      }
      
      const tempEvent = {
        title: 'Conflict Check',
        start: meetingTime,
        end: new Date(meetingTime.getTime() + 60 * 60 * 1000),
      };
      
      const conflictCheck = calendarManager.detectConflicts(tempEvent);
      
      const response = conflictCheck.hasConflict 
        ? `Conflict detected for ${timeSpec}: ${conflictCheck.suggestion}`
        : `No conflicts found for ${timeSpec}. That time slot is available.`;
      
      this.speak(response);
      return response;
    } catch (error) {
      const response = `I would check for scheduling conflicts, but calendar integration isn't fully connected yet. This would typically analyze your calendar for overlapping events.`;
      this.speak(response);
      return response;
    }
  }

  private async handleMeetingPrep(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    try {
      const { calendarManager } = await import('./calendar');
      const upcomingEvents = calendarManager.getUpcomingEvents(2); // Next 2 hours
      
      if (upcomingEvents.length === 0) {
        const response = `You don't have any upcoming meetings in the next 2 hours. Your schedule is clear!`;
        this.speak(response);
        return response;
      }
      
      const nextMeeting = upcomingEvents[0];
      const timeUntilMeeting = Math.floor((nextMeeting.start.getTime() - new Date().getTime()) / (1000 * 60));
      
      const response = `Your next meeting is "${nextMeeting.title}" in ${timeUntilMeeting} minutes. In production, I would help you prepare with agenda review, document gathering, and key talking points.`;
      this.speak(response);
      return response;
    } catch (error) {
      const response = `I would help you prepare for your next meeting, but calendar integration isn't fully connected yet. This would typically provide meeting preparation assistance including agenda review and document gathering.`;
      this.speak(response);
      return response;
    }
  }

  private async handleNextMeeting(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    try {
      const { calendarManager } = await import('./calendar');
      const upcomingEvents = calendarManager.getUpcomingEvents(24); // Next 24 hours
      
      if (upcomingEvents.length === 0) {
        const response = `You don't have any meetings scheduled for the next 24 hours.`;
        this.speak(response);
        return response;
      }
      
      const nextMeeting = upcomingEvents[0];
      const timeUntilMeeting = Math.floor((nextMeeting.start.getTime() - new Date().getTime()) / (1000 * 60));
      const meetingTime = nextMeeting.start.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      const response = timeUntilMeeting < 60 
        ? `Your next meeting is "${nextMeeting.title}" in ${timeUntilMeeting} minutes`
        : `Your next meeting is "${nextMeeting.title}" at ${meetingTime}`;
      
      this.speak(response);
      return response;
    } catch (error) {
      const response = `I would check your next meeting, but calendar integration isn't fully connected yet. This would typically show your upcoming appointments.`;
      this.speak(response);
      return response;
    }
  }

  private parseTimeSpecification(timeSpec: string): Date | null {
    // Simplified time parsing - in production, use a more robust library
    const now = new Date();
    const timeSpecLower = timeSpec.toLowerCase();
    
    // Handle "tomorrow at X"
    if (timeSpecLower.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const timeMatch = timeSpecLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]) || 0;
        const ampm = timeMatch[3];
        
        if (ampm === 'pm' && hour !== 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        
        tomorrow.setHours(hour, minute, 0, 0);
        return tomorrow;
      }
    }
    
    // Handle "today at X" or just time
    const timeMatch = timeSpecLower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch) {
      const today = new Date(now);
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]) || 0;
      const ampm = timeMatch[3];
      
      if (ampm === 'pm' && hour !== 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      
      today.setHours(hour, minute, 0, 0);
      
      // If the time has passed today, assume tomorrow
      if (today <= now) {
        today.setDate(today.getDate() + 1);
      }
      
      return today;
    }
    
    return null;
  }

  private async handleSetReminder(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    const reminderText = matches[4]?.trim() || '';
    const timeSpec = matches[6]?.trim() || '';
    const response = `I would set a reminder: "${reminderText}" for ${timeSpec}, but reminder functionality isn't fully implemented yet. This would typically create a scheduled notification.`;
    this.speak(response);
    return response;
  }

  private async handleTimeQuery(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const date = now.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const response = `It's currently ${time} on ${date}.`;
    this.speak(response);
    return response;
  }

  private async handleHelpQuery(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    const commands = [
      "Ask me about your schedule or calendar",
      "Set reminders with 'Set a reminder to call mom at 3 PM'",
      "Ask for the current time or date",
      "Ask about the weather",
      "Have a general conversation - I'm powered by AI!"
    ];
    
    const response = `I can help you with: ${commands.join(', ')}. Just speak naturally and I'll do my best to understand!`;
    this.speak(response);
    return response;
  }

  private async handleStopCommand(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    return "Stopped.";
  }

  private async handleCancelCommand(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    const response = "Okay, cancelled.";
    this.speak(response);
    return response;
  }

  private async handleWeatherQuery(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    const response = "I would check the weather for you, but weather integration isn't implemented yet. This would typically provide current conditions and forecasts.";
    this.speak(response);
    return response;
  }

  public speak(text: string): void {
    if (!this.synthesis) return;

    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.preferredVoice) {
      utterance.voice = this.preferredVoice;
    }
    utterance.lang = 'en-US';
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    this.synthesis.speak(utterance);
  }

  public toggleListening(): boolean {
    if (!this.recognition) {
      this.speak("Speech recognition is not supported in your browser.");
      return false;
    }

    this.isListening = !this.isListening;

    if (this.isListening) {
      this.recognition.start();
      this.speak("Voice recognition activated. How can I help?");
    } else {
      this.recognition.stop();
      this.speak("Voice recognition stopped.");
    }

    return this.isListening;
  }

  public isActive(): boolean {
    return this.isListening;
  }

  public getCommandSuggestions(): string[] {
    return this.commandRoutes.map(route => route.description);
  }

  public clearContext(): void {
    this.conversationContext = [];
  }

  public getContext(): string[] {
    return [...this.conversationContext];
  }

  public getAIConversationHistory() {
    return aiManager.getConversationHistory();
  }

  public getAIContextSummary(): string {
    return aiManager.getContextSummary();
  }

  public clearAIHistory(): void {
    aiManager.clearHistory();
  }

  public processSpeechFile(audioFile: File): Promise<string> {
    // This would be used for processing uploaded audio files
    // Implementation would depend on speech-to-text service
    return Promise.resolve("Audio file processing not implemented yet.");
  }
}

export const voiceAssistant = new VoiceAssistant();