// Data caching service for improved application performance

import { Meeting, Team, Notification, User } from './types';

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

// Cache statistics interface
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  totalAccesses: number;
}

// Generic cache implementation with TTL and LRU eviction
class DataCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    totalAccesses: 0
  };

  constructor(maxSize: number = 100, defaultTTL: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | null {
    this.stats.totalAccesses++;
    
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.data;
  }

  set(key: string, data: T, ttl?: number): void {
    // Clean up expired entries first
    this.cleanupExpired();

    // If cache is full, evict least recently used item
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      accessCount: 1,
      lastAccessed: Date.now()
    });

    this.updateStats();
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
    }
    return deleted;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.updateStats();
      return false;
    }
    
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      totalAccesses: 0
    };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    if (keysToDelete.length > 0) {
      this.updateStats();
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

  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.updateHitRate();
  }

  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalAccesses > 0 
      ? this.stats.hits / this.stats.totalAccesses 
      : 0;
  }

  // Get all keys (for debugging)
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache size in bytes (approximate)
  getApproximateSize(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // Approximate string size
      size += JSON.stringify(entry.data).length * 2; // Approximate data size
      size += 64; // Approximate overhead
    }
    return size;
  }
}

// Specialized cache for different data types
export class DataCacheService {
  private static instance: DataCacheService;

  // Individual data caches
  private meetingCache = new DataCache<Meeting>(200, 10 * 60 * 1000); // 10 minutes TTL
  private teamCache = new DataCache<Team>(100, 15 * 60 * 1000); // 15 minutes TTL
  private userCache = new DataCache<User>(500, 30 * 60 * 1000); // 30 minutes TTL
  private notificationCache = new DataCache<Notification[]>(100, 2 * 60 * 1000); // 2 minutes TTL

  // Query result caches
  private userMeetingsCache = new DataCache<Meeting[]>(100, 5 * 60 * 1000); // 5 minutes TTL
  private userTeamsCache = new DataCache<Team[]>(100, 10 * 60 * 1000); // 10 minutes TTL
  private teamMeetingsCache = new DataCache<Meeting[]>(50, 5 * 60 * 1000); // 5 minutes TTL

  // Metadata cache for quick lookups
  private metadataCache = new DataCache<any>(200, 5 * 60 * 1000); // 5 minutes TTL

  static getInstance(): DataCacheService {
    if (!DataCacheService.instance) {
      DataCacheService.instance = new DataCacheService();
    }
    return DataCacheService.instance;
  }

  // Meeting cache methods
  getMeeting(meetingId: string): Meeting | null {
    return this.meetingCache.get(meetingId);
  }

  setMeeting(meetingId: string, meeting: Meeting): void {
    this.meetingCache.set(meetingId, meeting);
    // Invalidate related caches
    this.invalidateUserMeetingsCache(meeting.teamId);
  }

  deleteMeeting(meetingId: string): void {
    const meeting = this.meetingCache.get(meetingId);
    this.meetingCache.delete(meetingId);
    if (meeting) {
      this.invalidateUserMeetingsCache(meeting.teamId);
    }
  }

  // Team cache methods
  getTeam(teamId: string): Team | null {
    return this.teamCache.get(teamId);
  }

  setTeam(teamId: string, team: Team): void {
    this.teamCache.set(teamId, team);
    // Invalidate related caches
    this.invalidateUserTeamsCache();
    this.invalidateTeamMeetingsCache(teamId);
  }

  deleteTeam(teamId: string): void {
    this.teamCache.delete(teamId);
    this.invalidateUserTeamsCache();
    this.invalidateTeamMeetingsCache(teamId);
  }

  // User cache methods
  getUser(userId: string): User | null {
    return this.userCache.get(userId);
  }

  setUser(userId: string, user: User): void {
    this.userCache.set(userId, user);
  }

  deleteUser(userId: string): void {
    this.userCache.delete(userId);
  }

  // Notification cache methods
  getUserNotifications(userId: string): Notification[] | null {
    return this.notificationCache.get(userId);
  }

  setUserNotifications(userId: string, notifications: Notification[]): void {
    this.notificationCache.set(userId, notifications);
  }

  deleteUserNotifications(userId: string): void {
    this.notificationCache.delete(userId);
  }

  // Query result cache methods
  getUserMeetings(userId: string, options?: any): Meeting[] | null {
    const cacheKey = `${userId}-${JSON.stringify(options || {})}`;
    return this.userMeetingsCache.get(cacheKey);
  }

  setUserMeetings(userId: string, meetings: Meeting[], options?: any): void {
    const cacheKey = `${userId}-${JSON.stringify(options || {})}`;
    this.userMeetingsCache.set(cacheKey, meetings);
  }

  getUserTeams(userId: string): Team[] | null {
    return this.userTeamsCache.get(userId);
  }

  setUserTeams(userId: string, teams: Team[]): void {
    this.userTeamsCache.set(userId, teams);
  }

  getTeamMeetings(teamId: string): Meeting[] | null {
    return this.teamMeetingsCache.get(teamId);
  }

  setTeamMeetings(teamId: string, meetings: Meeting[]): void {
    this.teamMeetingsCache.set(teamId, meetings);
  }

  // Metadata cache methods
  getMetadata(key: string): any {
    return this.metadataCache.get(key);
  }

  setMetadata(key: string, data: any, ttl?: number): void {
    this.metadataCache.set(key, data, ttl);
  }

  // Cache invalidation methods
  private invalidateUserMeetingsCache(teamId?: string): void {
    // Clear all user meetings caches since we don't know which users are affected
    this.userMeetingsCache.clear();
    
    if (teamId) {
      this.invalidateTeamMeetingsCache(teamId);
    }
  }

