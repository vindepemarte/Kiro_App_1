// Real-time synchronization engine for managing all data subscriptions

import { 
  Meeting, 
  Team, 
  Notification, 
  TaskWithContext,
  User 
} from './types';
import { DatabaseService } from './database';
import { TaskManagementService } from './task-management-service';

export interface UserDataSnapshot {
  meetings: Meeting[];
  tasks: TaskWithContext[];
  teams: Team[];
  notifications: Notification[];
  lastUpdated: Date;
}

export interface RealTimeSyncEngine {
  // Meeting Synchronization
  subscribeMeetingUpdates(userId: string, callback: (meetings: Meeting[]) => void): () => void;
  subscribeTeamMeetings(teamId: string, callback: (meetings: Meeting[]) => void): () => void;
  
  // Task Synchronization
  subscribeTaskUpdates(userId: string, callback: (tasks: TaskWithContext[]) => void): () => void;
  
  // Team Synchronization
  subscribeTeamUpdates(userId: string, callback: (teams: Team[]) => void): () => void;
  
  // Notification Synchronization
  subscribeNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void;
  
  // Batch Updates
  syncAllUserData(userId: string): Promise<UserDataSnapshot>;
  
  // Connection Management
  handleConnectionStateChange(isOnline: boolean): void;
  getConnectionState(): boolean;
  
  // Cleanup
  cleanup(): void;
}

export interface RealTimeUpdate {
  type: 'meeting' | 'task' | 'team' | 'notification';
  action: 'create' | 'update' | 'delete';
  data: any;
  userId: string;
  timestamp: Date;
}

export class RealTimeSyncEngineImpl implements RealTimeSyncEngine {
  private subscriptions: Map<string, () => void> = new Map();
  private isOnline: boolean = true;
  private updateQueue: RealTimeUpdate[] = [];
  private syncInProgress: boolean = false;

