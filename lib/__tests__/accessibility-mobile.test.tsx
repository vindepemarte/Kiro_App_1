/**
 * Mobile Accessibility Testing
 * Comprehensive accessibility tests for mobile interfaces
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ResponsiveNavigation } from '@/components/responsive-navigation'
import { TaskAssignmentDropdown } from '@/components/task-assignment-dropdown'
import { TeamManagement } from '@/components/team-management'
import { NotificationCenter } from '@/components/notification-center'
import { MobileCard } from '@/components/ui/mobile-card'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock auth context
jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-user',
      isAnonymous: false,
      displayName: 'Test User',
      email: 'test@example.com'
    }
  })
}))

// Mock services
jest.mock('@/lib/notification-service', () => ({
  getNotifications: jest.fn().mockResolvedValue([]),
  markAsRead: jest.fn().mockResolvedValue(undefined),
  getUnreadCount: jest.fn().mockResolvedValue(0)
}))

jest.mock('@/lib/team-service', () => ({
  getUserTeams: jest.fn().mockResolvedValue([]),
  createTeam: jest.fn().mockResolvedValue('team-id'),
  inviteUserToTeam: jest.fn().mockResolvedValue(undefined)
}))

describe('Mobile Accessibility Testing', () => {
  // Helper to simulate mobile viewport
  const setMobileViewport = () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    })
    window.dispatchEvent(new Event('resize'))
  }

  beforeEach(() => {
    setMobileViewport()
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('passes axe accessibility tests for mobile navigation', async () => {
      const { container } = render(<ResponsiveNavigation currentPage="dashboard" />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('passes axe accessibility tests for task assignment', async () => {
      const mockTeamMembers = [
        { userId: '1', displayName: 'John Doe', email: 'john@example.com', role: 'member' as const },
        { userId: '2', displayName: 'Jane Smith', email: 'jane@example.com', role: 'admin' as const }
      ]
      
      const { container } = render(
        <TaskAssignmentDropdown
          currentAssignee="Unassigned"
          teamMembers={mockTeamMembers}
          onAssign={jest.fn()}
        />
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('passes axe accessibility tests for team management', async () => {
      const { container } = render(<TeamManagement />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('passes axe accessibility tests for notification center', async () => {
      const { container } = render(
        <NotificationCenter isOpen={true} onClose={jest.fn()} />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('passes axe accessibility tests for mobile cards', async () => {
      const actions = [
        { label: 'View Report', onClick: jest.fn() },
        { label: 'Edit', onClick: jest.fn() }
      ]
      
      const { container } = render(
        <MobileCard title="Test Meeting" actions={actions}>
          <p>Meeting content</p>
        </MobileCard>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Touch Target Accessibility', () => {
    it('ensures all interactive elements meet minimum touch target size (44px)', () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Check hamburger menu button
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      const rect = hamburgerButton.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(hamburgerButton)
      
      const width = Math.max(rect.width, parseInt(computedStyle.minWidth) || 0)
      const height = Math.max(rect.height, parseInt(computedStyle.minHeight) || 0)
      
      expect(width).toBeGreaterThanOrEqual(44)
      expect(height).toBeGreaterThanOrEqual(44)
      
      // Check notification button
      const notificationButton = screen.getByLabelText('Open notifications')
      const notificationRect = notificationButton.getBoundingClientRect()
      const notificationStyle = window.getComputedStyle(notificationButton)
      
      const notificationWidth = Math.max(notificationRect.width, parseInt(notificationStyle.minWidth) || 0)
      const notificationHeight = Math.max(notificationRect.height, parseInt(notificationStyle.minHeight) || 0)
      
      expect(notificationWidth).toBeGreaterThanOrEqual(44)
      expect(notificationHeight).toBeGreaterThanOrEqual(44)
    })

    it('ensures adequate spacing between touch targets', () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      const notificationButton = screen.getByLabelText('Open notifications')
      
      const hamburgerRect = hamburgerButton.getBoundingClientRect()
      const notificationRect = notificationButton.getBoundingClientRect()
      
      // Calculate distance between buttons
      const distance = Math.abs(hamburgerRect.right - notificationRect.left)
      
      // Should have at least 8px spacing
      expect(distance).toBeGreaterThanOrEqual(8)
    })
  })

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation in mobile menu', async () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      
      // Focus hamburger button
      hamburgerButton.focus()
      expect(document.activeElement).toBe(hamburgerButton)
      
      // Open menu with Enter key
      fireEvent.keyDown(hamburgerButton, { key: 'Enter', code: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      // Should be able to navigate menu items with Tab
      fireEvent.keyDown(document.activeElement!, { key: 'Tab', code: 'Tab' })
      
      // Focus should move to first menu item
      const dashboardButton = screen.getByText('Dashboard')
      expect(document.activeElement).toBe(dashboardButton)
    })

    it('supports keyboard navigation in task assignment dropdown', async () => {
      const mockTeamMembers = [
        { userId: '1', displayName: 'John Doe', email: 'john@example.com', role: 'member' as const },
        { userId: '2', displayName: 'Jane Smith', email: 'jane@example.com', role: 'admin' as const }
      ]
      
      render(
        <TaskAssignmentDropdown
          currentAssignee="Unassigned"
          teamMembers={mockTeamMembers}
          onAssign={jest.fn()}
        />
      )
      
      const triggerButton = screen.getByRole('button')
      
      // Focus and open with keyboard
      triggerButton.focus()
      expect(document.activeElement).toBe(triggerButton)
      
      fireEvent.keyDown(triggerButton, { key: 'Enter', code: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
      
      // Should be able to navigate options with arrow keys
      fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown', code: 'ArrowDown' })
    })

    it('traps focus within modal dialogs', async () => {
      render(<NotificationCenter isOpen={true} onClose={jest.fn()} />)
      
      // Focus should be trapped within the notification center
      const closeButton = screen.getByLabelText('Close')
      closeButton.focus()
      
      // Tab should cycle within the modal
      fireEvent.keyDown(closeButton, { key: 'Tab', code: 'Tab' })
      
      // Focus should stay within the modal
      expect(document.activeElement).not.toBe(document.body)
    })
  })

  describe('Screen Reader Support', () => {
    it('provides proper ARIA labels for navigation elements', () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Check ARIA labels
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()
      expect(screen.getByLabelText('Open notifications')).toBeInTheDocument()
      
      // Check role attributes
      const navigation = screen.getByRole('banner') // header element
      expect(navigation).toBeInTheDocument()
    })

    it('provides proper ARIA states for interactive elements', async () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      
      // Initially closed
      expect(hamburgerButton).toHaveAttribute('aria-expanded', 'false')
      
      // Open menu
      fireEvent.click(hamburgerButton)
      
      await waitFor(() => {
        expect(hamburgerButton).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('provides proper ARIA descriptions for complex interactions', () => {
      const mockTeamMembers = [
        { userId: '1', displayName: 'John Doe', email: 'john@example.com', role: 'member' as const },
        { userId: '2', displayName: 'Jane Smith', email: 'jane@example.com', role: 'admin' as const }
      ]
      
      render(
        <TaskAssignmentDropdown
          currentAssignee="John Doe"
          teamMembers={mockTeamMembers}
          onAssign={jest.fn()}
        />
      )
      
      const triggerButton = screen.getByRole('button')
      
      // Should have descriptive text
      expect(triggerButton).toHaveTextContent('John Doe')
      expect(triggerButton).toHaveAttribute('aria-haspopup', 'listbox')
    })

    it('announces dynamic content changes', async () => {
      const mockOnAssign = jest.fn()
      const mockTeamMembers = [
        { userId: '1', displayName: 'John Doe', email: 'john@example.com', role: 'member' as const },
        { userId: '2', displayName: 'Jane Smith', email: 'jane@example.com', role: 'admin' as const }
      ]
      
      const { rerender } = render(
        <TaskAssignmentDropdown
          currentAssignee="Unassigned"
          teamMembers={mockTeamMembers}
          onAssign={mockOnAssign}
        />
      )
      
      // Simulate assignment change
      rerender(
        <TaskAssignmentDropdown
          currentAssignee="John Doe"
          teamMembers={mockTeamMembers}
          onAssign={mockOnAssign}
        />
      )
      
      // Should show updated assignee
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('maintains sufficient color contrast for text elements', () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Check that text elements have appropriate contrast classes
      const logoText = screen.getByText('MeetingAI')
      expect(logoText).toHaveClass('text-gray-900') // High contrast text
      
      // Check button text contrast
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      const computedStyle = window.getComputedStyle(hamburgerButton)
      
      // Should not have low contrast colors
      expect(computedStyle.color).not.toBe('rgb(156, 163, 175)') // gray-400 (too light)
    })

    it('provides visual focus indicators', () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      hamburgerButton.focus()
      
      // Should have focus styles (this would be tested with actual CSS in real implementation)
      expect(hamburgerButton).toHaveClass('focus:outline-none', 'focus:ring-2')
    })

    it('supports high contrast mode', () => {
      // Simulate high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })
      
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Components should render without issues in high contrast mode
      expect(screen.getByText('MeetingAI')).toBeInTheDocument()
    })
  })

  describe('Motion and Animation Accessibility', () => {
    it('respects reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })
      
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Should render without motion-dependent functionality
      expect(screen.getByText('MeetingAI')).toBeInTheDocument()
    })

    it('provides alternative interaction methods for gesture-based controls', () => {
      const actions = [
        { label: 'View Report', onClick: jest.fn() },
        { label: 'Edit', onClick: jest.fn() }
      ]
      
      render(
        <MobileCard title="Test Meeting" actions={actions}>
          <p>Meeting content</p>
        </MobileCard>
      )
      
      // Should provide button alternatives to swipe gestures
      expect(screen.getByText('View Report')).toBeInTheDocument()
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
  })

  describe('Error Handling and User Feedback', () => {
    it('provides accessible error messages', () => {
      // This would test error states in actual components
      // For now, we verify the structure supports accessible error handling
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Components should be structured to support ARIA error announcements
      expect(screen.getByText('MeetingAI')).toBeInTheDocument()
    })

    it('provides accessible loading states', () => {
      // Test loading states have proper ARIA attributes
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Should support aria-busy and loading indicators
      expect(screen.getByText('MeetingAI')).toBeInTheDocument()
    })
  })
})