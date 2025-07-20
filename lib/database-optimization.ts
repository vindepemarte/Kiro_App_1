// Database query optimization utilities and caching layer

import { 
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  onSnapshot,
  Unsubscribe,
  DocumentSnapshot,
  QuerySnapshot,
  FirestoreError
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { getAppConfig } from './config';
import { Meeting, Team, Notification, User } from './types';

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items in cache
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

// Generic cache implementation with LRU eviction
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  set(key: string, data: T): void {
    // Remove expired entries first
    this.cleanupExpired();

    // If cache is full, remove least recently used item
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  getStats(): { size: number; hitRate: number; totalAccesses: number } {
    let totalAccesses = 0;
    for (const entry of this.cache.values()) {
      totalAccesses += entry.accessCount;
    }

    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalAccesses / this.cache.size : 0,
      totalAccesses
    };
  }
}

// Query optimization utilities
export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private db = getFirebaseDb();
  private appId = getAppConfig().appId;

  // Caches for different data types
  private meetingCache = new LRUCache<Meeting>({ ttl: 5 * 60 * 1000, maxSize: 100 }); // 5 minutes, 100 items
  private teamCache = new LRUCache<Team>({ ttl: 10 * 60 * 1000, maxSize: 50 }); // 10 minutes, 50 items
  private userCache = new LRUCache<User>({ ttl: 15 * 60 * 1000, maxSize: 200 }); // 15 minutes, 200 items
  private notificationCache = new LRUCache<Notification[]>({ ttl: 2 * 60 * 1000, maxSize: 50 }); // 2 minutes, 50 items

  // Query result caches
  private queryCache = new LRUCache<any>({ ttl: 3 * 60 * 1000, maxSize: 100 }); // 3 minutes, 100 queries

  // Active listeners for cache invalidation
  private activeListeners = new Map<string, Unsubscribe>();

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  // Optimized meeting queries with caching
  async getOptimizedUserMeetings(userId: string, options?: {
    limit?: number;
    useCache?: boolean;
    orderBy?: 'createdAt' | 'updatedAt';
    orderDirection?: 'asc' | 'desc';
  }): Promise<Meeting[]> {
    const cacheKey = `user-meetings-${userId}-${JSON.stringify(options)}`;
    
    // Try cache first if enabled
    if (options?.useCache !== false) {
      const cached = this.queryCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const meetingsCollection = collection(this.db, `artifacts/${this.appId}/users/${userId}/meetings`);
      
      let q = query(meetingsCollection);
      
      // Add ordering
      const orderField = options?.orderBy || 'createdAt';
      const orderDirection = options?.orderDirection || 'desc';
      q = query(q, orderBy(orderField, orderDirection));
      
      // Add limit if specified
      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      const meetings: Meeting[] = [];

      querySnapshot.forEach((doc) => {
        const meeting = this.documentToMeeting(doc);
        if (meeting) {
          meetings.push(meeting);
          // Cache individual meetings
          this.meetingCache.set(meeting.id, meeting);
        }
      });

      // Cache query result
      this.queryCache.set(cacheKey, meetings);
      
      return meetings;
    } catch (error) {
      console.error('Optimized user meetings query failed:', error);
      throw error;
    }
  }

  // Optimized team queries with intelligent caching
  async getOptimizedTeam(teamId: string, useCache: boolean = true): Promise<Team | null> {
    // Try cache first
    if (useCache) {
      const cached = this.teamCache.get(teamId);
      if (cached) {
        return cached;
      }
    }

    try {
      const teamDoc = doc(this.db, `artifacts/${this.appId}/teams`, teamId);
      const docSnapshot = await getDoc(teamDoc);
      
      const team = this.documentToTeam(docSnapshot);
      if (team) {
        this.teamCache.set(teamId, team);
      }
      
      return team;
    } catch (error) {
      console.error('Optimized team query failed:', error);
      throw error;
    }
  }

  // Batch team queries for better performance
  async getOptimizedUserTeams(userId: string, useCache: boolean = true): Promise<Team[]> {
    const cacheKey = `user-teams-${userId}`;
    
    if (useCache) {
      const cached = this.queryCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const teamsCollection = collection(this.db, `artifacts/${this.appId}/teams`);
      const querySnapshot = await getDocs(teamsCollection);
      const teams: Team[] = [];

      querySnapshot.forEach((doc) => {
        const team = this.documentToTeam(doc);
        if (team && team.members.some(member => 
          member.userId === userId && 
          (member.status === 'active' || member.status === 'invited')
        )) {
          teams.push(team);
          // Cache individual teams
          this.teamCache.set(team.id, team);
        }
      });

      const sortedTeams = teams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Cache query result
      this.queryCache.set(cacheKey, sortedTeams);
      
      return sortedTeams;
    } catch (error) {
      console.error('Optimized user teams query failed:', error);
      throw error;
    }
  }

  // Optimized notification queries with pagination
  async getOptimizedUserNotifications(userId: string, options?: {
    limit?: number;
    unreadOnly?: boolean;
    useCache?: boolean;
  }): Promise<Notification[]> {
    const cacheKey = `user-notifications-${userId}-${JSON.stringify(options)}`;
    
    if (options?.useCache !== false) {
      const cached = this.notificationCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const notificationsCollection = collection(this.db, `artifacts/${this.appId}/notifications`);
      
      let q = query(
        notificationsCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      // Filter for unread only if specified
      if (options?.unreadOnly) {
        q = query(q, where('read', '==', false));
      }

      // Add limit if specified
      if (options?.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      const notifications: Notification[] = [];

      querySnapshot.forEach((doc) => {
        const notification = this.documentToNotification(doc);
        if (notification) {
          notifications.push(notification);
        }
      });

      // Cache result
      this.notificationCache.set(cacheKey, notifications);
      
      return notifications;
    } catch (error) {
      console.error('Optimized notifications query failed:', error);
      throw error;
    }
  }

  // Optimized real-time listeners with intelligent batching
  subscribeToOptimizedUserMeetings(
    userId: string, 
    callback: (meetings: Meeting[]) => void,
    options?: { batchDelay?: number; limit?: number }
  ): Unsubscribe {
    const batchDelay = options?.batchDelay || 100; // 100ms batching by default
    let batchTimeout: NodeJS.Timeout | null = null;
    let pendingUpdate = false;

    const meetingsCollection = collection(this.db, `artifacts/${this.appId}/users/${userId}/meetings`);
    let q = query(meetingsCollection, orderBy('createdAt', 'desc'));
    
    if (options?.limit) {
      q = query(q, limit(options.limit));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot: QuerySnapshot) => {
        // Batch updates to prevent excessive re-renders
        if (batchTimeout) {
          clearTimeout(batchTimeout);
        }

        if (!pendingUpdate) {
          pendingUpdate = true;
          
          batchTimeout = setTimeout(() => {
            const meetings: Meeting[] = [];
            
            querySnapshot.forEach((doc) => {
              const meeting = this.documentToMeeting(doc);
              if (meeting) {
                meetings.push(meeting);
                // Update cache
                this.meetingCache.set(meeting.id, meeting);
              }
            });

            // Invalidate related query caches
            this.invalidateUserMeetingCaches(userId);
            
            callback(meetings);
            pendingUpdate = false;
          }, batchDelay);
        }
      },
      (error: FirestoreError) => {
        console.error('Optimized meetings listener error:', error);
        callback([]);
      }
    );

    // Track active listener
    const listenerId = `user-meetings-${userId}-${Date.now()}`;
    this.activeListeners.set(listenerId, unsubscribe);

    // Return cleanup function
    return () => {
      unsubscribe();
      this.activeListeners.delete(listenerId);
      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }
    };
  }

  // Optimized team listener with change detection
  subscribeToOptimizedTeam(
    teamId: string, 
    callback: (team: Team | null) => void,
    options?: { batchDelay?: number }
  ): Unsubscribe {
    const batchDelay = options?.batchDelay || 150;
    let batchTimeout: NodeJS.Timeout | null = null;
    let lastTeamData: string | null = null;

    const teamDoc = doc(this.db, `artifacts/${this.appId}/teams`, teamId);

    const unsubscribe = onSnapshot(
      teamDoc,
      (docSnapshot: DocumentSnapshot) => {
        if (batchTimeout) {
          clearTimeout(batchTimeout);
        }

        batchTimeout = setTimeout(() => {
          const team = this.documentToTeam(docSnapshot);
          const currentTeamData = JSON.stringify(team);
          
          // Only trigger callback if data actually changed
          if (currentTeamData !== lastTeamData) {
            lastTeamData = currentTeamData;
            
            if (team) {
              // Update cache
              this.teamCache.set(teamId, team);
              // Invalidate related caches
              this.invalidateTeamRelatedCaches(teamId);
            }
            
            callback(team);
          }
        }, batchDelay);
      },
      (error: FirestoreError) => {
        console.error('Optimized team listener error:', error);
        callback(null);
      }
    );

    const listenerId = `team-${teamId}-${Date.now()}`;
    this.activeListeners.set(listenerId, unsubscribe);

    return () => {
      unsubscribe();
      this.activeListeners.delete(listenerId);
      if (batchTimeout) {
        clearTimeout(batchTimeout);
      }
    };
  }

  // Cache invalidation methods
  private invalidateUserMeetingCaches(userId: string): void {
    // Remove all cached queries related to this user's meetings
    for (const [key] of this.queryCache['cache'].entries()) {
      if (key.includes(`user-meetings-${userId}`)) {
        this.queryCache.delete(key);
      }
    }
  }

  private invalidateTeamRelatedCaches(teamId: string): void {
    // Remove team from cache
    this.teamCache.delete(teamId);
    
    // Remove related query caches
    for (const [key] of this.queryCache['cache'].entries()) {
      if (key.includes(`team-${teamId}`) || key.includes('user-teams')) {
        this.queryCache.delete(key);
      }
    }
  }

  // Utility methods for document conversion (reused from database service)
  private documentToMeeting(doc: DocumentSnapshot): Meeting | null {
    if (!doc.exists()) return null;
    
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || '',
      date: this.safeToDate(data.date),
      summary: data.summary || '',
      actionItems: data.actionItems || [],
      rawTranscript: data.rawTranscript || '',
      teamId: data.teamId || undefined,
      createdAt: this.safeToDate(data.createdAt),
      updatedAt: this.safeToDate(data.updatedAt),
    };
  }

  private documentToTeam(doc: DocumentSnapshot): Team | null {
    if (!doc.exists()) return null;
    
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || '',
      description: data.description || '',
      createdBy: data.createdBy || '',
      members: (data.members || []).map((member: any) => ({
        userId: member.userId || '',
        email: member.email || '',
        displayName: member.displayName || '',
        role: member.role || 'member',
        joinedAt: this.safeToDate(member.joinedAt),
        status: member.status || 'active',
      })),
      createdAt: this.safeToDate(data.createdAt),
      updatedAt: this.safeToDate(data.updatedAt),
    };
  }

  private documentToNotification(doc: DocumentSnapshot): Notification | null {
    if (!doc.exists()) return null;
    
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId || '',
      type: data.type || 'team_invitation',
      title: data.title || '',
      message: data.message || '',
      data: data.data || {},
      read: data.read || false,
      createdAt: this.safeToDate(data.createdAt),
    };
  }

  private safeToDate(timestamp: any): Date {
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
  }

  // Performance monitoring and statistics
  getCacheStats(): {
    meetings: any;
    teams: any;
    users: any;
    notifications: any;
    queries: any;
  } {
    return {
      meetings: this.meetingCache.getStats(),
      teams: this.teamCache.getStats(),
      users: this.userCache.getStats(),
      notifications: this.notificationCache.getStats(),
      queries: this.queryCache.getStats()
    };
  }

  // Clear all caches
  clearAllCaches(): void {
    this.meetingCache.clear();
    this.teamCache.clear();
    this.userCache.clear();
    this.notificationCache.clear();
    this.queryCache.clear();
  }

  // Cleanup all active listeners
  cleanup(): void {
    for (const unsubscribe of this.activeListeners.values()) {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('Error cleaning up listener:', error);
      }
    }
    this.activeListeners.clear();
    this.clearAllCaches();
  }
}

// Export singleton instance
export const databaseOptimizer = DatabaseOptimizer.getInstance();