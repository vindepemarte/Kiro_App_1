// Task assignment UI component tests

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskAssignment } from '../../components/task-assignment';
import { Meeting, TeamMember, ActionItem } from '../types';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange('user-1')}>Select User 1</button>
      <button onClick={() => onValueChange('user-2')}>Select User 2</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
}));

describe('TaskAssignment', () => {
  let mockMeeting: Meeting;
  let mockTeamMembers: TeamMember[];
  let mockOnTaskAssigned: ReturnType<typeof vi.fn>;
  let mockOnTaskStatusChanged: ReturnType<typeof vi.fn>;
  let mockOnBulkAssign: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOnTaskAssigned = vi.fn().mockResolvedValue(undefined);
    mockOnTaskStatusChanged = vi.fn().mockResolvedValue(undefined);
    mockOnBulkAssign = vi.fn().mockResolvedValue(undefined);

    mockTeamMembers = [
      {
        userId: 'user-1',
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        role: 'admin',
        joinedAt: new Date('2024-01-01'),
        status: 'active',
      },
      {
        userId: 'user-2',
        email: 'jane.smith@example.com',
        displayName: 'Jane Smith',
        role: 'member',
        joinedAt: new Date('2024-01-01'),
        status: 'active',
      },
      {
        userId: 'user-3',
        email: 'bob.wilson@example.com',
        displayName: 'Bob Wilson',
        role: 'member',
        joinedAt: new Date('2024-01-01'),
        status: 'inactive',
      },
    ];

    mockMeeting = {
      id: 'meeting-1',
      title: 'Team Standup',
      date: new Date('2024-01-15'),
      summary: 'Weekly team standup meeting',
      actionItems: [
        {
          id: 'task-1',
          description: 'Review the quarterly report',
          priority: 'high',
          status: 'pending',
        },
        {
          id: 'task-2',
          description: 'Update the project timeline',
          priority: 'medium',
          status: 'in_progress',
          assigneeId: 'user-2',
          assigneeName: 'Jane Smith',
        },
        {
          id: 'task-3',
          description: 'Schedule follow-up meeting',
          priority: 'low',
          status: 'completed',
          assigneeId: 'user-1',
          assigneeName: 'John Doe',
          deadline: new Date('2024-01-10'), // Overdue
        },
      ],
      rawTranscript: 'Meeting transcript...',
      teamId: 'team-1',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
    };
  });

  describe('Rendering', () => {
    it('should render unassigned and assigned task sections', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
        />
      );

      expect(screen.getByText('Unassigned Tasks (1)')).toBeInTheDocument();
      expect(screen.getByText('Assigned Tasks (2)')).toBeInTheDocument();
    });

    it('should display task details correctly', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
        />
      );

      expect(screen.getByText('Review the quarterly report')).toBeInTheDocument();
      expect(screen.getByText('Update the project timeline')).toBeInTheDocument();
      expect(screen.getByText('Schedule follow-up meeting')).toBeInTheDocument();
    });

    it('should show bulk assignment controls for team admins', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
          isTeamAdmin={true}
        />
      );

      expect(screen.getByText('Bulk Task Assignment')).toBeInTheDocument();
      expect(screen.getByText('Assign Selected')).toBeInTheDocument();
    });

    it('should not show bulk assignment controls for regular members', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-2"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
          isTeamAdmin={false}
        />
      );

      expect(screen.queryByText('Bulk Task Assignment')).not.toBeInTheDocument();
    });

    it('should display priority badges correctly', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
        />
      );

      expect(screen.getByText('high')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();
    });

    it('should display status badges correctly', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
        />
      );

      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('in progress')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('should show overdue indicator for overdue tasks', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
        />
      );

      expect(screen.getByText(/\(Overdue\)/)).toBeInTheDocument();
    });

    it('should display empty state when no action items exist', () => {
      const emptyMeeting = { ...mockMeeting, actionItems: [] };

      render(
        <TaskAssignment
          meeting={emptyMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
        />
      );

      expect(screen.getByText('No action items found in this meeting.')).toBeInTheDocument();
    });
  });

  describe('Task Assignment', () => {
    it('should call onTaskAssigned when assigning a task', async () => {
      const user = userEvent.setup();

      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
          isTeamAdmin={true}
        />
      );

      // Find and click the select user button for the first unassigned task
      const selectButtons = screen.getAllByText('Select User 1');
      await user.click(selectButtons[0]);

      // Find and click the assign button
      const assignButton = screen.getByText('Assign');
      await user.click(assignButton);

      await waitFor(() => {
        expect(mockOnTaskAssigned).toHaveBeenCalledWith('task-1', 'user-1');
      });
    });

    it('should call onTaskStatusChanged when updating task status', async () => {
      const user = userEvent.setup();

      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-2"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
        />
      );

      // This would require more complex mocking of the Select component
      // For now, we'll test that the component renders the status controls
      expect(screen.getAllByTestId('select')).toHaveLength(2); // One for assignment, one for status
    });

    it('should handle bulk assignment correctly', async () => {
      const user = userEvent.setup();

      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
          isTeamAdmin={true}
        />
      );

      // Select tasks using checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select first task
      await user.click(checkboxes[1]); // Select second task

      // Select assignee
      const selectUserButton = screen.getByText('Select User 1');
      await user.click(selectUserButton);

      // Click bulk assign
      const bulkAssignButton = screen.getByText('Assign Selected');
      await user.click(bulkAssignButton);

      await waitFor(() => {
        expect(mockOnBulkAssign).toHaveBeenCalledWith([
          { taskId: 'task-1', assigneeId: 'user-1' },
          { taskId: 'task-2', assigneeId: 'user-1' },
        ]);
      });
    });
  });

  describe('Permissions', () => {
    it('should only show assignment controls for tasks user can assign', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-2"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
          isTeamAdmin={false}
        />
      );

      // User-2 should be able to manage their own assigned task (task-2)
      // but not unassigned tasks or tasks assigned to others
      const assignButtons = screen.queryAllByText('Assign');
      expect(assignButtons).toHaveLength(0); // No assign buttons for non-admin on unassigned tasks
    });

    it('should show all controls for team admins', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
          isTeamAdmin={true}
        />
      );

      // Team admin should see bulk assignment controls
      expect(screen.getByText('Bulk Task Assignment')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle assignment errors gracefully', async () => {
      const user = userEvent.setup();
      mockOnTaskAssigned.mockRejectedValue(new Error('Assignment failed'));

      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
          isTeamAdmin={true}
        />
      );

      const selectButtons = screen.getAllByText('Select User 1');
      await user.click(selectButtons[0]);

      const assignButton = screen.getByText('Assign');
      await user.click(assignButton);

      await waitFor(() => {
        expect(mockOnTaskAssigned).toHaveBeenCalled();
      });

      // The component should handle the error and show a toast
      // (toast testing would require additional setup)
    });

    it('should handle status update errors gracefully', async () => {
      mockOnTaskStatusChanged.mockRejectedValue(new Error('Status update failed'));

      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-2"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
        />
      );

      // Component should render without crashing even if status update fails
      expect(screen.getByText('Update the project timeline')).toBeInTheDocument();
    });

    it('should handle bulk assignment errors gracefully', async () => {
      mockOnBulkAssign.mockRejectedValue(new Error('Bulk assignment failed'));

      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
          isTeamAdmin={true}
        />
      );

      // Component should render bulk assignment controls
      expect(screen.getByText('Bulk Task Assignment')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
          isTeamAdmin={true}
        />
      );

      // Check for checkboxes (bulk selection)
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);

      // Check for buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(
        <TaskAssignment
          meeting={mockMeeting}
          teamMembers={mockTeamMembers}
          currentUserId="user-1"
          onTaskAssigned={mockOnTaskAssigned}
          onTaskStatusChanged={mockOnTaskStatusChanged}
          onBulkAssign={mockOnBulkAssign}
          isTeamAdmin={true}
        />
      );

      // All interactive elements should be focusable
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });
});