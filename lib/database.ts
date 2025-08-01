// Database service - can use either Firebase or PostgreSQL

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
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
  Firestore,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { getAppConfig } from './config';
import { 
  Meeting, 
  ActionItem, 
  ProcessedMeeting, 
  DatabaseOperationResult,
  Team,
  TeamMember,
  CreateTeamData,
  Notification,
  CreateNotificationData,
  User,
  UserProfile
} from './types';
import { ErrorHandler, AppError, retryOperation } from './error-handler';
import { dataValidator } from './data-validator';

// Import the database factory
import { getDatabaseService as getFactoryDatabaseService } from './database-factory';

// Log database mode for server-side
if (typeof window === 'undefined') {
  // Check both variants of the environment variable name
  const USE_POSTGRES = process.env.USE_POSTGRES === 'true' || process.env.USE_POSTGRES === 'true';
  console.log(`Database mode: ${USE_POSTGRES ? 'PostgreSQL' : 'Firebase'}`);
  // Log environment variables for debugging
  console.log('Environment variables:', {
    USE_POSTGRES: process.env.USE_POSTGRES,
    USE_POSTGRES_UNDERSCORE: process.env.USE_POSTGRES,
    DATABASE_URL: process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set'
  });
}

// Create a function to get the database service instance
// This will be used by the proxy to get the instance on demand
function getDatabaseServiceInstance(): DatabaseService {
  // Try to use the factory with PostgreSQL priority
  console.log('[DATABASE] Getting database service instance');
  const service = getFactoryDatabaseService();
  console.log(`[DATABASE] Using database service: ${service.constructor.name}`);
  return service;
}

// Database utility functions
class DatabaseUtils {
  static isFirestoreError(error: any): error is FirestoreError {
    return error && typeof error === 'object' && 'code' in error && typeof error.code === 'string';
  }
}

export interface DatabaseService {
  // Meeting operations
  saveMeeting(userId: string, meeting: ProcessedMeeting, teamId?: string): Promise<string>;
  getUserMeetings(userId: string): Promise<Meeting[]>;
  getMeetingById(meetingId: string, userId: string): Promise<Meeting | null>;
  updateMeeting(meetingId: string, userId: string, updates: Partial<Meeting>): Promise<boolean>;
  deleteMeeting(meetingId: string, userId: string): Promise<boolean>;
  subscribeToUserMeetings(userId: string, callback: (meetings: Meeting[]) => void): Unsubscribe;
  
  // Team meeting operations
  getTeamMeetings(teamId: string): Promise<Meeting[]>;
  subscribeToTeamMeetings(teamId: string, callback: (meetings: Meeting[]) => void): Unsubscribe;
  
  // Team management operations
  createTeam(teamData: CreateTeamData): Promise<string>;
  getUserTeams(userId: string): Promise<Team[]>;
  getAllTeams(): Promise<Team[]>;
  getTeamById(teamId: string): Promise<Team | null>;
  updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean>;
  deleteTeam(teamId: string, userId: string): Promise<boolean>;
  subscribeToTeam(teamId: string, callback: (team: Team | null) => void): Unsubscribe;
  subscribeToUserTeams(userId: string, callback: (teams: Team[]) => void): Unsubscribe;
  
  // Team member operations
  addTeamMember(teamId: string, member: Omit<TeamMember, 'joinedAt'>): Promise<boolean>;
  removeTeamMember(teamId: string, userId: string): Promise<boolean>;
  updateTeamMember(teamId: string, userId: string, updates: Partial<TeamMember>): Promise<boolean>;
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  
  // User search operations
  searchUserByEmail(email: string): Promise<User | null>;
  
  // User profile operations
  createUserProfile(userId: string, profile: UserProfile): Promise<void>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  subscribeToUserProfile(userId: string, callback: (profile: UserProfile | null) => void): Unsubscribe;
  
  // Task assignment operations
  assignTask(meetingId: string, taskId: string, assigneeId: string, assignedBy: string, meetingOwnerId: string): Promise<boolean>;
  updateTaskStatus(meetingId: string, taskId: string, status: ActionItem['status']): Promise<boolean>;
  getTeamTasks(teamId: string): Promise<ActionItem[]>;
  
  // Task collection operations
  createTask(task: {
    id: string;
    description: string;
    assigneeId: string;
    assigneeName: string;
    assignedBy: string;
    assignedAt: Date;
    status: ActionItem['status'];
    priority: ActionItem['priority'];
    deadline?: Date;
    meetingId: string;
    meetingTitle: string;
    meetingDate: Date;
    teamId?: string;
    teamName?: string;
    owner?: string;
  }): Promise<string>;
  getUserTasksFromCollection(userId: string): Promise<any[]>;
  updateTaskInCollection(taskId: string, updates: Partial<any>): Promise<boolean>;
  subscribeToUserTasksFromCollection(userId: string, callback: (tasks: any[]) => void): Unsubscribe;
  
  // Notification operations
  createNotification(notification: CreateNotificationData): Promise<string>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<boolean>;
  deleteNotification(notificationId: string): Promise<boolean>;
  subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void): Unsubscribe;
  
  // Offline support
  enableOfflineSupport(): Promise<void>;
  disableOfflineSupport(): Promise<void>;
}

class FirestoreService implements DatabaseService {
  private _db: Firestore | null = null;
  private _appId: string | null = null;

