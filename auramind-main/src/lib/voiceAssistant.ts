import { generateResponse } from './gemini';

class VoiceAssistant {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];
  private preferredVoice: SpeechSynthesisVoice | null = null;

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
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      
      // Dispatch transcript update event
      window.dispatchEvent(new CustomEvent('transcript-update', { 
        detail: transcript 
      }));

      if (event.results[current].isFinal) {
        const response = await this.handleCommand(transcript);
        // Dispatch assistant response event
        window.dispatchEvent(new CustomEvent('assistant-response', { 
          detail: response 
        }));
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        this.recognition?.start();
      }
    };
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

  private async handleCommand(command: string): Promise<string> {
    try {
      const response = await generateResponse(command);
      this.speak(response);
      return response;
    } catch (error) {
      console.error('Error processing command:', error);
      const errorMessage = "I'm sorry, I encountered an error processing your request.";
      this.speak(errorMessage);
      return errorMessage;
    }
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
}

export const voiceAssistant = new VoiceAssistant();