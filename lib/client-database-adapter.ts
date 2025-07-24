// Client-side database adapter that routes all calls through API endpoints
import { DatabaseService } from './database';
import {
  Meeting,
  ProcessedMeeting,
  Team,
  TeamMember,
  User,
  UserProfile,
  ActionItem,
  CreateTeamData,
  Notification,
  CreateNotificationData
} from './types';

// Type for unsubscribe function
type Unsubscribe = () => void;

export class ClientDatabaseAdapter implements DatabaseService {
  private baseUrl = '/api';
  private static _isPostgresMode: boolean | null = null;

  // Check if we should use PostgreSQL mode by calling the API
  private static async checkDatabaseMode(): Promise<boolean> {
    if (ClientDatabaseAdapter._isPostgresMode !== null) {
      return ClientDatabaseAdapter._isPostgresMode;
    }

    try {
      const response = await fetch('/api/db-mode');
      const data = await response.json();
      ClientDatabaseAdapter._isPostgresMode = data.mode === 'postgresql';
      console.log(`Client database mode: ${data.mode}`);
      return ClientDatabaseAdapter._isPostgresMode;
    } catch (error) {
      console.error('Failed to check database mode, defaulting to Firebase:', error);
      ClientDatabaseAdapter._isPostgresMode = false;
      return false;
    }
  }

