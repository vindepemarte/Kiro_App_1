/**
 * Comprehensive integration tests for team collaboration features
 * Tests complete team workflow: create → invite → accept → assign tasks
 * Validates notification system across all team interactions
 * Tests mobile-first design and team task assignment functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../../contexts/auth-context'
import { ThemeProvider } from '../../components/theme-provider'
import { Toaster } from '../../components/ui/toaster'
import TeamManagement from '../../components/team-management'
import NotificationCenter from '../../components/notification-center'
import TaskAssignment from '../../components/task-assignment'
import Dashboard from '../../app/dashboard/page'

// Mock Firebase and services
vi.mock('../../lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-1', email: 'test@example.com' },
    onAuthStateChanged: vi.fn((callback) => {
      callback({ uid: 'test-user-1', email: 'test@example.com' })
      return () => {}
    })
  },
  db: {}
}))

vi.mock('../../lib/database', () => ({
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
  subscribeToUserNotifications: vi.fn()
}))

vi.mock('../../lib/team-service', () => ({
  searchUserByEmail: vi.fn(),
  inviteUserToTeam: vi.fn(),
  acceptTeamInvitation: vi.fn(),
  declineTeamInvitation: vi.fn(),
  matchSpeakerToTeamMember: vi.fn()
}))

vi.mock('../../lib/notification-service', () => ({
  sendTeamInvitation: vi.fn(),
  sendTaskAssignment: vi.fn(),
  markAsRead: vi.fn(),
  getUnreadCount: vi.fn()
}))

// Test data
const mockTeam = {
  id: 'team-1',
  name: 'Test Team',
  description: 'A test team for integration testing',
  createdBy: 'test-user-1',
  members: [
    {
      userId: 'test-user-1',
      email: 'test@example.com',
      displayName: 'Test User 1',
      role: 'admin',
      joinedAt: new Date(),
      status: 'active'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockInvitedUser = {
  userId: 'test-user-2',
  email: 'invited@example.com',
  displayName: 'Invited User',
  role: 'member',
  joinedAt: new Date(),
  status: 'invited'
}

const mockMeeting = {
  id: 'meeting-1',
  title: 'Team Meeting',
  date: new Date(),
  summary: 'Discussion about project progress',
  actionItems: [
    {
      id: 'task-1',
      description: 'Complete project documentation',
      owner: 'Test User 1',
      assigneeId: 'test-user-1',
      assigneeName: 'Test User 1',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: 'high',
      status: 'pending'
    }
  ],
  rawTranscript: 'Meeting transcript content...',
  teamId: 'team-1',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockNotification = {
  id: 'notification-1',
  userId: 'test-user-2',
  type: 'team_invitation',
  title: 'Team Invitation',
  message: 'You have been invited to join Test Team',
  data: {
    teamId: 'team-1',
    teamName: 'Test Team',
    inviterId: 'test-user-1',
    inviterName: 'Test User 1'
  },
  read: false,
  createdAt: new Date()
}

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  </ThemeProvider>
)

describe('Team Collaboration Integration Tests', () => {
  let mockDatabase: any
  let mockTeamService: any
  let mockNotificationService: any

  beforeAll(() => {
    // Setup viewport for mobile testing
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
  })

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup mock implementations
    mockDatabase = await import('../../lib/database')
    mockTeamService = await import('../../lib/team-service')
    mockNotificationService = await import('../../lib/notification-service')
    
    // Setup default mock returns
    mockDatabase.getUserTeams.mockResolvedValue([mockTeam])
    mockDatabase.getTeamById.mockResolvedValue(mockTeam)
    mockDatabase.getUserMeetings.mockResolvedValue([mockMeeting])
    mockDatabase.subscribeToUserMeetings.mockImplementation((userId, callback) => {
      callback([mockMeeting])
      return () => {}
    })
    mockDatabase.subscribeToUserNotifications.mockImplementation((userId, callback) => {
      callback([mockNotification])
      return () => {}
    })
    mockTeamService.searchUserByEmail.mockResolvedValue({
      uid: 'test-user-2',
      email: 'invited@example.com',
      displayName: 'Invited User'
    })
    mockNotificationService.getUnreadCount.mockResolvedValue(1)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Team Workflow', () => {
    it('should complete full team creation workflow', async () => {
      const user = userEvent.setup()
      
      // Mock team creation
      mockDatabase.createTeam.mockResolvedValue('team-1')
      
      render(
        <TestWrapper>
          <TeamManagement />
        </TestWrapper>
      )

      // Step 1: Create team
      const createButton = screen.getByRole('button', { name: /create team/i })
      await user.click(createButton)

      // Fill team creation form
      const nameInput = screen.getByLabelText(/team name/i)
      const descriptionInput = screen.getByLabelText(/description/i)
      
      await user.type(nameInput, 'Test Team')
      await user.type(descriptionInput, 'A test team for integration testing')
      
      const submitButton = screen.getByRole('button', { name: /create/i })
      await user.click(submitButton)

      // Verify team creation was called
      await waitFor(() => {
        expect(mockDatabase.createTeam).toHaveBeenCalledWith({
          name: 'Test Team',
          description: 'A test team for integration testing',
          createdBy: 'test-user-1'
        })
      })
    })

    it('should complete team invitation workflow', async () => {
      const user = userEvent.setup()
      
      // Mock invitation process
      mockTeamService.inviteUserToTeam.mockResolvedValue(undefined)
      mockNotificationService.sendTeamInvitation.mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <TeamManagement />
        </TestWrapper>
      )

      // Step 2: Invite user to team
      const inviteButton = screen.getByRole('button', { name: /invite member/i })
      await user.click(inviteButton)

      // Fill invitation form
      const emailInput = screen.getByLabelText(/email/i)
      const displayNameInput = screen.getByLabelText(/display name/i)
      
      await user.type(emailInput, 'invited@example.com')
      await user.type(displayNameInput, 'Invited User')
      
      const sendInviteButton = screen.getByRole('button', { name: /send invitation/i })
      await user.click(sendInviteButton)

      // Verify invitation was sent
      await waitFor(() => {
        expect(mockTeamService.inviteUserToTeam).toHaveBeenCalledWith(
          'team-1',
          'invited@example.com',
          'Invited User'
        )
        expect(mockNotificationService.sendTeamInvitation).toHaveBeenCalled()
      })
    })

    it('should handle team invitation acceptance', async () => {
      const user = userEvent.setup()
      
      // Mock acceptance process
      mockTeamService.acceptTeamInvitation.mockResolvedValue(undefined)
      mockDatabase.updateTeamMember.mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      // Step 3: Accept team invitation
      const acceptButton = screen.getByRole('button', { name: /accept/i })
      await user.click(acceptButton)

      // Verify acceptance was processed
      await waitFor(() => {
        expect(mockTeamService.acceptTeamInvitation).toHaveBeenCalledWith('notification-1')
      })
    })

    it('should complete task assignment workflow', async () => {
      const user = userEvent.setup()
      
      // Mock task assignment
      mockDatabase.assignTask.mockResolvedValue(undefined)
      mockNotificationService.sendTaskAssignment.mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <TaskAssignment 
            actionItem={mockMeeting.actionItems[0]}
            teamMembers={mockTeam.members}
            onAssign={vi.fn()}
          />
        </TestWrapper>
      )

      // Step 4: Assign task to team member
      const assignButton = screen.getByRole('button', { name: /assign/i })
      await user.click(assignButton)

      // Select team member from dropdown
      const memberOption = screen.getByText('Test User 1')
      await user.click(memberOption)

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      // Verify task assignment
      await waitFor(() => {
        expect(mockDatabase.assignTask).toHaveBeenCalledWith(
          'task-1',
          'test-user-1',
          'test-user-1'
        )
        expect(mockNotificationService.sendTaskAssignment).toHaveBeenCalled()
      })
    })
  })

  describe('Notification System Integration', () => {
    it('should display real-time notifications', async () => {
      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      // Verify notification is displayed
      expect(screen.getByText('Team Invitation')).toBeInTheDocument()
      expect(screen.getByText('You have been invited to join Test Team')).toBeInTheDocument()
      
      // Verify unread badge
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should handle notification interactions', async () => {
      const user = userEvent.setup()
      
      mockNotificationService.markAsRead.mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      // Mark notification as read
      const markReadButton = screen.getByRole('button', { name: /mark as read/i })
      await user.click(markReadButton)

      await waitFor(() => {
        expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('notification-1')
      })
    })

    it('should update notification counts in real-time', async () => {
      // Mock real-time updates
      const mockCallback = vi.fn()
      mockDatabase.subscribeToUserNotifications.mockImplementation((userId, callback) => {
        mockCallback.mockImplementation(callback)
        // Simulate initial notifications
        callback([mockNotification])
        return () => {}
      })

      render(
        <TestWrapper>
          <NotificationCenter />
        </TestWrapper>
      )

      // Verify initial count
      expect(screen.getByText('1')).toBeInTheDocument()

      // Simulate new notification
      act(() => {
        mockCallback([
          mockNotification,
          {
            ...mockNotification,
            id: 'notification-2',
            title: 'Task Assignment',
            message: 'You have been assigned a new task'
          }
        ])
      })

      // Verify updated count
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })
  })

  describe('Mobile-First Design Testing', () => {
    it('should display mobile navigation correctly', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      window.dispatchEvent(new Event('resize'))

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Verify mobile navigation elements
      const hamburgerButton = screen.getByRole('button', { name: /menu/i })
      expect(hamburgerButton).toBeInTheDocument()
      
      // Verify mobile-optimized layout
      const mobileContainer = screen.getByTestId('mobile-dashboard')
      expect(mobileContainer).toHaveClass('mobile-layout')
    })

    it('should handle touch interactions on mobile', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <TaskAssignment 
            actionItem={mockMeeting.actionItems[0]}
            teamMembers={mockTeam.members}
            onAssign={vi.fn()}
          />
        </TestWrapper>
      )

      // Verify touch targets meet minimum size requirements (44px)
      const touchTargets = screen.getAllByRole('button')
      touchTargets.forEach(target => {
        const styles = window.getComputedStyle(target)
        const minHeight = parseInt(styles.minHeight) || parseInt(styles.height)
        const minWidth = parseInt(styles.minWidth) || parseInt(styles.width)
        
        expect(minHeight).toBeGreaterThanOrEqual(44)
        expect(minWidth).toBeGreaterThanOrEqual(44)
      })
    })

    it('should adapt to different screen sizes', async () => {
      const screenSizes = [
        { width: 320, height: 568, name: 'mobile-small' },
        { width: 375, height: 667, name: 'mobile-medium' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1024, height: 768, name: 'desktop' }
      ]

      for (const size of screenSizes) {
        Object.defineProperty(window, 'innerWidth', { value: size.width })
        Object.defineProperty(window, 'innerHeight', { value: size.height })
        window.dispatchEvent(new Event('resize'))

        render(
          <TestWrapper>
            <Dashboard />
          </TestWrapper>
        )

        // Verify responsive layout
        const container = screen.getByTestId('dashboard-container')
        expect(container).toHaveAttribute('data-screen-size', size.name)
        
        // Clean up for next iteration
        screen.unmount()
      }
    })
  })

  describe('Team Task Assignment and Management', () => {
    it('should validate automatic task assignment', async () => {
      // Mock team-aware processing
      const mockTeamAwareProcessor = await import('../../lib/team-aware-processor')
      vi.mocked(mockTeamAwareProcessor.processWithTeamContext).mockResolvedValue({
        ...mockMeeting,
        actionItems: mockMeeting.actionItems.map(item => ({
          ...item,
          assigneeId: 'test-user-1',
          assigneeName: 'Test User 1'
        }))
      })

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Verify automatic assignment is displayed
      await waitFor(() => {
        expect(screen.getByText('Test User 1')).toBeInTheDocument()
        expect(screen.getByText('Complete project documentation')).toBeInTheDocument()
      })
    })

    it('should handle manual task reassignment', async () => {
      const user = userEvent.setup()
      
      mockDatabase.assignTask.mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <TaskAssignment 
            actionItem={mockMeeting.actionItems[0]}
            teamMembers={[
              ...mockTeam.members,
              { ...mockInvitedUser, status: 'active' }
            ]}
            onAssign={vi.fn()}
          />
        </TestWrapper>
      )

      // Reassign task to different team member
      const reassignButton = screen.getByRole('button', { name: /reassign/i })
      await user.click(reassignButton)

      const memberSelect = screen.getByRole('combobox')
      await user.click(memberSelect)
      
      const newAssignee = screen.getByText('Invited User')
      await user.click(newAssignee)

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      // Verify reassignment
      await waitFor(() => {
        expect(mockDatabase.assignTask).toHaveBeenCalledWith(
          'task-1',
          'test-user-2',
          'test-user-1'
        )
      })
    })

    it('should track task status changes', async () => {
      const user = userEvent.setup()
      
      mockDatabase.updateTaskStatus.mockResolvedValue(undefined)
      
      render(
        <TestWrapper>
          <TaskAssignment 
            actionItem={mockMeeting.actionItems[0]}
            teamMembers={mockTeam.members}
            onAssign={vi.fn()}
          />
        </TestWrapper>
      )

      // Update task status
      const statusSelect = screen.getByRole('combobox', { name: /status/i })
      await user.click(statusSelect)
      
      const completedOption = screen.getByText('Completed')
      await user.click(completedOption)

      // Verify status update
      await waitFor(() => {
        expect(mockDatabase.updateTaskStatus).toHaveBeenCalledWith('task-1', 'completed')
      })
    })

    it('should display team task overview', async () => {
      mockDatabase.getTeamTasks.mockResolvedValue([
        {
          ...mockMeeting.actionItems[0],
          assigneeName: 'Test User 1'
        },
        {
          id: 'task-2',
          description: 'Review project requirements',
          assigneeId: 'test-user-2',
          assigneeName: 'Invited User',
          priority: 'medium',
          status: 'in_progress'
        }
      ])

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Verify team tasks are displayed
      await waitFor(() => {
        expect(screen.getByText('Complete project documentation')).toBeInTheDocument()
        expect(screen.getByText('Review project requirements')).toBeInTheDocument()
        expect(screen.getByText('Test User 1')).toBeInTheDocument()
        expect(screen.getByText('Invited User')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle network failures gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock network failure
      mockDatabase.createTeam.mockRejectedValue(new Error('Network error'))
      
      render(
        <TestWrapper>
          <TeamManagement />
        </TestWrapper>
      )

      const createButton = screen.getByRole('button', { name: /create team/i })
      await user.click(createButton)

      const nameInput = screen.getByLabelText(/team name/i)
      await user.type(nameInput, 'Test Team')
      
      const submitButton = screen.getByRole('button', { name: /create/i })
      await user.click(submitButton)

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/error creating team/i)).toBeInTheDocument()
      })
    })

    it('should handle empty states correctly', async () => {
      // Mock empty data
      mockDatabase.getUserTeams.mockResolvedValue([])
      mockDatabase.getUserMeetings.mockResolvedValue([])
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Verify empty states
      await waitFor(() => {
        expect(screen.getByText(/no teams found/i)).toBeInTheDocument()
        expect(screen.getByText(/no meetings found/i)).toBeInTheDocument()
      })
    })

    it('should validate form inputs', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <TeamManagement />
        </TestWrapper>
      )

      const createButton = screen.getByRole('button', { name: /create team/i })
      await user.click(createButton)

      // Try to submit without required fields
      const submitButton = screen.getByRole('button', { name: /create/i })
      await user.click(submitButton)

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText(/team name is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Accessibility', () => {
    it('should meet accessibility standards', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      // Verify ARIA labels and roles
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label')
      })

      // Verify keyboard navigation
      const focusableElements = screen.getAllByRole('button')
      focusableElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex')
      })
    })

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeMeetingList = Array.from({ length: 100 }, (_, i) => ({
        ...mockMeeting,
        id: `meeting-${i}`,
        title: `Meeting ${i}`
      }))
      
      mockDatabase.getUserMeetings.mockResolvedValue(largeMeetingList)
      
      const startTime = performance.now()
      
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Meeting 0')).toBeInTheDocument()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Verify reasonable render time (less than 1 second)
      expect(renderTime).toBeLessThan(1000)
    })
  })
})