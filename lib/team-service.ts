// Team management service for handling team operations, invitations, and speaker matching

import { 
  Team, 
  TeamMember, 
  User, 
  CreateTeamData, 
  TeamInvitationData, 
  CreateNotificationData,
  Notification
} from './types';
import { DatabaseService } from './database';

export interface TeamService {
  // Team CRUD operations
  createTeam(teamData: CreateTeamData): Promise<string>;
  getTeam(teamId: string): Promise<Team | null>;
  getUserTeams(userId: string): Promise<Team[]>;
  updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean>;
  deleteTeam(teamId: string, userId: string): Promise<boolean>;
  
  // User search functionality
  searchUserByEmail(email: string): Promise<User | null>;
  
  // Team invitation system
  inviteUserToTeam(teamId: string, inviterUserId: string, email: string, displayName: string): Promise<void>;
  acceptTeamInvitation(invitationId: string, userId: string): Promise<void>;
  declineTeamInvitation(invitationId: string, userId: string): Promise<void>;
  
  // Team member management
  addTeamMember(teamId: string, member: Omit<TeamMember, 'joinedAt'>): Promise<boolean>;
  removeTeamMember(teamId: string, userId: string, removedBy: string): Promise<boolean>;
  updateTeamMemberRole(teamId: string, userId: string, role: TeamMember['role'], updatedBy: string): Promise<boolean>;
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  
  // Speaker-to-team-member matching
  matchSpeakerToTeamMember(speakerName: string, teamMembers: TeamMember[]): TeamMember | null;
  matchMultipleSpeakers(speakerNames: string[], teamMembers: TeamMember[]): Map<string, TeamMember | null>;
  
  // Team permissions
  isTeamAdmin(teamId: string, userId: string): Promise<boolean>;
  canManageTeam(teamId: string, userId: string): Promise<boolean>;
}

export class TeamManagementService implements TeamService {
  constructor(private databaseService: DatabaseService) {}

  // ===== TEAM CRUD OPERATIONS =====

