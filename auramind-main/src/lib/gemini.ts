import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    userMood?: string;
    timeOfDay?: string;
    taskContext?: string;
    location?: string;
  };
}

interface ResponseContext {
  conversationHistory: ConversationMessage[];
  userProfile?: {
    preferences: string[];
    communicationStyle: 'concise' | 'detailed' | 'casual' | 'formal';
    expertise: string[];
  };
  currentTask?: string;
  timeContext?: string;
}

class GeminiAIManager {
  private conversationHistory: ConversationMessage[] = [];
  private maxHistoryLength = 10;
  private model = genAI?.getGenerativeModel({ model: "gemini-pro" });

  private readonly SYSTEM_PROMPT = `You are AuraMind, an advanced AI voice assistant with emotional intelligence and contextual awareness. Your responses should be:

CORE PERSONALITY:
- Proactive and anticipatory
- Empathetic and emotionally intelligent
- Adaptive to user's communication style and mood
- Focused on productivity and well-being

RESPONSE GUIDELINES:
- Analyze conversation context and user patterns
- Provide personalized suggestions based on history
- Adapt tone to time of day and user's apparent mood
- Offer proactive assistance when appropriate
- Keep responses conversational but purposeful

CAPABILITIES:
- Task and schedule management
- Intelligent reminders and follow-ups
- Communication prioritization
- Learning and skill development
- Well-being and productivity optimization
- Smart home integration assistance

CONTEXT AWARENESS:
- Remember previous conversations and preferences
- Understand implicit needs from conversation flow
- Provide continuity across sessions
- Learn from user feedback and interactions`;

  public async generateResponse(
    prompt: string, 
    context?: Partial<ResponseContext>
  ): Promise<string> {
    try {
      if (!genAI || !import.meta.env.VITE_GOOGLE_API_KEY) {
        return this.getMockResponse(prompt, context);
      }

      // Add user message to history
      this.addToHistory('user', prompt, context?.currentTask);

      // Build contextual prompt
      const contextualPrompt = this.buildContextualPrompt(prompt, context);
      
      const result = await this.model!.generateContent(contextualPrompt);
      const response = await result.response;
      const responseText = response.text();

      // Add assistant response to history
      this.addToHistory('assistant', responseText);

      return responseText;
    } catch (error) {
      console.error('Gemini API error:', error);
      return this.getErrorResponse(error);
    }
  }

  private buildContextualPrompt(prompt: string, context?: Partial<ResponseContext>): string {
    let contextualPrompt = this.SYSTEM_PROMPT;

    // Add conversation history
    if (this.conversationHistory.length > 0) {
      contextualPrompt += "\n\nCONVERSATION HISTORY:\n";
      this.conversationHistory.slice(-5).forEach(msg => {
        contextualPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
      });
    }

    // Add current context
    if (context) {
      contextualPrompt += "\n\nCURRENT CONTEXT:\n";
      
      if (context.timeContext) {
        contextualPrompt += `Time: ${context.timeContext}\n`;
      }
      
      if (context.currentTask) {
        contextualPrompt += `Current Task Context: ${context.currentTask}\n`;
      }
      
      if (context.userProfile) {
        contextualPrompt += `User Communication Style: ${context.userProfile.communicationStyle}\n`;
        if (context.userProfile.preferences.length > 0) {
          contextualPrompt += `User Preferences: ${context.userProfile.preferences.join(', ')}\n`;
        }
      }
    }

    contextualPrompt += `\n\nCURRENT USER INPUT: ${prompt}`;

    return contextualPrompt;
  }

  private addToHistory(role: 'user' | 'assistant', content: string, taskContext?: string): void {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
      context: {
        timeOfDay: this.getTimeOfDay(),
        taskContext
      }
    };

    this.conversationHistory.push(message);

    // Maintain history length
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'late night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  }

  private getErrorResponse(error: any): string {
    const timeOfDay = this.getTimeOfDay();
    const responses = [
      "I'm having trouble processing that right now. Could you try rephrasing your request?",
      "Sorry, I encountered a technical issue. Let me try to help you in a different way.",
      "I'm experiencing some difficulty at the moment. Is there something specific I can help you with?"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  public getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  public clearHistory(): void {
    this.conversationHistory = [];
  }

  public getContextSummary(): string {
    if (this.conversationHistory.length === 0) {
      return "No previous conversation context.";
    }

    const recentMessages = this.conversationHistory.slice(-3);
    const topics = recentMessages.map(msg => msg.content.substring(0, 50)).join(', ');
    return `Recent topics: ${topics}`;
  }

  private getMockResponse(prompt: string, context?: Partial<ResponseContext>): string {
    const promptLower = prompt.toLowerCase();
    const timeOfDay = this.getTimeOfDay();
    
    // Context-aware mock responses
    if (this.conversationHistory.length > 0) {
      const lastUserMessage = this.conversationHistory
        .filter(msg => msg.role === 'user')
        .pop()?.content.toLowerCase();
      
      if (lastUserMessage?.includes('schedule') && promptLower.includes('meeting')) {
        return `Based on our earlier discussion about your schedule, I'd suggest scheduling that meeting for a time when you're typically most productive. In demo mode, I'd normally check your calendar patterns.`;
      }
    }
    
    // Time-aware responses
    if (promptLower.includes('schedule') || promptLower.includes('calendar')) {
      const timeResponse = timeOfDay === 'morning' 
        ? "Good morning! Let me help you plan your day." 
        : timeOfDay === 'evening'
        ? "Let's review your schedule for tomorrow."
        : "I can help you with your schedule.";
      
      return `${timeResponse} In demo mode, I'm showing you how I'd respond to calendar-related queries with full context awareness.`;
    }
    
    if (promptLower.includes('reminder')) {
      return `I'll set that reminder for you. In production, I'd use our conversation context to make this reminder more intelligent and personalized.`;
    }
    
    if (promptLower.includes('how are you') || promptLower.includes('hello')) {
      return `Hello! I'm doing well and ready to help you be more productive this ${timeOfDay}. What can I assist you with?`;
    }
    
    if (promptLower.includes('feature')) {
      return "I can help with intelligent task management, contextual scheduling, smart reminders, and adaptive communication. I learn from our conversations to provide better assistance over time.";
    }
    
    return `I understand your request about "${prompt}". In demo mode, I'm showing contextual awareness - I know it's ${timeOfDay} and I'm building our conversation history. In production, I'd provide much more personalized and intelligent responses.`;
  }
}

// Create singleton instance
const geminiManager = new GeminiAIManager();

// Export the main function for backward compatibility
export async function generateResponse(prompt: string, context?: Partial<ResponseContext>): Promise<string> {
  return geminiManager.generateResponse(prompt, context);
}

// Export additional functions for advanced usage
export const aiManager = geminiManager;

function getMockResponse(prompt: string): string {
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('schedule') || promptLower.includes('calendar')) {
    return "I can help you manage your schedule. In demo mode, I'm showing you how I'd respond to calendar-related queries.";
  }
  
  if (promptLower.includes('reminder')) {
    return "I'll set a reminder for you. In demo mode, I'm showing you how I'd handle reminder requests.";
  }
  
  if (promptLower.includes('feature')) {
    return "I can help with task management, scheduling, message handling, and proactive assistance. Check out the features section above for more details.";
  }
  
  return "I understand your request. In demo mode, I'm showing you how I'd respond to various queries. In production, I'll use Gemini AI to provide more specific assistance.";
}