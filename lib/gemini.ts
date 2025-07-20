import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAppConfig } from './config';
import { AIResponse, ActionItem, TeamMember } from './types';

export interface GeminiService {
  processTranscript(transcript: string, teamMembers?: TeamMember[]): Promise<AIResponse>;
  constructPrompt(transcript: string, teamMembers?: TeamMember[]): string;
}

export interface GeminiError extends Error {
  code?: string;
  status?: number;
  retryable?: boolean;
}

class GeminiServiceImpl implements GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private config: ReturnType<typeof getAppConfig>['gemini'];

  constructor() {
    this.config = getAppConfig().gemini;

    if (!this.config.apiKey) {
      throw new Error('Gemini API key is required. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable.');
    }

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.config.model });
  }

  /**
   * Construct AI prompt for meeting transcript analysis
   */
  constructPrompt(transcript: string, teamMembers?: TeamMember[]): string {
    let teamContext = '';
    
    if (teamMembers && teamMembers.length > 0) {
      const activeMembers = teamMembers.filter(member => member.status === 'active');
      if (activeMembers.length > 0) {
        teamContext = `

Team Members Context:
The following team members participated in this meeting. When assigning action items, try to match speaker names to these team members:
${activeMembers.map(member => `- ${member.displayName} (${member.email})`).join('\n')}

When suggesting owners for action items, prefer using the exact display names from the team members list above.`;
      }
    }

    return `Analyze this meeting transcript and provide a JSON response with:
1. A comprehensive summary (2-3 paragraphs)
2. Action items with suggested owners and deadlines
3. Priority levels for each action item${teamContext}

Format your response as valid JSON with this exact structure:
{
  "summary": "Comprehensive summary of the meeting in 2-3 paragraphs",
  "actionItems": [
    {
      "description": "Clear description of the action item",
      "owner": "Suggested person responsible (if mentioned in transcript)",
      "deadline": "YYYY-MM-DD format if deadline mentioned, otherwise null",
      "priority": "high|medium|low"
    }
  ]
}

Important guidelines:
- Extract only actionable items that require follow-up
- Infer priority based on urgency and importance mentioned in the transcript
- Use "high" for urgent/critical items, "medium" for important items, "low" for nice-to-have items
- If no specific owner is mentioned, leave the owner field as null
- If no deadline is mentioned, leave the deadline field as null${teamMembers && teamMembers.length > 0 ? '\n- When suggesting owners, try to match speaker names to the team members listed above' : ''}
- Ensure the response is valid JSON

Meeting Transcript:
${transcript}`;
  }

  /**
   * Process meeting transcript using Gemini AI with retry logic
   */
  async processTranscript(transcript: string, teamMembers?: TeamMember[]): Promise<AIResponse> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Transcript content is required');
    }

    const prompt = this.constructPrompt(transcript, teamMembers);

    return this.executeWithRetry(async () => {
      try {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return this.parseAIResponse(text);
      } catch (error) {
        throw this.handleGeminiError(error);
      }
    });
  }

  /**
   * Parse AI response and validate structure
   */
  private parseAIResponse(responseText: string): AIResponse {
    try {
      // Clean the response text - remove markdown code blocks if present
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanedText);

      // Validate required fields
      if (!parsed.summary || typeof parsed.summary !== 'string') {
        throw new Error('Invalid response: summary is required and must be a string');
      }

      if (!Array.isArray(parsed.actionItems)) {
        throw new Error('Invalid response: actionItems must be an array');
      }

      // Validate and clean action items
      const actionItems: Omit<ActionItem, 'id' | 'status'>[] = parsed.actionItems.map((item: any, index: number) => {
        if (!item.description || typeof item.description !== 'string') {
          throw new Error(`Invalid action item at index ${index}: description is required`);
        }

        const priority = item.priority?.toLowerCase();
        if (priority && !['high', 'medium', 'low'].includes(priority)) {
          throw new Error(`Invalid action item at index ${index}: priority must be high, medium, or low`);
        }

        // Parse deadline if provided
        let deadline: Date | undefined;
        if (item.deadline && item.deadline !== null) {
          const parsedDate = new Date(item.deadline);
          if (!isNaN(parsedDate.getTime())) {
            deadline = parsedDate;
          }
        }

        return {
          description: item.description.trim(),
          owner: item.owner && item.owner !== null ? item.owner.trim() : undefined,
          deadline,
          priority: (priority as 'high' | 'medium' | 'low') || 'medium'
        };
      });

      return {
        summary: parsed.summary.trim(),
        actionItems,
        confidence: parsed.confidence || 0.8 // Default confidence if not provided
      };

    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse AI response as JSON: ${error.message}. Response: ${responseText.substring(0, 200)}...`);
      }
      throw error;
    }
  }

  /**
   * Execute function with exponential backoff retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors
        if (!this.isRetryableError(error as Error)) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const geminiError = error as GeminiError;

    // Retry on network errors, rate limits, and server errors
    if (geminiError.status) {
      return geminiError.status >= 500 || geminiError.status === 429;
    }

    // Retry on network-related errors
    const retryableMessages = [
      'network',
      'timeout',
      'connection',
      'rate limit',
      'quota exceeded',
      'service unavailable'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Handle and normalize Gemini API errors
   */
  private handleGeminiError(error: any): GeminiError {
    const geminiError = new Error() as GeminiError;

    if (error.status) {
      geminiError.status = error.status;
      geminiError.code = error.code || `HTTP_${error.status}`;
    }

    // Handle specific Gemini API errors
    if (error.message) {
      if (error.message.includes('API key')) {
        geminiError.message = 'Invalid or missing Gemini API key. Please check your configuration.';
        geminiError.retryable = false;
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        geminiError.message = 'API quota exceeded or rate limit reached. Please try again later.';
        geminiError.retryable = true;
      } else if (error.message.includes('model not found')) {
        geminiError.message = `Model ${this.config.model} not found. Please check your model configuration.`;
        geminiError.retryable = false;
      } else {
        geminiError.message = error.message;
        geminiError.retryable = this.isRetryableError(error);
      }
    } else {
      geminiError.message = 'Unknown error occurred while processing with Gemini AI';
      geminiError.retryable = true;
    }

    return geminiError;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
let geminiServiceInstance: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiServiceImpl();
  }
  return geminiServiceInstance;
}

// Export for testing
export { GeminiServiceImpl };