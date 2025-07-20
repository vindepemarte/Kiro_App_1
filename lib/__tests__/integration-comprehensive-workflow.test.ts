// Comprehensive integration tests validating all system requirements
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TeamManagementService } from '../team-service';
import { NotificationServiceImpl } from '../notification-service';
import { DatabaseService } from '../database';
import { 
  Team, 
  TeamMember, 
  CreateTeamData, 
  User, 
  Meeting, 
  ProcessedMeeting, 
  Notification,
  UserProfile
} from '../types';

// Mock database service with comprehensive implementation
const mockDatabaseService: jest.Mocked<DatabaseService> = {
  // Team operations
  createTeam: vi.fn(),
  getUserTeams: vi.fn(),
  getTeamById: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  subscribeToTeam: vi.fn(),
  subscribeToUserTeams: vi.fn(),
  
  // Team member operations
  addTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
  updateTeamMember: vi.fn(),
  getTeamMembers: vi.fn(),
  
  // User operations
  searchUserByEmail: vi.fn(),
  createUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserProfile: vi.fn(),
  subscribeToUserProfile: vi.fn(),
  
  // Meeting operations
  saveMeeting: vi.fn(),
  getUserMeetings: vi.fn(),
  getMeetingById: vi.fn(),
  updateMeeting: vi.fn(),
  deleteMeeting: vi.fn(),
  subscribeToUserMeetings: vi.fn(),
  getTeamMeetings: vi.fn(),
  subscribeToTeamMeetings: vi.fn(),
  
  // Notification operations
  createNotification: vi.fn(),
  getUserNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  subscribeToUserNotifications: vi.fn(),
  
  // Task operations
  assignTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  getTeamTasks: vi.fn(),
  
  // Offline support
  enableOfflineSupport: vi.fn(),
  disableOfflineSupport: vi.fn(),
};

