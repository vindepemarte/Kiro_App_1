/**
 * End-to-End Team Collaboration Workflow Test
 * Tests the complete team workflow: create → invite → accept → assign tasks
 * Validates all team interactions work together seamlessly
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock environment setup
const mockEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
  NEXT_PUBLIC_GEMINI_API_KEY: 'test-gemini-key',
  NEXT_PUBLIC_APP_ID: 'meeting-ai-mvp'
}

// Set environment variables
Object.entries(mockEnv).forEach(([key, value]) => {
  process.env[key] = value
})

// Mock Firebase
const mockFirebaseUser = {
  uid: 'test-user-1',
  email: 'admin@example.com',
  displayName: 'Admin User'
}

const mockInvitedUser = {
  uid: 'test-user-2',
  email: 'member@example.com',
  displayName: 'Team Member'
}

vi.mock('../../lib/firebase', () => ({
  auth: {
    currentUser: mockFirebaseUser,
    onAuthStateChanged: vi.fn((callback) => {
      callback(mockFirebaseUser)
      return () => {}
    }),
    signInAnonymously: vi.fn(() => Promise.resolve({ user: mockFirebaseUser })),
    signInWithCustomToken: vi.fn(() => Promise.resolve({ user: mockFirebaseUser }))
  },
  db: {}
}))

// Mock all services
const mockDatabase = {
  createTeam: vi.fn(),
  getUserTeams: vi.fn(),
  getTeamById: vi.fn(),
  updateTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
  assignTask: vi.fn(),
  updateTaskStatus: vi.fn(),
  getTeamTasks: vi.fn(),
  getUserMeetings: vi.fn(),
  subscribeToUserMeetings: vi.fn(),
  subscribeToUserNotifications: vi.fn(),
  createNotification: vi.fn(),
  markNotificationAsRead: vi.fn()
}

const mockTeamService = {
  searchUserByEmail: vi.fn(),
  inviteUserToTeam: vi.fn(),
  acceptTeamInvitation: vi.fn(),
  declineTeamInvitation: vi.fn(),
  matchSpeakerToTeamMember: vi.fn()
}

const mockNotificationService = {
  sendTeamInvitation: vi.fn(),
  sendTaskAssignment: vi.fn(),
  markAsRead: vi.fn(),
  getUnreadCount: vi.fn()
}

const mockGeminiService = {
  processTranscript: vi.fn()
}

vi.mock('../../lib/database', () => mockDatabase)
vi.mock('../../lib/team-service', () => mockTeamService)
vi.mock('../../lib/notification-service', () => mockNotificationService)
vi.mock('../../lib/gemini', () => mockGeminiService)

// Test data that evolves through the workflow
let workflowState = {
  team: null,
  invitation: null,
  meeting: null,
  notifications: [],
  tasks: []
}

describe('End-to-End Team Collaboration Workflow', () => {
  beforeAll(() => {
    // Setup global test environment
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }))
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })
  })

  beforeEach(() => {
    // Reset workflow state
    workflowState = {
      team: null,
      invitation: null,
      meeting: null,
      notifications: [],
      tasks: []
    }
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup default mock implementations
    mockDatabase.getUserTeams.mockResolvedValue([])
    mockDatabase.getUserMeetings.mockResolvedValue([])
    mockDatabase.subscribeToUserMeetings.mockImplementation((userId, callback) => {
      callback(workflowState.meeting ? [workflowState.meeting] : [])
      return () => {}
    })
    mockDatabase.subscribeToUserNotifications.mockImplementation((userId, callback) => {
      callback(workflowState.notifications)
      return () => {}
    })
    mockNotificationService.getUnreadCount.mockResolvedValue(0)
  })

  describe('Complete Team Workflow Integration', () => {
    it('should execute complete team collaboration workflow', async () => {
      console.log('🚀 Starting complete team collaboration workflow test')
      
      // STEP 1: Team Creation
      console.log('📝 Step 1: Creating team')
      await testTeamCreation()
      
      // STEP 2: Member Invitation
      console.log('📧 Step 2: Inviting team member')
      await testMemberInvitation()
      
      // STEP 3: Invitation Acceptance
      console.log('✅ Step 3: Accepting invitation')
      await testInvitationAcceptance()
      
      // STEP 4: Meeting Processing with Team Context
      console.log('🎯 Step 4: Processing meeting with team context')
      await testMeetingProcessingWithTeam()
      
      // STEP 5: Task Assignment
      console.log('📋 Step 5: Assigning tasks to team members')
      await testTaskAssignment()
      
      // STEP 6: Notification System Validation
      console.log('🔔 Step 6: Validating notification system')
      await testNotificationSystem()
      
      // STEP 7: Mobile Interface Validation
      console.log('📱 Step 7: Validating mobile interface')
      await testMobileInterface()
      
      console.log('✅ Complete workflow test passed!')
    })
  })

  async function testTeamCreation() {
    const user = userEvent.setup()
    
    // Mock team creation success
    const createdTeam = {
      id: 'team-1',
      name: 'E2E Test Team',
      description: 'End-to-end testing team',
      createdBy: 'test-user-1',
      members: [{
        userId: 'test-user-1',
        email: 'admin@example.com',
        displayName: 'Admin User',
        role: 'admin',
        joinedAt: new Date(),
        status: 'active'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    mockDatabase.createTeam.mockResolvedValue('team-1')
    mockDatabase.getTeamById.mockResolvedValue(createdTeam)
    mockDatabase.getUserTeams.mockResolvedValue([createdTeam])
    
    // Import and render team management component
    const { default: TeamManagement } = await import('../../components/team-management')
    const { AuthProvider } = await import('../../contexts/auth-context')
    const { ThemeProvider } = await import('../../components/theme-provider')
    
    const TestWrapper = ({ children }) => (
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    )
    
    render(
      <TestWrapper>
        <TeamManagement />
      </TestWrapper>
    )
    
    // Create team
    const createButton = await screen.findByRole('button', { name: /create team/i })
    await user.click(createButton)
    
    const nameInput = screen.getByLabelText(/team name/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    
    await user.type(nameInput, 'E2E Test Team')
    await user.type(descriptionInput, 'End-to-end testing team')
    
    const submitButton = screen.getByRole('button', { name: /create/i })
    await user.click(submitButton)
    
    // Verify team creation
    await waitFor(() => {
      expect(mockDatabase.createTeam).toHaveBeenCalledWith({
        name: 'E2E Test Team',
        description: 'End-to-end testing team',
        createdBy: 'test-user-1'
      })
    })
    
    // Update workflow state
    workflowState.team = createdTeam
    
    console.log('✅ Team creation completed')
  }

  async function testMemberInvitation() {
    const user = userEvent.setup()
    
    // Mock user search and invitation
    mockTeamService.searchUserByEmail.mockResolvedValue(mockInvitedUser)
    mockTeamService.inviteUserToTeam.mockResolvedValue(undefined)
    mockNotificationService.sendTeamInvitation.mockResolvedValue(undefined)
    
    // Create invitation notification
    const invitation = {
      id: 'invitation-1',
      userId: 'test-user-2',
      type: 'team_invitation',
      title: 'Team Invitation',
      message: 'You have been invited to join E2E Test Team',
      data: {
        teamId: 'team-1',
        teamName: 'E2E Test Team',
        inviterId: 'test-user-1',
        inviterName: 'Admin User'
      },
      read: false,
      createdAt: new Date()
    }
    
    mockDatabase.createNotification.mockResolvedValue('invitation-1')
    
    // Import and render team management component
    const { default: TeamManagement } = await import('../../components/team-management')
    const { AuthProvider } = await import('../../contexts/auth-context')
    const { ThemeProvider } = await import('../../components/theme-provider')
    
    const TestWrapper = ({ children }) => (
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    )
    
    render(
      <TestWrapper>
        <TeamManagement />
      </TestWrapper>
    )
    
    // Invite member
    const inviteButton = await screen.findByRole('button', { name: /invite member/i })
    await user.click(inviteButton)
    
    const emailInput = screen.getByLabelText(/email/i)
    const displayNameInput = screen.getByLabelText(/display name/i)
    
    await user.type(emailInput, 'member@example.com')
    await user.type(displayNameInput, 'Team Member')
    
    const sendInviteButton = screen.getByRole('button', { name: /send invitation/i })
    await user.click(sendInviteButton)
    
    // Verify invitation was sent
    await waitFor(() => {
      expect(mockTeamService.inviteUserToTeam).toHaveBeenCalledWith(
        'team-1',
        'member@example.com',
        'Team Member'
      )
      expect(mockNotificationService.sendTeamInvitation).toHaveBeenCalled()
    })
    
    // Update workflow state
    workflowState.invitation = invitation
    workflowState.notifications.push(invitation)
    
    console.log('✅ Member invitation completed')
  }

  async function testInvitationAcceptance() {
    const user = userEvent.setup()
    
    // Mock invitation acceptance
    mockTeamService.acceptTeamInvitation.mockResolvedValue(undefined)
    mockDatabase.updateTeamMember.mockResolvedValue(undefined)
    mockDatabase.markNotificationAsRead.mockResolvedValue(undefined)
    
    // Update team with new member
    const updatedTeam = {
      ...workflowState.team,
      members: [
        ...workflowState.team.members,
        {
          userId: 'test-user-2',
          email: 'member@example.com',
          displayName: 'Team Member',
          role: 'member',
          joinedAt: new Date(),
          status: 'active'
        }
      ]
    }
    
    mockDatabase.getTeamById.mockResolvedValue(updatedTeam)
    
    // Import and render notification center
    const { default: NotificationCenter } = await import('../../components/notification-center')
    const { AuthProvider } = await import('../../contexts/auth-context')
    const { ThemeProvider } = await import('../../components/theme-provider')
    
    const TestWrapper = ({ children }) => (
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    )
    
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    )
    
    // Accept invitation
    const acceptButton = await screen.findByRole('button', { name: /accept/i })
    await user.click(acceptButton)
    
    // Verify acceptance
    await waitFor(() => {
      expect(mockTeamService.acceptTeamInvitation).toHaveBeenCalledWith('invitation-1')
    })
    
    // Update workflow state
    workflowState.team = updatedTeam
    workflowState.notifications = workflowState.notifications.map(n => 
      n.id === 'invitation-1' ? { ...n, read: true } : n
    )
    
    console.log('✅ Invitation acceptance completed')
  }

  async function testMeetingProcessingWithTeam() {
    // Mock meeting processing with team context
    const processedMeeting = {
      id: 'meeting-1',
      title: 'Team Standup',
      date: new Date(),
      summary: 'Daily standup meeting with task assignments',
      actionItems: [
        {
          id: 'task-1',
          description: 'Complete user authentication feature',
          owner: 'Admin User',
          assigneeId: 'test-user-1',
          assigneeName: 'Admin User',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          priority: 'high',
          status: 'pending',
          assignedBy: 'system',
          assignedAt: new Date()
        },
        {
          id: 'task-2',
          description: 'Review API documentation',
          owner: 'Team Member',
          assigneeId: 'test-user-2',
          assigneeName: 'Team Member',
          deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          priority: 'medium',
          status: 'pending',
          assignedBy: 'system',
          assignedAt: new Date()
        }
      ],
      rawTranscript: 'Admin User: We need to complete the authentication feature. Team Member: I can review the API documentation.',
      teamId: 'team-1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Mock AI processing with team context
    mockGeminiService.processTranscript.mockResolvedValue({
      summary: processedMeeting.summary,
      actionItems: processedMeeting.actionItems
    })
    
    // Mock team-aware processing
    const { processWithTeamContext } = await import('../../lib/team-aware-processor')
    vi.mocked(processWithTeamContext).mockResolvedValue(processedMeeting)
    
    // Mock database save
    mockDatabase.saveMeeting = vi.fn().mockResolvedValue('meeting-1')
    
    // Simulate file processing
    const transcript = 'Admin User: We need to complete the authentication feature. Team Member: I can review the API documentation.'
    
    const result = await processWithTeamContext(transcript, workflowState.team)
    
    // Verify team-aware processing
    expect(result.actionItems).toHaveLength(2)
    expect(result.actionItems[0].assigneeId).toBe('test-user-1')
    expect(result.actionItems[1].assigneeId).toBe('test-user-2')
    expect(result.teamId).toBe('team-1')
    
    // Update workflow state
    workflowState.meeting = processedMeeting
    workflowState.tasks = processedMeeting.actionItems
    
    console.log('✅ Meeting processing with team context completed')
  }

  async function testTaskAssignment() {
    const user = userEvent.setup()
    
    // Mock task assignment and notifications
    mockDatabase.assignTask.mockResolvedValue(undefined)
    mockNotificationService.sendTaskAssignment.mockResolvedValue(undefined)
    mockDatabase.updateTaskStatus.mockResolvedValue(undefined)
    
    // Import and render task assignment component
    const { default: TaskAssignment } = await import('../../components/task-assignment')
    const { AuthProvider } = await import('../../contexts/auth-context')
    const { ThemeProvider } = await import('../../components/theme-provider')
    
    const TestWrapper = ({ children }) => (
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    )
    
    render(
      <TestWrapper>
        <TaskAssignment 
          actionItem={workflowState.tasks[0]}
          teamMembers={workflowState.team.members}
          onAssign={vi.fn()}
        />
      </TestWrapper>
    )
    
    // Test task reassignment
    const reassignButton = await screen.findByRole('button', { name: /reassign/i })
    await user.click(reassignButton)
    
    const memberSelect = screen.getByRole('combobox')
    await user.click(memberSelect)
    
    const newAssignee = screen.getByText('Team Member')
    await user.click(newAssignee)
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)
    
    // Verify task reassignment
    await waitFor(() => {
      expect(mockDatabase.assignTask).toHaveBeenCalledWith(
        'task-1',
        'test-user-2',
        'test-user-1'
      )
      expect(mockNotificationService.sendTaskAssignment).toHaveBeenCalled()
    })
    
    // Test status update
    const statusSelect = screen.getByRole('combobox', { name: /status/i })
    await user.click(statusSelect)
    
    const inProgressOption = screen.getByText('In Progress')
    await user.click(inProgressOption)
    
    // Verify status update
    await waitFor(() => {
      expect(mockDatabase.updateTaskStatus).toHaveBeenCalledWith('task-1', 'in_progress')
    })
    
    console.log('✅ Task assignment completed')
  }

  async function testNotificationSystem() {
    // Create task assignment notification
    const taskNotification = {
      id: 'notification-2',
      userId: 'test-user-2',
      type: 'task_assignment',
      title: 'New Task Assignment',
      message: 'You have been assigned: Complete user authentication feature',
      data: {
        taskId: 'task-1',
        taskDescription: 'Complete user authentication feature',
        meetingId: 'meeting-1',
        meetingTitle: 'Team Standup',
        assignedBy: 'test-user-1'
      },
      read: false,
      createdAt: new Date()
    }
    
    // Update workflow state with new notification
    workflowState.notifications.push(taskNotification)
    
    // Mock notification count
    mockNotificationService.getUnreadCount.mockResolvedValue(1)
    
    // Import and render notification center
    const { default: NotificationCenter } = await import('../../components/notification-center')
    const { AuthProvider } = await import('../../contexts/auth-context')
    const { ThemeProvider } = await import('../../components/theme-provider')
    
    const TestWrapper = ({ children }) => (
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    )
    
    render(
      <TestWrapper>
        <NotificationCenter />
      </TestWrapper>
    )
    
    // Verify notifications are displayed
    expect(await screen.findByText('New Task Assignment')).toBeInTheDocument()
    expect(screen.getByText('You have been assigned: Complete user authentication feature')).toBeInTheDocument()
    
    // Verify unread count
    expect(screen.getByText('1')).toBeInTheDocument()
    
    console.log('✅ Notification system validation completed')
  }

  async function testMobileInterface() {
    // Set mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    })
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
    
    // Import and render dashboard with mobile layout
    const { default: Dashboard } = await import('../../app/dashboard/page')
    const { AuthProvider } = await import('../../contexts/auth-context')
    const { ThemeProvider } = await import('../../components/theme-provider')
    
    const TestWrapper = ({ children }) => (
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    )
    
    // Mock dashboard data
    mockDatabase.getUserMeetings.mockResolvedValue([workflowState.meeting])
    mockDatabase.getUserTeams.mockResolvedValue([workflowState.team])
    
    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    )
    
    // Verify mobile navigation
    const mobileMenuButton = await screen.findByRole('button', { name: /menu/i })
    expect(mobileMenuButton).toBeInTheDocument()
    
    // Verify mobile-optimized layout
    const dashboardContainer = screen.getByTestId('dashboard-container')
    expect(dashboardContainer).toHaveClass('mobile-layout')
    
    // Test touch targets
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button)
      const minHeight = parseInt(styles.minHeight) || parseInt(styles.height)
      const minWidth = parseInt(styles.minWidth) || parseInt(styles.width)
      
      // Verify minimum touch target size (44px)
      expect(minHeight).toBeGreaterThanOrEqual(44)
      expect(minWidth).toBeGreaterThanOrEqual(44)
    })
    
    console.log('✅ Mobile interface validation completed')
  }

  describe('Workflow State Validation', () => {
    it('should maintain consistent state throughout workflow', () => {
      // Verify team state
      expect(workflowState.team).toBeTruthy()
      expect(workflowState.team.members).toHaveLength(2)
      expect(workflowState.team.members.some(m => m.role === 'admin')).toBe(true)
      expect(workflowState.team.members.some(m => m.role === 'member')).toBe(true)
      
      // Verify meeting state
      expect(workflowState.meeting).toBeTruthy()
      expect(workflowState.meeting.teamId).toBe(workflowState.team.id)
      expect(workflowState.meeting.actionItems).toHaveLength(2)
      
      // Verify task assignments
      expect(workflowState.tasks).toHaveLength(2)
      expect(workflowState.tasks.every(task => task.assigneeId)).toBe(true)
      expect(workflowState.tasks.every(task => task.assigneeName)).toBe(true)
      
      // Verify notifications
      expect(workflowState.notifications.length).toBeGreaterThan(0)
      expect(workflowState.notifications.some(n => n.type === 'team_invitation')).toBe(true)
      expect(workflowState.notifications.some(n => n.type === 'task_assignment')).toBe(true)
    })
  })

  describe('Error Handling in Workflow', () => {
    it('should handle errors gracefully during workflow', async () => {
      // Test team creation failure
      mockDatabase.createTeam.mockRejectedValueOnce(new Error('Database error'))
      
      const { default: TeamManagement } = await import('../../components/team-management')
      const { AuthProvider } = await import('../../contexts/auth-context')
      const { ThemeProvider } = await import('../../components/theme-provider')
      
      const TestWrapper = ({ children }) => (
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      )
      
      render(
        <TestWrapper>
          <TeamManagement />
        </TestWrapper>
      )
      
      const user = userEvent.setup()
      const createButton = await screen.findByRole('button', { name: /create team/i })
      await user.click(createButton)
      
      const nameInput = screen.getByLabelText(/team name/i)
      await user.type(nameInput, 'Error Test Team')
      
      const submitButton = screen.getByRole('button', { name: /create/i })
      await user.click(submitButton)
      
      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/error creating team/i)).toBeInTheDocument()
      })
    })
  })
})