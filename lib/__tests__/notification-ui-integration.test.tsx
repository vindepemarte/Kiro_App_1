/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResponsiveNavigation } from '../../components/responsive-navigation';
import { AuthProvider } from '../../contexts/auth-context';
import { notificationService } from '../notification-service';

// Mock the notification service
jest.mock('../notification-service', () => ({
  notificationService: {
    getUserNotifications: jest.fn(),
    subscribeToNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    acceptTeamInvitation: jest.fn(),
    declineTeamInvitation: jest.fn(),
  },
}));

// Mock the auth context
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  isAnonymous: false,
};

const mockAuthContext = {
  user: mockUser,
  loading: false,
  error: null,
  signOut: jest.fn(),
};

jest.mock('../../contexts/auth-context', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the mobile hook
jest.mock('../../hooks/use-mobile', () => ({
  useMobile: () => false, // Test desktop version
}));

// Mock the database service
jest.mock('../database', () => ({
  databaseService: {
    searchUserByEmail: jest.fn(),
    addTeamMember: jest.fn(),
    deleteNotification: jest.fn(),
  },
}));

describe('Notification System UI Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock returns
    (notificationService.getUserNotifications as jest.Mock).mockResolvedValue([]);
    (notificationService.subscribeToNotifications as jest.Mock).mockReturnValue(() => {});
    (notificationService.getUnreadCount as jest.Mock).mockResolvedValue(0);
  });

  it('should render notification button in navigation', () => {
    render(
      <AuthProvider>
        <ResponsiveNavigation currentPage="dashboard" />
      </AuthProvider>
    );

    const notificationButton = screen.getByLabelText('Open notifications');
    expect(notificationButton).toBeInTheDocument();
  });

  it('should show notification badge when there are unread notifications', async () => {
    // Mock unread count
    (notificationService.getUnreadCount as jest.Mock).mockResolvedValue(3);
    
    render(
      <AuthProvider>
        <ResponsiveNavigation currentPage="dashboard" />
      </AuthProvider>
    );

    // Wait for the unread count to be loaded
    await waitFor(() => {
      const badge = screen.getByText('3');
      expect(badge).toBeInTheDocument();
    });
  });

  it('should open notification center when notification button is clicked', async () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        userId: 'test-user-123',
        type: 'team_invitation' as const,
        title: 'Team Invitation',
        message: 'You have been invited to join Team Alpha',
        data: {
          teamId: 'team-123',
          teamName: 'Team Alpha',
          inviterName: 'John Doe',
        },
        read: false,
        createdAt: new Date(),
      },
    ];

    (notificationService.getUserNotifications as jest.Mock).mockResolvedValue(mockNotifications);
    
    render(
      <AuthProvider>
        <ResponsiveNavigation currentPage="dashboard" />
      </AuthProvider>
    );

    const notificationButton = screen.getByLabelText('Open notifications');
    fireEvent.click(notificationButton);

    // Wait for notification center to open and load notifications
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('should handle notification actions correctly', async () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        userId: 'test-user-123',
        type: 'team_invitation' as const,
        title: 'Team Invitation',
        message: 'You have been invited to join Team Alpha',
        data: {
          teamId: 'team-123',
          teamName: 'Team Alpha',
          inviterName: 'John Doe',
        },
        read: false,
        createdAt: new Date(),
      },
    ];

    (notificationService.getUserNotifications as jest.Mock).mockResolvedValue(mockNotifications);
    (notificationService.acceptTeamInvitation as jest.Mock).mockResolvedValue(true);
    (notificationService.declineTeamInvitation as jest.Mock).mockResolvedValue(true);
    
    render(
      <AuthProvider>
        <ResponsiveNavigation currentPage="dashboard" />
      </AuthProvider>
    );

    const notificationButton = screen.getByLabelText('Open notifications');
    fireEvent.click(notificationButton);

    // Wait for notification center to load
    await waitFor(() => {
      expect(screen.getByText('Team Invitation')).toBeInTheDocument();
    });

    // Test accept button
    const acceptButton = screen.getByText('Accept');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(notificationService.acceptTeamInvitation).toHaveBeenCalledWith('notif-1', 'test-user-123');
    });
  });

  it('should show correct badge count format', async () => {
    // Test large numbers
    (notificationService.getUnreadCount as jest.Mock).mockResolvedValue(150);
    
    render(
      <AuthProvider>
        <ResponsiveNavigation currentPage="dashboard" />
      </AuthProvider>
    );

    await waitFor(() => {
      const badge = screen.getByText('99+');
      expect(badge).toBeInTheDocument();
    });
  });

  it('should subscribe to real-time notification updates', () => {
    const mockUnsubscribe = jest.fn();
    (notificationService.subscribeToNotifications as jest.Mock).mockReturnValue(mockUnsubscribe);
    
    const { unmount } = render(
      <AuthProvider>
        <ResponsiveNavigation currentPage="dashboard" />
      </AuthProvider>
    );

    expect(notificationService.subscribeToNotifications).toHaveBeenCalledWith(
      'test-user-123',
      expect.any(Function)
    );

    // Test cleanup
    unmount();
    // Note: In a real test, we'd verify the unsubscribe function is called
  });

  it('should handle notification center close correctly', async () => {
    render(
      <AuthProvider>
        <ResponsiveNavigation currentPage="dashboard" />
      </AuthProvider>
    );

    const notificationButton = screen.getByLabelText('Open notifications');
    fireEvent.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    // Close by clicking the X button
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });
  });
});

describe('Mobile Notification Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock mobile hook to return true
    jest.doMock('../../hooks/use-mobile', () => ({
      useMobile: () => true,
    }));
    
    (notificationService.getUserNotifications as jest.Mock).mockResolvedValue([]);
    (notificationService.subscribeToNotifications as jest.Mock).mockReturnValue(() => {});
    (notificationService.getUnreadCount as jest.Mock).mockResolvedValue(0);
  });

  it('should show notification button in mobile bottom navigation', () => {
    render(
      <AuthProvider>
        <ResponsiveNavigation currentPage="dashboard" />
      </AuthProvider>
    );

    // Should have notification button in bottom nav
    const notificationButtons = screen.getAllByLabelText('Open notifications');
    expect(notificationButtons.length).toBeGreaterThan(0);
  });

  it('should show mobile-optimized notification badge', async () => {
    (notificationService.getUnreadCount as jest.Mock).mockResolvedValue(12);
    
    render(
      <AuthProvider>
        <ResponsiveNavigation currentPage="dashboard" />
      </AuthProvider>
    );

    await waitFor(() => {
      // Mobile shows 9+ for numbers > 9
      const badge = screen.getByText('9+');
      expect(badge).toBeInTheDocument();
    });
  });
});