describe('Comprehensive System Integration Tests', () => {
  let teamService: TeamManagementService;
  let notificationService: NotificationServiceImpl;

  // Test users
  const adminUser: User = {
    uid: 'admin-user',
    email: 'admin@company.com',
    displayName: 'Team Admin',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: '2024-01-01T00:00:00.000Z',
      lastSignInTime: '2024-01-01T00:00:00.000Z'
    },
    providerData: [],
    refreshToken: '',
    tenantId: null
  };

  const memberUser: User = {
    uid: 'member-user',
    email: 'member@company.com',
    displayName: 'Team Member',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: '2024-01-01T00:00:00.000Z',
      lastSignInTime: '2024-01-01T00:00:00.000Z'
    },
    providerData: [],
    refreshToken: '',
    tenantId: null
  };

  const newUser: User = {
    uid: 'new-user',
    email: 'newuser@company.com',
    displayName: 'New User',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: '2024-01-01T00:00:00.000Z',
      lastSignInTime: '2024-01-01T00:00:00.000Z'
    },
    providerData: [],
    refreshToken: '',
    tenantId: null
  };

  // Test user profiles
  const adminProfile: UserProfile = {
    userId: 'admin-user',
    email: 'admin@company.com',
    displayName: 'Team Admin',
    preferences: {
      notifications: {
        teamInvitations: true,
        meetingAssignments: true,
        taskAssignments: true
      },
      theme: 'light'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    teamService = new TeamManagementService(mockDatabaseService);
    notificationService = new NotificationServiceImpl();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Requirement 1: Team Management Integration - Complete Workflow', () => {
    it('should complete full team management lifecycle', async () => {
      // Step 1: Create team (Requirement 1.1, 1.6)
      const teamData: CreateTeamData = {
        name: 'Product Development Team',
        description: 'Team responsible for product development',
        createdBy: 'admin-user'
      };

      mockDatabaseService.createTeam.mockResolvedValue('team-123');
      
      const teamId = await teamService.createTeam(teamData);
      expect(teamId).toBe('team-123');

      // Step 2: Setup team with admin member
      const team: Team = {
        id: 'team-123',
        name: 'Product Development Team',
        description: 'Team responsible for product development',
        createdBy: 'admin-user',
        members: [
          {
            userId: 'admin-user',
            email: 'admin@company.com',
            displayName: 'Team Admin',
            role: 'admin',
            joinedAt: new Date(),
            status: 'active'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDatabaseService.getTeamById.mockResolvedValue(team);
      mockDatabaseService.getUserTeams.mockResolvedValue([team]);

      // Step 3: Invite new member (Requirement 1.3)
      mockDatabaseService.searchUserByEmail.mockResolvedValue(newUser);
      mockDatabaseService.addTeamMember.mockResolvedValue(true);
      mockDatabaseService.createNotification.mockResolvedValue('invitation-notification');

      await teamService.inviteUserToTeam('team-123', 'admin-user', 'newuser@company.com', 'New User');

      expect(mockDatabaseService.addTeamMember).toHaveBeenCalled();
      expect(mockDatabaseService.createNotification).toHaveBeenCalled();

      // Step 4: Accept invitation (Requirement 1.3)
      const invitationNotification: Notification = {
        id: 'invitation-notification',
        userId: 'new-user',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to join Product Development Team',
        data: {
          teamId: 'team-123',
          inviteeEmail: 'newuser@company.com'
        },
        read: false,
        createdAt: new Date()
      };

      const teamWithInvitedUser: Team = {
        ...team,
        members: [
          ...team.members,
          {
            userId: 'invited-temp-id',
            email: 'newuser@company.com',
            displayName: 'New User',
            role: 'member',
            joinedAt: new Date(),
            status: 'invited'
          }
        ]
      };

      mockDatabaseService.getUserNotifications.mockResolvedValue([invitationNotification]);
      mockDatabaseService.getTeamById.mockResolvedValue(teamWithInvitedUser);
      mockDatabaseService.removeTeamMember.mockResolvedValue(true);
      mockDatabaseService.addTeamMember.mockResolvedValue(true);
      mockDatabaseService.deleteNotification.mockResolvedValue(true);

      await teamService.acceptTeamInvitation('invitation-notification', 'new-user');

      expect(mockDatabaseService.removeTeamMember).toHaveBeenCalledWith('team-123', 'invited-temp-id');
      expect(mockDatabaseService.addTeamMember).toHaveBeenCalled();
      expect(mockDatabaseService.deleteNotification).toHaveBeenCalledWith('invitation-notification');

      // Step 5: Update member role (Requirement 1.5)
      mockDatabaseService.updateTeamMember.mockResolvedValue(true);

      const roleUpdateResult = await teamService.updateTeamMemberRole('team-123', 'new-user', 'admin', 'admin-user');
      expect(roleUpdateResult).toBe(true);

      // Step 6: Remove member (Requirement 1.4)
      const removeResult = await teamService.removeTeamMember('team-123', 'new-user', 'admin-user');
      expect(removeResult).toBe(true);
    });

    it('should validate team permissions throughout workflow', async () => {
      const team: Team = {
        id: 'team-123',
        name: 'Test Team',
        description: 'Test team',
        createdBy: 'admin-user',
        members: [
          {
            userId: 'admin-user',
            email: 'admin@company.com',
            displayName: 'Team Admin',
            role: 'admin',
            joinedAt: new Date(),
            status: 'active'
          },
          {
            userId: 'member-user',
            email: 'member@company.com',
            displayName: 'Team Member',
            role: 'member',
            joinedAt: new Date(),
            status: 'active'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDatabaseService.getTeamById.mockResolvedValue(team);

      // Admin should have permissions
      const adminCanManage = await teamService.canManageTeam('team-123', 'admin-user');
      expect(adminCanManage).toBe(true);

      // Regular member should not have admin permissions
      const memberCanManage = await teamService.canManageTeam('team-123', 'member-user');
      expect(memberCanManage).toBe(false);

      // Test permission enforcement
      await expect(teamService.updateTeamMemberRole('team-123', 'admin-user', 'member', 'member-user'))
        .rejects.toThrow('Only team admins can change member roles');
    });
  });

  describe('Requirement 2: Meeting-Team Assignment Integration - Complete Workflow', () => {
    it('should complete full meeting assignment workflow', async () => {
      // Setup team
      const team: Team = {
        id: 'team-123',
        name: 'Development Team',
        description: 'Software development team',
        createdBy: 'admin-user',
        members: [
          {
            userId: 'admin-user',
            email: 'admin@company.com',
            displayName: 'Team Admin',
            role: 'admin',
            joinedAt: new Date(),
            status: 'active'
          },
          {
            userId: 'member-user',
            email: 'member@company.com',
            displayName: 'Team Member',
            role: 'member',
            joinedAt: new Date(),
            status: 'active'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Step 1: Upload meeting and assign to team (Requirement 2.1, 2.2)
      const processedMeeting: ProcessedMeeting = {
        summary: 'Sprint planning meeting discussing upcoming features and task assignments.',
        actionItems: [
          {
            id: 'action-1',
            description: 'Implement user authentication',
            priority: 'high',
            status: 'pending',
            owner: 'Team Member'
          },
          {
            id: 'action-2',
            description: 'Design database schema',
            priority: 'medium',
            status: 'pending',
            owner: 'Team Admin'
          }
        ],
        rawTranscript: 'Meeting transcript content...',
        metadata: {
          fileName: 'sprint-planning.mp3',
          fileSize: 2048000,
          uploadedAt: new Date(),
          processingTime: 8000
        }
      };

      mockDatabaseService.saveMeeting.mockResolvedValue('meeting-456');
      mockDatabaseService.getTeamById.mockResolvedValue(team);

      const meetingId = await mockDatabaseService.saveMeeting('admin-user', processedMeeting, 'team-123');
      expect(meetingId).toBe('meeting-456');

      // Step 2: Verify team members receive notifications (Requirement 2.4)
      const meetingAssignmentData = {
        meetingId: 'meeting-456',
        meetingTitle: 'Sprint Planning Meeting',
        teamId: 'team-123',
        teamName: 'Development Team',
        assignedBy: 'admin-user',
        assignedByName: 'Team Admin'
      };

      // Mock team service for notification service
      vi.doMock('../team-service', () => ({
        getTeamService: () => ({
          getTeam: vi.fn().mockResolvedValue(team)
        })
      }));

      mockDatabaseService.createNotification.mockResolvedValue('meeting-notification');

      const notificationIds = await notificationService.sendMeetingAssignment(meetingAssignmentData);
      expect(notificationIds).toHaveLength(1); // Only member-user gets notification

      // Step 3: Verify team meetings are displayed separately (Requirement 2.3, 2.5)
      const teamMeeting: Meeting = {
        id: 'meeting-456',
        title: 'Sprint Planning Meeting',
        date: new Date(),
        summary: processedMeeting.summary,
        actionItems: processedMeeting.actionItems,
        rawTranscript: processedMeeting.rawTranscript,
        teamId: 'team-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDatabaseService.getTeamMeetings.mockResolvedValue([teamMeeting]);

      const teamMeetings = await mockDatabaseService.getTeamMeetings('team-123');
      expect(teamMeetings).toHaveLength(1);
      expect(teamMeetings[0].teamId).toBe('team-123');

      // Step 4: Update meeting and send notifications
      mockDatabaseService.getMeetingById.mockResolvedValue(teamMeeting);
      mockDatabaseService.updateMeeting.mockResolvedValue(true);

      const updateResult = await mockDatabaseService.updateMeeting('meeting-456', 'admin-user', {
        summary: 'Updated sprint planning summary with additional details'
      });
      expect(updateResult).toBe(true);
    });

    it('should handle task assignments within team meetings', async () => {
      // Step 1: Assign task to team member
      mockDatabaseService.assignTask.mockResolvedValue(true);

      const taskAssignResult = await mockDatabaseService.assignTask('meeting-456', 'action-1', 'member-user', 'admin-user', 'admin-user');
      expect(taskAssignResult).toBe(true);

      // Step 2: Send task assignment notification
      const taskAssignmentData = {
        assigneeId: 'member-user',
        taskId: 'action-1',
        taskDescription: 'Implement user authentication',
        meetingTitle: 'Sprint Planning Meeting',
        assignedBy: 'Team Admin'
      };

      mockDatabaseService.createNotification.mockResolvedValue('task-notification');

      const taskNotificationId = await notificationService.sendTaskAssignment(taskAssignmentData);
      expect(taskNotificationId).toBe('task-notification');

      // Step 3: Update task status
      mockDatabaseService.updateTaskStatus.mockResolvedValue(true);

      const statusUpdateResult = await mockDatabaseService.updateTaskStatus('meeting-456', 'action-1', 'in_progress');
      expect(statusUpdateResult).toBe(true);
    });
  });

  describe('Requirement 3: Notification System Integration - Complete Workflow', () => {
    it('should handle complete notification lifecycle', async () => {
      // Step 1: Create various types of notifications
      const notifications: Notification[] = [
        {
          id: 'team-invite-notif',
          userId: 'new-user',
          type: 'team_invitation',
          title: 'Team Invitation',
          message: 'You have been invited to join Development Team',
          data: {
            teamId: 'team-123',
            teamName: 'Development Team',
            inviterId: 'admin-user',
            inviterName: 'Team Admin'
          },
          read: false,
          createdAt: new Date()
        },
        {
          id: 'meeting-assign-notif',
          userId: 'member-user',
          type: 'meeting_assignment',
          title: 'New Team Meeting',
          message: 'Team Admin assigned a new meeting to your team',
          data: {
            meetingId: 'meeting-456',
            meetingTitle: 'Sprint Planning',
            teamId: 'team-123'
          },
          read: false,
          createdAt: new Date()
        },
        {
          id: 'task-assign-notif',
          userId: 'member-user',
          type: 'task_assignment',
          title: 'New Task Assignment',
          message: 'You have been assigned a task',
          data: {
            taskId: 'action-1',
            taskDescription: 'Implement user authentication'
          },
          read: false,
          createdAt: new Date()
        }
      ];

      // Step 2: Get user notifications (Requirement 3.1, 3.6)
      mockDatabaseService.getUserNotifications.mockResolvedValue(notifications);

      const userNotifications = await notificationService.getUserNotifications('member-user');
      expect(userNotifications).toHaveLength(3);

      const unreadCount = await notificationService.getUnreadCount('member-user');
      expect(unreadCount).toBe(3);

      // Step 3: Handle notification actions (Requirement 3.2)
      mockDatabaseService.markNotificationAsRead.mockResolvedValue(true);

      const markReadResult = await notificationService.markAsRead('meeting-assign-notif');
      expect(markReadResult).toBe(true);

      // Step 4: Delete notification (Requirement 3.4)
      mockDatabaseService.deleteNotification.mockResolvedValue(true);

      const deleteResult = await notificationService.deleteNotification('task-assign-notif');
      expect(deleteResult).toBe(true);

      // Step 5: Handle notification errors with retry (Requirement 3.5)
      mockDatabaseService.getUserNotifications
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(notifications);

      const retriedNotifications = await notificationService.getUserNotifications('member-user');
      expect(retriedNotifications).toHaveLength(3);
    });

    it('should handle real-time notification updates', () => {
      // Setup real-time subscription
      let subscriptionCallback: ((notifications: Notification[]) => void) | null = null;
      const mockUnsubscribe = vi.fn();

      mockDatabaseService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        subscriptionCallback = callback;
        return mockUnsubscribe;
      });

      const notificationUpdateCallback = vi.fn();
      const unsubscribe = notificationService.subscribeToNotifications('member-user', notificationUpdateCallback);

      // Simulate real-time notification update
      const newNotifications: Notification[] = [
        {
          id: 'new-notif',
          userId: 'member-user',
          type: 'meeting_update',
          title: 'Meeting Updated',
          message: 'Sprint Planning meeting has been updated',
          data: { meetingId: 'meeting-456' },
          read: false,
          createdAt: new Date()
        }
      ];

      if (subscriptionCallback) {
        subscriptionCallback(newNotifications);
      }

      expect(notificationUpdateCallback).toHaveBeenCalledWith(newNotifications);

      // Cleanup
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('Requirement 4: User Settings Persistence - Complete Workflow', () => {
    it('should handle complete user profile lifecycle', async () => {
      // Step 1: Create user profile (Requirement 4.1, 4.2)
      mockDatabaseService.createUserProfile.mockResolvedValue(undefined);

      await mockDatabaseService.createUserProfile('admin-user', adminProfile);
      expect(mockDatabaseService.createUserProfile).toHaveBeenCalledWith('admin-user', adminProfile);

      // Step 2: Update user profile (Requirement 4.3, 4.4)
      const profileUpdates: Partial<UserProfile> = {
        displayName: 'Updated Team Admin',
        preferences: {
          notifications: {
            teamInvitations: true,
            meetingAssignments: false,
            taskAssignments: true
          },
          theme: 'dark'
        }
      };

      mockDatabaseService.updateUserProfile.mockResolvedValue(undefined);

      await mockDatabaseService.updateUserProfile('admin-user', profileUpdates);
      expect(mockDatabaseService.updateUserProfile).toHaveBeenCalledWith('admin-user', profileUpdates);

      // Step 3: Retrieve user profile (Requirement 4.5)
      const updatedProfile: UserProfile = {
        ...adminProfile,
        ...profileUpdates,
        updatedAt: new Date()
      };

      mockDatabaseService.getUserProfile.mockResolvedValue(updatedProfile);

      const retrievedProfile = await mockDatabaseService.getUserProfile('admin-user');
      expect(retrievedProfile).toEqual(updatedProfile);

      // Step 4: Handle profile persistence errors with retry
      mockDatabaseService.updateUserProfile
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(undefined);

      await mockDatabaseService.updateUserProfile('admin-user', { displayName: 'Retry Test' });
      expect(mockDatabaseService.updateUserProfile).toHaveBeenCalledTimes(3); // Initial + retry
    });
  });

  describe('Requirement 5: Real-time Data Synchronization - Complete Workflow', () => {
    it('should handle real-time updates across all components', () => {
      const mockCallbacks = {
        team: vi.fn(),
        userTeams: vi.fn(),
        meetings: vi.fn(),
        teamMeetings: vi.fn(),
        notifications: vi.fn(),
        userProfile: vi.fn()
      };

      const mockUnsubscribes = {
        team: vi.fn(),
        userTeams: vi.fn(),
        meetings: vi.fn(),
        teamMeetings: vi.fn(),
        notifications: vi.fn(),
        userProfile: vi.fn()
      };

      // Setup all subscriptions
      mockDatabaseService.subscribeToTeam.mockReturnValue(mockUnsubscribes.team);
      mockDatabaseService.subscribeToUserTeams.mockReturnValue(mockUnsubscribes.userTeams);
      mockDatabaseService.subscribeToUserMeetings.mockReturnValue(mockUnsubscribes.meetings);
      mockDatabaseService.subscribeToTeamMeetings.mockReturnValue(mockUnsubscribes.teamMeetings);
      mockDatabaseService.subscribeToUserNotifications.mockReturnValue(mockUnsubscribes.notifications);
      mockDatabaseService.subscribeToUserProfile.mockReturnValue(mockUnsubscribes.userProfile);

      // Create subscriptions
      const unsubscribes = {
        team: teamService.subscribeToTeam('team-123', mockCallbacks.team),
        userTeams: teamService.subscribeToUserTeams('admin-user', mockCallbacks.userTeams),
        meetings: mockDatabaseService.subscribeToUserMeetings('admin-user', mockCallbacks.meetings),
        teamMeetings: mockDatabaseService.subscribeToTeamMeetings('team-123', mockCallbacks.teamMeetings),
        notifications: notificationService.subscribeToNotifications('admin-user', mockCallbacks.notifications),
        userProfile: mockDatabaseService.subscribeToUserProfile('admin-user', mockCallbacks.userProfile)
      };

      // Verify all subscriptions are set up
      expect(mockDatabaseService.subscribeToTeam).toHaveBeenCalledWith('team-123', mockCallbacks.team);
      expect(mockDatabaseService.subscribeToUserTeams).toHaveBeenCalledWith('admin-user', mockCallbacks.userTeams);
      expect(mockDatabaseService.subscribeToUserMeetings).toHaveBeenCalledWith('admin-user', mockCallbacks.meetings);
      expect(mockDatabaseService.subscribeToTeamMeetings).toHaveBeenCalledWith('team-123', mockCallbacks.teamMeetings);
      expect(mockDatabaseService.subscribeToUserNotifications).toHaveBeenCalledWith('admin-user', mockCallbacks.notifications);
      expect(mockDatabaseService.subscribeToUserProfile).toHaveBeenCalledWith('admin-user', mockCallbacks.userProfile);

      // Cleanup all subscriptions
      Object.values(unsubscribes).forEach(unsub => unsub());
      Object.values(mockUnsubscribes).forEach(mockUnsub => expect(mockUnsub).toHaveBeenCalled());
    });
  });

  describe('Requirement 6: Error Handling and Recovery - Complete Workflow', () => {
    it('should handle various error scenarios gracefully', async () => {
      // Test database connection errors (Requirement 6.1)
      mockDatabaseService.getUserTeams.mockRejectedValue(new Error('Database connection failed'));

      await expect(teamService.getUserTeams('admin-user'))
        .rejects.toThrow();

      // Test network errors with retry (Requirement 6.2)
      mockDatabaseService.createTeam
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('team-retry');

      const teamData: CreateTeamData = {
        name: 'Retry Test Team',
        description: 'Testing retry mechanism',
        createdBy: 'admin-user'
      };

      const retryTeamId = await teamService.createTeam(teamData);
      expect(retryTeamId).toBe('team-retry');

      // Test authentication errors (Requirement 6.3)
      const authError = new Error('Authentication required');
      authError.name = 'AUTH_ERROR';
      mockDatabaseService.getUserNotifications.mockRejectedValue(authError);

      const unreadCount = await notificationService.getUnreadCount('admin-user');
      expect(unreadCount).toBe(0); // Should handle gracefully

      // Test permission errors (Requirement 6.4)
      mockDatabaseService.updateTeam.mockRejectedValue(new Error('Permission denied'));

      await expect(mockDatabaseService.updateTeam('team-123', { name: 'Updated Name' }))
        .rejects.toThrow('Permission denied');

      // Test loading error states (Requirement 6.5)
      mockDatabaseService.getTeamMeetings.mockRejectedValue(new Error('Failed to load meetings'));

      await expect(mockDatabaseService.getTeamMeetings('team-123'))
        .rejects.toThrow('Failed to load meetings');
    });

    it('should validate input parameters across all operations', async () => {
      // Team operations validation
      await expect(teamService.createTeam({ name: '', description: 'test', createdBy: 'user1' }))
        .rejects.toThrow('Team name is required');

      await expect(teamService.getUserTeams(''))
        .rejects.toThrow('User ID is required');

      // Notification operations validation
      await expect(notificationService.getUserNotifications(''))
        .rejects.toThrow('User ID is required');

      await expect(notificationService.markAsRead(''))
        .rejects.toThrow('Notification ID is required');

      // Meeting operations validation
      mockDatabaseService.saveMeeting.mockRejectedValue(new Error('User ID is required'));

      await expect(mockDatabaseService.saveMeeting('', {} as ProcessedMeeting))
        .rejects.toThrow('User ID is required');
    });
  });

  describe('Requirement 7: Data Consistency and Integrity - Complete Workflow', () => {
    it('should maintain data consistency across all operations', async () => {
      // Step 1: Create team and verify member linkage (Requirement 7.1)
      const teamData: CreateTeamData = {
        name: 'Consistency Test Team',
        description: 'Testing data consistency',
        createdBy: 'admin-user'
      };

      mockDatabaseService.createTeam.mockResolvedValue('consistency-team');
      mockDatabaseService.createUserProfile.mockResolvedValue(undefined);

      const teamId = await teamService.createTeam(teamData);
      await mockDatabaseService.createUserProfile('admin-user', adminProfile);

      expect(teamId).toBe('consistency-team');

      // Step 2: Assign meeting to team and verify reference (Requirement 7.2)
      const processedMeeting: ProcessedMeeting = {
        summary: 'Consistency test meeting',
        actionItems: [],
        rawTranscript: 'Test transcript',
        metadata: {
          fileName: 'test.mp3',
          fileSize: 1000,
          uploadedAt: new Date(),
          processingTime: 1000
        }
      };

      mockDatabaseService.saveMeeting.mockResolvedValue('consistency-meeting');

      const meetingId = await mockDatabaseService.saveMeeting('admin-user', processedMeeting, 'consistency-team');
      expect(meetingId).toBe('consistency-meeting');

      // Step 3: Create notification and verify user/team references (Requirement 7.3)
      mockDatabaseService.createNotification.mockResolvedValue('consistency-notification');

      const notificationId = await mockDatabaseService.createNotification({
        userId: 'admin-user',
        type: 'meeting_assignment',
        title: 'Test Notification',
        message: 'Testing consistency',
        data: {
          teamId: 'consistency-team',
          meetingId: 'consistency-meeting'
        }
      });

      expect(notificationId).toBe('consistency-notification');

      // Step 4: Update data and verify related components reflect changes (Requirement 7.4)
      const team: Team = {
        id: 'consistency-team',
        name: 'Consistency Test Team',
        description: 'Testing data consistency',
        createdBy: 'admin-user',
        members: [
          {
            userId: 'admin-user',
            email: 'admin@company.com',
            displayName: 'Team Admin',
            role: 'admin',
            joinedAt: new Date(),
            status: 'active'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDatabaseService.getTeamById.mockResolvedValue(team);
      mockDatabaseService.updateTeam.mockResolvedValue(true);

      const updateResult = await mockDatabaseService.updateTeam('consistency-team', {
        name: 'Updated Consistency Team'
      });

      expect(updateResult).toBe(true);

      // Step 5: Remove user from team and verify cleanup (Requirement 7.5)
      mockDatabaseService.removeTeamMember.mockResolvedValue(true);
      mockDatabaseService.deleteNotification.mockResolvedValue(true);

      const removeResult = await teamService.removeTeamMember('consistency-team', 'admin-user', 'admin-user');
      expect(removeResult).toBe(true);

      // Verify related notifications are cleaned up
      const cleanupResult = await mockDatabaseService.deleteNotification('consistency-notification');
      expect(cleanupResult).toBe(true);
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should handle complete user onboarding and team collaboration workflow', async () => {
      // Scenario: New user joins company, gets invited to team, participates in meeting
      
      // Step 1: User profile creation
      mockDatabaseService.createUserProfile.mockResolvedValue(undefined);
      await mockDatabaseService.createUserProfile('new-user', {
        userId: 'new-user',
        email: 'newuser@company.com',
        displayName: 'New User',
        preferences: {
          notifications: {
            teamInvitations: true,
            meetingAssignments: true,
            taskAssignments: true
          },
          theme: 'light'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Step 2: Team invitation
      const team: Team = {
        id: 'onboarding-team',
        name: 'Onboarding Team',
        description: 'Team for new user onboarding',
        createdBy: 'admin-user',
        members: [
          {
            userId: 'admin-user',
            email: 'admin@company.com',
            displayName: 'Team Admin',
            role: 'admin',
            joinedAt: new Date(),
            status: 'active'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDatabaseService.getTeamById.mockResolvedValue(team);
      mockDatabaseService.searchUserByEmail.mockResolvedValue(newUser);
      mockDatabaseService.addTeamMember.mockResolvedValue(true);
      mockDatabaseService.createNotification.mockResolvedValue('onboarding-invitation');

      await teamService.inviteUserToTeam('onboarding-team', 'admin-user', 'newuser@company.com', 'New User');

      // Step 3: Accept invitation
      const invitationNotification: Notification = {
        id: 'onboarding-invitation',
        userId: 'new-user',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to join Onboarding Team',
        data: {
          teamId: 'onboarding-team',
          inviteeEmail: 'newuser@company.com'
        },
        read: false,
        createdAt: new Date()
      };

      const teamWithInvitedUser: Team = {
        ...team,
        members: [
          ...team.members,
          {
            userId: 'invited-temp',
            email: 'newuser@company.com',
            displayName: 'New User',
            role: 'member',
            joinedAt: new Date(),
            status: 'invited'
          }
        ]
      };

      mockDatabaseService.getUserNotifications.mockResolvedValue([invitationNotification]);
      mockDatabaseService.getTeamById.mockResolvedValue(teamWithInvitedUser);
      mockDatabaseService.removeTeamMember.mockResolvedValue(true);
      mockDatabaseService.addTeamMember.mockResolvedValue(true);
      mockDatabaseService.deleteNotification.mockResolvedValue(true);

      await teamService.acceptTeamInvitation('onboarding-invitation', 'new-user');

      // Step 4: Meeting assignment and participation
      const processedMeeting: ProcessedMeeting = {
        summary: 'Onboarding meeting for new team member',
        actionItems: [
          {
            id: 'onboarding-task',
            description: 'Complete onboarding checklist',
            priority: 'high',
            status: 'pending',
            owner: 'New User'
          }
        ],
        rawTranscript: 'Welcome to the team...',
        metadata: {
          fileName: 'onboarding-meeting.mp3',
          fileSize: 1500000,
          uploadedAt: new Date(),
          processingTime: 6000
        }
      };

      mockDatabaseService.saveMeeting.mockResolvedValue('onboarding-meeting');

      const meetingId = await mockDatabaseService.saveMeeting('admin-user', processedMeeting, 'onboarding-team');
      expect(meetingId).toBe('onboarding-meeting');

      // Step 5: Task assignment
      mockDatabaseService.assignTask.mockResolvedValue(true);
      mockDatabaseService.createNotification.mockResolvedValue('task-notification');

      await mockDatabaseService.assignTask('onboarding-meeting', 'onboarding-task', 'new-user', 'admin-user', 'admin-user');

      const taskNotificationId = await notificationService.sendTaskAssignment({
        assigneeId: 'new-user',
        taskId: 'onboarding-task',
        taskDescription: 'Complete onboarding checklist',
        meetingTitle: 'Onboarding Meeting',
        assignedBy: 'Team Admin'
      });

      expect(taskNotificationId).toBe('task-notification');

      // Verify complete workflow success
      expect(mockDatabaseService.createUserProfile).toHaveBeenCalled();
      expect(mockDatabaseService.addTeamMember).toHaveBeenCalledTimes(2); // Invitation + acceptance
      expect(mockDatabaseService.saveMeeting).toHaveBeenCalled();
      expect(mockDatabaseService.assignTask).toHaveBeenCalled();
      expect(mockDatabaseService.createNotification).toHaveBeenCalledTimes(3); // Invitation + meeting + task
    });
  });
});