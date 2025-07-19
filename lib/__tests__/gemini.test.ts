import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiServiceImpl, getGeminiService } from '../gemini';

// Mock the Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn()
    })
  }))
}));

// Mock the config
vi.mock('../config', () => ({
  getAppConfig: vi.fn().mockReturnValue({
    gemini: {
      apiKey: 'test-api-key',
      model: 'gemini-2.0-flash'
    },
    firebase: {},
    appId: 'test'
  })
}));

describe('GeminiService', () => {
  let service: GeminiServiceImpl;
  let mockGenerateContent: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup fresh mock for each test
    mockGenerateContent = vi.fn();
    
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent
      })
    }) as any);

    service = new GeminiServiceImpl();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      expect(service).toBeInstanceOf(GeminiServiceImpl);
    });

    it('should throw error when API key is missing', () => {
      const mockGetAppConfig = vi.mocked(getAppConfig);
      mockGetAppConfig.mockReturnValue({
        gemini: { apiKey: '', model: 'gemini-2.0-flash' },
        firebase: {} as any,
        appId: 'test'
      });

      expect(() => new GeminiServiceImpl()).toThrow('Gemini API key is required');
    });
  });

  describe('constructPrompt', () => {
    it('should create a well-formatted prompt', () => {
      const transcript = 'Test meeting transcript';
      const prompt = service.constructPrompt(transcript);

      expect(prompt).toContain('Analyze this meeting transcript');
      expect(prompt).toContain('JSON response');
      expect(prompt).toContain('summary');
      expect(prompt).toContain('actionItems');
      expect(prompt).toContain(transcript);
    });

    it('should include proper JSON structure guidelines', () => {
      const prompt = service.constructPrompt('test');
      
      expect(prompt).toContain('"summary"');
      expect(prompt).toContain('"actionItems"');
      expect(prompt).toContain('"description"');
      expect(prompt).toContain('"owner"');
      expect(prompt).toContain('"deadline"');
      expect(prompt).toContain('"priority"');
    });
  });

  describe('processTranscript', () => {
    const validAIResponse = {
      summary: 'This is a test meeting summary with important discussions.',
      actionItems: [
        {
          description: 'Complete the project documentation',
          owner: 'John Doe',
          deadline: '2024-01-15',
          priority: 'high'
        },
        {
          description: 'Schedule follow-up meeting',
          owner: null,
          deadline: null,
          priority: 'medium'
        }
      ]
    };

    beforeEach(() => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(validAIResponse)
        }
      });
    });

    it('should process transcript successfully', async () => {
      const result = await service.processTranscript('Test meeting transcript');

      expect(result.summary).toBe(validAIResponse.summary);
      expect(result.actionItems).toHaveLength(2);
      expect(result.actionItems[0].description).toBe('Complete the project documentation');
      expect(result.actionItems[0].owner).toBe('John Doe');
      expect(result.actionItems[0].priority).toBe('high');
      expect(result.confidence).toBe(0.8);
    });

    it('should handle response with markdown code blocks', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => `\`\`\`json\n${JSON.stringify(validAIResponse)}\n\`\`\``
        }
      });

      const result = await service.processTranscript('Test transcript');
      expect(result.summary).toBe(validAIResponse.summary);
    });

    it('should throw error for empty transcript', async () => {
      await expect(service.processTranscript('')).rejects.toThrow('Transcript content is required');
      await expect(service.processTranscript('   ')).rejects.toThrow('Transcript content is required');
    });

    it('should handle invalid JSON response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Invalid JSON response'
        }
      });

      await expect(service.processTranscript('Test transcript'))
        .rejects.toThrow('Failed to parse AI response as JSON');
    });

    it('should validate required fields in response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ actionItems: [] }) // Missing summary
        }
      });

      await expect(service.processTranscript('Test transcript'))
        .rejects.toThrow('Invalid response: summary is required');
    });

    it('should validate action items structure', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            summary: 'Test summary',
            actionItems: [{ priority: 'high' }] // Missing description
          })
        }
      });

      await expect(service.processTranscript('Test transcript'))
        .rejects.toThrow('Invalid action item at index 0: description is required');
    });

    it('should validate priority values', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            summary: 'Test summary',
            actionItems: [{
              description: 'Test action',
              priority: 'invalid-priority'
            }]
          })
        }
      });

      await expect(service.processTranscript('Test transcript'))
        .rejects.toThrow('Invalid action item at index 0: priority must be high, medium, or low');
    });

    it('should handle null/undefined values in action items', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            summary: 'Test summary',
            actionItems: [{
              description: 'Test action',
              owner: null,
              deadline: null,
              priority: null
            }]
          })
        }
      });

      const result = await service.processTranscript('Test transcript');
      expect(result.actionItems[0].owner).toBeUndefined();
      expect(result.actionItems[0].deadline).toBeUndefined();
      expect(result.actionItems[0].priority).toBe('medium'); // Default priority
    });

    it('should parse valid deadline dates', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            summary: 'Test summary',
            actionItems: [{
              description: 'Test action',
              deadline: '2024-01-15',
              priority: 'high'
            }]
          })
        }
      });

      const result = await service.processTranscript('Test transcript');
      expect(result.actionItems[0].deadline).toBeInstanceOf(Date);
      expect(result.actionItems[0].deadline?.toISOString()).toContain('2024-01-15');
    });
  });

  describe('retry logic', () => {
    it('should retry on retryable errors', async () => {
      const retryableError = new Error('Rate limit exceeded');
      (retryableError as any).status = 429;

      mockGenerateContent
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue({
          response: {
            text: () => JSON.stringify({
              summary: 'Success after retry',
              actionItems: []
            })
          }
        });

      const result = await service.processTranscript('Test transcript');
      expect(result.summary).toBe('Success after retry');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new Error('Invalid API key');
      (nonRetryableError as any).status = 401;

      mockGenerateContent.mockRejectedValue(nonRetryableError);

      await expect(service.processTranscript('Test transcript')).rejects.toThrow();
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should give up after max retries', async () => {
      const retryableError = new Error('Service unavailable');
      (retryableError as any).status = 503;

      mockGenerateContent.mockRejectedValue(retryableError);

      await expect(service.processTranscript('Test transcript')).rejects.toThrow('Service unavailable');
      expect(mockGenerateContent).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('error handling', () => {
    it('should handle API key errors', async () => {
      const apiKeyError = new Error('API key not valid');
      mockGenerateContent.mockRejectedValue(apiKeyError);

      await expect(service.processTranscript('Test transcript'))
        .rejects.toThrow('Invalid or missing Gemini API key');
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      mockGenerateContent.mockRejectedValue(quotaError);

      await expect(service.processTranscript('Test transcript'))
        .rejects.toThrow('API quota exceeded or rate limit reached');
    });

    it('should handle model not found errors', async () => {
      const modelError = new Error('Model not found');
      mockGenerateContent.mockRejectedValue(modelError);

      await expect(service.processTranscript('Test transcript'))
        .rejects.toThrow('Model gemini-2.0-flash not found');
    });
  });

  describe('getGeminiService singleton', () => {
    it('should return the same instance', () => {
      const service1 = getGeminiService();
      const service2 = getGeminiService();
      expect(service1).toBe(service2);
    });
  });
});