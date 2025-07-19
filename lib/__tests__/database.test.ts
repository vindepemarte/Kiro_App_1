// Tests for Firestore database service

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
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
  onSnapshot,
  Timestamp,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import { databaseService, FirestoreService, DatabaseUtils } from '../database';
import { ProcessedMeeting, Meeting, ActionItem } from '../types';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
  },
  enableNetwork: vi.fn(),
  disableNetwork: vi.fn(),
}));

// Mock Firebase initialization
vi.mock('../firebase', () => ({
  getFirebaseDb: vi.fn(() => ({})),
}));

// Mock config
vi.mock('../config', () => ({
  getAppConfig: vi.fn(() => ({
    appId: 'test-app-id',
    firebase: {},
    gemini: {},
  })),
}));

describe('FirestoreService', () => {
  let service: FirestoreService;
  const mockUserId = 'test-user-id';
  const mockMeetingId = 'test-meeting-id';

  beforeEach(() => {
    service = new FirestoreService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('saveMeeting', () => {
    it('should save a meeting successfully', async () => {
      const mockProcessedMeeting: ProcessedMeeting = {
        summary: 'Test meeting summary',
        actionItems: [
          {
            id: 'action-1',
            description: 'Test action item',
            priority: 'high',
            status: 'pending',
          },
        ],
        rawTranscript: 'Test transcript content',
        metadata: {
          fileName: 'test.txt',
          fileSize: 1000,
          uploadedAt: new Date(),
          processingTime: 5000,
        },
      };

      const mockDocRef = { id: 'new-meeting-id' };
      (addDoc as Mock).mockResolvedValue(mockDocRef);
      (collection as Mock).mockReturnValue({});

      const result = await service.saveMeeting(mockUserId, mockProcessedMeeting);

      expect(result).toBe('new-meeting-id');
      expect(addDoc).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          summary: 'Test meeting summary',
          rawTranscript: 'Test transcript content',
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              description: 'Test action item',
              priority: 'high',
              status: 'pending',
            }),
          ]),
        })
      );
    });

    it('should handle Firestore errors', async () => {
      const mockProcessedMeeting: ProcessedMeeting = {
        summary: 'Test summary',
        actionItems: [],
        rawTranscript: 'Test transcript',
        metadata: {
          uploadedAt: new Date(),
        },
      };

      const firestoreError = {
        code: 'permission-denied',
        message: 'Permission denied',
      };

      (addDoc as Mock).mockRejectedValue(firestoreError);
      (collection as Mock).mockReturnValue({});

      await expect(service.saveMeeting(mockUserId, mockProcessedMeeting)).rejects.toThrow(
        'You do not have permission to perform this operation'
      );
    });

    it('should generate appropriate meeting titles', async () => {
      const mockProcessedMeeting: ProcessedMeeting = {
        summary: 'Weekly team standup discussion about project progress.',
        actionItems: [],
        rawTranscript: 'Weekly Team Standup\nDiscussion about current sprint...',
        metadata: {
          uploadedAt: new Date(),
        },
      };

      const mockDocRef = { id: 'new-meeting-id' };
      (addDoc as Mock).mockResolvedValue(mockDocRef);
      (collection as Mock).mockReturnValue({});

      await service.saveMeeting(mockUserId, mockProcessedMeeting);

      expect(addDoc).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          title: 'Weekly Team Standup',
        })
      );
    });
  });

  describe('getUserMeetings', () => {
    it('should fetch user meetings successfully', async () => {
      const mockMeetingData = {
        id: 'meeting-1',
        title: 'Test Meeting',
        date: { toDate: () => new Date('2024-01-01') },
        summary: 'Test summary',
        actionItems: [],
        rawTranscript: 'Test transcript',
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
      };

      const mockDoc = {
        id: 'meeting-1',
        exists: () => true,
        data: () => mockMeetingData,
      };

      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback(mockDoc);
        },
      };

      (collection as Mock).mockReturnValue({});
      (query as Mock).mockReturnValue({});
      (orderBy as Mock).mockReturnValue({});
      (getDocs as Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await service.getUserMeetings(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'meeting-1',
          title: 'Test Meeting',
          summary: 'Test summary',
        })
      );
    });

    it('should handle empty results', async () => {
      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          // No documents
        },
      };

      (collection as Mock).mockReturnValue({});
      (query as Mock).mockReturnValue({});
      (orderBy as Mock).mockReturnValue({});
      (getDocs as Mock).mockResolvedValue(mockQuerySnapshot);

      const result = await service.getUserMeetings(mockUserId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getMeetingById', () => {
    it('should fetch a specific meeting successfully', async () => {
      const mockMeetingData = {
        title: 'Test Meeting',
        date: { toDate: () => new Date('2024-01-01') },
        summary: 'Test summary',
        actionItems: [],
        rawTranscript: 'Test transcript',
        createdAt: { toDate: () => new Date('2024-01-01') },
        updatedAt: { toDate: () => new Date('2024-01-01') },
      };

      const mockDocSnapshot = {
        id: mockMeetingId,
        exists: () => true,
        data: () => mockMeetingData,
      };

      (doc as Mock).mockReturnValue({});
      (getDoc as Mock).mockResolvedValue(mockDocSnapshot);

      const result = await service.getMeetingById(mockMeetingId, mockUserId);

      expect(result).toEqual(
        expect.objectContaining({
          id: mockMeetingId,
          title: 'Test Meeting',
          summary: 'Test summary',
        })
      );
    });

    it('should return null for non-existent meeting', async () => {
      const mockDocSnapshot = {
        exists: () => false,
      };

      (doc as Mock).mockReturnValue({});
      (getDoc as Mock).mockResolvedValue(mockDocSnapshot);

      const result = await service.getMeetingById(mockMeetingId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateMeeting', () => {
    it('should update a meeting successfully', async () => {
      const updates = {
        title: 'Updated Meeting Title',
        summary: 'Updated summary',
      };

      (doc as Mock).mockReturnValue({});
      (updateDoc as Mock).mockResolvedValue(undefined);

      const result = await service.updateMeeting(mockMeetingId, mockUserId, updates);

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          title: 'Updated Meeting Title',
          summary: 'Updated summary',
          updatedAt: expect.any(Object),
        })
      );
    });

    it('should handle action items updates', async () => {
      const actionItems: ActionItem[] = [
        {
          id: 'action-1',
          description: 'Updated action',
          priority: 'medium',
          status: 'completed',
        },
      ];

      const updates = { actionItems };

      (doc as Mock).mockReturnValue({});
      (updateDoc as Mock).mockResolvedValue(undefined);

      await service.updateMeeting(mockMeetingId, mockUserId, updates);

      expect(updateDoc).toHaveBeenCalledWith(
        {},
        expect.objectContaining({
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              id: 'action-1',
              description: 'Updated action',
              status: 'completed',
            }),
          ]),
        })
      );
    });
  });

  describe('deleteMeeting', () => {
    it('should delete a meeting successfully', async () => {
      (doc as Mock).mockReturnValue({});
      (deleteDoc as Mock).mockResolvedValue(undefined);

      const result = await service.deleteMeeting(mockMeetingId, mockUserId);

      expect(result).toBe(true);
      expect(deleteDoc).toHaveBeenCalledWith({});
    });
  });

  describe('subscribeToUserMeetings', () => {
    it('should set up real-time listener', () => {
      const mockCallback = vi.fn();
      const mockUnsubscribe = vi.fn();

      (collection as Mock).mockReturnValue({});
      (query as Mock).mockReturnValue({});
      (orderBy as Mock).mockReturnValue({});
      (onSnapshot as Mock).mockReturnValue(mockUnsubscribe);

      const unsubscribe = service.subscribeToUserMeetings(mockUserId, mockCallback);

      expect(onSnapshot).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should handle snapshot updates', () => {
      const mockCallback = vi.fn();
      const mockMeetingData = {
        title: 'Test Meeting',
        date: { toDate: () => new Date() },
        summary: 'Test summary',
        actionItems: [],
        rawTranscript: 'Test transcript',
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      const mockDoc = {
        id: 'meeting-1',
        exists: () => true,
        data: () => mockMeetingData,
      };

      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          callback(mockDoc);
        },
      };

      (collection as Mock).mockReturnValue({});
      (query as Mock).mockReturnValue({});
      (orderBy as Mock).mockReturnValue({});
      (onSnapshot as Mock).mockImplementation((query, successCallback) => {
        // Simulate snapshot update
        successCallback(mockQuerySnapshot);
        return vi.fn();
      });

      service.subscribeToUserMeetings(mockUserId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'meeting-1',
          title: 'Test Meeting',
        }),
      ]);
    });

    it('should handle snapshot errors', () => {
      const mockCallback = vi.fn();
      const mockError = { code: 'permission-denied', message: 'Permission denied' };

      (collection as Mock).mockReturnValue({});
      (query as Mock).mockReturnValue({});
      (orderBy as Mock).mockReturnValue({});
      (onSnapshot as Mock).mockImplementation((query, successCallback, errorCallback) => {
        // Simulate error
        errorCallback(mockError);
        return vi.fn();
      });

      service.subscribeToUserMeetings(mockUserId, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith([]);
    });
  });

  describe('offline support', () => {
    it('should enable offline support', async () => {
      (enableNetwork as Mock).mockResolvedValue(undefined);

      await service.enableOfflineSupport();

      expect(enableNetwork).toHaveBeenCalled();
    });

    it('should disable offline support', async () => {
      (disableNetwork as Mock).mockResolvedValue(undefined);

      await service.disableOfflineSupport();

      expect(disableNetwork).toHaveBeenCalled();
    });

    it('should handle offline support errors', async () => {
      (enableNetwork as Mock).mockRejectedValue(new Error('Network error'));

      await expect(service.enableOfflineSupport()).rejects.toThrow(
        'Failed to enable offline support'
      );
    });
  });
});

