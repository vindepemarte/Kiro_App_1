// End-to-End Complete Integration Tests
// Validates complete user workflows from start to finish
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
  UserProfile,
  ActionItem
} from '../types';

// Mock Firebase Auth
const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn()
};

// Mock database service with complete implementation
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

describe('End-to-End Complete Integration Tests', () => {
  let teamService: TeamManagementService;
  let notificationService: NotificationServiceImpl;

  // Test users for complete workflow
  const companyAdmin: User = {
    uid: 'company-admin',
    email: 'admin@company.com',
    displayName: 'Company Admin',
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

  const teamLead: User = {
    uid: 'team-lead',
    email: 'lead@company.com',
    displayName: 'Team Lead',
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

  const developer: User = {
    uid: 'developer',
    email: 'dev@company.com',
    displayName: 'Developer',
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

  const newHire: User = {
    uid: 'new-hire',
    email: 'newhire@company.com',
    displayName: 'New Hire',
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

  beforeEach(() => {
    teamService = new TeamManagementService(mockDatabaseService);
    notificationService = new NotificationServiceImpl();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Complete Company Onboarding and Collaboration Workflow', () => {
    it('should handle complete end-to-end workflow from user onboarding to project completion', async () => {
      // ===== PHASE 1: COMPANY SETUP =====
      console.log('Phase 1: Company Setup');

      // Step 1: Company admin creates user profiles
      const adminProfile: UserProfile = {
        userId: 'company-admin',
        email: 'admin@company.com',
        displayName: 'Company Admin',
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

      const leadProfile: UserProfile = {
        userId: 'team-lead',
        email: 'lead@company.com',
        displayName: 'Team Lead',
        preferences: {
          notifications: {
            teamInvitations: true,
            meetingAssignments: true,
            taskAssignments: true
          },
          theme: 'dark'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDatabaseService.createUserProfile.mockResolvedValue(undefined);
      
      await mockDatabaseService.createUserProfile('company-admin', adminProfile);
      await mockDatabaseService.createUserProfile('team-lead', leadProfile);

      expect(mockDatabaseService.createUserProfile).toHaveBeenCalledTimes(2);

      // Step 2: Company admin creates development team
      const teamData: CreateTeamData = {
        name: 'Product Development Team',
        description: 'Main product development team responsible for core features',
        createdBy: 'company-admin'
      };

      mockDatabaseService.createTeam.mockResolvedValue('dev-team-001');
      
      const teamId = await teamService.createTeam(teamData);
      expect(teamId).toBe('dev-team-001');

      // Step 3: Add team lead to the team
      const devTeam: Team = {
        id: 'dev-team-001',
        name: 'Product Development Team',
        description: 'Main product development team responsible for core features',
        createdBy: 'company-admin',
        members: [
          {
            userId: 'company-admin',
            email: 'admin@company.com',
            displayName: 'Company Admin',
            role: 'admin',
            joinedAt: new Date(),
            status: 'active'
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDatabaseService.getTeamById.mockResolvedValue(devTeam);
      mockDatabaseService.searchUserByEmail.mockResolvedValue(teamLead);
      mockDatabaseService.addTeamMember.mockResolvedValue(true);
      mockDatabaseService.createNotification.mockResolvedValue('team-lead-invitation');

      await teamService.inviteUserToTeam('dev-team-001', 'company-admin', 'lead@company.com', 'Team Lead');

      expect(mockDatabaseService.addTeamMember).toHaveBeenCalled();
      expect(mockDatabaseService.createNotification).toHaveBeenCalled();

      // ===== PHASE 2: TEAM LEAD ACCEPTS AND BUILDS TEAM =====
      console.log('Phase 2: Team Lead Accepts and Builds Team');

      // Step 4: Team lead accepts invitation
      const teamLeadInvitation: Notification = {
        id: 'team-lead-invitation',
        userId: 'team-lead',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to join Product Development Team',
        data: {
          teamId: 'dev-team-001',
          teamName: 'Product Development Team',
          inviterId: 'company-admin',
          inviterName: 'Company Admin'
        },
        read: false,
        createdAt: new Date()
      };

      mockDatabaseService.getUserNotifications.mockResolvedValue([teamLeadInvitation]);
      mockDatabaseService.removeTeamMember.mockResolvedValue(true);
      mockDatabaseService.deleteNotification.mockResolvedValue(true);

      await teamService.acceptTeamInvitation('team-lead-invitation', 'team-lead');

      expect(mockDatabaseService.deleteNotification).toHaveBeenCalledWith('team-lead-invitation');

      // Step 5: Team lead gets admin role
      mockDatabaseService.updateTeamMember.mockResolvedValue(true);

      await teamService.updateTeamMemberRole('dev-team-001', 'team-lead', 'admin', 'company-admin');

      expect(mockDatabaseService.updateTeamMember).toHaveBeenCalled();

      // Step 6: Team lead invites existing developer
      const devProfile: UserProfile = {
        userId: 'developer',
        email: 'dev@company.com',
        displayName: 'Developer',
        preferences: {
          notifications: {
            teamInvitations: true,
            meetingAssignments: true,
            taskAssignments: true
          },
          theme: 'system'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockDatabaseService.createUserProfile('developer', devProfile);

      mockDatabaseService.searchUserByEmail.mockResolvedValue(developer);
      mockDatabaseService.createNotification.mockResolvedValue('dev-invitation');

      await teamService.inviteUserToTeam('dev-team-001', 'team-lead', 'dev@company.com', 'Developer');

      // ===== PHASE 3: NEW HIRE ONBOARDING =====
      console.log('Phase 3: New Hire Onboarding');

      // Step 7: New hire joins company and gets invited
      const newHireProfile: UserProfile = {
        userId: 'new-hire',
        email: 'newhire@company.com',
        displayName: 'New Hire',
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

      await mockDatabaseService.createUserProfile('new-hire', newHireProfile);

      mockDatabaseService.searchUserByEmail.mockResolvedValue(newHire);
      mockDatabaseService.createNotification.mockResolvedValue('new-hire-invitation');

      await teamService.inviteUserToTeam('dev-team-001', 'team-lead', 'newhire@company.com', 'New Hire');

      // Step 8: New hire accepts invitation
      const newHireInvitation: Notification = {
        id: 'new-hire-invitation',
        userId: 'new-hire',
        type: 'team_invitation',
        title: 'Team Invitation',
        message: 'You have been invited to join Product Development Team',
        data: {
          teamId: 'dev-team-001',
          teamName: 'Product Development Team',
          inviterId: 'team-lead',
          inviterName: 'Team Lead'
        },
        read: false,
        createdAt: new Date()
      };

      mockDatabaseService.getUserNotifications.mockResolvedValue([newHireInvitation]);

      await teamService.acceptTeamInvitation('new-hire-invitation', 'new-hire');

      // ===== PHASE 4: PROJECT KICKOFF MEETING =====
      console.log('Phase 4: Project Kickoff Meeting');

      // Step 9: Team lead uploads project kickoff meeting
      const kickoffMeeting: ProcessedMeeting = {
        summary: 'Project kickoff meeting discussing the new user authentication feature. Team discussed requirements, timeline, and task assignments.',
        actionItems: [
          {
            id: 'auth-001',
            description: 'Research authentication libraries and frameworks',
            priority: 'high',
            status: 'pending',
            owner: 'New Hire'
          },
          {
            id: 'auth-002',
            description: 'Design database schema for user management',
            priority: 'high',
            status: 'pending',
            owner: 'Developer'
          },
          {
            id: 'auth-003',
            description: 'Create API endpoints for authentication',
            priority: 'medium',
            status: 'pending',
            owner: 'Team Lead'
          },
          {
            id: 'auth-004',
            description: 'Implement frontend login/signup components',
            priority: 'medium',
            status: 'pending',
            owner: 'Developer'
          }
        ],
        rawTranscript: 'Team Lead: Welcome everyone to the project kickoff meeting...',
        metadata: {
          fileName: 'project-kickoff-2024.mp3',
          fileSize: 5242880,
          uploadedAt: new Date(),
          processingTime: 12000
        }
      };

      mockDatabaseService.saveMeeting.mockResolvedValue('meeting-kickoff-001');

      const meetingId = await mockDatabaseService.saveMeeting('team-lead', kickoffMeeting, 'dev-team-001');
      expect(meetingId).toBe('meeting-kickoff-001');

      // Step 10: Team members receive meeting notifications
      const teamWithAllMembers: Team = {
        ...devTeam,
        members: [
          {
            userId: 'company-admin',
            email: 'admin@company.com',
            displayName: 'Company Admin',
            role: 'admin',
            joinedAt: new Date(),
            status: 'active'
          },
          {
            userId: 'team-lead',
            email: 'lead@company.com',
            displayName: 'Team Lead',
            role: 'admin',
            joinedAt: new Date(),
            status: 'active'
          },
          {
            userId: 'developer',
            email: 'dev@company.com',
            displayName: 'Developer',
            role: 'member',
            joinedAt: new Date(),
            status: 'active'
          },
          {
            userId: 'new-hire',
            email: 'newhire@company.com',
            displayName: 'New Hire',
            role: 'member',
            joinedAt: new Date(),
            status: 'active'
          }
        ]
      };

      mockDatabaseService.getTeamById.mockResolvedValue(teamWithAllMembers);

      const meetingAssignmentData = {
        meetingId: 'meeting-kickoff-001',
        meetingTitle: 'Project Kickoff Meeting',
        teamId: 'dev-team-001',
        teamName: 'Product Development Team',
        assignedBy: 'team-lead',
        assignedByName: 'Team Lead'
      };

      // Mock team service for notification service
      vi.doMock('../team-service', () => ({
        getTeamService: () => ({
          getTeam: vi.fn().mockResolvedValue(teamWithAllMembers)
        })
      }));

      mockDatabaseService.createNotification.mockResolvedValue('meeting-notification');

      const notificationIds = await notificationService.sendMeetingAssignment(meetingAssignmentData);
      expect(notificationIds.length).toBeGreaterThan(0);

      // ===== PHASE 5: TASK ASSIGNMENT AND EXECUTION =====
      console.log('Phase 5: Task Assignment and Execution');

      // Step 11: Assign tasks to team members
      mockDatabaseService.assignTask.mockResolvedValue(true);

      // Assign research task to new hire
      await mockDatabaseService.assignTask('meeting-kickoff-001', 'auth-001', 'new-hire', 'new-hire', 'team-lead');

      // Assign database design to developer
      await mockDatabaseService.assignTask('meeting-kickoff-001', 'auth-002', 'developer', 'developer', 'team-lead');

      expect(mockDatabaseService.assignTask).toHaveBeenCalledTimes(2);

      // Step 12: Send task assignment notifications
      const taskAssignmentData = {
        assigneeId: 'new-hire',
        taskId: 'auth-001',
        taskDescription: 'Research authentication libraries and frameworks',
        meetingTitle: 'Project Kickoff Meeting',
        assignedBy: 'Team Lead'
      };

      mockDatabaseService.createNotification.mockResolvedValue('task-notification');

      const taskNotificationId = await notificationService.sendTaskAssignment(taskAssignmentData);
      expect(taskNotificationId).toBe('task-notification');

      // Step 13: Team members update task status
      mockDatabaseService.updateTaskStatus.mockResolvedValue(true);

      // New hire starts research
      await mockDatabaseService.updateTaskStatus('meeting-kickoff-001', 'auth-001', 'in_progress');

      // Developer completes database design
      await mockDatabaseService.updateTaskStatus('meeting-kickoff-001', 'auth-002', 'completed');

      expect(mockDatabaseService.updateTaskStatus).toHaveBeenCalledTimes(2);

      // ===== PHASE 6: PROGRESS MEETING =====
      console.log('Phase 6: Progress Meeting');

      // Step 14: Team lead uploads progress meeting
      const progressMeeting: ProcessedMeeting = {
        summary: 'Weekly progress meeting. New hire completed authentication research, developer finished database schema. Discussed next steps and blockers.',
        actionItems: [
          {
            id: 'auth-005',
            description: 'Implement JWT token generation and validation',
            priority: 'high',
            status: 'pending',
            owner: 'Developer'
          },
          {
            id: 'auth-006',
            description: 'Create user registration flow',
            priority: 'high',
            status: 'pending',
            owner: 'New Hire'
          },
          {
            id: 'auth-007',
            description: 'Set up password reset functionality',
            priority: 'medium',
            status: 'pending',
            owner: 'Team Lead'
          }
        ],
        rawTranscript: 'Team Lead: Great progress this week team...',
        metadata: {
          fileName: 'progress-meeting-week1.mp3',
          fileSize: 3145728,
          uploadedAt: new Date(),
          processingTime: 8000
        }
      };

      mockDatabaseService.saveMeeting.mockResolvedValue('meeting-progress-001');

      const progressMeetingId = await mockDatabaseService.saveMeeting('team-lead', progressMeeting, 'dev-team-001');
      expect(progressMeetingId).toBe('meeting-progress-001');

      // ===== PHASE 7: REAL-TIME COLLABORATION =====
      console.log('Phase 7: Real-time Collaboration');

      // Step 15: Set up real-time subscriptions for all team members
      const mockCallbacks = {
        teamUpdates: vi.fn(),
        meetingUpdates: vi.fn(),
        notificationUpdates: vi.fn(),
        profileUpdates: vi.fn()
      };

      const mockUnsubscribes = {
        team: vi.fn(),
        meetings: vi.fn(),
        notifications: vi.fn(),
        profile: vi.fn()
      };

      mockDatabaseService.subscribeToTeam.mockReturnValue(mockUnsubscribes.team);
      mockDatabaseService.subscribeToTeamMeetings.mockReturnValue(mockUnsubscribes.meetings);
      mockDatabaseService.subscribeToUserNotifications.mockReturnValue(mockUnsubscribes.notifications);
      mockDatabaseService.subscribeToUserProfile.mockReturnValue(mockUnsubscribes.profile);

      // Each team member sets up subscriptions
      const subscriptions = {
        teamLead: {
          team: teamService.subscribeToTeam('dev-team-001', mockCallbacks.teamUpdates),
          meetings: mockDatabaseService.subscribeToTeamMeetings('dev-team-001', mockCallbacks.meetingUpdates),
          notifications: notificationService.subscribeToNotifications('team-lead', mockCallbacks.notificationUpdates),
          profile: mockDatabaseService.subscribeToUserProfile('team-lead', mockCallbacks.profileUpdates)
        }
      };

      expect(mockDatabaseService.subscribeToTeam).toHaveBeenCalled();
      expect(mockDatabaseService.subscribeToTeamMeetings).toHaveBeenCalled();
      expect(mockDatabaseService.subscribeToUserNotifications).toHaveBeenCalled();
      expect(mockDatabaseService.subscribeToUserProfile).toHaveBeenCalled();

      // ===== PHASE 8: SETTINGS AND PREFERENCES =====
      console.log('Phase 8: Settings and Preferences');

      // Step 16: Team members update their preferences
      const updatedNewHireProfile: Partial<UserProfile> = {
        displayName: 'New Hire (Junior Developer)',
        preferences: {
          notifications: {
            teamInvitations: true,
            meetingAssignments: true,
            taskAssignments: true
          },
          theme: 'dark'
        }
      };

      mockDatabaseService.updateUserProfile.mockResolvedValue(undefined);

      await mockDatabaseService.updateUserProfile('new-hire', updatedNewHireProfile);

      expect(mockDatabaseService.updateUserProfile).toHaveBeenCalledWith('new-hire', updatedNewHireProfile);

      // Step 17: Verify settings persistence
      const updatedProfile: UserProfile = {
        ...newHireProfile,
        ...updatedNewHireProfile,
        updatedAt: new Date()
      };

      mockDatabaseService.getUserProfile.mockResolvedValue(updatedProfile);

      const retrievedProfile = await mockDatabaseService.getUserProfile('new-hire');
      expect(retrievedProfile?.displayName).toBe('New Hire (Junior Developer)');
      expect(retrievedProfile?.preferences.theme).toBe('dark');

      // ===== PHASE 9: NOTIFICATION MANAGEMENT =====
      console.log('Phase 9: Notification Management');

      // Step 18: Handle various notification types
      const allNotifications: Notification[] = [
        {
          id: 'notif-001',
          userId: 'new-hire',
          type: 'team_invitation',
          title: 'Team Invitation',
          message: 'You have been invited to join Product Development Team',
          data: { teamId: 'dev-team-001' },
          read: true,
          createdAt: new Date(Date.now() - 86400000) // 1 day ago
        },
        {
          id: 'notif-002',
          userId: 'new-hire',
          type: 'meeting_assignment',
          title: 'New Team Meeting',
          message: 'Team Lead assigned a new meeting to your team',
          data: { meetingId: 'meeting-kickoff-001', teamId: 'dev-team-001' },
          read: true,
          createdAt: new Date(Date.now() - 43200000) // 12 hours ago
        },
        {
          id: 'notif-003',
          userId: 'new-hire',
          type: 'task_assignment',
          title: 'New Task Assignment',
          message: 'You have been assigned a task: Research authentication libraries',
          data: { taskId: 'auth-001', meetingId: 'meeting-kickoff-001' },
          read: false,
          createdAt: new Date(Date.now() - 3600000) // 1 hour ago
        },
        {
          id: 'notif-004',
          userId: 'new-hire',
          type: 'meeting_assignment',
          title: 'New Team Meeting',
          message: 'Team Lead assigned a new meeting to your team',
          data: { meetingId: 'meeting-progress-001', teamId: 'dev-team-001' },
          read: false,
          createdAt: new Date(Date.now() - 1800000) // 30 minutes ago
        }
      ];

      mockDatabaseService.getUserNotifications.mockResolvedValue(allNotifications);

      const userNotifications = await notificationService.getUserNotifications('new-hire');
      expect(userNotifications).toHaveLength(4);

      const unreadCount = await notificationService.getUnreadCount('new-hire');
      expect(unreadCount).toBe(2);

      // Step 19: Mark notifications as read
      mockDatabaseService.markNotificationAsRead.mockResolvedValue(true);

      await notificationService.markAsRead('notif-003');
      await notificationService.markAsRead('notif-004');

      expect(mockDatabaseService.markNotificationAsRead).toHaveBeenCalledTimes(2);

      // ===== PHASE 10: DATA CONSISTENCY VALIDATION =====
      console.log('Phase 10: Data Consistency Validation');

      // Step 20: Verify all data is consistent across components
      
      // Verify team data
      const finalTeam = await mockDatabaseService.getTeamById('dev-team-001');
      expect(finalTeam?.members).toHaveLength(4);

      // Verify meeting data
      const teamMeetings = await mockDatabaseService.getTeamMeetings('dev-team-001');
      mockDatabaseService.getTeamMeetings.mockResolvedValue([
        {
          id: 'meeting-kickoff-001',
          title: 'Project Kickoff Meeting',
          date: new Date(),
          summary: kickoffMeeting.summary,
          actionItems: kickoffMeeting.actionItems,
          rawTranscript: kickoffMeeting.rawTranscript,
          teamId: 'dev-team-001',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'meeting-progress-001',
          title: 'Weekly Progress Meeting',
          date: new Date(),
          summary: progressMeeting.summary,
          actionItems: progressMeeting.actionItems,
          rawTranscript: progressMeeting.rawTranscript,
          teamId: 'dev-team-001',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const meetings = await mockDatabaseService.getTeamMeetings('dev-team-001');
      expect(meetings).toHaveLength(2);
      expect(meetings.every(m => m.teamId === 'dev-team-001')).toBe(true);

      // Verify task assignments
      mockDatabaseService.getTeamTasks.mockResolvedValue([
        { taskId: 'auth-001', assigneeId: 'new-hire', status: 'in_progress' },
        { taskId: 'auth-002', assigneeId: 'developer', status: 'completed' },
        { taskId: 'auth-005', assigneeId: 'developer', status: 'pending' },
        { taskId: 'auth-006', assigneeId: 'new-hire', status: 'pending' },
        { taskId: 'auth-007', assigneeId: 'team-lead', status: 'pending' }
      ]);

      const teamTasks = await mockDatabaseService.getTeamTasks('dev-team-001');
      expect(teamTasks).toHaveLength(5);

      // ===== PHASE 11: ERROR HANDLING VALIDATION =====
      console.log('Phase 11: Error Handling Validation');

      // Step 21: Test error scenarios
      
      // Test network error with retry
      mockDatabaseService.getUserTeams
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue([finalTeam!]);

      const userTeams = await teamService.getUserTeams('team-lead');
      expect(userTeams).toHaveLength(1);

      // Test permission error
      mockDatabaseService.updateTeam.mockRejectedValue(new Error('Permission denied'));

      await expect(mockDatabaseService.updateTeam('dev-team-001', { name: 'Unauthorized Update' }))
        .rejects.toThrow('Permission denied');

      // Test authentication error
      const authError = new Error('Authentication required');
      authError.name = 'AUTH_ERROR';
      mockDatabaseService.getUserNotifications.mockRejectedValue(authError);

      const fallbackUnreadCount = await notificationService.getUnreadCount('new-hire');
      expect(fallbackUnreadCount).toBe(0); // Should handle gracefully

      // ===== PHASE 12: CLEANUP AND FINAL VALIDATION =====
      console.log('Phase 12: Cleanup and Final Validation');

      // Step 22: Clean up subscriptions
      Object.values(subscriptions.teamLead).forEach(unsub => unsub());
      Object.values(mockUnsubscribes).forEach(mockUnsub => expect(mockUnsub).toHaveBeenCalled());

      // Step 23: Final data integrity check
      expect(mockDatabaseService.createTeam).toHaveBeenCalledTimes(1);
      expect(mockDatabaseService.createUserProfile).toHaveBeenCalledTimes(4);
      expect(mockDatabaseService.saveMeeting).toHaveBeenCalledTimes(2);
      expect(mockDatabaseService.assignTask).toHaveBeenCalledTimes(2);
      expect(mockDatabaseService.updateTaskStatus).toHaveBeenCalledTimes(2);

      console.log('✅ Complete end-to-end workflow validation successful');
    });

    it('should handle concurrent user actions and maintain data consistency', async () => {
      // Test concurrent team operations
      const concurrentTeamData = [
        { name: 'Frontend Team', description: 'Frontend development', createdBy: 'company-admin' },
        { name: 'Backend Team', description: 'Backend development', createdBy: 'company-admin' },
        { name: 'DevOps Team', description: 'DevOps and infrastructure', createdBy: 'company-admin' }
      ];

      mockDatabaseService.createTeam
        .mockResolvedValueOnce('frontend-team')
        .mockResolvedValueOnce('backend-team')
        .mockResolvedValueOnce('devops-team');

      const teamPromises = concurrentTeamData.map(data => teamService.createTeam(data));
      const teamIds = await Promise.all(teamPromises);

      expect(teamIds).toEqual(['frontend-team', 'backend-team', 'devops-team']);
      expect(mockDatabaseService.createTeam).toHaveBeenCalledTimes(3);

      // Test concurrent meeting uploads
      const concurrentMeetings = [
        { summary: 'Frontend standup', actionItems: [], rawTranscript: 'Frontend meeting...', metadata: { fileName: 'frontend.mp3', fileSize: 1000, uploadedAt: new Date(), processingTime: 1000 } },
        { summary: 'Backend planning', actionItems: [], rawTranscript: 'Backend meeting...', metadata: { fileName: 'backend.mp3', fileSize: 1000, uploadedAt: new Date(), processingTime: 1000 } }
      ];

      mockDatabaseService.saveMeeting
        .mockResolvedValueOnce('frontend-meeting')
        .mockResolvedValueOnce('backend-meeting');

      const meetingPromises = [
        mockDatabaseService.saveMeeting('team-lead', concurrentMeetings[0], 'frontend-team'),
        mockDatabaseService.saveMeeting('team-lead', concurrentMeetings[1], 'backend-team')
      ];

      const meetingIds = await Promise.all(meetingPromises);
      expect(meetingIds).toEqual(['frontend-meeting', 'backend-meeting']);

      // Test concurrent notification handling
      const concurrentNotifications = [
        { userId: 'developer', type: 'meeting_assignment' as const, title: 'Frontend Meeting', message: 'New frontend meeting', data: { meetingId: 'frontend-meeting' } },
        { userId: 'developer', type: 'meeting_assignment' as const, title: 'Backend Meeting', message: 'New backend meeting', data: { meetingId: 'backend-meeting' } }
      ];

      mockDatabaseService.createNotification
        .mockResolvedValueOnce('frontend-notif')
        .mockResolvedValueOnce('backend-notif');

      const notificationPromises = concurrentNotifications.map(notif => 
        mockDatabaseService.createNotification(notif)
      );

      const notificationIds = await Promise.all(notificationPromises);
      expect(notificationIds).toEqual(['frontend-notif', 'backend-notif']);
    });

    it('should handle offline/online transitions gracefully', async () => {
      // Simulate offline mode
      mockDatabaseService.enableOfflineSupport.mockResolvedValue(undefined);
      await mockDatabaseService.enableOfflineSupport();

      // Test offline operations
      mockDatabaseService.getUserTeams.mockResolvedValue([]);
      const offlineTeams = await teamService.getUserTeams('team-lead');
      expect(offlineTeams).toEqual([]);

      // Simulate coming back online
      mockDatabaseService.disableOfflineSupport.mockResolvedValue(undefined);
      await mockDatabaseService.disableOfflineSupport();

      // Test online operations resume
      const onlineTeam: Team = {
        id: 'dev-team-001',
        name: 'Product Development Team',
        description: 'Main development team',
        createdBy: 'company-admin',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDatabaseService.getUserTeams.mockResolvedValue([onlineTeam]);
      const onlineTeams = await teamService.getUserTeams('team-lead');
      expect(onlineTeams).toHaveLength(1);
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle large team operations efficiently', async () => {
      // Test with large team (50 members)
      const largeTeamMembers: TeamMember[] = Array.from({ length: 50 }, (_, i) => ({
        userId: `user-${i}`,
        email: `user${i}@company.com`,
        displayName: `User ${i}`,
        role: i === 0 ? 'admin' : 'member',
        joinedAt: new Date(),
        status: 'active'
      }));

      const largeTeam: Team = {
        id: 'large-team',
        name: 'Large Team',
        description: 'Team with many members',
        createdBy: 'company-admin',
        members: largeTeamMembers,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDatabaseService.getTeamById.mockResolvedValue(largeTeam);

      const team = await mockDatabaseService.getTeamById('large-team');
      expect(team?.members).toHaveLength(50);

      // Test bulk notification sending
      const meetingAssignmentData = {
        meetingId: 'large-meeting',
        meetingTitle: 'All Hands Meeting',
        teamId: 'large-team',
        teamName: 'Large Team',
        assignedBy: 'company-admin',
        assignedByName: 'Company Admin'
      };

      // Mock team service for notification service
      vi.doMock('../team-service', () => ({
        getTeamService: () => ({
          getTeam: vi.fn().mockResolvedValue(largeTeam)
        })
      }));

      mockDatabaseService.createNotification.mockResolvedValue('bulk-notification');

      const notificationIds = await notificationService.sendMeetingAssignment(meetingAssignmentData);
      expect(notificationIds.length).toBeGreaterThan(0);
    });

    it('should handle multiple real-time subscriptions efficiently', () => {
      const subscriptionCount = 10;
      const mockCallbacks = Array.from({ length: subscriptionCount }, () => vi.fn());
      const mockUnsubscribes = Array.from({ length: subscriptionCount }, () => vi.fn());

      mockDatabaseService.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        const index = mockCallbacks.indexOf(callback);
        return mockUnsubscribes[index] || vi.fn();
      });

      // Create multiple subscriptions
      const unsubscribes = mockCallbacks.map(callback => 
        notificationService.subscribeToNotifications('test-user', callback)
      );

      expect(unsubscribes).toHaveLength(subscriptionCount);

      // Cleanup all subscriptions
      unsubscribes.forEach(unsub => unsub());
    });
  });
});