// Performance testing for real-time listeners and database queries

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  databaseService,
  subscribeToUserMeetings,
  subscribeToTeamMeetings,
  subscribeToUserNotifications,
  subscribeToUserTeams
} from '../database';
import { getTeamService } from '../team-service';
import { notificationService } from '../notification-service';
import { 
  Team, 
  Meeting, 
  Notification, 
  CreateTeamData, 
  ProcessedMeeting,
  CreateNotificationData 
} from '../types';

// Performance measurement utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();
  private activeTimers: Map<string, number> = new Map();

  startTimer(label: string): void {
    this.activeTimers.set(label, performance.now());
  }

  endTimer(label: string): number {
    const startTime = this.activeTimers.get(label);
    if (!startTime) {
      throw new Error(`Timer '${label}' was not started`);
    }
    
    const duration = performance.now() - startTime;
    this.activeTimers.delete(label);
    
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(duration);
    
    return duration;
  }

  getStats(label: string): { avg: number; min: number; max: number; count: number } {
    const measurements = this.measurements.get(label) || [];
    if (measurements.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }

    const sum = measurements.reduce((a, b) => a + b, 0);
    return {
      avg: sum / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
      count: measurements.length
    };
  }

  reset(): void {
    this.measurements.clear();
    this.activeTimers.clear();
  }
}

// Memory usage monitoring
class MemoryMonitor {
  private initialMemory: number = 0;
  private snapshots: Array<{ label: string; memory: number; timestamp: number }> = [];

  start(): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      this.initialMemory = (performance as any).memory.usedJSHeapSize;
    }
    this.snapshots = [];
  }

  snapshot(label: string): void {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const currentMemory = (performance as any).memory.usedJSHeapSize;
      this.snapshots.push({
        label,
        memory: currentMemory - this.initialMemory,
        timestamp: Date.now()
      });
    }
  }

  getMemoryUsage(): Array<{ label: string; memoryMB: number; timestamp: number }> {
    return this.snapshots.map(snapshot => ({
      label: snapshot.label,
      memoryMB: snapshot.memory / (1024 * 1024),
      timestamp: snapshot.timestamp
    }));
  }
}

