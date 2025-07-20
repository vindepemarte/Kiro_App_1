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
  User
} from './types';

export interface DatabaseService {
  // Meeting operations
  saveMeeting(userId: string, meeting: ProcessedMeeting): Promise<string>;
  getUserMeetings(userId: string): Promise<Meeting[]>;
  getMeetingById(meetingId: string, userId: string): Promise<Meeting | null>;
  updateMeeting(meetingId: string, userId: string, updates: Partial<Meeting>): Promise<boolean>;
  deleteMeeting(meetingId: string, userId: string): Promise<boolean>;
  subscribeToUserMeetings(userId: string, callback: (meetings: Meeting[]) => void): Unsubscribe;
  
  // Team management operations
  createTeam(teamData: CreateTeamData): Promise<string>;
  getUserTeams(userId: string): Promise<Team[]>;
  getTeamById(teamId: string): Promise<Team | null>;
  updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean>;
  deleteTeam(teamId: string, userId: string): Promise<boolean>;
  subscribeToUserTeams(userId: string, callback: (teams: Team[]) => void): Unsubscribe;
  
  // Team member operations
  addTeamMember(teamId: string, member: Omit<TeamMember, 'joinedAt'>): Promise<boolean>;
  removeTeamMember(teamId: string, userId: string): Promise<boolean>;
  updateTeamMember(teamId: string, userId: string, updates: Partial<TeamMember>): Promise<boolean>;
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  
  // User search operations
  searchUserByEmail(email: string): Promise<User | null>;
  
  // Task assignment operations
  assignTask(meetingId: string, taskId: string, assigneeId: string, assignedBy: string): Promise<boolean>;
  updateTaskStatus(meetingId: string, taskId: string, status: ActionItem['status']): Promise<boolean>;
  getTeamTasks(teamId: string): Promise<ActionItem[]>;
  
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
      const q = query(teamsCollection, where('members', 'array-contains-any', [
        { userId, status: 'active' },
        { userId, status: 'invited' }
      ]));
      
      const querySnapshot = await getDocs(q);
      const teams: Team[] = [];

      querySnapshot.forEach((doc) => {
        const team = this.documentToTeam(doc);
        if (team && team.members.some(member => member.userId === userId)) {
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

  // Delete a team (only by creator)
  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    try {
      const team = await this.getTeamById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      if (team.createdBy !== userId) {
        throw new Error('Only the team creator can delete the team');
      }

      const teamDoc = doc(this.db, this.getTeamsPath(), teamId);
      await deleteDoc(teamDoc);
      return true;
    } catch (error) {
      const errorMessage = DatabaseUtils.isFirestoreError(error)
        ? this.handleFirestoreError(error)
        : `Failed to delete team: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      throw new Error(errorMessage);
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
            if (team && team.members.some(member => member.userId === userId)) {
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

  // Search for a user by email (simplified implementation)
  async searchUserByEmail(email: string): Promise<User | null> {
    try {
      // In a real implementation, this would search a users collection
      // For now, we'll return a mock user structure that can be used for invitations
      // The actual user data will be populated when they accept the invitation
      
      if (!email || !email.includes('@')) {
        return null;
      }

      // Return a basic user structure for invitation purposes
      return {
        uid: `temp-${Date.now()}`, // Temporary ID for invitation
        email,
        displayName: email.split('@')[0], // Use email prefix as display name
        photoURL: null,
        isAnonymous: false,
        customClaims: null,
      };
    } catch (error) {
      console.error('User search error:', error);
      return null;
    }
  }

  // ===== TASK ASSIGNMENT OPERATIONS =====

  // Assign a task to a team member
  async assignTask(meetingId: string, taskId: string, assigneeId: string, assignedBy: string): Promise<boolean> {
    try {
      // First, we need to find which user owns this meeting
      // We'll need to search through user collections to find the meeting
      // For now, we'll assume the assignedBy user owns the meeting
      
      const meeting = await this.getMeetingById(meetingId, assignedBy);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const taskIndex = meeting.actionItems.findIndex(item => item.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      const updatedActionItems = [...meeting.actionItems];
      updatedActionItems[taskIndex] = {
        ...updatedActionItems[taskIndex],
        assigneeId,
        assignedBy,
        assignedAt: new Date(),
      };

      return await this.updateMeeting(meetingId, assignedBy, { actionItems: updatedActionItems });
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
      // This is a simplified implementation - in practice, we'd need to find the meeting owner
      // For now, we'll need the userId to be passed or determined from context
      throw new Error('updateTaskStatus requires meeting owner context - use updateMeeting instead');
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

// Ensure methods are properly bound to prevent context loss
export const createTeam = databaseService.createTeam.bind(databaseService);
export const getUserTeams = databaseService.getUserTeams.bind(databaseService);
export const getTeamById = databaseService.getTeamById.bind(databaseService);
export const updateTeam = databaseService.updateTeam.bind(databaseService);
export const deleteTeam = databaseService.deleteTeam.bind(databaseService);
export const addTeamMember = databaseService.addTeamMember.bind(databaseService);
export const removeTeamMember = databaseService.removeTeamMember.bind(databaseService);
export const updateTeamMember = databaseService.updateTeamMember.bind(databaseService);

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