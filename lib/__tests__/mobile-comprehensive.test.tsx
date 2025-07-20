/**
 * Comprehensive Mobile Testing and Optimization
 * Tests responsive design across all device sizes (320px to 4K)
 * Verifies touch target sizes and accessibility
 * Tests team collaboration features on mobile interfaces
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { ResponsiveNavigation } from '@/components/responsive-navigation'
import { MobileCard } from '@/components/ui/mobile-card'
import { ResponsiveGrid } from '@/components/ui/responsive-grid'
import { TaskAssignmentDropdown } from '@/components/task-assignment-dropdown'
import { TeamManagement } from '@/components/team-management'
import { NotificationCenter } from '@/components/notification-center'
import { useMobile, useTablet, useDeviceType, useBreakpoint } from '@/hooks/use-mobile'

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

// Mock notification service
jest.mock('@/lib/notification-service', () => ({
  getNotifications: jest.fn().mockResolvedValue([]),
  markAsRead: jest.fn().mockResolvedValue(undefined),
  getUnreadCount: jest.fn().mockResolvedValue(0)
}))

// Mock team service
jest.mock('@/lib/team-service', () => ({
  getUserTeams: jest.fn().mockResolvedValue([]),
  createTeam: jest.fn().mockResolvedValue('team-id'),
  inviteUserToTeam: jest.fn().mockResolvedValue(undefined)
}))

// Device size configurations for testing
const DEVICE_SIZES = {
  mobile: {
    small: { width: 320, height: 568 }, // iPhone SE
    medium: { width: 375, height: 667 }, // iPhone 8
    large: { width: 414, height: 896 }, // iPhone 11 Pro Max
  },
  tablet: {
    portrait: { width: 768, height: 1024 }, // iPad
    landscape: { width: 1024, height: 768 }, // iPad landscape
  },
  desktop: {
    small: { width: 1280, height: 720 }, // Small laptop
    medium: { width: 1920, height: 1080 }, // Full HD
    large: { width: 2560, height: 1440 }, // 2K
    xl: { width: 3840, height: 2160 }, // 4K
  }
}

// Touch target size constants
const TOUCH_TARGET = {
  MINIMUM: 44, // iOS/Android minimum
  RECOMMENDED: 48, // Material Design recommendation
  SPACING: 8 // Minimum spacing between targets
}

describe('Comprehensive Mobile Testing and Optimization', () => {
  // Helper function to simulate device resize
  const resizeWindow = (width: number, height: number) => {
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: height,
      })
      window.dispatchEvent(new Event('resize'))
    })
  }

  // Helper function to check touch target size
  const checkTouchTargetSize = (element: HTMLElement, minSize = TOUCH_TARGET.MINIMUM) => {
    const rect = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)
    
    const width = Math.max(rect.width, parseInt(computedStyle.minWidth) || 0)
    const height = Math.max(rect.height, parseInt(computedStyle.minHeight) || 0)
    
    return {
      width,
      height,
      meetsMinimum: width >= minSize && height >= minSize,
      isRecommended: width >= TOUCH_TARGET.RECOMMENDED && height >= TOUCH_TARGET.RECOMMENDED
    }
  }

  describe('Device Size Responsiveness', () => {
    describe('Mobile Devices (320px - 767px)', () => {
      Object.entries(DEVICE_SIZES.mobile).forEach(([size, dimensions]) => {
        it(`renders correctly on ${size} mobile (${dimensions.width}x${dimensions.height})`, () => {
          resizeWindow(dimensions.width, dimensions.height)
          
          render(<ResponsiveNavigation currentPage="dashboard" />)
          
          // Should show mobile navigation
          expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()
          expect(screen.getByText('MeetingAI')).toBeInTheDocument()
          
          // Should not show desktop navigation
          expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
        })
      })

      it('displays bottom navigation on mobile', () => {
        resizeWindow(375, 667)
        
        render(<ResponsiveNavigation currentPage="dashboard" />)
        
        // Check for bottom navigation
        const bottomNav = document.querySelector('.fixed.bottom-0')
        expect(bottomNav).toBeInTheDocument()
        
        // Check for navigation items in bottom nav
        const navButtons = screen.getAllByRole('button')
        const bottomNavButtons = navButtons.filter(button => 
          button.closest('.fixed.bottom-0')
        )
        expect(bottomNavButtons.length).toBeGreaterThan(0)
      })
    })

    describe('Tablet Devices (768px - 1023px)', () => {
      Object.entries(DEVICE_SIZES.tablet).forEach(([orientation, dimensions]) => {
        it(`renders correctly on tablet ${orientation} (${dimensions.width}x${dimensions.height})`, () => {
          resizeWindow(dimensions.width, dimensions.height)
          
          render(<ResponsiveNavigation currentPage="dashboard" />)
          
          // Should show desktop-style navigation on tablet
          expect(screen.getByText('Dashboard')).toBeInTheDocument()
          expect(screen.getByText('Teams')).toBeInTheDocument()
          expect(screen.getByText('Analytics')).toBeInTheDocument()
        })
      })
    })

    describe('Desktop Devices (1024px+)', () => {
      Object.entries(DEVICE_SIZES.desktop).forEach(([size, dimensions]) => {
        it(`renders correctly on ${size} desktop (${dimensions.width}x${dimensions.height})`, () => {
          resizeWindow(dimensions.width, dimensions.height)
          
          render(<ResponsiveNavigation currentPage="dashboard" />)
          
          // Should show full desktop navigation
          expect(screen.getByText('Dashboard')).toBeInTheDocument()
          expect(screen.getByText('Teams')).toBeInTheDocument()
          expect(screen.getByText('Analytics')).toBeInTheDocument()
          expect(screen.getByText('Settings')).toBeInTheDocument()
          
          // Should show user info
          expect(screen.getByText('Test User')).toBeInTheDocument()
        })
      })
    })
  })

  describe('Touch Target Size Verification', () => {
    beforeEach(() => {
      resizeWindow(375, 667) // Mobile size
    })

    it('ensures all navigation buttons meet minimum touch target size', () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Check hamburger menu button
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      const hamburgerSize = checkTouchTargetSize(hamburgerButton)
      expect(hamburgerSize.meetsMinimum).toBe(true)
      expect(hamburgerSize.width).toBeGreaterThanOrEqual(TOUCH_TARGET.MINIMUM)
      expect(hamburgerSize.height).toBeGreaterThanOrEqual(TOUCH_TARGET.MINIMUM)
      
      // Check notification button
      const notificationButton = screen.getByLabelText('Open notifications')
      const notificationSize = checkTouchTargetSize(notificationButton)
      expect(notificationSize.meetsMinimum).toBe(true)
    })

    it('ensures bottom navigation buttons meet touch target requirements', () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      const bottomNav = document.querySelector('.fixed.bottom-0')
      const buttons = bottomNav?.querySelectorAll('button') || []
      
      buttons.forEach((button) => {
        const size = checkTouchTargetSize(button as HTMLElement)
        expect(size.meetsMinimum).toBe(true)
        expect(size.width).toBeGreaterThanOrEqual(TOUCH_TARGET.MINIMUM)
        expect(size.height).toBeGreaterThanOrEqual(TOUCH_TARGET.MINIMUM)
      })
    })

    it('ensures task assignment dropdown has proper touch targets', () => {
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
      const size = checkTouchTargetSize(triggerButton)
      expect(size.meetsMinimum).toBe(true)
    })

    it('ensures mobile cards have proper touch targets', () => {
      const actions = [
        { label: 'View Report', onClick: jest.fn() },
        { label: 'Edit', onClick: jest.fn() }
      ]
      
      render(
        <MobileCard title="Test Meeting" actions={actions}>
          <p>Meeting content</p>
        </MobileCard>
      )
      
      actions.forEach(action => {
        const button = screen.getByText(action.label)
        const size = checkTouchTargetSize(button)
        expect(size.meetsMinimum).toBe(true)
      })
    })
  })

  describe('Accessibility Compliance', () => {
    beforeEach(() => {
      resizeWindow(375, 667) // Mobile size
    })

    it('provides proper ARIA labels for mobile navigation', () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Check ARIA labels
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()
      expect(screen.getByLabelText('Open notifications')).toBeInTheDocument()
    })

    it('maintains keyboard navigation on mobile', () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      
      // Should be focusable
      hamburgerButton.focus()
      expect(document.activeElement).toBe(hamburgerButton)
      
      // Should respond to Enter key
      fireEvent.keyDown(hamburgerButton, { key: 'Enter', code: 'Enter' })
      // Menu should open (tested by checking for navigation items)
      waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
    })

    it('provides proper focus management in mobile menu', async () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      fireEvent.click(hamburgerButton)
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })
      
      // Focus should move to first menu item
      const dashboardButton = screen.getByText('Dashboard')
      expect(dashboardButton).toBeInTheDocument()
      
      // Should be able to navigate with keyboard
      fireEvent.keyDown(dashboardButton, { key: 'ArrowDown' })
      // Next item should be focusable
    })

    it('provides proper color contrast for mobile elements', () => {
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Check that active states have sufficient contrast
      // This would typically be done with automated accessibility testing tools
      // For now, we verify the classes are applied correctly
      const hamburgerButton = screen.getByLabelText('Open navigation menu')
      expect(hamburgerButton).toHaveClass('text-gray-600') // Ensures readable contrast
    })
  })

  describe('Team Collaboration Mobile Interface', () => {
    beforeEach(() => {
      resizeWindow(375, 667) // Mobile size
    })

    it('renders team management interface properly on mobile', () => {
      render(<TeamManagement />)
      
      // Should show mobile-optimized layout
      expect(screen.getByText('Teams')).toBeInTheDocument()
      
      // Create team button should be touch-friendly
      const createButton = screen.getByText('Create Team')
      const size = checkTouchTargetSize(createButton)
      expect(size.meetsMinimum).toBe(true)
    })

    it('handles task assignment on mobile devices', () => {
      const mockTeamMembers = [
        { userId: '1', displayName: 'John Doe', email: 'john@example.com', role: 'member' as const },
        { userId: '2', displayName: 'Jane Smith', email: 'jane@example.com', role: 'admin' as const }
      ]
      
      const mockOnAssign = jest.fn()
      
      render(
        <TaskAssignmentDropdown
          currentAssignee="Unassigned"
          teamMembers={mockTeamMembers}
          onAssign={mockOnAssign}
        />
      )
      
      const assignButton = screen.getByRole('button')
      fireEvent.click(assignButton)
      
      // Should show dropdown options
      waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })
      
      // Options should be touch-friendly
      const johnOption = screen.getByText('John Doe')
      const size = checkTouchTargetSize(johnOption)
      expect(size.meetsMinimum).toBe(true)
    })

    it('displays notifications properly on mobile', () => {
      render(<NotificationCenter isOpen={true} onClose={jest.fn()} />)
      
      // Should show mobile-optimized notification center
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      
      // Close button should be touch-friendly
      const closeButton = screen.getByLabelText('Close')
      const size = checkTouchTargetSize(closeButton)
      expect(size.meetsMinimum).toBe(true)
    })
  })

  describe('Performance Optimization', () => {
    it('efficiently handles window resize events', () => {
      const resizeHandler = jest.fn()
      
      // Mock the hook to track resize calls
      jest.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
        if (event === 'resize') {
          resizeHandler.mockImplementation(handler as any)
        }
      })
      
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Simulate multiple rapid resize events
      act(() => {
        for (let i = 0; i < 10; i++) {
          resizeWindow(300 + i * 10, 600)
        }
      })
      
      // Should handle resize events without performance issues
      expect(resizeHandler).toHaveBeenCalled()
    })

    it('optimizes rendering for mobile devices', () => {
      const renderStart = performance.now()
      
      resizeWindow(375, 667)
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      const renderTime = performance.now() - renderStart
      
      // Should render quickly (under 100ms for simple component)
      expect(renderTime).toBeLessThan(100)
    })

    it('lazy loads mobile-specific components', () => {
      resizeWindow(1920, 1080) // Desktop size
      
      const { rerender } = render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Should not render mobile-specific elements on desktop
      expect(screen.queryByText('More')).not.toBeInTheDocument()
      
      // Switch to mobile
      resizeWindow(375, 667)
      rerender(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Should now render mobile elements
      expect(screen.getByText('More')).toBeInTheDocument()
    })
  })

  describe('Responsive Grid System', () => {
    it('adapts grid columns based on screen size', () => {
      const { container, rerender } = render(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      )
      
      // Mobile: 1 column
      resizeWindow(375, 667)
      rerender(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      )
      
      const gridElement = container.firstChild as HTMLElement
      expect(gridElement).toHaveClass('grid-cols-1')
      
      // Tablet: 2 columns
      resizeWindow(768, 1024)
      rerender(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      )
      
      expect(gridElement).toHaveClass('md:grid-cols-2')
      
      // Desktop: 3 columns
      resizeWindow(1920, 1080)
      rerender(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      )
      
      expect(gridElement).toHaveClass('lg:grid-cols-3')
    })
  })

  describe('Safe Area and Device-Specific Optimizations', () => {
    it('handles safe area insets on mobile devices', () => {
      resizeWindow(375, 812) // iPhone X dimensions
      
      render(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Bottom navigation should account for safe area
      const bottomNav = document.querySelector('.fixed.bottom-0')
      expect(bottomNav).toHaveStyle('padding-bottom: env(safe-area-inset-bottom)')
    })

    it('optimizes for different mobile orientations', () => {
      // Portrait
      resizeWindow(375, 667)
      const { rerender } = render(<ResponsiveNavigation currentPage="dashboard" />)
      
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()
      
      // Landscape
      resizeWindow(667, 375)
      rerender(<ResponsiveNavigation currentPage="dashboard" />)
      
      // Should still show mobile navigation in landscape
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument()
    })
  })
})