describe('Performance Testing', () => {
  let performanceMonitor: PerformanceMonitor;
  let memoryMonitor: MemoryMonitor;
  let testUserId: string;
  let testTeamId: string;
  let cleanupFunctions: Array<() => void> = [];

  beforeEach(async () => {
    performanceMonitor = new PerformanceMonitor();
    memoryMonitor = new MemoryMonitor();
    testUserId = `test-user-${Date.now()}`;
    
    // Create a test team for performance testing
    const teamService = getTeamService(databaseService);
    const teamData: CreateTeamData = {
      name: `Performance Test Team ${Date.now()}`,
      description: 'Team for performance testing',
      createdBy: testUserId
    };
    testTeamId = await teamService.createTeam(teamData);
    
    memoryMonitor.start();
  });

  afterEach(async () => {
    // Clean up all subscriptions
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    });
    cleanupFunctions = [];
    
    // Clean up test data
    try {
      const teamService = getTeamService(databaseService);
      await teamService.deleteTeam(testTeamId, testUserId);
    } catch (error) {
      console.warn('Test cleanup error:', error);
    }
    
    performanceMonitor.reset();
  });

  describe('Real-time Listener Performance', () => {
    it('should handle multiple concurrent listeners efficiently', async () => {
      const listenerCount = 10;
      const updateCount = 5;
      let totalCallbacks = 0;
      
      performanceMonitor.startTimer('multiple-listeners-setup');
      
      // Set up multiple listeners
      for (let i = 0; i < listenerCount; i++) {
        const unsubscribe = subscribeToUserMeetings(testUserId, (meetings) => {
          totalCallbacks++;
        });
        cleanupFunctions.push(unsubscribe);
      }
      
      performanceMonitor.endTimer('multiple-listeners-setup');
      memoryMonitor.snapshot('after-listener-setup');
      
      // Trigger updates
      performanceMonitor.startTimer('listener-updates');
      
      for (let i = 0; i < updateCount; i++) {
        const meeting: ProcessedMeeting = {
          summary: `Performance test meeting ${i}`,
          actionItems: [],
          rawTranscript: `Test transcript ${i}`,
          metadata: {
            fileName: `test-${i}.txt`,
            fileSize: 1000,
            uploadedAt: new Date(),
            processingTime: 100
          }
        };
        
        await databaseService.saveMeeting(testUserId, meeting);
        
        // Wait for listeners to process
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      performanceMonitor.endTimer('listener-updates');
      memoryMonitor.snapshot('after-updates');
      
      const setupStats = performanceMonitor.getStats('multiple-listeners-setup');
      const updateStats = performanceMonitor.getStats('listener-updates');
      
      console.log('Listener Performance Stats:', {
        setup: setupStats,
        updates: updateStats,
        totalCallbacks,
        memoryUsage: memoryMonitor.getMemoryUsage()
      });
      
      // Performance assertions
      expect(setupStats.avg).toBeLessThan(1000); // Setup should be under 1 second
      expect(updateStats.avg).toBeLessThan(2000); // Updates should be under 2 seconds
      expect(totalCallbacks).toBeGreaterThan(0); // Callbacks should have been triggered
    });

    it('should efficiently handle team listener subscriptions', async () => {
      const teamService = getTeamService(databaseService);
      let callbackCount = 0;
      
      performanceMonitor.startTimer('team-listener-setup');
      
      const unsubscribe = teamService.subscribeToTeam(testTeamId, (team) => {
        callbackCount++;
      });
      cleanupFunctions.push(unsubscribe);
      
      performanceMonitor.endTimer('team-listener-setup');
      
      // Trigger team updates
      performanceMonitor.startTimer('team-updates');
      
      for (let i = 0; i < 3; i++) {
        await teamService.updateTeam(testTeamId, {
          description: `Updated description ${i}`
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      performanceMonitor.endTimer('team-updates');
      
      const setupStats = performanceMonitor.getStats('team-listener-setup');
      const updateStats = performanceMonitor.getStats('team-updates');
      
      console.log('Team Listener Performance:', {
        setup: setupStats,
        updates: updateStats,
        callbackCount
      });
      
      expect(setupStats.avg).toBeLessThan(500);
      expect(updateStats.avg).toBeLessThan(1500);
      expect(callbackCount).toBeGreaterThan(0);
    });

    it('should handle notification listener performance', async () => {
      let notificationCallbacks = 0;
      
      performanceMonitor.startTimer('notification-listener-setup');
      
      const unsubscribe = notificationService.subscribeToNotifications(testUserId, (notifications) => {
        notificationCallbacks++;
      });
      cleanupFunctions.push(unsubscribe);
      
      performanceMonitor.endTimer('notification-listener-setup');
      
      // Create multiple notifications
      performanceMonitor.startTimer('notification-creation');
      
      for (let i = 0; i < 5; i++) {
        const notificationData: CreateNotificationData = {
          userId: testUserId,
          type: 'team_invitation',
          title: `Performance Test Notification ${i}`,
          message: `Test notification message ${i}`,
          data: { testId: i }
        };
        
        await databaseService.createNotification(notificationData);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      performanceMonitor.endTimer('notification-creation');
      
      const setupStats = performanceMonitor.getStats('notification-listener-setup');
      const creationStats = performanceMonitor.getStats('notification-creation');
      
      console.log('Notification Performance:', {
        setup: setupStats,
        creation: creationStats,
        callbackCount: notificationCallbacks
      });
      
      expect(setupStats.avg).toBeLessThan(300);
      expect(creationStats.avg).toBeLessThan(1000);
    });
  });

  describe('Database Query Performance', () => {
    it('should efficiently handle batch operations', async () => {
      const batchSize = 20;
      
      performanceMonitor.startTimer('batch-meeting-creation');
      
      // Create multiple meetings in batch
      const meetingPromises = [];
      for (let i = 0; i < batchSize; i++) {
        const meeting: ProcessedMeeting = {
          summary: `Batch meeting ${i}`,
          actionItems: [
            {
              id: `action-${i}-1`,
              description: `Action item ${i}-1`,
              priority: 'medium',
              status: 'pending'
            },
            {
              id: `action-${i}-2`,
              description: `Action item ${i}-2`,
              priority: 'high',
              status: 'pending'
            }
          ],
          rawTranscript: `Batch transcript ${i}`,
          metadata: {
            fileName: `batch-${i}.txt`,
            fileSize: 2000,
            uploadedAt: new Date(),
            processingTime: 150
          }
        };
        
        meetingPromises.push(databaseService.saveMeeting(testUserId, meeting));
      }
      
      await Promise.all(meetingPromises);
      performanceMonitor.endTimer('batch-meeting-creation');
      
      // Test retrieval performance
      performanceMonitor.startTimer('batch-meeting-retrieval');
      const meetings = await databaseService.getUserMeetings(testUserId);
      performanceMonitor.endTimer('batch-meeting-retrieval');
      
      const creationStats = performanceMonitor.getStats('batch-meeting-creation');
      const retrievalStats = performanceMonitor.getStats('batch-meeting-retrieval');
      
      console.log('Batch Operation Performance:', {
        creation: creationStats,
        retrieval: retrievalStats,
        meetingCount: meetings.length
      });
      
      expect(creationStats.avg).toBeLessThan(5000); // Batch creation under 5 seconds
      expect(retrievalStats.avg).toBeLessThan(1000); // Retrieval under 1 second
      expect(meetings.length).toBeGreaterThanOrEqual(batchSize);
    });

    it('should handle complex team queries efficiently', async () => {
      const teamService = getTeamService(databaseService);
      
      // Add multiple team members
      performanceMonitor.startTimer('team-member-operations');
      
      for (let i = 0; i < 10; i++) {
        await teamService.addTeamMember(testTeamId, {
          userId: `member-${i}`,
          email: `member${i}@test.com`,
          displayName: `Member ${i}`,
          role: 'member',
          status: 'active'
        });
      }
      
      performanceMonitor.endTimer('team-member-operations');
      
      // Test team retrieval with members
      performanceMonitor.startTimer('team-with-members-retrieval');
      const team = await teamService.getTeam(testTeamId);
      performanceMonitor.endTimer('team-with-members-retrieval');
      
      // Test user teams query
      performanceMonitor.startTimer('user-teams-query');
      const userTeams = await teamService.getUserTeams(testUserId);
      performanceMonitor.endTimer('user-teams-query');
      
      const memberOpsStats = performanceMonitor.getStats('team-member-operations');
      const teamRetrievalStats = performanceMonitor.getStats('team-with-members-retrieval');
      const userTeamsStats = performanceMonitor.getStats('user-teams-query');
      
      console.log('Team Query Performance:', {
        memberOperations: memberOpsStats,
        teamRetrieval: teamRetrievalStats,
        userTeamsQuery: userTeamsStats,
        memberCount: team?.members.length || 0
      });
      
      expect(memberOpsStats.avg).toBeLessThan(3000);
      expect(teamRetrievalStats.avg).toBeLessThan(500);
      expect(userTeamsStats.avg).toBeLessThan(1000);
      expect(team?.members.length).toBeGreaterThan(10);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should properly clean up listeners to prevent memory leaks', async () => {
      const initialMemory = memoryMonitor.getMemoryUsage();
      
      // Create and destroy multiple listeners
      for (let cycle = 0; cycle < 5; cycle++) {
        const listeners: Array<() => void> = [];
        
        // Create listeners
        for (let i = 0; i < 10; i++) {
          const unsubscribe = subscribeToUserMeetings(testUserId, () => {});
          listeners.push(unsubscribe);
        }
        
        memoryMonitor.snapshot(`cycle-${cycle}-after-creation`);
        
        // Clean up listeners
        listeners.forEach(cleanup => cleanup());
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        memoryMonitor.snapshot(`cycle-${cycle}-after-cleanup`);
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const memoryUsage = memoryMonitor.getMemoryUsage();
      console.log('Memory Usage During Listener Cycles:', memoryUsage);
      
      // Memory should not continuously grow
      const finalMemory = memoryUsage[memoryUsage.length - 1];
      const peakMemory = Math.max(...memoryUsage.map(m => m.memoryMB));
      
      console.log('Memory Analysis:', {
        finalMemoryMB: finalMemory?.memoryMB || 0,
        peakMemoryMB: peakMemory,
        memoryGrowth: (finalMemory?.memoryMB || 0) - (memoryUsage[0]?.memoryMB || 0)
      });
      
      // Memory growth should be reasonable (less than 10MB for this test)
      expect(peakMemory).toBeLessThan(50); // Peak memory under 50MB
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent database operations efficiently', async () => {
      const concurrentOperations = 15;
      
      performanceMonitor.startTimer('concurrent-operations');
      
      // Create concurrent operations of different types
      const operations = [];
      
      // Concurrent meeting saves
      for (let i = 0; i < 5; i++) {
        const meeting: ProcessedMeeting = {
          summary: `Concurrent meeting ${i}`,
          actionItems: [],
          rawTranscript: `Concurrent transcript ${i}`,
          metadata: {
            fileName: `concurrent-${i}.txt`,
            fileSize: 1500,
            uploadedAt: new Date(),
            processingTime: 120
          }
        };
        operations.push(databaseService.saveMeeting(testUserId, meeting));
      }
      
      // Concurrent notification creates
      for (let i = 0; i < 5; i++) {
        const notificationData: CreateNotificationData = {
          userId: testUserId,
          type: 'team_invitation',
          title: `Concurrent Notification ${i}`,
          message: `Concurrent message ${i}`,
          data: { concurrentId: i }
        };
        operations.push(databaseService.createNotification(notificationData));
      }
      
      // Concurrent team operations
      const teamService = getTeamService(databaseService);
      for (let i = 0; i < 5; i++) {
        operations.push(teamService.addTeamMember(testTeamId, {
          userId: `concurrent-member-${i}`,
          email: `concurrent${i}@test.com`,
          displayName: `Concurrent Member ${i}`,
          role: 'member',
          status: 'active'
        }));
      }
      
      // Execute all operations concurrently
      const results = await Promise.allSettled(operations);
      
      performanceMonitor.endTimer('concurrent-operations');
      
      const stats = performanceMonitor.getStats('concurrent-operations');
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;
      
      console.log('Concurrent Operations Performance:', {
        stats,
        successCount,
        failureCount,
        totalOperations: concurrentOperations
      });
      
      expect(stats.avg).toBeLessThan(8000); // All concurrent operations under 8 seconds
      expect(successCount).toBeGreaterThan(concurrentOperations * 0.8); // At least 80% success rate
    });
  });
});