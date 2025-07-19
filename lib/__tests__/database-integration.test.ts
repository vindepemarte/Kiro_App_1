// Integration tests for database service with Firebase

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { databaseService } from '../database';
import { ProcessedMeeting } from '../types';

// Mock Firebase modules
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

vi.mock('../firebase', () => ({
  getFirebaseDb: vi.fn(() => ({})),
}));

vi.mock('../config', () => ({
  getAppConfig: vi.fn(() => ({
    appId: 'meeting-ai-mvp',
    firebase: {
      apiKey: 'test-api-key',
      authDomain: 'test.firebaseapp.com',
      projectId: 'test-project',
      storageBucket: 'test.appspot.com',
      messagingSenderId: '123456789',
      appId: 'test-app-id',
    },
    gemini: {
      apiKey: 'test-gemini-key',
      model: 'gemini-2.0-flash',
    },
  })),
}));

describe('Database Service Integration', () => {
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use correct Firestore path structure', async () => {
    const mockProcessedMeeting: ProcessedMeeting = {
      summary: 'Integration test meeting summary',
      actionItems: [
        {
          id: 'action-1',
          description: 'Test integration action',
          priority: 'high',
          status: 'pending',
        },
      ],
      rawTranscript: 'Integration test transcript',
      metadata: {
        fileName: 'integration-test.txt',
        fileSize: 2000,
        uploadedAt: new Date(),
        processingTime: 3000,
      },
    };

    // Mock successful save
    const { collection, addDoc } = await import('firebase/firestore');
    (addDoc as any).mockResolvedValue({ id: 'integration-test-meeting-id' });
    (collection as any).mockReturnValue({});

    const meetingId = await databaseService.saveMeeting(mockUserId, mockProcessedMeeting);

    expect(meetingId).toBe('integration-test-meeting-id');
    expect(collection).toHaveBeenCalledWith(
      {},
      'artifacts/meeting-ai-mvp/users/test-user-123/meetings'
    );
  });

  it('should handle real-time subscription setup', async () => {
    const mockCallback = vi.fn();
    const mockUnsubscribe = vi.fn();

    const { collection, query, orderBy, onSnapshot } = await import('firebase/firestore');
    (collection as any).mockReturnValue({});
    (query as any).mockReturnValue({});
    (orderBy as any).mockReturnValue({});
    (onSnapshot as any).mockReturnValue(mockUnsubscribe);

    const unsubscribe = databaseService.subscribeToUserMeetings(mockUserId, mockCallback);

    expect(collection).toHaveBeenCalledWith(
      {},
      'artifacts/meeting-ai-mvp/users/test-user-123/meetings'
    );
    expect(query).toHaveBeenCalled();
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(onSnapshot).toHaveBeenCalled();
    expect(unsubscribe).toBe(mockUnsubscribe);
  });

  it('should properly format meeting data for Firestore', async () => {
    const testDate = new Date('2024-01-15T10:30:00Z');
    const mockProcessedMeeting: ProcessedMeeting = {
      summary: 'Test meeting with complex data',
      actionItems: [
        {
          id: 'action-1',
          description: 'First action item',
          owner: 'John Doe',
          deadline: new Date('2024-01-20'),
          priority: 'high',
          status: 'pending',
        },
        {
          // Action item without ID to test ID generation
          description: 'Second action item',
          priority: 'medium',
          status: 'pending',
        } as any,
      ],
      rawTranscript: 'Complex meeting transcript with multiple speakers...',
      metadata: {
        fileName: 'complex-meeting.txt',
        fileSize: 5000,
        uploadedAt: testDate,
        processingTime: 8000,
      },
    };

    const { addDoc, Timestamp } = await import('firebase/firestore');
    (addDoc as any).mockResolvedValue({ id: 'complex-meeting-id' });
    (Timestamp.fromDate as any).mockImplementation((date: Date) => ({ toDate: () => date }));

    await databaseService.saveMeeting(mockUserId, mockProcessedMeeting);

    expect(addDoc).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        summary: 'Test meeting with complex data',
        rawTranscript: 'Complex meeting transcript with multiple speakers...',
        actionItems: expect.arrayContaining([
          expect.objectContaining({
            id: 'action-1',
            description: 'First action item',
            owner: 'John Doe',
            priority: 'high',
            status: 'pending',
          }),
          expect.objectContaining({
            description: 'Second action item',
            priority: 'medium',
            status: 'pending',
            id: expect.stringMatching(/^action-\d+-\d+$/),
          }),
        ]),
        metadata: expect.objectContaining({
          fileName: 'complex-meeting.txt',
          fileSize: 5000,
          processingTime: 8000,
        }),
      })
    );
  });

  it('should handle offline support operations', async () => {
    const { enableNetwork, disableNetwork } = await import('firebase/firestore');
    (enableNetwork as any).mockResolvedValue(undefined);
    (disableNetwork as any).mockResolvedValue(undefined);

    await databaseService.enableOfflineSupport();
    expect(enableNetwork).toHaveBeenCalledWith({});

    await databaseService.disableOfflineSupport();
    expect(disableNetwork).toHaveBeenCalledWith({});
  });
});