  constructor(
    private databaseService: DatabaseService,
    private taskService: TaskManagementService
  ) {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleConnectionStateChange(true));
      window.addEventListener('offline', () => this.handleConnectionStateChange(false));
      this.isOnline = navigator.onLine;
    }
  }

  // Subscribe to meeting updates for a user
  subscribeMeetingUpdates(userId: string, callback: (meetings: Meeting[]) => void): () => void {
    const subscriptionKey = `meetings-${userId}`;
    
    // Clean up existing subscription if any
    const existingUnsubscribe = this.subscriptions.get(subscriptionKey);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    // Create new subscription
    const unsubscribe = this.databaseService.subscribeToUserMeetings(userId, (meetings) => {
      try {
        // Sort meetings by creation date (newest first)
        const sortedMeetings = meetings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(sortedMeetings);
        
        // Log update for debugging
        console.log(`Meeting updates for user ${userId}: ${meetings.length} meetings`);
      } catch (error) {
        console.error('Error in meeting updates subscription:', error);
        callback([]);
      }
    });

    // Store subscription for cleanup
    this.subscriptions.set(subscriptionKey, unsubscribe);

    // Return cleanup function
    return () => {
      unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to team meetings
  subscribeTeamMeetings(teamId: string, callback: (meetings: Meeting[]) => void): () => void {
    const subscriptionKey = `team-meetings-${teamId}`;
    
    // Clean up existing subscription if any
    const existingUnsubscribe = this.subscriptions.get(subscriptionKey);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    // Create new subscription
    const unsubscribe = this.databaseService.subscribeToTeamMeetings(teamId, (meetings) => {
      try {
        // Sort meetings by creation date (newest first)
        const sortedMeetings = meetings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(sortedMeetings);
        
        // Log update for debugging
        console.log(`Team meeting updates for team ${teamId}: ${meetings.length} meetings`);
      } catch (error) {
        console.error('Error in team meeting updates subscription:', error);
        callback([]);
      }
    });

    // Store subscription for cleanup
    this.subscriptions.set(subscriptionKey, unsubscribe);

    // Return cleanup function
    return () => {
      unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to task updates for a user
  subscribeTaskUpdates(userId: string, callback: (tasks: TaskWithContext[]) => void): () => void {
    const subscriptionKey = `tasks-${userId}`;
    
    // Clean up existing subscription if any
    const existingUnsubscribe = this.subscriptions.get(subscriptionKey);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    // Create new subscription using task service
    const unsubscribe = this.taskService.subscribeToUserTasks(userId, (tasks) => {
      try {
        // Sort tasks by creation date (newest first)
        const sortedTasks = tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(sortedTasks);
        
        // Log update for debugging
        console.log(`Task updates for user ${userId}: ${tasks.length} tasks`);
      } catch (error) {
        console.error('Error in task updates subscription:', error);
        callback([]);
      }
    });

    // Store subscription for cleanup
    this.subscriptions.set(subscriptionKey, unsubscribe);

    // Return cleanup function
    return () => {
      unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to team updates for a user
  subscribeTeamUpdates(userId: string, callback: (teams: Team[]) => void): () => void {
    const subscriptionKey = `teams-${userId}`;
    
    // Clean up existing subscription if any
    const existingUnsubscribe = this.subscriptions.get(subscriptionKey);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    // Create new subscription
    const unsubscribe = this.databaseService.subscribeToUserTeams(userId, (teams) => {
      try {
        // Sort teams by creation date (newest first)
        const sortedTeams = teams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(sortedTeams);
        
        // Log update for debugging
        console.log(`Team updates for user ${userId}: ${teams.length} teams`);
      } catch (error) {
        console.error('Error in team updates subscription:', error);
        callback([]);
      }
    });

    // Store subscription for cleanup
    this.subscriptions.set(subscriptionKey, unsubscribe);

    // Return cleanup function
    return () => {
      unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to notification updates for a user
  subscribeNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    const subscriptionKey = `notifications-${userId}`;
    
    // Clean up existing subscription if any
    const existingUnsubscribe = this.subscriptions.get(subscriptionKey);
    if (existingUnsubscribe) {
      existingUnsubscribe();
    }

    // Create new subscription
    const unsubscribe = this.databaseService.subscribeToUserNotifications(userId, (notifications) => {
      try {
        // Sort notifications by creation date (newest first)
        const sortedNotifications = notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(sortedNotifications);
        
        // Log update for debugging
        console.log(`Notification updates for user ${userId}: ${notifications.length} notifications`);
      } catch (error) {
        console.error('Error in notification updates subscription:', error);
        callback([]);
      }
    });

    // Store subscription for cleanup
    this.subscriptions.set(subscriptionKey, unsubscribe);

    // Return cleanup function
    return () => {
      unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Sync all user data at once
  async syncAllUserData(userId: string): Promise<UserDataSnapshot> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;

    try {
      console.log(`Starting full data sync for user ${userId}`);

      // Fetch all data in parallel
      const [meetings, tasks, teams, notifications] = await Promise.all([
        this.databaseService.getUserMeetings(userId),
        this.taskService.getUserTasks(userId),
        this.databaseService.getUserTeams(userId),
        this.databaseService.getUserNotifications(userId)
      ]);

      const snapshot: UserDataSnapshot = {
        meetings: meetings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        tasks: tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        teams: teams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        notifications: notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        lastUpdated: new Date()
      };

      console.log(`Full data sync completed for user ${userId}:`, {
        meetings: snapshot.meetings.length,
        tasks: snapshot.tasks.length,
        teams: snapshot.teams.length,
        notifications: snapshot.notifications.length
      });

      return snapshot;

    } catch (error) {
      console.error('Error during full data sync:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Handle connection state changes
  handleConnectionStateChange(isOnline: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;

    console.log(`Connection state changed: ${isOnline ? 'online' : 'offline'}`);

    if (isOnline && !wasOnline) {
      // Coming back online - process queued updates
      this.processQueuedUpdates();
    }

    // Notify all active subscriptions about connection state
    // This could be used to show offline indicators in the UI
  }

  // Get current connection state
  getConnectionState(): boolean {
    return this.isOnline;
  }

  // Process queued updates when coming back online
  private async processQueuedUpdates(): Promise<void> {
    if (this.updateQueue.length === 0) {
      return;
    }

    console.log(`Processing ${this.updateQueue.length} queued updates`);

    try {
      // Process updates in chronological order
      const sortedUpdates = this.updateQueue.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      for (const update of sortedUpdates) {
        try {
          await this.processUpdate(update);
        } catch (error) {
          console.error('Error processing queued update:', error);
        }
      }

      // Clear the queue after processing
      this.updateQueue = [];
      console.log('All queued updates processed');

    } catch (error) {
      console.error('Error processing queued updates:', error);
    }
  }

  // Process a single update
  private async processUpdate(update: RealTimeUpdate): Promise<void> {
    // This would contain logic to apply the update
    // For now, we'll just log it
    console.log('Processing update:', update);
  }

  // Queue an update for later processing (when offline)
  private queueUpdate(update: RealTimeUpdate): void {
    this.updateQueue.push(update);
    
    // Limit queue size to prevent memory issues
    if (this.updateQueue.length > 1000) {
      this.updateQueue = this.updateQueue.slice(-500); // Keep only the latest 500 updates
    }
  }

  // Clean up all subscriptions
  cleanup(): void {
    console.log(`Cleaning up ${this.subscriptions.size} real-time subscriptions`);
    
    // Unsubscribe from all active subscriptions
    for (const [key, unsubscribe] of this.subscriptions) {
      try {
        unsubscribe();
      } catch (error) {
        console.error(`Error cleaning up subscription ${key}:`, error);
      }
    }

    // Clear subscriptions map
    this.subscriptions.clear();

    // Clear update queue
    this.updateQueue = [];

    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', () => this.handleConnectionStateChange(true));
      window.removeEventListener('offline', () => this.handleConnectionStateChange(false));
    }

    console.log('Real-time sync engine cleanup completed');
  }
}

// Create and export a singleton instance
let syncEngineInstance: RealTimeSyncEngineImpl | null = null;

export function getRealTimeSyncEngine(
  databaseService: DatabaseService,
  taskService: TaskManagementService
): RealTimeSyncEngineImpl {
  if (!syncEngineInstance) {
    syncEngineInstance = new RealTimeSyncEngineImpl(databaseService, taskService);
  }
  return syncEngineInstance;
}

// Export the implementation class as well
export { RealTimeSyncEngineImpl };