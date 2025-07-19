// Core data types and interfaces

export interface Meeting {
  id: string;
  title: string;
  date: Date;
  summary: string;
  actionItems: ActionItem[];
  rawTranscript: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  owner?: string;
  deadline?: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
}

export interface User {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
  customClaims?: any;
}

export interface MeetingMetadata {
  fileName?: string;
  fileSize?: number;
  uploadedAt: Date;
  processingTime?: number;
}

export interface ProcessedMeeting {
  summary: string;
  actionItems: ActionItem[];
  rawTranscript: string;
  metadata: MeetingMetadata;
}

// API Response types
export interface AIResponse {
  summary: string;
  actionItems: Omit<ActionItem, 'id' | 'status'>[];
  confidence?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// File processing types
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  size?: number;
  type?: string;
}

// Authentication types
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Database operation types
export interface DatabaseOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}