import { FileValidationResult, ProcessedMeeting, MeetingMetadata } from './types';

export class FileProcessingError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FileProcessingError';
  }
}

export class FileProcessor {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  private static readonly ALLOWED_TYPES = ['.txt', '.md'];
  private static readonly ALLOWED_MIME_TYPES = ['text/plain', 'text/markdown'];

  /**
   * Validates a file for processing
   */
  static validateFile(file: File): FileValidationResult {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size (${this.formatFileSize(file.size)}) exceeds the maximum limit of ${this.formatFileSize(this.MAX_FILE_SIZE)}`,
        size: file.size,
        type: file.type
      };
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = this.ALLOWED_TYPES.some(ext => fileName.endsWith(ext));
    
    // Check MIME type as backup
    const hasValidMimeType = this.ALLOWED_MIME_TYPES.includes(file.type);

    if (!hasValidExtension && !hasValidMimeType) {
      return {
        isValid: false,
        error: `File type not supported. Please upload a .txt or .md file. Current file: ${file.name}`,
        size: file.size,
        type: file.type
      };
    }

    return {
      isValid: true,
      size: file.size,
      type: file.type
    };
  }

  /**
   * Reads file content as text
   */
  static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          if (typeof content !== 'string') {
            throw new FileProcessingError('Failed to read file as text', 'READ_ERROR');
          }
          
          // Basic content validation
          if (content.trim().length === 0) {
            throw new FileProcessingError('File appears to be empty', 'EMPTY_FILE');
          }

          resolve(content);
        } catch (error) {
          reject(error instanceof FileProcessingError ? error : 
            new FileProcessingError('Failed to process file content', 'PROCESSING_ERROR'));
        }
      };

      reader.onerror = () => {
        reject(new FileProcessingError('Failed to read file', 'READ_ERROR'));
      };

      reader.onabort = () => {
        reject(new FileProcessingError('File reading was aborted', 'ABORTED'));
      };

      // Read as text with UTF-8 encoding
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Processes a file and extracts text content with validation
   */
  static async processFile(file: File): Promise<{ content: string; metadata: MeetingMetadata }> {
    const startTime = Date.now();
    
    try {
      // Validate file first
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        throw new FileProcessingError(validation.error!, 'VALIDATION_ERROR');
      }

      // Read file content
      const content = await this.readFileContent(file);
      
      // Create metadata
      const metadata: MeetingMetadata = {
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date(),
        processingTime: Date.now() - startTime
      };

      return { content, metadata };
    } catch (error) {
      if (error instanceof FileProcessingError) {
        throw error;
      }
      throw new FileProcessingError(
        `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROCESSING_ERROR'
      );
    }
  }

  /**
   * Formats file size in human-readable format
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Extracts a title from file content (first non-empty line or filename)
   */
  static extractTitle(content: string, fileName: string): string {
    // Try to find a title from the first few lines
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length > 0) {
      const firstLine = lines[0];
      
      // Check if first line looks like a title (markdown header or short line)
      if (firstLine.startsWith('#')) {
        return firstLine.replace(/^#+\s*/, '').trim();
      }
      
      // If first line is reasonably short, use it as title
      if (firstLine.length <= 100) {
        return firstLine;
      }
    }
    
    // Fallback to filename without extension
    return fileName.replace(/\.[^/.]+$/, '');
  }

  /**
   * Sanitizes text content for processing
   */
  static sanitizeContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')   // Handle old Mac line endings
      .trim();                // Remove leading/trailing whitespace
  }
}