  private get db(): Firestore {
    if (!this._db) {
      try {
        // Ensure we're in a browser environment
        if (typeof window === 'undefined') {
          throw new Error('Database service can only be used in browser environment');
        }
        this._db = getFirebaseDb();
      } catch (error) {
        console.error('Failed to initialize Firebase database:', error);
        throw new Error(`Firebase database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    return this._db;
  }

  private get appId(): string {
    if (!this._appId) {
      this._appId = getAppConfig().appId;
    }
    return this._appId;
  }

  // Get the collection path for user meetings
  private getUserMeetingsPath(userId: string): string {
    return `artifacts/${this.appId}/users/${userId}/meetings`;
  }

  // Get the collection path for teams
  private getTeamsPath(): string {
    return `artifacts/${this.appId}/teams`;
  }

  // Get the collection path for notifications
  private getNotificationsPath(): string {
    return `artifacts/${this.appId}/notifications`;
  }

  // Get the collection path for users (for search)
  private getUsersPath(): string {
    return `artifacts/${this.appId}/users`;
  }

  // Get the collection path for all meetings (for team cleanup)
  private getMeetingsPath(): string {
    return `artifacts/${this.appId}/meetings`;
  }

  // Safe date conversion with fallbacks
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

  // Convert Firestore document to Meeting object
  private documentToMeeting(doc: DocumentSnapshot<DocumentData>): Meeting | null {
    if (!doc.exists()) {
      return null;
    }

    const data = doc.data();
    
    return {
      id: doc.id,
      title: data.title || '',
      date: this.safeToDate(data.date),
      summary: data.summary || '',
      actionItems: this.processActionItems(data.actionItems || []),
      rawTranscript: data.rawTranscript || '',
      teamId: data.teamId || undefined,
      createdAt: this.safeToDate(data.createdAt),
      updatedAt: this.safeToDate(data.updatedAt),
    };
  }

  // Convert Firestore document to Team object
  private documentToTeam(doc: DocumentSnapshot<DocumentData>): Team | null {
    if (!doc.exists()) {
      return null;
    }

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

  // Convert Firestore document to Notification object
  private documentToNotification(doc: DocumentSnapshot<DocumentData>): Notification | null {
    if (!doc.exists()) {
      return null;
    }

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
              // Type assertion to tell TypeScript this is a Firestore Timestamp
              processedItem.deadline = (item.deadline as any).toDate();
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
  async saveMeeting(userId: string, meeting: ProcessedMeeting, teamId?: string): Promise<string> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }
        if (!meeting?.rawTranscript && !meeting?.summary) {
          throw new AppError('Meeting content is required', 'VALIDATION_ERROR', false, 'Please provide meeting content');
        }

        const meetingsCollection = collection(this.db, this.getUserMeetingsPath(userId));
        
        // Use data validator to ensure clean data
        const validatedMeetingData = dataValidator.validateMeetingData(meeting, teamId);
        
        const docRef = await addDoc(meetingsCollection, validatedMeetingData);
        const meetingId = docRef.id;

        // If assigned to a team, also store in team meetings collection
        if (validatedMeetingData.teamId) {
          try {
            // Store meeting in team's meetings subcollection
            const teamMeetingsCollection = collection(this.db, `${this.getTeamsPath()}/${validatedMeetingData.teamId}/meetings`);
            await addDoc(teamMeetingsCollection, {
              ...validatedMeetingData,
              originalMeetingId: meetingId,
              originalOwnerId: userId,
            });
          } catch (teamMeetingError) {
            console.warn('Failed to store meeting in team collection:', teamMeetingError);
            // Don't fail the meeting save if team storage fails
          }

          // Send meeting assignment notifications
          try {
            await this.sendMeetingAssignmentNotifications(meetingId, validatedMeetingData.title, validatedMeetingData.teamId, userId);
          } catch (notificationError) {
            console.warn('Failed to send meeting assignment notifications:', notificationError);
            // Don't fail the meeting save if notifications fail
          }
        }

        return meetingId;
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Save Meeting');
      }
    }, {
      maxRetries: 3,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !appError.code.includes('VALIDATION');
      }
    });
  }

  // Get all meetings for a user
  async getUserMeetings(userId: string): Promise<Meeting[]> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

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
        throw ErrorHandler.handleError(error, 'Get User Meetings');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !appError.code.includes('VALIDATION');
      }
    });
  }

  // Get a specific meeting by ID
  async getMeetingById(meetingId: string, userId: string): Promise<Meeting | null> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!meetingId?.trim()) {
          throw new AppError('Meeting ID is required', 'VALIDATION_ERROR', false, 'Invalid meeting ID');
        }
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

        const meetingDoc = doc(this.db, this.getUserMeetingsPath(userId), meetingId);
        const docSnapshot = await getDoc(meetingDoc);
        
        return this.documentToMeeting(docSnapshot);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get Meeting');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !appError.code.includes('VALIDATION');
      }
    });
  }

  // Update an existing meeting
  async updateMeeting(meetingId: string, userId: string, updates: Partial<Meeting>): Promise<boolean> {
    try {
      // Get the current meeting to check if it's assigned to a team
      const currentMeeting = await this.getMeetingById(meetingId, userId);
      if (!currentMeeting) {
        throw new Error('Meeting not found');
      }

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

      // Send meeting update notifications if the meeting is assigned to a team
      if (currentMeeting.teamId) {
        try {
          // Determine the type of update
          let updateType = 'general';
          if (updates.summary) updateType = 'summary';
          if (updates.actionItems) updateType = 'action_items';
          
          await this.sendMeetingUpdateNotifications(
            meetingId, 
            currentMeeting.title, 
            currentMeeting.teamId, 
            userId, 
            updateType
          );
        } catch (notificationError) {
          console.warn('Failed to send meeting update notifications:', notificationError);
          // Don't fail the meeting update if notifications fail
        }
      }

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

  // ===== TEAM MEETING OPERATIONS =====

  // Get all meetings for a specific team
  async getTeamMeetings(teamId: string): Promise<Meeting[]> {
    try {
      // First, check if team exists
      const teamDoc = await getDoc(doc(this.db, this.getTeamsPath(), teamId));
      if (!teamDoc.exists()) {
        throw new Error('Team not found');
      }

      // Get meetings from the team's meetings subcollection (more efficient)
      const teamMeetingsCollection = collection(this.db, `${this.getTeamsPath()}/${teamId}/meetings`);
      const q = query(teamMeetingsCollection, orderBy('createdAt', 'desc'));
      
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
        : `Failed to fetch team meetings: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Subscribe to real-time updates for team meetings
  subscribeToTeamMeetings(teamId: string, callback: (meetings: Meeting[]) => void): Unsubscribe {
    try {
      // Use the team's meetings subcollection for more efficient real-time updates
      const teamMeetingsCollection = collection(this.db, `${this.getTeamsPath()}/${teamId}/meetings`);
      const q = query(teamMeetingsCollection, orderBy('createdAt', 'desc'));

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
          console.error('Real-time team meetings listener error:', error);
          // Call callback with empty array on error to maintain UI state
          callback([]);
        }
      );
    } catch (error) {
      console.error('Failed to set up team meetings listener:', error);
      callback([]);
      return () => {};
    }
  }

  // ===== TEAM MANAGEMENT OPERATIONS =====

  // Create a new team
  async createTeam(teamData: CreateTeamData): Promise<string> {
    try {
      const teamsCollection = collection(this.db, this.getTeamsPath());
      
      const team = {
        name: teamData.name,
        description: teamData.description,
        createdBy: teamData.createdBy,
        members: [{
          userId: teamData.createdBy,
          email: '', // Will be populated when we have user data
          displayName: '', // Will be populated when we have user data
          role: 'admin' as const,
          joinedAt: Timestamp.fromDate(new Date()),
          status: 'active' as const,
        }],
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(teamsCollection, team);
      return docRef.id;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to create team: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Get all teams for a user
  async getUserTeams(userId: string): Promise<Team[]> {
    try {
      const teamsCollection = collection(this.db, this.getTeamsPath());
      
      // Use a simpler query approach - get all teams and filter client-side
      // This is more reliable than complex array-contains queries
      const querySnapshot = await getDocs(teamsCollection);
      const teams: Team[] = [];

      querySnapshot.forEach((doc) => {
        const team = this.documentToTeam(doc);
        if (team && team.members.some(member => 
          member.userId === userId && 
          (member.status === 'active' || member.status === 'invited')
        )) {
          teams.push(team);
        }
      });

      return teams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to fetch teams: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Get all teams (for task service to find all users with meetings)
  async getAllTeams(): Promise<Team[]> {
    try {
      const teamsCollection = collection(this.db, this.getTeamsPath());
      const querySnapshot = await getDocs(teamsCollection);
      const teams: Team[] = [];

      querySnapshot.forEach((doc) => {
        const team = this.documentToTeam(doc);
        if (team) {
          teams.push(team);
        }
      });

      return teams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to fetch all teams: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Get a specific team by ID
  async getTeamById(teamId: string): Promise<Team | null> {
    try {
      const teamDoc = doc(this.db, this.getTeamsPath(), teamId);
      const docSnapshot = await getDoc(teamDoc);
      
      return this.documentToTeam(docSnapshot);
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to fetch team: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Update an existing team
  async updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean> {
    try {
      const teamDoc = doc(this.db, this.getTeamsPath(), teamId);
      
      const firestoreUpdates: any = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      if (updates.createdAt) {
        firestoreUpdates.createdAt = Timestamp.fromDate(updates.createdAt);
      }

      if (updates.members) {
        firestoreUpdates.members = updates.members.map(member => ({
          ...member,
          joinedAt: Timestamp.fromDate(member.joinedAt),
        }));
      }

      await updateDoc(teamDoc, firestoreUpdates);
      return true;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to update team: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Delete a team (only by creator) with proper cleanup
  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      if (team.createdBy !== userId) {
        throw new Error('Only the team creator can delete the team');
      }

      // Step 1: Clean up team-related notifications
      await this.cleanupTeamNotifications(teamId);

      // Step 2: Clean up team meetings (reassign to personal or delete)
      await this.cleanupTeamMeetings(teamId);

      // Step 3: Delete the team document
      const teamDoc = doc(this.db, this.getTeamsPath(), teamId);
      await deleteDoc(teamDoc);

      console.log(`Team ${teamId} deleted successfully with proper cleanup`);
      return true;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to delete team: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Helper method to clean up team-related notifications
  private async cleanupTeamNotifications(teamId: string): Promise<void> {
    try {
      const notificationsCollection = collection(this.db, this.getNotificationsPath());
      const teamNotificationsQuery = query(
        notificationsCollection,
        where('data.teamId', '==', teamId)
      );
      
      const querySnapshot = await getDocs(teamNotificationsQuery);
      const deletePromises: Promise<void>[] = [];
      
      querySnapshot.forEach((doc) => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${deletePromises.length} team notifications for team ${teamId}`);
    } catch (error) {
      console.error('Error cleaning up team notifications:', error);
      // Don't throw error here to allow team deletion to continue
    }
  }

  // Helper method to clean up team meetings
  private async cleanupTeamMeetings(teamId: string): Promise<void> {
    try {
      const meetingsCollection = collection(this.db, this.getMeetingsPath());
      const teamMeetingsQuery = query(
        meetingsCollection,
        where('teamId', '==', teamId)
      );
      
      const querySnapshot = await getDocs(teamMeetingsQuery);
      const updatePromises: Promise<void>[] = [];
      
      querySnapshot.forEach((doc) => {
        // Remove team assignment from meetings (convert to personal meetings)
        const updateData = {
          teamId: null,
          updatedAt: Timestamp.fromDate(new Date())
        };
        updatePromises.push(updateDoc(doc.ref, updateData));
      });
      
      await Promise.all(updatePromises);
      console.log(`Cleaned up ${updatePromises.length} team meetings for team ${teamId}`);
    } catch (error) {
      console.error('Error cleaning up team meetings:', error);
      // Don't throw error here to allow team deletion to continue
    }
  }

  // Helper method to send meeting assignment notifications
  private async sendMeetingAssignmentNotifications(
    meetingId: string, 
    meetingTitle: string, 
    teamId: string, 
    assignedBy: string
  ): Promise<void> {
    try {
      // Get team information
      const team = await this.getTeamById(teamId);
      if (!team) {
        console.warn(`Team ${teamId} not found for meeting assignment notifications`);
        return;
      }

      // Get the assigner's information
      const assignerMember = team.members.find(member => member.userId === assignedBy);
      const assignerName = assignerMember?.displayName || 'Team member';

      // Import notification service to avoid circular dependencies
      const { notificationService } = await import('./notification-service');
      
      // Send meeting assignment notification
      await notificationService.sendMeetingAssignment(
        meetingId,
        meetingTitle,
        teamId,
        team.name,
        assignedBy,
        assignerName
      );

      console.log(`Sent meeting assignment notifications for "${meetingTitle}" to team "${team.name}"`);
    } catch (error) {
      console.error('Error sending meeting assignment notifications:', error);
      // Don't throw error to avoid failing the meeting save
    }
  }

  // Helper method to send meeting update notifications
  private async sendMeetingUpdateNotifications(
    meetingId: string, 
    meetingTitle: string, 
    teamId: string, 
    updatedBy: string, 
    updateType: string
  ): Promise<void> {
    try {
      // Import notification service to avoid circular dependencies
      const { notificationService } = await import('./notification-service');
      
      // Send meeting update notification
      await notificationService.sendMeetingUpdate(
        meetingId,
        meetingTitle,
        teamId,
        updatedBy,
        updateType
      );

      console.log(`Sent meeting update notifications for "${meetingTitle}" (${updateType}) to team ${teamId}`);
    } catch (error) {
      console.error('Error sending meeting update notifications:', error);
      // Don't throw error to avoid failing the meeting update
    }
  }

  // Helper method to send task assignment notifications
  private async sendTaskAssignmentNotifications(
    task: ActionItem,
    meeting: Meeting,
    assignedBy: string
  ): Promise<void> {
    try {
      if (!task.assigneeId) {
        return;
      }

      // Import notification service to avoid circular dependencies
      const { notificationService } = await import('./notification-service');
      
      // Get assignee information from team members (optimize by using existing data if available)
      let assigneeName = task.assigneeName || 'Unknown';
      if (meeting.teamId) {
        // Try to avoid extra database call by using cached team data if available
        try {
          const team = await this.getTeamById(meeting.teamId);
          if (team) {
            const assigneeMember = team.members.find(member => member.userId === task.assigneeId);
            if (assigneeMember) {
              assigneeName = assigneeMember.displayName;
            }
          }
        } catch (teamError) {
          console.warn('Could not fetch team data for notification, using fallback name:', teamError);
          // Continue with fallback name to avoid blocking notification
        }
      }

      // Send task assignment notification with error handling
      try {
        await notificationService.sendTaskAssignment(
          task.id,
          task.description,
          task.assigneeId,
          assigneeName,
          meeting.title,
          assignedBy,
          meeting.teamId,
          meeting.teamId ? (await this.getTeamById(meeting.teamId))?.name : undefined
        );

        console.log(`Sent task assignment notification for task "${task.description}" to ${assigneeName}`);
      } catch (notificationError) {
        console.warn('Failed to send task assignment notification:', notificationError);
        // Don't throw - notification failure shouldn't break task assignment
      }
    } catch (error) {
      console.error('Error sending task assignment notifications:', error);
      // Don't throw error to avoid failing the task assignment
    }
  }

  // Subscribe to real-time updates for a specific team
  subscribeToTeam(teamId: string, callback: (team: Team | null) => void): Unsubscribe {
    try {
      const teamDoc = doc(this.db, this.getTeamsPath(), teamId);
      
      return onSnapshot(
        teamDoc,
        (docSnapshot: DocumentSnapshot<DocumentData>) => {
          const team = this.documentToTeam(docSnapshot);
          callback(team);
        },
        (error: FirestoreError) => {
          console.error('Real-time team listener error:', error);
          // Return null instead of failing
          callback(null);
        }
      );
    } catch (error) {
      console.error('Failed to set up team listener:', error);
      // Return a no-op unsubscribe function
      callback(null);
      return () => {};
    }
  }

  // Subscribe to real-time updates for user teams
  subscribeToUserTeams(userId: string, callback: (teams: Team[]) => void): Unsubscribe {
    try {
      const teamsCollection = collection(this.db, this.getTeamsPath());
      
      return onSnapshot(
        teamsCollection,
        (querySnapshot: QuerySnapshot<DocumentData>) => {
          const teams: Team[] = [];
          
          querySnapshot.forEach((doc) => {
            const team = this.documentToTeam(doc);
            if (team && team.members.some(member => 
              member.userId === userId && 
              (member.status === 'active' || member.status === 'invited')
            )) {
              teams.push(team);
            }
          });

          teams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          callback(teams);
        },
        (error: FirestoreError) => {
          console.error('Real-time teams listener error:', error);
          // Return empty array instead of failing
          callback([]);
        }
      );
    } catch (error) {
      console.error('Failed to set up teams listener:', error);
      // Return a no-op unsubscribe function
      callback([]);
      return () => {};
    }
  }

  // ===== TEAM MEMBER OPERATIONS =====

  // Add a team member
  async addTeamMember(teamId: string, member: Omit<TeamMember, 'joinedAt'>): Promise<boolean> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check if user is already a member
      const existingMember = team.members.find(m => m.userId === member.userId);
      if (existingMember) {
        throw new Error('User is already a team member');
      }

      const newMember: TeamMember = {
        ...member,
        joinedAt: new Date(),
      };

      const updatedMembers = [...team.members, newMember];
      
      return await this.updateTeam(teamId, { members: updatedMembers });
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to add team member: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Remove a team member
  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      const updatedMembers = team.members.filter(member => member.userId !== userId);
      
      if (updatedMembers.length === team.members.length) {
        throw new Error('User is not a team member');
      }

      return await this.updateTeam(teamId, { members: updatedMembers });
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to remove team member: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Update a team member
  async updateTeamMember(teamId: string, userId: string, updates: Partial<TeamMember>): Promise<boolean> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      const memberIndex = team.members.findIndex(member => member.userId === userId);
      if (memberIndex === -1) {
        throw new Error('Team member not found');
      }

      const updatedMembers = [...team.members];
      updatedMembers[memberIndex] = {
        ...updatedMembers[memberIndex],
        ...updates,
        userId, // Ensure userId cannot be changed
      };

      return await this.updateTeam(teamId, { members: updatedMembers });
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to update team member: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Get team members
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const team = await this.getTeamById(teamId);
      return team?.members || [];
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to fetch team members: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // ===== USER SEARCH OPERATIONS =====

  // Search for a user by email in userProfiles collection
  async searchUserByEmail(email: string): Promise<User | null> {
    try {
      if (!email || !email.includes('@')) {
        return null;
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      // Search in userProfiles collection
      const userProfilesCollection = collection(this.db, this.getUserProfilesPath());
      const q = query(userProfilesCollection, where('email', '==', normalizedEmail));
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // No more temporary IDs - users must exist before they can be invited
        return null;
      }

      // Get the first matching user profile
      const userProfileDoc = querySnapshot.docs[0];
      const profileData = userProfileDoc.data();
      
      // Convert profile data to User format
      const user: User = {
        uid: userProfileDoc.id,
        email: profileData.email,
        displayName: profileData.displayName,
        photoURL: profileData.photoURL || null,
        isAnonymous: false,
        customClaims: null,
      };

      return user;
    } catch (error) {
      console.error('User search error:', error);
      return null;
    }
  }

  // ===== TASK ASSIGNMENT OPERATIONS =====

  // Assign a task to a team member
  async assignTask(meetingId: string, taskId: string, assigneeId: string, assignedBy: string, meetingOwnerId: string): Promise<boolean> {
    try {
      const meeting = await this.getMeetingById(meetingId, meetingOwnerId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const taskIndex = meeting.actionItems.findIndex(item => item.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      // Get assignee information
      let assigneeName = 'Unknown';
      if (meeting.teamId) {
        try {
          const team = await this.getTeamById(meeting.teamId);
          if (team) {
            const assigneeMember = team.members.find(member => member.userId === assigneeId);
            if (assigneeMember) {
              assigneeName = assigneeMember.displayName;
            }
          }
        } catch (teamError) {
          console.warn('Could not fetch team data for assignment:', teamError);
        }
      }

      // If still unknown, try to get from user profile
      if (assigneeName === 'Unknown') {
        try {
          const userProfile = await this.getUserProfile(assigneeId);
          if (userProfile) {
            assigneeName = userProfile.displayName;
          }
        } catch (profileError) {
          console.warn('Could not fetch user profile for assignment:', profileError);
        }
      }

      const updatedActionItems = [...meeting.actionItems];
      updatedActionItems[taskIndex] = {
        ...updatedActionItems[taskIndex],
        assigneeId,
        assigneeName,
        assignedBy,
        assignedAt: new Date(),
      };

      const success = await this.updateMeeting(meetingId, meetingOwnerId, { actionItems: updatedActionItems });

      // Send task assignment notification if the meeting is assigned to a team
      if (success && meeting.teamId) {
        try {
          await this.sendTaskAssignmentNotifications(
            updatedActionItems[taskIndex],
            meeting,
            assignedBy
          );
        } catch (notificationError) {
          console.warn('Failed to send task assignment notifications:', notificationError);
          // Don't fail the task assignment if notifications fail
        }
      }

      return success;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to assign task: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Update task status
  async updateTaskStatus(meetingId: string, taskId: string, status: ActionItem['status']): Promise<boolean> {
    try {
      // This method needs to be called with proper context
      // For now, we'll implement a basic version that works with the task service
      console.warn('updateTaskStatus called - this should be handled by the task service');
      return false;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Get all tasks for a team
  async getTeamTasks(teamId: string): Promise<ActionItem[]> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      const allTasks: ActionItem[] = [];

      // Get meetings for each team member and collect their tasks
      for (const member of team.members) {
        try {
          const meetings = await this.getUserMeetings(member.userId);
          const teamMeetings = meetings.filter(meeting => meeting.teamId === teamId);
          
          for (const meeting of teamMeetings) {
            allTasks.push(...meeting.actionItems);
          }
        } catch (error) {
          // Continue if we can't access a member's meetings
          console.warn(`Could not fetch meetings for team member ${member.userId}:`, error);
        }
      }

      return allTasks;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to fetch team tasks: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // ===== NOTIFICATION OPERATIONS =====

  // Create a notification
  async createNotification(notification: CreateNotificationData): Promise<string> {
    try {
      const notificationsCollection = collection(this.db, this.getNotificationsPath());
      
      const notificationData = {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: false,
        createdAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(notificationsCollection, notificationData);
      return docRef.id;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Get all notifications for a user
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const notificationsCollection = collection(this.db, this.getNotificationsPath());
      const q = query(
        notificationsCollection, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const notifications: Notification[] = [];

      querySnapshot.forEach((doc) => {
        const notification = this.documentToNotification(doc);
        if (notification) {
          notifications.push(notification);
        }
      });

      return notifications;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to fetch notifications: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Mark a notification as read
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const notificationDoc = doc(this.db, this.getNotificationsPath(), notificationId);
      await updateDoc(notificationDoc, { read: true });
      return true;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to mark notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const notificationDoc = doc(this.db, this.getNotificationsPath(), notificationId);
      await deleteDoc(notificationDoc);
      return true;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to delete notification: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Subscribe to real-time updates for user notifications
  subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void): Unsubscribe {
    const notificationsCollection = collection(this.db, this.getNotificationsPath());
    const q = query(
      notificationsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        const notifications: Notification[] = [];
        
        querySnapshot.forEach((doc) => {
          const notification = this.documentToNotification(doc);
          if (notification) {
            notifications.push(notification);
          }
        });

        callback(notifications);
      },
      (error: FirestoreError) => {
        console.error('Real-time notifications listener error:', error);
        callback([]);
      }
    );
  }

  // ===== USER PROFILE OPERATIONS =====

  // Get the collection path for user profiles
  private getUserProfilesPath(): string {
    return `artifacts/${this.appId}/userProfiles`;
  }

  // Convert Firestore document to UserProfile object
  private documentToUserProfile(doc: DocumentSnapshot<DocumentData>): UserProfile | null {
    if (!doc.exists()) {
      return null;
    }

    const data = doc.data();
    
    return {
      userId: doc.id,
      email: data.email || '',
      displayName: data.displayName || '',
      photoURL: data.photoURL || undefined,
      preferences: {
        notifications: {
          teamInvitations: data.preferences?.notifications?.teamInvitations ?? true,
          meetingAssignments: data.preferences?.notifications?.meetingAssignments ?? true,
          taskAssignments: data.preferences?.notifications?.taskAssignments ?? true,
        },
        theme: data.preferences?.theme || 'system',
      },
      createdAt: this.safeToDate(data.createdAt),
      updatedAt: this.safeToDate(data.updatedAt),
    };
  }

  // Create a user profile
  async createUserProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
      const profileDoc = doc(this.db, this.getUserProfilesPath(), userId);
      
      const profileData = {
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL || null,
        preferences: {
          notifications: {
            teamInvitations: profile.preferences.notifications.teamInvitations,
            meetingAssignments: profile.preferences.notifications.meetingAssignments,
            taskAssignments: profile.preferences.notifications.taskAssignments,
          },
          theme: profile.preferences.theme,
        },
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      await setDoc(profileDoc, profileData);
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to create user profile: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Update a user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const profileDoc = doc(this.db, this.getUserProfilesPath(), userId);
      
      const updateData: any = {
        updatedAt: Timestamp.fromDate(new Date()),
      };

      if (updates.email) updateData.email = updates.email;
      if (updates.displayName) updateData.displayName = updates.displayName;
      if (updates.photoURL !== undefined) updateData.photoURL = updates.photoURL;
      if (updates.preferences) {
        updateData.preferences = {
          notifications: {
            teamInvitations: updates.preferences.notifications?.teamInvitations !== undefined 
              ? updates.preferences.notifications.teamInvitations 
              : true,
            meetingAssignments: updates.preferences.notifications?.meetingAssignments !== undefined 
              ? updates.preferences.notifications.meetingAssignments 
              : true,
            taskAssignments: updates.preferences.notifications?.taskAssignments !== undefined 
              ? updates.preferences.notifications.taskAssignments 
              : true,
          },
          theme: updates.preferences.theme || 'system',
        };
      }

      await updateDoc(profileDoc, updateData);
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Get a user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profileDoc = doc(this.db, this.getUserProfilesPath(), userId);
      const docSnapshot = await getDoc(profileDoc);
      
      return this.documentToUserProfile(docSnapshot);
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Subscribe to real-time updates for user profile
  subscribeToUserProfile(userId: string, callback: (profile: UserProfile | null) => void): Unsubscribe {
    const profileDoc = doc(this.db, this.getUserProfilesPath(), userId);

    return onSnapshot(
      profileDoc,
      (docSnapshot: DocumentSnapshot<DocumentData>) => {
        const profile = this.documentToUserProfile(docSnapshot);
        callback(profile);
      },
      (error: FirestoreError) => {
        console.error('Real-time user profile listener error:', error);
        callback(null);
      }
    );
  }

  // ===== TASK COLLECTION OPERATIONS =====
  
  // Create a task in the dedicated tasks collection
  async createTask(task: {
    id: string;
    description: string;
    assigneeId: string;
    assigneeName: string;
    assignedBy: string;
    assignedAt: Date;
    status: ActionItem['status'];
    priority: ActionItem['priority'];
    deadline?: Date;
    meetingId: string;
    meetingTitle: string;
    meetingDate: Date;
    teamId?: string;
    teamName?: string;
    owner?: string;
  }): Promise<string> {
    try {
      const tasksCollection = collection(this.db, this.getTasksPath());
      
      const taskData = {
        id: task.id,
        description: task.description,
        assigneeId: task.assigneeId,
        assigneeName: task.assigneeName,
        assignedBy: task.assignedBy,
        assignedAt: Timestamp.fromDate(task.assignedAt),
        status: task.status,
        priority: task.priority,
        deadline: task.deadline ? Timestamp.fromDate(task.deadline) : null,
        meetingId: task.meetingId,
        meetingTitle: task.meetingTitle,
        meetingDate: Timestamp.fromDate(task.meetingDate),
        teamId: task.teamId || null,
        teamName: task.teamName || null,
        owner: task.owner || null,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      };

      const docRef = await addDoc(tasksCollection, taskData);
      console.log(`Task created in collection with ID: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating task in collection:', error);
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Get all tasks assigned to a user from the tasks collection
  async getUserTasksFromCollection(userId: string): Promise<any[]> {
    try {
      const tasksCollection = collection(this.db, this.getTasksPath());
      const q = query(
        tasksCollection,
        where('assigneeId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const tasks: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const task = {
          id: data.id,
          description: data.description,
          assigneeId: data.assigneeId,
          assigneeName: data.assigneeName,
          assignedBy: data.assignedBy,
          assignedAt: data.assignedAt?.toDate() || new Date(),
          status: data.status,
          priority: data.priority,
          deadline: data.deadline?.toDate(),
          meetingId: data.meetingId,
          meetingTitle: data.meetingTitle,
          meetingDate: data.meetingDate?.toDate() || new Date(),
          teamId: data.teamId,
          teamName: data.teamName,
          owner: data.owner,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          firestoreId: doc.id
        };
        tasks.push(task);
      });

      return tasks;
    } catch (error) {
      console.error('Error getting user tasks from collection:', error);
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to fetch user tasks: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Update a task in the tasks collection
  async updateTaskInCollection(taskId: string, updates: Partial<any>): Promise<boolean> {
    try {
      const tasksCollection = collection(this.db, this.getTasksPath());
      
      // Find the task document by the task ID field (not the Firestore document ID)
      const q = query(tasksCollection, where('id', '==', taskId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.warn(`Task with ID ${taskId} not found in collection`);
        return false;
      }

      // Update the first matching document
      const taskDoc = querySnapshot.docs[0];
      const updateData = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Convert Date objects to Timestamps
      if (updates.deadline && updates.deadline instanceof Date) {
        updateData.deadline = Timestamp.fromDate(updates.deadline);
      }
      if (updates.assignedAt && updates.assignedAt instanceof Date) {
        updateData.assignedAt = Timestamp.fromDate(updates.assignedAt);
      }

      await updateDoc(taskDoc.ref, updateData);
      console.log(`Task ${taskId} updated in collection`);
      return true;
    } catch (error) {
      console.error('Error updating task in collection:', error);
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
    }
  }

  // Subscribe to real-time updates for user tasks from the tasks collection
  subscribeToUserTasksFromCollection(userId: string, callback: (tasks: any[]) => void): Unsubscribe {
    try {
      const tasksCollection = collection(this.db, this.getTasksPath());
      const q = query(
        tasksCollection,
        where('assigneeId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (querySnapshot) => {
        const tasks: any[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const task = {
            id: data.id,
            description: data.description,
            assigneeId: data.assigneeId,
            assigneeName: data.assigneeName,
            assignedBy: data.assignedBy,
            assignedAt: data.assignedAt?.toDate() || new Date(),
            status: data.status,
            priority: data.priority,
            deadline: data.deadline?.toDate(),
            meetingId: data.meetingId,
            meetingTitle: data.meetingTitle,
            meetingDate: data.meetingDate?.toDate() || new Date(),
            teamId: data.teamId,
            teamName: data.teamName,
            owner: data.owner,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            firestoreId: doc.id
          };
          tasks.push(task);
        });

        callback(tasks);
      }, (error) => {
        console.error('Error in user tasks subscription:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Failed to subscribe to user tasks:', error);
      return () => {};
    }
  }

  // Helper method to get the tasks collection path
  private getTasksPath(): string {
    return `artifacts/${this.appId}/tasks`;
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

// Create and export singleton instance with lazy initialization
// Import PostgreSQL adapter
import { PostgresAdapter } from './postgres-adapter';

// Create instances of both services
let firestoreServiceInstance: FirestoreService | null = null;
let postgresAdapterInstance: PostgresAdapter | null = null;

function getFirestoreService(): FirestoreService {
  if (!firestoreServiceInstance) {
    firestoreServiceInstance = new FirestoreService();
  }
  return firestoreServiceInstance;
}

// This function is no longer used directly - we use the factory instead
function getPostgresAdapter(): any {
  console.warn('getPostgresAdapter is deprecated, use getDatabaseService from database-factory instead');
  return getFactoryDatabaseService();
}

// Get the appropriate database service based on environment variable
function getDatabaseService(): DatabaseService {
  // Import from the factory instead of using the global variable
  return getFactoryDatabaseService();
}

// List of subscription methods that should return unsubscribe functions synchronously
const SUBSCRIPTION_METHODS = [
  'subscribeToUserMeetings',
  'subscribeToTeamMeetings', 
  'subscribeToTeam',
  'subscribeToUserTeams',
  'subscribeToUserProfile',
  'subscribeToUserNotifications',
  'subscribeToUserTasksFromCollection'
];

// Client-side database instance cache
let clientDatabaseInstance: DatabaseService | null = null;
let clientDatabasePromise: Promise<DatabaseService> | null = null;

// Get or create client database instance
async function getClientDatabaseInstance(): Promise<DatabaseService> {
  if (clientDatabaseInstance) {
    return clientDatabaseInstance;
  }
  
  if (clientDatabasePromise) {
    return clientDatabasePromise;
  }
  
  clientDatabasePromise = (async () => {
    const { getRuntimeDatabaseService } = await import('./database-factory');
    const instance = await getRuntimeDatabaseService();
    clientDatabaseInstance = instance;
    return instance;
  })();
  
  return clientDatabasePromise;
}

// Export the database service with proper method binding
export const databaseService = new Proxy({} as DatabaseService, {
  get(target, prop) {
    const methodName = String(prop);
    
    // For server-side, use runtime detection with PostgreSQL priority
    if (typeof window === 'undefined') {
      // Return a promise-based proxy for server-side usage
      return async (...args: any[]) => {
        const { getRuntimeDatabaseService } = await import('./database-factory');
        const instance = await getRuntimeDatabaseService();
        // Reduced logging for production
        if (process.env.NODE_ENV === 'development' && !methodName.includes('get')) {
          console.log(`[SERVER] Using database service: ${instance.constructor.name} for method: ${methodName}`);
        }
        const value = (instance as any)[prop];
        if (typeof value === 'function') {
          return value.apply(instance, args);
        }
        return value;
      };
    } else {
      // For client-side, handle subscription methods differently
      if (SUBSCRIPTION_METHODS.includes(methodName)) {
        // Subscription methods should return unsubscribe functions synchronously
        return (...args: any[]) => {
          // Reduced logging for subscriptions
          if (process.env.NODE_ENV === 'development') {
            console.log(`[CLIENT] Setting up subscription: ${methodName}`);
          }
          
          let actualUnsubscribe: (() => void) | null = null;
          let isUnsubscribed = false;
          
          // Set up the subscription asynchronously
          getClientDatabaseInstance().then(instance => {
            if (isUnsubscribed) return; // Already unsubscribed before setup completed
            
            // Subscription setup complete (reduced logging)
            const value = (instance as any)[prop];
            if (typeof value === 'function') {
              actualUnsubscribe = value.apply(instance, args);
            }
          }).catch(error => {
            console.error(`Error setting up subscription ${methodName}:`, error);
          });
          
          // Return an unsubscribe function immediately
          return () => {
            isUnsubscribed = true;
            if (actualUnsubscribe && typeof actualUnsubscribe === 'function') {
              actualUnsubscribe();
            }
          };
        };
      } else {
        // Regular methods remain async
        return async (...args: any[]) => {
          // Reduced logging for regular methods
          const instance = await getClientDatabaseInstance();
          // Database service ready
          const value = (instance as any)[prop];
          if (typeof value === 'function') {
            return value.apply(instance, args);
          }
          return value;
        };
      }
    }
  }
});

// Ensure methods are properly bound to prevent context loss
export const createTeam = databaseService.createTeam.bind(databaseService);
export const getUserTeams = databaseService.getUserTeams.bind(databaseService);
export const getAllTeams = databaseService.getAllTeams.bind(databaseService);
export const getTeamById = databaseService.getTeamById.bind(databaseService);
export const updateTeam = databaseService.updateTeam.bind(databaseService);
export const deleteTeam = databaseService.deleteTeam.bind(databaseService);
export const addTeamMember = databaseService.addTeamMember.bind(databaseService);
export const removeTeamMember = databaseService.removeTeamMember.bind(databaseService);
export const updateTeamMember = databaseService.updateTeamMember.bind(databaseService);
export const getTeamMembers = databaseService.getTeamMembers.bind(databaseService);
export const subscribeToTeam = databaseService.subscribeToTeam.bind(databaseService);
export const subscribeToUserTeams = databaseService.subscribeToUserTeams.bind(databaseService);

// Notification methods
export const createNotification = databaseService.createNotification.bind(databaseService);
export const getUserNotifications = databaseService.getUserNotifications.bind(databaseService);
export const markNotificationAsRead = databaseService.markNotificationAsRead.bind(databaseService);
export const deleteNotification = databaseService.deleteNotification.bind(databaseService);
export const subscribeToUserNotifications = databaseService.subscribeToUserNotifications.bind(databaseService);

// User search methods
export const searchUserByEmail = databaseService.searchUserByEmail.bind(databaseService);

// User profile methods
export const createUserProfile = databaseService.createUserProfile.bind(databaseService);
export const updateUserProfile = databaseService.updateUserProfile.bind(databaseService);
export const getUserProfile = databaseService.getUserProfile.bind(databaseService);
export const subscribeToUserProfile = databaseService.subscribeToUserProfile.bind(databaseService);

// Meeting methods with team support
export const saveMeeting = databaseService.saveMeeting.bind(databaseService);
export const getUserMeetings = databaseService.getUserMeetings.bind(databaseService);
export const getMeetingById = databaseService.getMeetingById.bind(databaseService);
export const updateMeeting = databaseService.updateMeeting.bind(databaseService);
export const deleteMeeting = databaseService.deleteMeeting.bind(databaseService);
export const subscribeToUserMeetings = databaseService.subscribeToUserMeetings.bind(databaseService);
export const getTeamMeetings = databaseService.getTeamMeetings.bind(databaseService);
export const subscribeToTeamMeetings = databaseService.subscribeToTeamMeetings.bind(databaseService);

// Export the service class for testing
export { FirestoreService };
