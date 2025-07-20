/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Dashboard from '@/app/dashboard/page'
import { AuthProvider } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock the database service
jest.mock('@/lib/database', () => ({
  databaseService: {
    subscribeToUserMeetings: jest.fn((userId, callback) => {
      // Mock personal and team meetings
      const mockMeetings = [
        {
          id: 'personal-1',
          title: 'Personal Meeting 1',
          date: new Date(),
          summary: 'Personal meeting summary',
          actionItems: [
            { id: 'task-1', description: 'Personal task', status: 'pending' }
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'team-1',
          title: 'Team Meeting 1',
          date: new Date(),
          summary: 'Team meeting summary',
          actionItems: [
            { 
              id: 'task-2', 
              description: 'Team task', 
              status: 'pending',
              assigneeId: 'user-1',
              assigneeName: 'John Doe'
            }
          ],
          teamId: 'team-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ]
      callback(mockMeetings)
      return jest.fn() // unsubscribe function
    }),
    subscribeToUserTeams: jest.fn((userId, callback) => {
      const mockTeams = [
        {
          id: 'team-1',
          name: 'Development Team',
          description: 'Main development team',
          createdBy: 'user-1',
          members: [
            {
              userId: 'user-1',
              email: 'john@example.com',
              displayName: 'John Doe',
              role: 'admin',
              joinedAt: new Date(),
              status: 'active'
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ]
      callback(mockTeams)
      return jest.fn() // unsubscribe function
    }),
    assignTask: jest.fn().mockResolvedValue(true),
  }
}))

// Mock other dependencies
jest.mock('@/lib/gemini', () => ({
  getGeminiService: jest.fn()
}))

jest.mock('@/lib/file-processor', () => ({
  FileProcessor: {
    processFile: jest.fn(),
    sanitizeContent: jest.fn(),
    extractTitle: jest.fn()
  }
}))

jest.mock('@/lib/team-service', () => ({
  getTeamService: jest.fn(() => ({
    matchSpeakerToTeamMember: jest.fn()
  }))
}))

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: jest.fn(() => ({})),
    getInputProps: jest.fn(() => ({})),
    isDragActive: false
  }))
}))

// Mock auth context
const mockUser = {
  uid: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  isAnonymous: false
}

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

// Mock useAuth hook
jest.mock('@/contexts/auth-context', () => ({
  ...jest.requireActual('@/contexts/auth-context'),
  useAuth: () => ({
    user: mockUser,
    loading: false,
    error: null,
    signOut: jest.fn()
  })
}))

describe('Dashboard Team Integration', () => {
  const mockPush = jest.fn()

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })
    jest.clearAllMocks()
  })

  it('should display personal and team meeting tabs', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Personal (1)')).toBeInTheDocument()
      expect(screen.getByText('Team (1)')).toBeInTheDocument()
    })
  })

  it('should show team filter when on team tab', async () => {
    render(<Dashboard />)

    // Click on team tab
    const teamTab = await screen.findByText('Team (1)')
    fireEvent.click(teamTab)

    await waitFor(() => {
      expect(screen.getByText('All Teams')).toBeInTheDocument()
      expect(screen.getByText('Development Team')).toBeInTheDocument()
    })
  })

  it('should display team meetings with team controls for admins', async () => {
    render(<Dashboard />)

    // Click on team tab
    const teamTab = await screen.findByText('Team (1)')
    fireEvent.click(teamTab)

    await waitFor(() => {
      expect(screen.getByText('Team Meeting 1')).toBeInTheDocument()
      expect(screen.getByText('Development Team')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })
  })

  it('should show task assignment controls for team meetings', async () => {
    render(<Dashboard />)

    // Click on team tab
    const teamTab = await screen.findByText('Team (1)')
    fireEvent.click(teamTab)

    await waitFor(() => {
      expect(screen.getByText('Task Assignments')).toBeInTheDocument()
      expect(screen.getByText('Team task')).toBeInTheDocument()
      expect(screen.getByText('Assigned to: John Doe')).toBeInTheDocument()
    })
  })

  it('should display updated stats including team information', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('Total Meetings')).toBeInTheDocument()
      expect(screen.getByText('Personal')).toBeInTheDocument()
      expect(screen.getByText('Team')).toBeInTheDocument()
      expect(screen.getByText('My Tasks')).toBeInTheDocument()
      expect(screen.getByText('My Teams')).toBeInTheDocument()
    })
  })

  it('should show team overview in sidebar', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('My Teams')).toBeInTheDocument()
      expect(screen.getByText('Development Team')).toBeInTheDocument()
      expect(screen.getByText('1 members')).toBeInTheDocument()
      expect(screen.getByText('Manage Teams')).toBeInTheDocument()
    })
  })

  it('should filter meetings correctly when team filter is applied', async () => {
    render(<Dashboard />)

    // Click on team tab
    const teamTab = await screen.findByText('Team (1)')
    fireEvent.click(teamTab)

    // Should show team meeting
    await waitFor(() => {
      expect(screen.getByText('Team Meeting 1')).toBeInTheDocument()
    })

    // Personal meeting should not be visible in team tab
    expect(screen.queryByText('Personal Meeting 1')).not.toBeInTheDocument()
  })
})