  // Static method to determine if we should use this adapter
  static async shouldUse(): Promise<boolean> {
    return await ClientDatabaseAdapter.checkDatabaseMode();
  }

  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `API call failed: ${response.status}`);
    }

    return response.json();
  }

  // Meeting operations
  async saveMeeting(userId: string, meeting: ProcessedMeeting, teamId?: string): Promise<string> {
    const result = await this.apiCall('/meetings', {
      method: 'POST',
      body: JSON.stringify({ userId, meeting, teamId }),
    });
    return result.meetingId;
  }

  async getUserMeetings(userId: string): Promise<Meeting[]> {
    const result = await this.apiCall(`/meetings?userId=${userId}`);
    return result.meetings.map((meeting: any) => ({
      ...meeting,
      date: new Date(meeting.date),
      createdAt: new Date(meeting.createdAt),
      updatedAt: new Date(meeting.updatedAt),
      actionItems: meeting.actionItems?.map((item: any) => ({
        ...item,
        deadline: item.deadline ? new Date(item.deadline) : undefined
      })) || []
    }));
  }

  async getMeetingById(meetingId: string, userId: string): Promise<Meeting | null> {
    try {
      const result = await this.apiCall(`/meetings/${meetingId}?userId=${userId}`);
      const meeting = result.meeting;
      if (!meeting) return null;
      
      return {
        ...meeting,
        date: new Date(meeting.date),
        createdAt: new Date(meeting.createdAt),
        updatedAt: new Date(meeting.updatedAt),
        actionItems: meeting.actionItems?.map((item: any) => ({
          ...item,
          deadline: item.deadline ? new Date(item.deadline) : undefined
        })) || []
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async updateMeeting(meetingId: string, userId: string, updates: Partial<Meeting>): Promise<boolean> {
    const result = await this.apiCall(`/meetings/${meetingId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, updates }),
    });
    return result.success;
  }

  async deleteMeeting(meetingId: string, userId: string): Promise<boolean> {
    const result = await this.apiCall(`/meetings/${meetingId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
    return result.success;
  }

  // Team meeting operations
  async getTeamMeetings(teamId: string): Promise<Meeting[]> {
    const result = await this.apiCall(`/teams/${teamId}/meetings`);
    return result.meetings;
  }

  // Team management operations
  async createTeam(teamData: CreateTeamData): Promise<string> {
    const result = await this.apiCall('/teams', {
      method: 'POST',
      body: JSON.stringify({ teamData }),
    });
    return result.teamId;
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const result = await this.apiCall(`/teams?userId=${userId}`);
    return result.teams.map((team: any) => ({
      ...team,
      createdAt: new Date(team.createdAt),
      updatedAt: new Date(team.updatedAt),
      members: team.members.map((member: any) => ({
        ...member,
        joinedAt: new Date(member.joinedAt)
      }))
    }));
  }

  async getAllTeams(): Promise<Team[]> {
    const result = await this.apiCall('/teams/all');
    return result.teams;
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    try {
      const result = await this.apiCall(`/teams/${teamId}`);
      const team = result.team;
      if (!team) return null;
      
      return {
        ...team,
        createdAt: new Date(team.createdAt),
        updatedAt: new Date(team.updatedAt),
        members: team.members.map((member: any) => ({
          ...member,
          joinedAt: new Date(member.joinedAt)
        }))
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean> {
    const result = await this.apiCall(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return result.success;
  }

  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    const result = await this.apiCall(`/teams/${teamId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
    return result.success;
  }

  // Team member operations
  async addTeamMember(teamId: string, member: Omit<TeamMember, 'joinedAt'>): Promise<boolean> {
    const result = await this.apiCall(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ member }),
    });
    return result.success;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const result = await this.apiCall(`/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
    return result.success;
  }

  async updateTeamMember(teamId: string, userId: string, updates: Partial<TeamMember>): Promise<boolean> {
    const result = await this.apiCall(`/teams/${teamId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return result.success;
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const result = await this.apiCall(`/teams/${teamId}/members`);
    return result.members.map((member: any) => ({
      ...member,
      joinedAt: new Date(member.joinedAt)
    }));
  }

  // User search operations
  async searchUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.apiCall(`/users/search?email=${encodeURIComponent(email)}`);
      return result.user;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // User profile operations
  async createUserProfile(userId: string, profile: UserProfile): Promise<void> {
    await this.apiCall('/users/profile', {
      method: 'POST',
      body: JSON.stringify({ userId, profile }),
    });
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    await this.apiCall(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const result = await this.apiCall(`/users/${userId}/profile`);
      return result.profile;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // Task assignment operations
  async assignTask(meetingId: string, taskId: string, assigneeId: string, assignedBy: string, meetingOwnerId: string): Promise<boolean> {
    const result = await this.apiCall('/tasks/assign', {
      method: 'POST',
      body: JSON.stringify({ meetingId, taskId, assigneeId, assignedBy, meetingOwnerId }),
    });
    return result.success;
  }

  async updateTaskStatus(meetingId: string, taskId: string, status: ActionItem['status']): Promise<boolean> {
    const result = await this.apiCall('/tasks/status', {
      method: 'PUT',
      body: JSON.stringify({ meetingId, taskId, status }),
    });
    return result.success;
  }

  async getTeamTasks(teamId: string): Promise<ActionItem[]> {
    const result = await this.apiCall(`/teams/${teamId}/tasks`);
    return result.tasks;
  }

  // Task collection operations
  async createTask(task: any): Promise<string> {
    const result = await this.apiCall('/tasks', {
      method: 'POST',
      body: JSON.stringify({ task }),
    });
    return result.taskId;
  }

  async getUserTasksFromCollection(userId: string): Promise<any[]> {
    const result = await this.apiCall(`/tasks?userId=${userId}`);
    return result.tasks;
  }

  async updateTaskInCollection(taskId: string, updates: Partial<any>): Promise<boolean> {
    const result = await this.apiCall(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    return result.success;
  }

  // Notification operations
  async createNotification(notification: CreateNotificationData): Promise<string> {
    const result = await this.apiCall('/notifications', {
      method: 'POST',
      body: JSON.stringify({ notification }),
    });
    return result.notificationId;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const result = await this.apiCall(`/notifications?userId=${userId}`);
    return result.notifications.map((notification: any) => ({
      ...notification,
      createdAt: new Date(notification.createdAt)
    }));
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const result = await this.apiCall(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
    return result.success;
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    const result = await this.apiCall(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    return result.success;
  }

  // Subscription methods - implement with polling or WebSocket
  subscribeToUserMeetings(userId: string, callback: (meetings: Meeting[]) => void): Unsubscribe {
    let isSubscribed = true;

    const poll = async () => {
      if (!isSubscribed) return;

      try {
        const meetings = await this.getUserMeetings(userId);
        callback(meetings);
      } catch (error) {
        console.error('Error polling user meetings:', error);
      }

      if (isSubscribed) {
        setTimeout(poll, 10000); // Poll every 10 seconds (reduced frequency)
      }
    };

    poll();

    return () => {
      isSubscribed = false;
    };
  }

  subscribeToTeamMeetings(teamId: string, callback: (meetings: Meeting[]) => void): Unsubscribe {
    let isSubscribed = true;

    const poll = async () => {
      if (!isSubscribed) return;

      try {
        const meetings = await this.getTeamMeetings(teamId);
        callback(meetings);
      } catch (error) {
        console.error('Error polling team meetings:', error);
      }

      if (isSubscribed) {
        setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isSubscribed = false;
    };
  }

  subscribeToTeam(teamId: string, callback: (team: Team | null) => void): Unsubscribe {
    let isSubscribed = true;

    const poll = async () => {
      if (!isSubscribed) return;

      try {
        const team = await this.getTeamById(teamId);
        callback(team);
      } catch (error) {
        console.error('Error polling team:', error);
      }

      if (isSubscribed) {
        setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isSubscribed = false;
    };
  }

  subscribeToUserTeams(userId: string, callback: (teams: Team[]) => void): Unsubscribe {
    let isSubscribed = true;

    const poll = async () => {
      if (!isSubscribed) return;

      try {
        const teams = await this.getUserTeams(userId);
        callback(teams);
      } catch (error) {
        console.error('Error polling user teams:', error);
      }

      if (isSubscribed) {
        setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isSubscribed = false;
    };
  }

  subscribeToUserProfile(userId: string, callback: (profile: UserProfile | null) => void): Unsubscribe {
    let isSubscribed = true;

    const poll = async () => {
      if (!isSubscribed) return;

      try {
        const profile = await this.getUserProfile(userId);
        callback(profile);
      } catch (error) {
        console.error('Error polling user profile:', error);
      }

      if (isSubscribed) {
        setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isSubscribed = false;
    };
  }

  subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void): Unsubscribe {
    let isSubscribed = true;

    const poll = async () => {
      if (!isSubscribed) return;

      try {
        const notifications = await this.getUserNotifications(userId);
        callback(notifications);
      } catch (error) {
        console.error('Error polling user notifications:', error);
      }

      if (isSubscribed) {
        setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isSubscribed = false;
    };
  }

  subscribeToUserTasksFromCollection(userId: string, callback: (tasks: any[]) => void): Unsubscribe {
    let isSubscribed = true;

    const poll = async () => {
      if (!isSubscribed) return;

      try {
        const tasks = await this.getUserTasksFromCollection(userId);
        callback(tasks);
      } catch (error) {
        console.error('Error polling user tasks:', error);
      }

      if (isSubscribed) {
        setTimeout(poll, 5000);
      }
    };

    poll();

    return () => {
      isSubscribed = false;
    };
  }

  // Offline support (not applicable for API-based client)
  async enableOfflineSupport(): Promise<void> {
    console.warn('Offline support not available in client-side API adapter');
  }

  async disableOfflineSupport(): Promise<void> {
    console.warn('Offline support not available in client-side API adapter');
  }
}