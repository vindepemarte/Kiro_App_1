import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TeamManagement } from '../../components/team-management'
import { useAuth } from '../../contexts/auth-context'
import { useMobile } from '../../hooks/use-mobile'
import { Team, User } from '../types'

// Mock dependencies
vi.mock('../../contexts/auth-context')
vi.mock('../../hooks/use-mobile')
vi.mock('../../lib/database')
vi.mock('../../lib/team-service')

const mockUser: User = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  isAnonymous: false,
  customClaims: null
}

const mockTeam: Team = {
  id: 'team-1',
  name: 'Test Team',
  description: 'A test team',
  createdBy: 'test-user-id',
  members: [
    {
      userId: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'admin',
      joinedAt: new Date(),
      status: 'active'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('TeamManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signOut: vi.fn()
    })
    
    // Mock useMobile
    vi.mocked(useMobile).mockReturnValue(false)
  })

  it('should render team management header', () => {
    render(<TeamManagement />)
    
    expect(screen.getByText('Team Management')).toBeInTheDocument()
    expect(screen.getByText('Create and manage your teams for collaborative meeting management')).toBeInTheDocument()
  })

  it('should show create team button', () => {
    render(<TeamManagement />)
    
    expect(screen.getByRole('button', { name: /create team/i })).toBeInTheDocument()
  })

  it('should show loading state initially', () => {
    render(<TeamManagement />)
    
    expect(screen.getByText('Loading teams...')).toBeInTheDocument()
  })

  it('should show empty state when no teams exist', async () => {
    // Mock team service to return empty array
    const mockGetUserTeams = vi.fn().mockResolvedValue([])
    vi.doMock('../../lib/team-service', () => ({
      getTeamService: () => ({
        getUserTeams: mockGetUserTeams,
        createTeam: vi.fn(),
        inviteUserToTeam: vi.fn(),
        removeTeamMember: vi.fn(),
        updateTeamMemberRole: vi.fn(),
        deleteTeam: vi.fn(),
        searchUserByEmail: vi.fn()
      })
    }))

    render(<TeamManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('No teams yet')).toBeInTheDocument()
      expect(screen.getByText('Create your first team to start collaborating on meetings')).toBeInTheDocument()
    })
  })

  it('should open create team dialog when create button is clicked', async () => {
    render(<TeamManagement />)
    
    const createButton = screen.getByRole('button', { name: /create team/i })
    fireEvent.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Create New Team')).toBeInTheDocument()
      expect(screen.getByLabelText('Team Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument()
    })
  })

  it('should show sign in message when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      error: null,
      signOut: vi.fn()
    })

    render(<TeamManagement />)
    
    expect(screen.getByText('Please sign in to manage teams')).toBeInTheDocument()
  })

  it('should render mobile layout when on mobile device', () => {
    vi.mocked(useMobile).mockReturnValue(true)
    
    render(<TeamManagement />)
    
    // Check for mobile-specific classes or layout
    const header = screen.getByText('Team Management')
    expect(header).toHaveClass('text-2xl') // Mobile header size
  })

  it('should render desktop layout when on desktop device', () => {
    vi.mocked(useMobile).mockReturnValue(false)
    
    render(<TeamManagement />)
    
    // Check for desktop-specific classes or layout
    const header = screen.getByText('Team Management')
    expect(header).toHaveClass('text-3xl') // Desktop header size
  })
})

describe('TeamCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
      signOut: vi.fn()
    })
    
    vi.mocked(useMobile).mockReturnValue(false)
  })

  it('should display team information correctly', async () => {
    // Mock team service to return test team
    const mockGetUserTeams = vi.fn().mockResolvedValue([mockTeam])
    vi.doMock('../../lib/team-service', () => ({
      getTeamService: () => ({
        getUserTeams: mockGetUserTeams,
        createTeam: vi.fn(),
        inviteUserToTeam: vi.fn(),
        removeTeamMember: vi.fn(),
        updateTeamMemberRole: vi.fn(),
        deleteTeam: vi.fn(),
        searchUserByEmail: vi.fn()
      })
    }))

    render(<TeamManagement />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Team')).toBeInTheDocument()
      expect(screen.getByText('A test team')).toBeInTheDocument()
      expect(screen.getByText('1 active')).toBeInTheDocument()
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })
  })

  it('should show admin controls for team admin', async () => {
    const mockGetUserTeams = vi.fn().mockResolvedValue([mockTeam])
    vi.doMock('../../lib/team-service', () => ({
      getTeamService: () => ({
        getUserTeams: mockGetUserTeams,
        createTeam: vi.fn(),
        inviteUserToTeam: vi.fn(),
        removeTeamMember: vi.fn(),
        updateTeamMemberRole: vi.fn(),
        deleteTeam: vi.fn(),
        searchUserByEmail: vi.fn()
      })
    }))

    render(<TeamManagement />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument()
    })
  })
})