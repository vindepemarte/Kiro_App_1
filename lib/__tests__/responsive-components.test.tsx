/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { ResponsiveNavigation } from '@/components/responsive-navigation'
import { MobileCard, MeetingCard } from '@/components/ui/mobile-card'
import { ResponsiveGrid, ResponsiveContainer } from '@/components/ui/responsive-grid'
import { useMobile } from '@/hooks/use-mobile'

// Mock the auth context
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-user',
      isAnonymous: false,
      displayName: 'Test User'
    }
  })
}))

// Mock the mobile hook
jest.mock('@/hooks/use-mobile')
const mockUseMobile = useMobile as jest.MockedFunction<typeof useMobile>

describe('Responsive Components', () => {
  beforeEach(() => {
    // Reset window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    
    // Mock mobile detection
    mockUseMobile.mockReturnValue(false)
  })

  describe('ResponsiveNavigation', () => {
    it('renders desktop navigation on large screens', () => {
      mockUseMobile.mockReturnValue(false)
      
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Should show desktop navigation
      expect(screen.getByText('MeetingAI')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })

    it('renders mobile navigation on small screens', () => {
      mockUseMobile.mockReturnValue(true)
      
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Should show mobile hamburger menu
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()
      expect(screen.getByText('MeetingAI')).toBeInTheDocument()
    })

    it('opens mobile menu when hamburger is clicked', () => {
      mockUseMobile.mockReturnValue(true)
      
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      fireEvent.click(hamburgerButton)
      
      // Menu should be open and show navigation items
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })
  })

  describe('MobileCard', () => {
    it('renders card with title and actions', () => {
      const actions = [
        { label: 'Action 1', onClick: jest.fn() },
        { label: 'Action 2', onClick: jest.fn() }
      ]
      
      render(
        <MobileCard title="Test Card" actions={actions}>
          <p>Card content</p>
        </MobileCard>
      )
      
      expect(screen.getByText('Test Card')).toBeInTheDocument()
      expect(screen.getByText('Card content')).toBeInTheDocument()
      expect(screen.getByText('Action 1')).toBeInTheDocument()
      expect(screen.getByText('Action 2')).toBeInTheDocument()
    })

    it('calls action onClick when button is clicked', () => {
      const mockAction = jest.fn()
      const actions = [{ label: 'Test Action', onClick: mockAction }]
      
      render(
        <MobileCard title="Test Card" actions={actions}>
          <p>Content</p>
        </MobileCard>
      )
      
      fireEvent.click(screen.getByText('Test Action'))
      expect(mockAction).toHaveBeenCalled()
    })
  })

  describe('MeetingCard', () => {
    const mockMeeting = {
      id: 'test-meeting',
      title: 'Test Meeting',
      date: new Date('2024-01-01'),
      summary: 'This is a test meeting summary',
      actionItems: [
        { status: 'completed' },
        { status: 'pending' },
        { status: 'completed' }
      ]
    }

    it('renders meeting information correctly', () => {
      const mockViewReport = jest.fn()
      
      render(
        <MeetingCard 
          meeting={mockMeeting} 
          onViewReport={mockViewReport}
        />
      )
      
      expect(screen.getByText('Test Meeting')).toBeInTheDocument()
      expect(screen.getByText('This is a test meeting summary')).toBeInTheDocument()
      expect(screen.getByText('3 action items')).toBeInTheDocument()
      expect(screen.getByText('2 completed')).toBeInTheDocument()
    })

    it('calls onViewReport when View Report button is clicked', () => {
      const mockViewReport = jest.fn()
      
      render(
        <MeetingCard 
          meeting={mockMeeting} 
          onViewReport={mockViewReport}
        />
      )
      
      fireEvent.click(screen.getByText('View Report'))
      expect(mockViewReport).toHaveBeenCalledWith('test-meeting')
    })
  })

  describe('ResponsiveGrid', () => {
    it('renders with default grid classes', () => {
      const { container } = render(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      )
      
      const gridElement = container.firstChild as HTMLElement
      expect(gridElement).toHaveClass('grid')
      expect(gridElement).toHaveClass('grid-cols-1')
      expect(gridElement).toHaveClass('md:grid-cols-2')
      expect(gridElement).toHaveClass('lg:grid-cols-3')
    })

    it('renders with custom column configuration', () => {
      const { container } = render(
        <ResponsiveGrid cols={{ mobile: 2, tablet: 3, desktop: 4 }}>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      )
      
      const gridElement = container.firstChild as HTMLElement
      expect(gridElement).toHaveClass('grid-cols-2')
      expect(gridElement).toHaveClass('md:grid-cols-3')
      expect(gridElement).toHaveClass('lg:grid-cols-4')
    })
  })

  describe('ResponsiveContainer', () => {
    it('renders with default container classes', () => {
      const { container } = render(
        <ResponsiveContainer>
          <div>Content</div>
        </ResponsiveContainer>
      )
      
      const containerElement = container.firstChild as HTMLElement
      expect(containerElement).toHaveClass('mx-auto')
      expect(containerElement).toHaveClass('w-full')
      expect(containerElement).toHaveClass('max-w-xl')
    })

    it('renders with custom max width', () => {
      const { container } = render(
        <ResponsiveContainer maxWidth="2xl">
          <div>Content</div>
        </ResponsiveContainer>
      )
      
      const containerElement = container.firstChild as HTMLElement
      expect(containerElement).toHaveClass('max-w-2xl')
    })
  })
})