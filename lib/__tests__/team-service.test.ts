// Tests for team management service

import { describe, it, expect, beforeEach, afterEach, test } from 'vitest';
import { TeamManagementService } from '../team-service';
import { DatabaseService } from '../database';
import { 
  Team, 
  TeamMember, 
  User, 
  CreateTeamData, 
  CreateNotificationData,
  Notification 
} from '../types';

// Mock database service
class MockDatabaseService implements Partial<DatabaseService> {
  private teams: Map<string, Team> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private notificationCounter = 0;
  private teamCounter = 0;

  async createTeam(teamData: CreateTeamData): Promise<string> {
    const teamId = `team-${++this.teamCounter}`;
    const team: Team = {
      id: teamId,
      name: teamData.name,
      description: teamData.description,
      createdBy: teamData.createdBy,
      members: [{
        userId: teamData.createdBy,
        email: 'creator@example.com',
        displayName: 'Team Creator',
        role: 'admin',
        joinedAt: new Date(),
        status: 'active',
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.teams.set(teamId, team);
    return teamId;
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    return this.teams.get(teamId) || null;
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const userTeams: Team[] = [];
    for (const team of this.teams.values()) {
      if (team.members.some(member => member.userId === userId)) {
        userTeams.push(team);
      }
    }
    return userTeams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;
    
    const updatedTeam = { ...team, ...updates, updatedAt: new Date() };
    this.teams.set(teamId, updatedTeam);
    return true;
  }

  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team || team.createdBy !== userId) return false;
    
    this.teams.delete(teamId);
    return true;
  }

  async addTeamMember(teamId: string, member: Omit<TeamMember, 'joinedAt'>): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const existingMember = team.members.find(m => m.userId === member.userId);
    if (existingMember) return false;

    const newMember: TeamMember = { ...member, joinedAt: new Date() };
    team.members.push(newMember);
    this.teams.set(teamId, { ...team, updatedAt: new Date() });
    return true;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const initialLength = team.members.length;
    team.members = team.members.filter(member => member.userId !== userId);
    
    if (team.members.length === initialLength) return false;
    
    this.teams.set(teamId, { ...team, updatedAt: new Date() });
    return true;
  }

  async updateTeamMember(teamId: string, userId: string, updates: Partial<TeamMember>): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const memberIndex = team.members.findIndex(member => member.userId === userId);
    if (memberIndex === -1) return false;

    team.members[memberIndex] = { ...team.members[memberIndex], ...updates, userId };
    this.teams.set(teamId, { ...team, updatedAt: new Date() });
    return true;
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const team = this.teams.get(teamId);
    return team?.members || [];
  }

  async searchUserByEmail(email: string): Promise<User | null> {
    if (!email || !email.includes('@')) return null;
    
    return {
      uid: `user-${email.replace('@', '-').replace('.', '-')}`,
      email,
      displayName: email.split('@')[0],
      photoURL: null,
      isAnonymous: false,
      customClaims: null,
    };
  }

  async createNotification(notification: CreateNotificationData): Promise<string> {
    const notificationId = `notification-${++this.notificationCounter}`;
    const newNotification: Notification = {
      id: notificationId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(notificationId, newNotification);
    return notificationId;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const userNotifications: Notification[] = [];
    for (const notification of this.notifications.values()) {
      if (notification.userId === userId) {
        userNotifications.push(notification);
      }
    }
    return userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;
    
    notification.read = true;
    this.notifications.set(notificationId, notification);
    return true;
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    return this.notifications.delete(notificationId);
  }

  // Helper methods for testing
  clearData(): void {
    this.teams.clear();
    this.notifications.clear();
    this.teamCounter = 0;
    this.notificationCounter = 0;
  }

  getTeamsData(): Map<string, Team> {
    return new Map(this.teams);
  }

  getNotificationsData(): Map<string, Notification> {
    return new Map(this.notifications);
  }
}

