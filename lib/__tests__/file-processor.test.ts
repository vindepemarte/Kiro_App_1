import { describe, it, expect } from 'vitest'
import { FileProcessor, FileProcessingError } from '../file-processor';

// Mock File constructor for testing
class MockFile implements File {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath: string = '';

  constructor(content: string[], name: string, options: { type?: string } = {}) {
    this.name = name;
    this.size = content.join('').length;
    this.type = options.type || 'text/plain';
    this.lastModified = Date.now();
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    throw new Error('Not implemented');
  }

  slice(): Blob {
    throw new Error('Not implemented');
  }

  stream(): ReadableStream<Uint8Array> {
    throw new Error('Not implemented');
  }

  text(): Promise<string> {
    throw new Error('Not implemented');
  }
}

describe('FileProcessor', () => {
  describe('validateFile', () => {
    it('should validate a valid .txt file', () => {
      const file = new MockFile(['test content'], 'test.txt', { type: 'text/plain' });
      const result = FileProcessor.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate a valid .md file', () => {
      const file = new MockFile(['# Test'], 'test.md', { type: 'text/markdown' });
      const result = FileProcessor.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files that are too large', () => {
      const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
      const file = new MockFile([largeContent], 'large.txt');
      const result = FileProcessor.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds the maximum limit');
    });

    it('should reject unsupported file types', () => {
      const file = new MockFile(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = FileProcessor.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File type not supported');
    });

    it('should accept files with valid MIME type even without extension', () => {
      const file = new MockFile(['content'], 'transcript', { type: 'text/plain' });
      const result = FileProcessor.validateFile(file);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('extractTitle', () => {
    it('should extract title from markdown header', () => {
      const content = '# Meeting Notes\n\nSome content here';
      const title = FileProcessor.extractTitle(content, 'file.md');
      
      expect(title).toBe('Meeting Notes');
    });

    it('should extract title from first line if short', () => {
      const content = 'Weekly Team Meeting\n\nLong content follows...';
      const title = FileProcessor.extractTitle(content, 'file.txt');
      
      expect(title).toBe('Weekly Team Meeting');
    });

    it('should use filename if first line is too long', () => {
      const content = 'This is a very long first line that exceeds the reasonable length for a title and should not be used as the meeting title';
      const title = FileProcessor.extractTitle(content, 'meeting-notes.txt');
      
      expect(title).toBe('meeting-notes');
    });

    it('should use filename if content is empty', () => {
      const content = '';
      const title = FileProcessor.extractTitle(content, 'empty-file.md');
      
      expect(title).toBe('empty-file');
    });

    it('should handle multiple markdown headers', () => {
      const content = '## Secondary Header\n\nContent';
      const title = FileProcessor.extractTitle(content, 'file.md');
      
      expect(title).toBe('Secondary Header');
    });
  });

  describe('sanitizeContent', () => {
    it('should normalize line endings', () => {
      const content = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const sanitized = FileProcessor.sanitizeContent(content);
      
      expect(sanitized).toBe('Line 1\nLine 2\nLine 3\nLine 4');
    });

    it('should trim whitespace', () => {
      const content = '  \n  Content with spaces  \n  ';
      const sanitized = FileProcessor.sanitizeContent(content);
      
      expect(sanitized).toBe('Content with spaces');
    });

    it('should handle empty content', () => {
      const content = '   \n\n   ';
      const sanitized = FileProcessor.sanitizeContent(content);
      
      expect(sanitized).toBe('');
    });
  });

  describe('readFileContent', () => {
    // Note: Testing FileReader in Node.js requires additional setup
    // These tests would need to be run in a browser environment or with jsdom
    it('should be defined', () => {
      expect(FileProcessor.readFileContent).toBeDefined();
      expect(typeof FileProcessor.readFileContent).toBe('function');
    });
  });

  describe('processFile', () => {
    // Note: This would also need browser environment for FileReader
    it('should be defined', () => {
      expect(FileProcessor.processFile).toBeDefined();
      expect(typeof FileProcessor.processFile).toBe('function');
    });
  });
});

describe('FileProcessingError', () => {
  it('should create error with message and code', () => {
    const error = new FileProcessingError('Test message', 'TEST_CODE');
    
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('FileProcessingError');
    expect(error instanceof Error).toBe(true);
  });
});