// Firestore database service for meeting operations

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Timestamp,
  enableNetwork,
  disableNetwork,
  Unsubscribe,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  FirestoreError,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { getAppConfig } from './config';
import { Meeting, ActionItem, ProcessedMeeting, DatabaseOperationResult } from './types';

export interface DatabaseService {
  saveMeeting(userId: string, meeting: ProcessedMeeting): Promise<string>;
  getUserMeetings(userId: string): Promise<Meeting[]>;
  getMeetingById(meetingId: string, userId: string): Promise<Meeting | null>;
  updateMeeting(meetingId: string, userId: string, updates: Partial<Meeting>): Promise<boolean>;
  deleteMeeting(meetingId: string, userId: string): Promise<boolean>;
  subscribeToUserMeetings(userId: string, callback: (meetings: Meeting[]) => void): Unsubscribe;
  enableOfflineSupport(): Promise<void>;
  disableOfflineSupport(): Promise<void>;
}

class FirestoreService implements DatabaseService {
  private db = getFirebaseDb();
  private appId = getAppConfig().appId;

  // Get the collection path for user meetings
  private getUserMeetingsPath(userId: string): string {
    return `artifacts/${this.appId}/users/${userId}/meetings`;
  }

  // Convert Firestore document to Meeting object
  private documentToMeeting(doc: DocumentSnapshot<DocumentData>): Meeting | null {
    if (!doc.exists()) {
      return null;
    }

    const data = doc.data();
    
    // Safe date conversion with fallbacks
    const safeToDate = (timestamp: any): Date => {
      if (!timestamp) return new Date();
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        try {
          return timestamp.toDate();
        } catch {
          return new Date();
        }
      }
      if (timestamp instanceof Date) return timestamp;
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? new Date() : date;
      }
      return new Date();
    };
    
    return {
      id: doc.id,
      title: data.title || '',
      date: safeToDate(data.date),
      summary: data.summary || '',
      actionItems: this.processActionItems(data.actionItems || []),
      rawTranscript: data.rawTranscript || '',
      createdAt: safeToDate(data.createdAt),
      updatedAt: safeToDate(data.updatedAt),
    };
  }

  // Generate a title from the transcript or summary
  private generateMeetingTitle(transcript: string, summary: string): string {
    // Try to extract title from first line of transcript
    const firstLine = transcript.split('\n')[0]?.trim();
    if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
      return firstLine;
    }

    // Try to extract title from summary
    const summaryFirstSentence = summary.split('.')[0]?.trim();
    if (summaryFirstSentence && summaryFirstSentence.length > 0 && summaryFirstSentence.length < 100) {
      return summaryFirstSentence;
    }

    // Fallback to date-based title
    return `Meeting - ${new Date().toLocaleDateString()}`;
  }

  // Add unique IDs to action items if they don't have them
  private processActionItems(actionItems: ActionItem[], forSaving: boolean = false): ActionItem[] {
    return actionItems.map((item, index) => {
      const processedItem: any = {
        id: item.id || `action-${Date.now()}-${index}`,
        description: item.description || '',
        priority: item.priority || 'medium',
        status: item.status || 'pending',
      };

      // Only add owner if it exists and is not empty
      if (item.owner && item.owner.trim()) {
        processedItem.owner = item.owner.trim();
      }

      // Handle deadline conversion based on context
      if (item.deadline) {
        if (forSaving) {
          // When saving to Firestore, convert to Timestamp
          const deadline = item.deadline instanceof Date ? item.deadline : new Date(item.deadline);
          if (!isNaN(deadline.getTime())) {
            processedItem.deadline = Timestamp.fromDate(deadline);
          }
        } else {
          // When reading from Firestore, convert Timestamp to Date
          if (item.deadline && typeof item.deadline === 'object' && 'toDate' in item.deadline) {
            try {
              processedItem.deadline = item.deadline.toDate();
            } catch {
              // If conversion fails, use current date
              processedItem.deadline = new Date();
            }
          } else if (item.deadline instanceof Date) {
            processedItem.deadline = item.deadline;
          } else {
            // Try to parse as date string/number
            const deadline = new Date(item.deadline);
            processedItem.deadline = isNaN(deadline.getTime()) ? new Date() : deadline;
          }
        }
      }

      return processedItem;
    });
  }

  // Handle Firestore errors with user-friendly messages
  private handleFirestoreError(error: FirestoreError): string {
    console.error('Firestore error:', error);

    switch (error.code) {
      case 'permission-denied':
        return 'You do not have permission to perform this operation. Please check your authentication.';
      case 'not-found':
        return 'The requested meeting was not found.';
      case 'unavailable':
        return 'The database is currently unavailable. Please check your internet connection and try again.';
      case 'deadline-exceeded':
        return 'The operation timed out. Please try again.';
      case 'resource-exhausted':
        return 'Database quota exceeded. Please try again later.';
      case 'cancelled':
        return 'The operation was cancelled.';
      case 'data-loss':
        return 'Data loss detected. Please contact support.';
      case 'unauthenticated':
        return 'Authentication required. Please sign in and try again.';
      case 'invalid-argument':
        return 'Invalid data provided. Please check your input and try again.';
      case 'already-exists':
        return 'A meeting with this ID already exists.';
      case 'failed-precondition':
        return 'Operation failed due to system constraints. Please try again.';
      case 'aborted':
        return 'Operation was aborted due to a conflict. Please try again.';
      case 'out-of-range':
        return 'Invalid data range provided.';
      case 'unimplemented':
        return 'This operation is not supported.';
      case 'internal':
        return 'An internal error occurred. Please try again later.';
      default:
        return `Database error: ${error.message}`;
    }
  }

  // Save a new meeting to Firestore
  async saveMeeting(userId: string, meeting: ProcessedMeeting): Promise<string> {
    try {
      const meetingsCollection = collection(this.db, this.getUserMeetingsPath(userId));
      
      const meetingData = {
        title: this.generateMeetingTitle(meeting.rawTranscript, meeting.summary),
        date: Timestamp.fromDate(new Date()),
        summary: meeting.summary || '',
        actionItems: this.processActionItems(meeting.actionItems || [], true),
        rawTranscript: meeting.rawTranscript || '',
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        metadata: {
          fileName: meeting.metadata?.fileName || 'unknown',
          fileSize: meeting.metadata?.fileSize || 0,
          uploadedAt: Timestamp.fromDate(meeting.metadata?.uploadedAt || new Date()),
          processingTime: meeting.metadata?.processingTime || 0,
        },
      };

      // Debug logging to help identify undefined values
      console.log('Saving meeting data:', {
        title: meetingData.title,
        actionItemsCount: meetingData.actionItems.length,
        hasUndefinedValues: JSON.stringify(meetingData).includes('undefined')
      });

      const docRef = await addDoc(meetingsCollection, meetingData);
      return docRef.id;
    } catch (error) {
      console.error('Database save error:', error);
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to save meeting: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Get all meetings for a user
  async getUserMeetings(userId: string): Promise<Meeting[]> {
    try {
      const meetingsCollection = collection(this.db, this.getUserMeetingsPath(userId));
      const q = query(meetingsCollection, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const meetings: Meeting[] = [];

      querySnapshot.forEach((doc) => {
        const meeting = this.documentToMeeting(doc);
        if (meeting) {
          meetings.push(meeting);
        }
      });

      return meetings;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to fetch meetings: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Get a specific meeting by ID
  async getMeetingById(meetingId: string, userId: string): Promise<Meeting | null> {
    try {
      const meetingDoc = doc(this.db, this.getUserMeetingsPath(userId), meetingId);
      const docSnapshot = await getDoc(meetingDoc);
      
      return this.documentToMeeting(docSnapshot);
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to fetch meeting: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Update an existing meeting
  async updateMeeting(meetingId: string, userId: string, updates: Partial<Meeting>): Promise<boolean> {
    try {
      const meetingDoc = doc(this.db, this.getUserMeetingsPath(userId), meetingId);
      
      // Convert Date objects to Timestamps for Firestore
      const firestoreUpdates: any = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      if (updates.date) {
        firestoreUpdates.date = Timestamp.fromDate(updates.date);
      }

      if (updates.createdAt) {
        firestoreUpdates.createdAt = Timestamp.fromDate(updates.createdAt);
      }

      if (updates.actionItems) {
        firestoreUpdates.actionItems = this.processActionItems(updates.actionItems);
      }

      await updateDoc(meetingDoc, firestoreUpdates);
      return true;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to update meeting: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Delete a meeting
  async deleteMeeting(meetingId: string, userId: string): Promise<boolean> {
    try {
      const meetingDoc = doc(this.db, this.getUserMeetingsPath(userId), meetingId);
      await deleteDoc(meetingDoc);
      return true;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to delete meeting: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Subscribe to real-time updates for user meetings
  subscribeToUserMeetings(userId: string, callback: (meetings: Meeting[]) => void): Unsubscribe {
    const meetingsCollection = collection(this.db, this.getUserMeetingsPath(userId));
    const q = query(meetingsCollection, orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const meetings: Meeting[] = [];
        
        querySnapshot.forEach((doc) => {
          const meeting = this.documentToMeeting(doc);
          if (meeting) {
            meetings.push(meeting);
          }
        });

        callback(meetings);
      },
      (error: FirestoreError) => {
        console.error('Real-time listener error:', error);
        // Call callback with empty array on error to maintain UI state
        callback([]);
      }
    );
  }

  // Enable offline support
  async enableOfflineSupport(): Promise<void> {
    try {
      await enableNetwork(this.db);
    } catch (error) {
      console.error('Failed to enable offline support:', error);
      throw new Error('Failed to enable offline support');
    }
  }

  // Disable offline support
  async disableOfflineSupport(): Promise<void> {
    try {
      await disableNetwork(this.db);
    } catch (error) {
      console.error('Failed to disable offline support:', error);
      throw new Error('Failed to disable offline support');
    }
  }
}

// Create and export singleton instance
export const databaseService = new FirestoreService();

// Export the service class for testing
export { FirestoreService };

// Export utility functions for advanced usage
export const DatabaseUtils = {
  // Check if error is a Firestore error
  isFirestoreError: (error: any): error is FirestoreError => {
    return !!(error && typeof error.code === 'string' && typeof error.message === 'string');
  },

  // Retry operation with exponential backoff
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain error types
        if (DatabaseUtils.isFirestoreError(error)) {
          const nonRetryableCodes = [
            'permission-denied',
            'not-found',
            'invalid-argument',
            'unauthenticated',
            'already-exists',
          ];
          
          if (nonRetryableCodes.includes(error.code)) {
            throw error;
          }
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  },

  // Batch operations helper
  async batchOperation<T>(
    items: T[],
    operation: (item: T) => Promise<any>,
    batchSize: number = 10
  ): Promise<DatabaseOperationResult[]> {
    const results: DatabaseOperationResult[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async (item) => {
        try {
          const data = await operation(item);
          return { success: true, data };
        } catch (error) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  },
};