import { describe, it, expect } from 'vitest';
import { GeminiServiceImpl } from '../gemini';

// Simple test to verify the service can be instantiated and basic methods work
describe('GeminiService - Basic Tests', () => {
  describe('constructPrompt', () => {
    it('should create a well-formatted prompt', () => {
      // Mock the config to avoid API key requirement
      const originalEnv = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test-key';
      
      try {
        const service = new GeminiServiceImpl();
        const transcript = 'Test meeting transcript about project planning';
        const prompt = service.constructPrompt(transcript);

        // Verify prompt contains expected elements
        expect(prompt).toContain('Analyze this meeting transcript');
        expect(prompt).toContain('JSON response');
        expect(prompt).toContain('summary');
        expect(prompt).toContain('actionItems');
        expect(prompt).toContain(transcript);
        expect(prompt).toContain('"description"');
        expect(prompt).toContain('"owner"');
        expect(prompt).toContain('"deadline"');
        expect(prompt).toContain('"priority"');
        expect(prompt).toContain('high|medium|low');
      } finally {
        // Restore original env
        if (originalEnv) {
          process.env.NEXT_PUBLIC_GEMINI_API_KEY = originalEnv;
        } else {
          delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        }
      }
    });

    it('should include the transcript content in the prompt', () => {
      const originalEnv = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test-key';
      
      try {
        const service = new GeminiServiceImpl();
        const transcript = 'Unique test content for verification';
        const prompt = service.constructPrompt(transcript);

        expect(prompt).toContain(transcript);
      } finally {
        if (originalEnv) {
          process.env.NEXT_PUBLIC_GEMINI_API_KEY = originalEnv;
        } else {
          delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        }
      }
    });
  });

  describe('constructor', () => {
    it('should throw error when API key is missing', () => {
      const originalEnv = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      
      try {
        expect(() => new GeminiServiceImpl()).toThrow('Gemini API key is required');
      } finally {
        if (originalEnv) {
          process.env.NEXT_PUBLIC_GEMINI_API_KEY = originalEnv;
        }
      }
    });

    it('should initialize successfully with valid API key', () => {
      const originalEnv = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test-key';
      
      try {
        const service = new GeminiServiceImpl();
        expect(service).toBeInstanceOf(GeminiServiceImpl);
      } finally {
        if (originalEnv) {
          process.env.NEXT_PUBLIC_GEMINI_API_KEY = originalEnv;
        } else {
          delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        }
      }
    });
  });

  describe('processTranscript validation', () => {
    it('should throw error for empty transcript', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test-key';
      
      try {
        const service = new GeminiServiceImpl();
        
        await expect(service.processTranscript('')).rejects.toThrow('Transcript content is required');
        await expect(service.processTranscript('   ')).rejects.toThrow('Transcript content is required');
      } finally {
        if (originalEnv) {
          process.env.NEXT_PUBLIC_GEMINI_API_KEY = originalEnv;
        } else {
          delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        }
      }
    });
  });
});