describe('DatabaseUtils', () => {
  describe('isFirestoreError', () => {
    it('should identify Firestore errors correctly', () => {
      const firestoreError = { code: 'permission-denied', message: 'Permission denied' };
      const regularError = new Error('Regular error');

      expect(DatabaseUtils.isFirestoreError(firestoreError)).toBe(true);
      expect(DatabaseUtils.isFirestoreError(regularError)).toBe(false);
      expect(DatabaseUtils.isFirestoreError(null)).toBe(false);
      expect(DatabaseUtils.isFirestoreError(undefined)).toBe(false);
    });
  });

  describe('retryOperation', () => {
    it('should retry operations with exponential backoff', async () => {
      let attempts = 0;
      const operation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary error');
        }
        return 'success';
      });

      const result = await DatabaseUtils.retryOperation(operation, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = vi.fn().mockRejectedValue({
        code: 'permission-denied',
        message: 'Permission denied',
      });

      await expect(DatabaseUtils.retryOperation(operation, 3, 100)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw last error after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));

      await expect(DatabaseUtils.retryOperation(operation, 2, 100)).rejects.toThrow(
        'Persistent error'
      );
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('batchOperation', () => {
    it('should process items in batches', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = vi.fn().mockImplementation((item: number) => Promise.resolve(item * 2));

      const results = await DatabaseUtils.batchOperation(items, operation, 2);

      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
      expect(results.map(r => r.data)).toEqual([2, 4, 6, 8, 10]);
    });

    it('should handle operation failures', async () => {
      const items = [1, 2, 3];
      const operation = vi.fn().mockImplementation((item: number) => {
        if (item === 2) {
          throw new Error('Operation failed');
        }
        return Promise.resolve(item * 2);
      });

      const results = await DatabaseUtils.batchOperation(items, operation, 2);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ success: true, data: 2 });
      expect(results[1]).toEqual({ success: false, error: 'Operation failed' });
      expect(results[2]).toEqual({ success: true, data: 6 });
    });
  });
});