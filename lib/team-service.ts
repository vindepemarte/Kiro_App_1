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
import { ErrorHandler, AppError, retryOperation } from './error-handler';

export interface TeamService {
  // Team CRUD operations
  createTeam(teamData: CreateTeamData): Promise<string>;
  getTeam(teamId: string): Promise<Team | null>;
  getUserTeams(userId: string): Promise<Team[]>;
  updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean>;
  deleteTeam(teamId: string, userId: string): Promise<boolean>;
  
  // Real-time team subscriptions
  subscribeToTeam(teamId: string, callback: (team: Team | null) => void): () => void;
  subscribeToUserTeams(userId: string, callback: (teams: Team[]) => void): () => void;
  
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
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamData?.name?.trim()) {
          throw new AppError('Team name is required', 'VALIDATION_ERROR', false, 'Please provide a team name');
        }
        if (!teamData?.createdBy?.trim()) {
          throw new AppError('Creator ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

        const teamId = await this.databaseService.createTeam(teamData);
        return teamId;
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Create Team');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  async getTeam(teamId: string): Promise<Team | null> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Invalid team ID');
        }

        return await this.databaseService.getTeamById(teamId);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get Team');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

        return await this.databaseService.getUserTeams(userId);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get User Teams');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Invalid team ID');
        }
        if (!updates || Object.keys(updates).length === 0) {
          throw new AppError('Updates are required', 'VALIDATION_ERROR', false, 'No updates provided');
        }

        return await this.databaseService.updateTeam(teamId, updates);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Update Team');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Invalid team ID');
        }
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

        return await this.databaseService.deleteTeam(teamId, userId);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Delete Team');
      }
    }, {
      maxRetries: 1, // Only retry once for delete operations
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'PERMISSION_DENIED'].includes(appError.code);
      }
    });
  }

  // ===== REAL-TIME TEAM SUBSCRIPTIONS =====

  subscribeToTeam(teamId: string, callback: (team: Team | null) => void): () => void {
    try {
      // Use the database service's real-time subscription for individual teams
      return this.databaseService.subscribeToTeam(teamId, callback);
    } catch (error) {
      console.error('Failed to subscribe to team updates:', error);
      // Return a no-op cleanup function if subscription fails
      return () => {};
    }
  }

  subscribeToUserTeams(userId: string, callback: (teams: Team[]) => void): () => void {
    try {
      // Use the database service's real-time subscription for user teams
      return this.databaseService.subscribeToUserTeams(userId, callback);
    } catch (error) {
      console.error('Failed to subscribe to user teams updates:', error);
      // Return a no-op cleanup function if subscription fails
      return () => {};
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
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim() || !inviterUserId?.trim() || !email?.trim() || !displayName?.trim()) {
          throw new AppError('Missing required invitation parameters', 'VALIDATION_ERROR', false, 'All invitation parameters are required');
        }

        // Validate email format
        if (!this.isValidEmail(email)) {
          throw new AppError('Invalid email address format', 'VALIDATION_ERROR', false, 'Please provide a valid email address');
        }

        // Get team information
        const team = await this.getTeam(teamId);
        if (!team) {
          throw new AppError('Team not found', 'NOT_FOUND', false, 'The specified team could not be found');
        }

        // Check if inviter has permission to invite
        const canInvite = await this.canManageTeam(teamId, inviterUserId);
        if (!canInvite) {
          throw new AppError('Permission denied', 'PERMISSION_DENIED', false, 'You do not have permission to invite users to this team');
        }

        // Check if user is already a team member (including invited status)
        const existingMember = team.members.find(member => 
          member.email.toLowerCase() === email.toLowerCase()
        );
        if (existingMember) {
          if (existingMember.status === 'invited') {
            throw new AppError('User already invited', 'ALREADY_EXISTS', false, 'User has already been invited to this team');
          } else if (existingMember.status === 'active') {
            throw new AppError('User already member', 'ALREADY_EXISTS', false, 'User is already an active team member');
          }
        }

        // Search for the user in the system
        const user = await this.searchUserByEmail(email);
        
        // User must exist in the system to be invited
        if (!user) {
          throw new AppError('User not found', 'NOT_FOUND', false, 'The user must have an account before they can be invited to teams');
        }
        
        // Get inviter information for the notification
        const inviterMember = team.members.find(member => member.userId === inviterUserId);
        const inviterName = inviterMember?.displayName || 'Team Admin';

        // Use the real user ID consistently (no more temporary IDs)
        // Previously: const inviteeUserId = user?.uid || `invited-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const inviteeUserId = user.uid;

        // Add user as invited member first
        const newMember: Omit<TeamMember, 'joinedAt'> = {
          userId: inviteeUserId,
          email: email.toLowerCase(),
          displayName: displayName.trim(),
          role: 'member',
          status: 'invited'
        };

        await this.addTeamMember(teamId, newMember);

        // Create invitation notification with same user ID
        const invitationData: CreateNotificationData = {
          userId: inviteeUserId,
          type: 'team_invitation',
          title: `Team Invitation: ${team.name}`,
          message: `${inviterName} has invited you to join the team "${team.name}". Click to accept or decline this invitation.`,
          data: {
            teamId: team.id,
            teamName: team.name,
            inviterId: inviterUserId,
            inviterName: inviterName,
            inviteeEmail: email.toLowerCase(),
            inviteeDisplayName: displayName.trim()
          }
        };

        await this.databaseService.createNotification(invitationData);

        console.log(`Team invitation sent successfully: ${email} invited to ${team.name} by ${inviterName}`);

      } catch (error) {
        console.error('Failed to invite user to team:', error);
        throw new Error(`Failed to invite user to team: ${error.message}`);
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND', 'PERMISSION_DENIED', 'ALREADY_EXISTS'].includes(appError.code);
      }
    });
  }

  async acceptTeamInvitation(invitationId: string, userId: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!invitationId?.trim()) {
          throw new AppError('Invitation ID is required', 'VALIDATION_ERROR', false, 'Invalid invitation');
        }
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

        // Get the notification
        const notifications = await this.databaseService.getUserNotifications(userId);
        const invitation = notifications.find(n => n.id === invitationId && n.type === 'team_invitation');
        
        if (!invitation) {
          throw new AppError('Invitation not found', 'NOT_FOUND', false, 'Team invitation not found or already processed');
        }

        const { teamId, inviteeEmail } = invitation.data;
        if (!teamId) {
          throw new AppError('Invalid invitation data', 'VALIDATION_ERROR', false, 'Missing team information in invitation');
        }

        // Get the team to verify it still exists
        const team = await this.getTeam(teamId);
        if (!team) {
          throw new AppError('Team not found', 'NOT_FOUND', false, 'Team no longer exists');
        }

        // Find the invited member record
        const invitedMember = team.members.find(member => 
          member.status === 'invited' && 
          (member.userId === userId || member.email.toLowerCase() === inviteeEmail?.toLowerCase())
        );

        if (!invitedMember) {
          throw new AppError('Invitation record not found', 'NOT_FOUND', false, 'Invitation record not found in team members');
        }

        // Update the member record to active status and link to actual user
        const memberUpdates: Partial<TeamMember> = {
          status: 'active',
          userId: userId, // Link to the actual authenticated user
        };

        await this.databaseService.updateTeamMember(teamId, invitedMember.userId, memberUpdates);

        // If the invited member had a temporary ID, we need to remove the old record and add a new one
        if (invitedMember.userId !== userId && invitedMember.userId.startsWith('invited-')) {
          // Remove the temporary member record
          await this.databaseService.removeTeamMember(teamId, invitedMember.userId);
          
          // Add the user with their actual ID
          const activeMember: Omit<TeamMember, 'joinedAt'> = {
            userId: userId,
            email: invitedMember.email,
            displayName: invitedMember.displayName,
            role: invitedMember.role,
            status: 'active'
          };
          
          await this.addTeamMember(teamId, activeMember);
        }

        // Clean up the notification
        await this.databaseService.deleteNotification(invitationId);

        console.log(`Team invitation accepted: User ${userId} joined team ${team.name}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Accept Team Invitation');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  async declineTeamInvitation(invitationId: string, userId: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!invitationId?.trim()) {
          throw new AppError('Invitation ID is required', 'VALIDATION_ERROR', false, 'Invalid invitation');
        }
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

        // Get the notification
        const notifications = await this.databaseService.getUserNotifications(userId);
        const invitation = notifications.find(n => n.id === invitationId && n.type === 'team_invitation');
        
        if (!invitation) {
          throw new AppError('Invitation not found', 'NOT_FOUND', false, 'Team invitation not found or already processed');
        }

        const { teamId, inviteeEmail } = invitation.data;
        if (!teamId) {
          throw new AppError('Invalid invitation data', 'VALIDATION_ERROR', false, 'Missing team information in invitation');
        }

        // Get the team to verify it still exists
        const team = await this.getTeam(teamId);
        if (team) {
          // Find and remove the invited member record
          const invitedMember = team.members.find(member => 
            member.status === 'invited' && 
            (member.userId === userId || member.email.toLowerCase() === inviteeEmail?.toLowerCase())
          );

          if (invitedMember) {
            // Remove the invited member from the team
            await this.databaseService.removeTeamMember(teamId, invitedMember.userId);
            console.log(`Removed invited member ${invitedMember.email} from team ${team.name}`);
          }
        }

        // Delete the notification
        await this.databaseService.deleteNotification(invitationId);

        console.log(`Team invitation declined: User ${userId} declined invitation to team ${team?.name || teamId}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Decline Team Invitation');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // ===== TEAM MEMBER MANAGEMENT =====

  async addTeamMember(teamId: string, member: Omit<TeamMember, 'joinedAt'>): Promise<boolean> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Invalid team ID');
        }
        if (!member?.userId?.trim()) {
          throw new AppError('Member user ID is required', 'VALIDATION_ERROR', false, 'Invalid member information');
        }
        if (!member?.email?.trim()) {
          throw new AppError('Member email is required', 'VALIDATION_ERROR', false, 'Invalid member information');
        }

        return await this.databaseService.addTeamMember(teamId, member);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Add Team Member');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  async removeTeamMember(teamId: string, userId: string, removedBy: string): Promise<boolean> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Invalid team ID');
        }
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Invalid user ID');
        }
        if (!removedBy?.trim()) {
          throw new AppError('Removed by user ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

        // Check permissions - user can remove themselves, or admins can remove others
        if (userId !== removedBy) {
          const canRemove = await this.canManageTeam(teamId, removedBy);
          if (!canRemove) {
            throw new AppError('Permission denied', 'PERMISSION_DENIED', false, 'You do not have permission to remove team members');
          }
        }

        return await this.databaseService.removeTeamMember(teamId, userId);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Remove Team Member');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'PERMISSION_DENIED'].includes(appError.code);
      }
    });
  }

  async updateTeamMemberRole(
    teamId: string, 
    userId: string, 
    role: TeamMember['role'], 
    updatedBy: string
  ): Promise<boolean> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Invalid team ID');
        }
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Invalid user ID');
        }
        if (!role) {
          throw new AppError('Role is required', 'VALIDATION_ERROR', false, 'Please specify a role');
        }
        if (!updatedBy?.trim()) {
          throw new AppError('Updated by user ID is required', 'VALIDATION_ERROR', false, 'Please sign in and try again');
        }

        // Check permissions - only admins can change roles
        const canUpdate = await this.isTeamAdmin(teamId, updatedBy);
        if (!canUpdate) {
          throw new AppError('Permission denied', 'PERMISSION_DENIED', false, 'Only team admins can change member roles');
        }

        return await this.databaseService.updateTeamMember(teamId, userId, { role });
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Update Team Member Role');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'PERMISSION_DENIED'].includes(appError.code);
      }
    });
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Invalid team ID');
        }

        return await this.databaseService.getTeamMembers(teamId);
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get Team Members');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
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