  async createTeam(teamData: CreateTeamData): Promise<string> {
    try {
      const teamId = await this.databaseService.createTeam(teamData);
      return teamId;
    } catch (error) {
      throw new Error(`Failed to create team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTeam(teamId: string): Promise<Team | null> {
    try {
      return await this.databaseService.getTeamById(teamId);
    } catch (error) {
      throw new Error(`Failed to get team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    try {
      return await this.databaseService.getUserTeams(userId);
    } catch (error) {
      throw new Error(`Failed to get user teams: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean> {
    try {
      return await this.databaseService.updateTeam(teamId, updates);
    } catch (error) {
      throw new Error(`Failed to update team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    try {
      return await this.databaseService.deleteTeam(teamId, userId);
    } catch (error) {
      throw new Error(`Failed to delete team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== USER SEARCH FUNCTIONALITY =====

  async searchUserByEmail(email: string): Promise<User | null> {
    try {
      if (!email || !this.isValidEmail(email)) {
        return null;
      }

      return await this.databaseService.searchUserByEmail(email.toLowerCase().trim());
    } catch (error) {
      console.error('User search error:', error);
      return null;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ===== TEAM INVITATION SYSTEM =====

  async inviteUserToTeam(
    teamId: string, 
    inviterUserId: string, 
    email: string, 
    displayName: string
  ): Promise<void> {
    try {
      // Get team information
      const team = await this.getTeam(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check if inviter has permission to invite
      const canInvite = await this.canManageTeam(teamId, inviterUserId);
      if (!canInvite) {
        throw new Error('You do not have permission to invite users to this team');
      }

      // Check if user is already a team member
      const existingMember = team.members.find(member => 
        member.email.toLowerCase() === email.toLowerCase()
      );
      if (existingMember) {
        throw new Error('User is already a team member');
      }

      // Search for the user
      const user = await this.searchUserByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      // Get inviter information
      const inviterMember = team.members.find(member => member.userId === inviterUserId);
      const inviterName = inviterMember?.displayName || 'Team Admin';

      // Create invitation notification
      const invitationData: CreateNotificationData = {
        userId: user.uid,
        type: 'team_invitation',
        title: `Team Invitation: ${team.name}`,
        message: `${inviterName} has invited you to join the team "${team.name}"`,
        data: {
          teamId: team.id,
          teamName: team.name,
          inviterId: inviterUserId,
          inviterName: inviterName,
        }
      };

      await this.databaseService.createNotification(invitationData);

      // Add user as invited member
      const newMember: Omit<TeamMember, 'joinedAt'> = {
        userId: user.uid,
        email: email.toLowerCase(),
        displayName: displayName || user.displayName || email.split('@')[0],
        role: 'member',
        status: 'invited'
      };

      await this.addTeamMember(teamId, newMember);

    } catch (error) {
      throw new Error(`Failed to invite user to team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async acceptTeamInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      // Get the notification
      const notifications = await this.databaseService.getUserNotifications(userId);
      const invitation = notifications.find(n => n.id === invitationId && n.type === 'team_invitation');
      
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      const teamId = invitation.data.teamId;
      if (!teamId) {
        throw new Error('Invalid invitation data');
      }

      // Update team member status to active
      await this.databaseService.updateTeamMember(teamId, userId, { status: 'active' });

      // Mark notification as read and delete it
      await this.databaseService.markNotificationAsRead(invitationId);
      await this.databaseService.deleteNotification(invitationId);

    } catch (error) {
      throw new Error(`Failed to accept team invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async declineTeamInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      // Get the notification
      const notifications = await this.databaseService.getUserNotifications(userId);
      const invitation = notifications.find(n => n.id === invitationId && n.type === 'team_invitation');
      
      if (!invitation) {
        throw new Error('Invitation not found');
      }

      const teamId = invitation.data.teamId;
      if (!teamId) {
        throw new Error('Invalid invitation data');
      }

      // Remove user from team members
      await this.removeTeamMember(teamId, userId, userId);

      // Delete the notification
      await this.databaseService.deleteNotification(invitationId);

    } catch (error) {
      throw new Error(`Failed to decline team invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== TEAM MEMBER MANAGEMENT =====

  async addTeamMember(teamId: string, member: Omit<TeamMember, 'joinedAt'>): Promise<boolean> {
    try {
      return await this.databaseService.addTeamMember(teamId, member);
    } catch (error) {
      throw new Error(`Failed to add team member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async removeTeamMember(teamId: string, userId: string, removedBy: string): Promise<boolean> {
    try {
      // Check permissions - user can remove themselves, or admins can remove others
      if (userId !== removedBy) {
        const canRemove = await this.canManageTeam(teamId, removedBy);
        if (!canRemove) {
          throw new Error('You do not have permission to remove team members');
        }
      }

      return await this.databaseService.removeTeamMember(teamId, userId);
    } catch (error) {
      throw new Error(`Failed to remove team member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateTeamMemberRole(
    teamId: string, 
    userId: string, 
    role: TeamMember['role'], 
    updatedBy: string
  ): Promise<boolean> {
    try {
      // Check permissions - only admins can change roles
      const canUpdate = await this.isTeamAdmin(teamId, updatedBy);
      if (!canUpdate) {
        throw new Error('Only team admins can change member roles');
      }

      return await this.databaseService.updateTeamMember(teamId, userId, { role });
    } catch (error) {
      throw new Error(`Failed to update team member role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      return await this.databaseService.getTeamMembers(teamId);
    } catch (error) {
      throw new Error(`Failed to get team members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== SPEAKER-TO-TEAM-MEMBER MATCHING =====

  matchSpeakerToTeamMember(speakerName: string, teamMembers: TeamMember[]): TeamMember | null {
    if (!speakerName || !teamMembers.length) {
      return null;
    }

    const normalizedSpeaker = this.normalizeName(speakerName);
    
    // Try exact match first
    for (const member of teamMembers) {
      if (this.normalizeName(member.displayName) === normalizedSpeaker) {
        return member;
      }
    }

    // Try partial matches
    for (const member of teamMembers) {
      const normalizedMemberName = this.normalizeName(member.displayName);
      
      // Check if speaker name contains member name or vice versa
      if (normalizedSpeaker.includes(normalizedMemberName) || 
          normalizedMemberName.includes(normalizedSpeaker)) {
        return member;
      }

      // Check first name match
      const speakerFirstName = normalizedSpeaker.split(' ')[0];
      const memberFirstName = normalizedMemberName.split(' ')[0];
      if (speakerFirstName === memberFirstName && speakerFirstName.length > 2) {
        return member;
      }
    }

    // Try fuzzy matching with email prefix
    for (const member of teamMembers) {
      const emailPrefix = member.email.split('@')[0].toLowerCase().replace(/[^\w]/g, '');
      const normalizedEmailPrefix = emailPrefix.replace(/[^\w]/g, '');
      if (normalizedSpeaker.includes(normalizedEmailPrefix) || normalizedEmailPrefix.includes(normalizedSpeaker)) {
        return member;
      }
    }

    return null;
  }

  matchMultipleSpeakers(speakerNames: string[], teamMembers: TeamMember[]): Map<string, TeamMember | null> {
    const matches = new Map<string, TeamMember | null>();
    
    for (const speakerName of speakerNames) {
      const match = this.matchSpeakerToTeamMember(speakerName, teamMembers);
      matches.set(speakerName, match);
    }

    return matches;
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/[^\w\s]/g, '');
  }

  // ===== TEAM PERMISSIONS =====

  async isTeamAdmin(teamId: string, userId: string): Promise<boolean> {
    try {
      const team = await this.getTeam(teamId);
      if (!team) {
        return false;
      }

      // Team creator is always admin
      if (team.createdBy === userId) {
        return true;
      }

      // Check if user has admin role
      const member = team.members.find(m => m.userId === userId);
      return member?.role === 'admin' && member.status === 'active';
    } catch (error) {
      console.error('Error checking team admin status:', error);
      return false;
    }
  }

  async canManageTeam(teamId: string, userId: string): Promise<boolean> {
    try {
      return await this.isTeamAdmin(teamId, userId);
    } catch (error) {
      console.error('Error checking team management permissions:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
let teamServiceInstance: TeamManagementService | null = null;

export function getTeamService(databaseService: DatabaseService): TeamManagementService {
  if (!teamServiceInstance) {
    teamServiceInstance = new TeamManagementService(databaseService);
  }
  return teamServiceInstance;
}

// TeamManagementService is already exported above