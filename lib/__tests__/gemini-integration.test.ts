import { describe, it, expect } from 'vitest';
import { getGeminiService } from '../gemini';

describe('GeminiService - Integration Tests', () => {
  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      // Set up environment for testing
      const originalEnv = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test-key';
      
      try {
        const service1 = getGeminiService();
        const service2 = getGeminiService();
        expect(service1).toBe(service2);
      } finally {
        if (originalEnv) {
          process.env.NEXT_PUBLIC_GEMINI_API_KEY = originalEnv;
        } else {
          delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        }
      }
    });
  });

  describe('prompt construction', () => {
    it('should create comprehensive prompts for different meeting types', () => {
      const originalEnv = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      process.env.NEXT_PUBLIC_GEMINI_API_KEY = 'test-key';
      
      try {
        const service = getGeminiService();
        
        const standup = 'Daily standup: John completed user auth, Sarah working on database, Mike blocked on API keys';
        const planning = 'Sprint planning: Need to implement login, dashboard, and reports. Priority is login first.';
        const retrospective = 'Retrospective: What went well - good communication. What to improve - testing coverage.';
        
        const standupPrompt = service.constructPrompt(standup);
        const planningPrompt = service.constructPrompt(planning);
        const retroPrompt = service.constructPrompt(retrospective);
        
        // All prompts should have the same structure
        [standupPrompt, planningPrompt, retroPrompt].forEach(prompt => {
          expect(prompt).toContain('Analyze this meeting transcript');
          expect(prompt).toContain('JSON response');
          expect(prompt).toContain('summary');
          expect(prompt).toContain('actionItems');
          expect(prompt).toContain('priority');
        });
        
        // Each should contain the specific content
        expect(standupPrompt).toContain(standup);
        expect(planningPrompt).toContain(planning);
        expect(retroPrompt).toContain(retrospective);
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