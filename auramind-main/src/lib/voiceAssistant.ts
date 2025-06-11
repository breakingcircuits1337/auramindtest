import { generateResponse } from './gemini';

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

      // If no specific route matches, use general AI response
      const context = this.conversationContext.slice(-5).join('\n');
      const contextualCommand = context ? `Context:\n${context}\n\nCurrent: ${command}` : command;
      
      const response = await generateResponse(contextualCommand);
      this.speak(response);
      return response;
    } catch (error) {
      console.error('Error processing command:', error);
      const errorMessage = "I'm sorry, I encountered an error processing your request.";
      this.speak(errorMessage);
      return errorMessage;
    }
  }

  private async handleScheduleQuery(matches: RegExpMatchArray, fullCommand: string): Promise<string> {
    const timeframe = matches[4]?.trim() || 'today';
    const response = `I would check your ${timeframe} schedule, but calendar integration isn't fully implemented yet. This would typically show your appointments, meetings, and scheduled tasks.`;
    this.speak(response);
    return response;
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

  public processSpeechFile(audioFile: File): Promise<string> {
    // This would be used for processing uploaded audio files
    // Implementation would depend on speech-to-text service
    return Promise.resolve("Audio file processing not implemented yet.");
  }
}

export const voiceAssistant = new VoiceAssistant();