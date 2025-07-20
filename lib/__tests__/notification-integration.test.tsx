// Integration tests for notification system with UI components

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationCenter, useNotificationCount } from '../../components/notification-center';
import { notificationService } from '../notification-service';
import { useAuth } from '../../contexts/auth-context';
import { Notification } from '../types';

// Mock the notification service
vi.mock('../notification-service', () => ({
  notificationService: {
    getUserNotifications: vi.fn(),
    subscribeToNotifications: vi.fn(),
    markAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    acceptTeamInvitation: vi.fn(),
    declineTeamInvitation: vi.fn(),
    getUnreadCount: vi.fn(),
  }
}));

// Mock the auth context
vi.mock('../../contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

// Mock the toast hook
vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockUser = {
  uid: 'user123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  isAnonymous: false,
  customClaims: null,
};

const mockNotifications: Notification[] = [
  {
    id: 'notification1',
    userId: 'user123',
    type: 'team_invitation',
    title: 'Team Invitation',
    message: 'John Doe invited you to join the team "Test Team"',
    data: {
      teamId: 'team123',
      teamName: 'Test Team',
      inviterId: 'inviter123',
      inviterName: 'John Doe',
    },
    read: false,
    createdAt: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'notification2',
    userId: 'user123',
    type: 'task_assignment',
    title: 'New Task Assignment',
    message: 'You have been assigned a task: "Complete the report"',
    data: {
      taskId: 'task123',
      taskDescription: 'Complete the report',
      meetingTitle: 'Weekly Standup',
    },
    read: true,
    createdAt: new Date('2024-01-01T09:00:00Z'),
  },
];

describe('Notification Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    });
  });

  describe('NotificationCenter', () => {
    it('should render notifications when open', async () => {
      vi.mocked(notificationService.getUserNotifications).mockResolvedValue(mockNotifications);
      vi.mocked(notificationService.subscribeToNotifications).mockReturnValue(() => {});

      render(<NotificationCenter isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });

      // Wait for notifications to load
      await waitFor(() => {
        expect(screen.getByText('Team Invitation')).toBeInTheDocument();
        expect(screen.getByText('New Task Assignment')).toBeInTheDocument();
      });

      expect(screen.getByText('John Doe invited you to join the team "Test Team"')).toBeInTheDocument();
      expect(screen.getByText('You have been assigned a task: "Complete the report"')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<NotificationCenter isOpen={false} onClose={() => {}} />);
      
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    });

    it('should show empty state when no notifications', async () => {
      vi.mocked(notificationService.getUserNotifications).mockResolvedValue([]);
      vi.mocked(notificationService.subscribeToNotifications).mockReturnValue(() => {});

      render(<NotificationCenter isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      });
    });

    it('should handle accept team invitation', async () => {
      vi.mocked(notificationService.getUserNotifications).mockResolvedValue(mockNotifications);
      vi.mocked(notificationService.subscribeToNotifications).mockReturnValue(() => {});
      vi.mocked(notificationService.acceptTeamInvitation).mockResolvedValue(true);

      render(<NotificationCenter isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText('Team Invitation')).toBeInTheDocument();
      });

      const acceptButton = screen.getByText('Accept');
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(notificationService.acceptTeamInvitation).toHaveBeenCalledWith('notification1', 'user123');
      });
    });

    it('should handle decline team invitation', async () => {
      vi.mocked(notificationService.getUserNotifications).mockResolvedValue(mockNotifications);
      vi.mocked(notificationService.subscribeToNotifications).mockReturnValue(() => {});
      vi.mocked(notificationService.declineTeamInvitation).mockResolvedValue(true);

      render(<NotificationCenter isOpen={true} onClose={() => {}} />);

      await waitFor(() => {
        expect(screen.getByText('Team Invitation')).toBeInTheDocument();
      });

      const declineButton = screen.getByText('Decline');
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(notificationService.declineTeamInvitation).toHaveBeenCalledWith('notification1');
      });
    });
  });

  describe('useNotificationCount hook', () => {
    it('should return correct unread count', async () => {
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(3);
      vi.mocked(notificationService.subscribeToNotifications).mockReturnValue(() => {});

      let hookResult: number;
      
      function TestComponent() {
        hookResult = useNotificationCount();
        return <div>Count: {hookResult}</div>;
      }

      render(<TestComponent />);

      await waitFor(() => {
        expect(hookResult!).toBe(3);
      });
    });

    it('should update count on real-time changes', async () => {
      let subscriptionCallback: ((notifications: Notification[]) => void) | undefined;
      
      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(1);
      vi.mocked(notificationService.subscribeToNotifications).mockImplementation((userId, callback) => {
        subscriptionCallback = callback;
        return () => {};
      });

      let hookResult: number;
      
      function TestComponent() {
        hookResult = useNotificationCount();
        return <div>Count: {hookResult}</div>;
      }

      render(<TestComponent />);

      await waitFor(() => {
        expect(hookResult!).toBe(1);
      });

      // Simulate real-time update
      const updatedNotifications = [
        ...mockNotifications,
        {
          id: 'notification3',
          userId: 'user123',
          type: 'task_assignment',
          title: 'Another Task',
          message: 'Another task assigned',
          data: {},
          read: false,
          createdAt: new Date(),
        }
      ];

      if (subscriptionCallback) {
        subscriptionCallback(updatedNotifications);
      }

      await waitFor(() => {
        expect(hookResult!).toBe(2); // Two unread notifications
      });
    });
  });
});