describe('TeamManagementService', () => {
  let teamService: TeamManagementService;
  let mockDb: MockDatabaseService;

  beforeEach(() => {
    mockDb = new MockDatabaseService();
    teamService = new TeamManagementService(mockDb as DatabaseService);
  });

  afterEach(() => {
    mockDb.clearData();
  });

  describe('Team CRUD Operations', () => {
    test('should create a team successfully', async () => {
      const teamData: CreateTeamData = {
        name: 'Test Team',
        description: 'A test team',
        createdBy: 'user-1',
      };

      const teamId = await teamService.createTeam(teamData);
      expect(teamId).toBe('team-1');

      const team = await teamService.getTeam(teamId);
      expect(team).toMatchObject({
        name: 'Test Team',
        description: 'A test team',
        createdBy: 'user-1',
      });
      expect(team?.members).toHaveLength(1);
      expect(team?.members[0].role).toBe('admin');
    });

    test('should get user teams', async () => {
      const teamData: CreateTeamData = {
        name: 'User Team',
        description: 'Team for user',
        createdBy: 'user-1',
      };

      await teamService.createTeam(teamData);
      const teams = await teamService.getUserTeams('user-1');
      
      expect(teams).toHaveLength(1);
      expect(teams[0].name).toBe('User Team');
    });

    test('should update team', async () => {
      const teamId = await teamService.createTeam({
        name: 'Original Team',
        description: 'Original description',
        createdBy: 'user-1',
      });

      const success = await teamService.updateTeam(teamId, {
        name: 'Updated Team',
        description: 'Updated description',
      });

      expect(success).toBe(true);
      
      const team = await teamService.getTeam(teamId);
      expect(team?.name).toBe('Updated Team');
      expect(team?.description).toBe('Updated description');
    });

    test('should delete team', async () => {
      const teamId = await teamService.createTeam({
        name: 'Team to Delete',
        description: 'Will be deleted',
        createdBy: 'user-1',
      });

      const success = await teamService.deleteTeam(teamId, 'user-1');
      expect(success).toBe(true);

      const team = await teamService.getTeam(teamId);
      expect(team).toBeNull();
    });
  });

  describe('User Search', () => {
    test('should search user by valid email', async () => {
      const user = await teamService.searchUserByEmail('test@example.com');
      
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
      expect(user?.displayName).toBe('test');
    });

    test('should return null for invalid email', async () => {
      const user = await teamService.searchUserByEmail('invalid-email');
      expect(user).toBeNull();
    });

    test('should return null for empty email', async () => {
      const user = await teamService.searchUserByEmail('');
      expect(user).toBeNull();
    });
  });

  describe('Team Invitations', () => {
    let teamId: string;

    beforeEach(async () => {
      teamId = await teamService.createTeam({
        name: 'Invitation Team',
        description: 'Team for testing invitations',
        createdBy: 'admin-user',
      });
    });

    test('should invite user to team', async () => {
      await teamService.inviteUserToTeam(
        teamId,
        'admin-user',
        'invitee@example.com',
        'Invitee User'
      );

      const team = await teamService.getTeam(teamId);
      const invitedMember = team?.members.find(m => m.email === 'invitee@example.com');
      
      expect(invitedMember).toBeDefined();
      expect(invitedMember?.status).toBe('invited');
      expect(invitedMember?.displayName).toBe('Invitee User');

      // Check notification was created
      const notifications = mockDb.getNotificationsData();
      expect(notifications.size).toBe(1);
      
      const notification = Array.from(notifications.values())[0];
      expect(notification.type).toBe('team_invitation');
      expect(notification.data.teamId).toBe(teamId);
    });

    test('should not invite existing team member', async () => {
      // First invitation
      await teamService.inviteUserToTeam(
        teamId,
        'admin-user',
        'existing@example.com',
        'Existing User'
      );

      // Second invitation should fail
      await expect(
        teamService.inviteUserToTeam(
          teamId,
          'admin-user',
          'existing@example.com',
          'Existing User'
        )
      ).rejects.toThrow('User is already a team member');
    });

    test('should accept team invitation', async () => {
      // Create invitation
      await teamService.inviteUserToTeam(
        teamId,
        'admin-user',
        'accept@example.com',
        'Accept User'
      );

      const inviteeUserId = 'user-accept-example-com';
      const notifications = await mockDb.getUserNotifications(inviteeUserId);
      const invitationId = notifications[0].id;

      // Accept invitation
      await teamService.acceptTeamInvitation(invitationId, inviteeUserId);

      // Check member status updated
      const team = await teamService.getTeam(teamId);
      const member = team?.members.find(m => m.userId === inviteeUserId);
      expect(member?.status).toBe('active');

      // Check notification was deleted
      const updatedNotifications = await mockDb.getUserNotifications(inviteeUserId);
      expect(updatedNotifications).toHaveLength(0);
    });

    test('should decline team invitation', async () => {
      // Create invitation
      await teamService.inviteUserToTeam(
        teamId,
        'admin-user',
        'decline@example.com',
        'Decline User'
      );

      const inviteeUserId = 'user-decline-example-com';
      const notifications = await mockDb.getUserNotifications(inviteeUserId);
      const invitationId = notifications[0].id;

      // Decline invitation
      await teamService.declineTeamInvitation(invitationId, inviteeUserId);

      // Check member was removed
      const team = await teamService.getTeam(teamId);
      const member = team?.members.find(m => m.userId === inviteeUserId);
      expect(member).toBeUndefined();

      // Check notification was deleted
      const updatedNotifications = await mockDb.getUserNotifications(inviteeUserId);
      expect(updatedNotifications).toHaveLength(0);
    });
  });

  describe('Team Member Management', () => {
    let teamId: string;

    beforeEach(async () => {
      teamId = await teamService.createTeam({
        name: 'Member Team',
        description: 'Team for member management',
        createdBy: 'admin-user',
      });
    });

    test('should add team member', async () => {
      const member: Omit<TeamMember, 'joinedAt'> = {
        userId: 'new-member',
        email: 'member@example.com',
        displayName: 'New Member',
        role: 'member',
        status: 'active',
      };

      const success = await teamService.addTeamMember(teamId, member);
      expect(success).toBe(true);

      const members = await teamService.getTeamMembers(teamId);
      expect(members).toHaveLength(2);
      expect(members.find(m => m.userId === 'new-member')).toBeDefined();
    });

    test('should remove team member', async () => {
      // Add member first
      await teamService.addTeamMember(teamId, {
        userId: 'remove-me',
        email: 'remove@example.com',
        displayName: 'Remove Me',
        role: 'member',
        status: 'active',
      });

      // Remove member
      const success = await teamService.removeTeamMember(teamId, 'remove-me', 'admin-user');
      expect(success).toBe(true);

      const members = await teamService.getTeamMembers(teamId);
      expect(members.find(m => m.userId === 'remove-me')).toBeUndefined();
    });

    test('should update team member role', async () => {
      // Add member first
      await teamService.addTeamMember(teamId, {
        userId: 'promote-me',
        email: 'promote@example.com',
        displayName: 'Promote Me',
        role: 'member',
        status: 'active',
      });

      // Update role
      const success = await teamService.updateTeamMemberRole(
        teamId, 
        'promote-me', 
        'admin', 
        'admin-user'
      );
      expect(success).toBe(true);

      const members = await teamService.getTeamMembers(teamId);
      const member = members.find(m => m.userId === 'promote-me');
      expect(member?.role).toBe('admin');
    });
  });

  describe('Speaker Matching', () => {
    let teamMembers: TeamMember[];

    beforeEach(() => {
      teamMembers = [
        {
          userId: 'user-1',
          email: 'john.doe@example.com',
          displayName: 'John Doe',
          role: 'admin',
          joinedAt: new Date(),
          status: 'active',
        },
        {
          userId: 'user-2',
          email: 'jane.smith@example.com',
          displayName: 'Jane Smith',
          role: 'member',
          joinedAt: new Date(),
          status: 'active',
        },
        {
          userId: 'user-3',
          email: 'bob.wilson@example.com',
          displayName: 'Bob Wilson',
          role: 'member',
          joinedAt: new Date(),
          status: 'active',
        },
      ];
    });

    test('should match exact speaker name', async () => {
      const match = teamService.matchSpeakerToTeamMember('John Doe', teamMembers);
      expect(match?.userId).toBe('user-1');
      expect(match?.displayName).toBe('John Doe');
    });

    test('should match partial speaker name', async () => {
      const match = teamService.matchSpeakerToTeamMember('John', teamMembers);
      expect(match?.userId).toBe('user-1');
    });

    test('should match case insensitive', async () => {
      const match = teamService.matchSpeakerToTeamMember('JANE SMITH', teamMembers);
      expect(match?.userId).toBe('user-2');
    });

    test('should match first name only', async () => {
      const match = teamService.matchSpeakerToTeamMember('Bob', teamMembers);
      expect(match?.userId).toBe('user-3');
    });

    test('should match email prefix', async () => {
      const match = teamService.matchSpeakerToTeamMember('john.doe', teamMembers);
      expect(match?.userId).toBe('user-1');
    });

    test('should return null for no match', async () => {
      const match = teamService.matchSpeakerToTeamMember('Unknown Speaker', teamMembers);
      expect(match).toBeNull();
    });

    test('should match multiple speakers', async () => {
      const speakerNames = ['John Doe', 'Jane', 'Unknown', 'bob.wilson'];
      const matches = teamService.matchMultipleSpeakers(speakerNames, teamMembers);

      expect(matches.get('John Doe')?.userId).toBe('user-1');
      expect(matches.get('Jane')?.userId).toBe('user-2');
      expect(matches.get('Unknown')).toBeNull();
      expect(matches.get('bob.wilson')?.userId).toBe('user-3');
    });
  });

  describe('Team Permissions', () => {
    let teamId: string;

    beforeEach(async () => {
      teamId = await teamService.createTeam({
        name: 'Permission Team',
        description: 'Team for permission testing',
        createdBy: 'creator-user',
      });

      // Add a regular member
      await teamService.addTeamMember(teamId, {
        userId: 'regular-member',
        email: 'member@example.com',
        displayName: 'Regular Member',
        role: 'member',
        status: 'active',
      });

      // Add an admin member
      await teamService.addTeamMember(teamId, {
        userId: 'admin-member',
        email: 'admin@example.com',
        displayName: 'Admin Member',
        role: 'admin',
        status: 'active',
      });
    });

    test('should identify team creator as admin', async () => {
      const isAdmin = await teamService.isTeamAdmin(teamId, 'creator-user');
      expect(isAdmin).toBe(true);
    });

    test('should identify admin member as admin', async () => {
      const isAdmin = await teamService.isTeamAdmin(teamId, 'admin-member');
      expect(isAdmin).toBe(true);
    });

    test('should not identify regular member as admin', async () => {
      const isAdmin = await teamService.isTeamAdmin(teamId, 'regular-member');
      expect(isAdmin).toBe(false);
    });

    test('should not identify non-member as admin', async () => {
      const isAdmin = await teamService.isTeamAdmin(teamId, 'non-member');
      expect(isAdmin).toBe(false);
    });

    test('should allow admin to manage team', async () => {
      const canManage = await teamService.canManageTeam(teamId, 'creator-user');
      expect(canManage).toBe(true);
    });

    test('should not allow regular member to manage team', async () => {
      const canManage = await teamService.canManageTeam(teamId, 'regular-member');
      expect(canManage).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle team not found errors', async () => {
      await expect(teamService.getTeam('non-existent-team')).resolves.toBeNull();
    });

    test('should handle invalid invitation data', async () => {
      await expect(
        teamService.acceptTeamInvitation('invalid-invitation', 'user-1')
      ).rejects.toThrow('Invitation not found');
    });

    test('should handle permission errors', async () => {
      const teamId = await teamService.createTeam({
        name: 'Test Team',
        description: 'Test',
        createdBy: 'owner',
      });

      await expect(
        teamService.inviteUserToTeam(teamId, 'non-admin', 'test@example.com', 'Test User')
      ).rejects.toThrow('You do not have permission to invite users to this team');
    });
  });
});