  private invalidateUserTeamsCache(): void {
    this.userTeamsCache.clear();
  }

  private invalidateTeamMeetingsCache(teamId: string): void {
    this.teamMeetingsCache.delete(teamId);
  }

  // Bulk invalidation methods
  invalidateUserData(userId: string): void {
    // Remove user-specific caches
    this.userCache.delete(userId);
    this.notificationCache.delete(userId);
    this.userTeamsCache.delete(userId);
    
    // Clear user meetings cache (all variations)
    const userMeetingKeys = this.userMeetingsCache.getKeys().filter(key => key.startsWith(userId));
    userMeetingKeys.forEach(key => this.userMeetingsCache.delete(key));
  }

  invalidateTeamData(teamId: string): void {
    this.teamCache.delete(teamId);
    this.teamMeetingsCache.delete(teamId);
    this.invalidateUserTeamsCache(); // Team membership might have changed
  }

  // Cache warming methods
  warmUserCache(userId: string, userData: {
    user?: User;
    teams?: Team[];
    meetings?: Meeting[];
    notifications?: Notification[];
  }): void {
    if (userData.user) {
      this.setUser(userId, userData.user);
    }
    if (userData.teams) {
      this.setUserTeams(userId, userData.teams);
      // Cache individual teams
      userData.teams.forEach(team => this.setTeam(team.id, team));
    }
    if (userData.meetings) {
      this.setUserMeetings(userId, userData.meetings);
      // Cache individual meetings
      userData.meetings.forEach(meeting => this.setMeeting(meeting.id, meeting));
    }
    if (userData.notifications) {
      this.setUserNotifications(userId, userData.notifications);
    }
  }

  // Performance monitoring
  getAllCacheStats(): {
    meetings: CacheStats;
    teams: CacheStats;
    users: CacheStats;
    notifications: CacheStats;
    userMeetings: CacheStats;
    userTeams: CacheStats;
    teamMeetings: CacheStats;
    metadata: CacheStats;
    totalSize: number;
  } {
    return {
      meetings: this.meetingCache.getStats(),
      teams: this.teamCache.getStats(),
      users: this.userCache.getStats(),
      notifications: this.notificationCache.getStats(),
      userMeetings: this.userMeetingsCache.getStats(),
      userTeams: this.userTeamsCache.getStats(),
      teamMeetings: this.teamMeetingsCache.getStats(),
      metadata: this.metadataCache.getStats(),
      totalSize: this.getTotalCacheSize()
    };
  }

  private getTotalCacheSize(): number {
    return (
      this.meetingCache.getApproximateSize() +
      this.teamCache.getApproximateSize() +
      this.userCache.getApproximateSize() +
      this.notificationCache.getApproximateSize() +
      this.userMeetingsCache.getApproximateSize() +
      this.userTeamsCache.getApproximateSize() +
      this.teamMeetingsCache.getApproximateSize() +
      this.metadataCache.getApproximateSize()
    );
  }

  // Cache health monitoring
  getCacheHealth(): {
    overallHitRate: number;
    lowPerformingCaches: string[];
    oversizedCaches: string[];
    recommendations: string[];
  } {
    const stats = this.getAllCacheStats();
    const cacheNames = Object.keys(stats).filter(key => key !== 'totalSize');
    
    let totalHits = 0;
    let totalAccesses = 0;
    const lowPerformingCaches: string[] = [];
    const oversizedCaches: string[] = [];
    const recommendations: string[] = [];

    cacheNames.forEach(cacheName => {
      const cacheStats = stats[cacheName as keyof typeof stats] as CacheStats;
      totalHits += cacheStats.hits;
      totalAccesses += cacheStats.totalAccesses;

      // Check for low hit rate
      if (cacheStats.totalAccesses > 10 && cacheStats.hitRate < 0.3) {
        lowPerformingCaches.push(cacheName);
      }

      // Check for oversized caches (>80% capacity)
      if (cacheStats.size > 80) { // Assuming max size of 100 for most caches
        oversizedCaches.push(cacheName);
      }
    });

    const overallHitRate = totalAccesses > 0 ? totalHits / totalAccesses : 0;

    // Generate recommendations
    if (overallHitRate < 0.5) {
      recommendations.push('Consider increasing cache TTL or size');
    }
    if (lowPerformingCaches.length > 0) {
      recommendations.push(`Review caching strategy for: ${lowPerformingCaches.join(', ')}`);
    }
    if (oversizedCaches.length > 0) {
      recommendations.push(`Consider increasing size for: ${oversizedCaches.join(', ')}`);
    }
    if (stats.totalSize > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Total cache size is large, consider reducing TTL');
    }

    return {
      overallHitRate,
      lowPerformingCaches,
      oversizedCaches,
      recommendations
    };
  }

  // Clear all caches
  clearAllCaches(): void {
    this.meetingCache.clear();
    this.teamCache.clear();
    this.userCache.clear();
    this.notificationCache.clear();
    this.userMeetingsCache.clear();
    this.userTeamsCache.clear();
    this.teamMeetingsCache.clear();
    this.metadataCache.clear();
  }

  // Cleanup expired entries across all caches
  cleanupExpiredEntries(): void {
    // Force cleanup by attempting to get a non-existent key
    const caches = [
      this.meetingCache,
      this.teamCache,
      this.userCache,
      this.notificationCache,
      this.userMeetingsCache,
      this.userTeamsCache,
      this.teamMeetingsCache,
      this.metadataCache
    ];

    caches.forEach(cache => {
      cache.get('__cleanup_trigger__'); // This will trigger cleanup of expired entries
    });
  }
}

// Export singleton instance
export const dataCacheService = DataCacheService.getInstance();