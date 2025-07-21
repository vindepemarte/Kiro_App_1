// Team task management service for admin task reassignment and team task operations

import { 
  Meeting, 
  ActionItem, 
  TaskWithContext, 
  Team, 
  TeamMember, 
  User 
} from './types';
import { DatabaseService } from './database';
import { TaskManagementService } from './task-management-service';
import { ErrorHandler, AppError, retryOperation } from './error-handler';

export interface TeamTaskManagementService {
  // Task reassignment by team admins
  reassignTaskToTeamMember(
    taskId: string, 
    meetingId: string, 
    newAssigneeId: string, 
    reassignedBy: string, 
    teamId: string
  ): Promise<void>;
  
  // Bulk task reassignment
  bulkReassignTasks(
    taskIds: string[], 
    meetingId: string, 
    newAssigneeId: string, 
    reassignedBy: string, 
    teamId: string
  ): Promise<void>;
  
  // Get team task assignment history
  getTaskAssignmentHistory(taskId: string, meetingId: string): Promise<TaskAssignmentHistory[]>;
  
  // Team task analytics
  getTeamTaskAnalytics(teamId: string): Promise<TeamTaskAnalytics>;
  
  // Auto-assign unassigned tasks in team meetings
  autoAssignUnassignedTasks(meetingId: string, teamId: string, assignedBy: string): Promise<void>;
  
  // Get team workload distribution
  getTeamWorkloadDistribution(teamId: string): Promise<TeamWorkloadDistribution>;
  
  // Permission checks
  canUserReassignTasks(userId: string, teamId: string): Promise<boolean>;
  canUserManageTeamTasks(userId: string, teamId: string): Promise<boolean>;
}

export interface TaskAssignmentHistory {
  taskId: string;
  previousAssigneeId?: string;
  previousAssigneeName?: string;
  newAssigneeId: string;
  newAssigneeName: string;
  reassignedBy: string;
  reassignedByName: string;
  reassignedAt: Date;
  reason?: string;
}

export interface TeamTaskAnalytics {
  totalTasks: number;
  assignedTasks: number;
  unassignedTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksByMember: { memberId: string; memberName: string; taskCount: number; completedCount: number }[];
  tasksByPriority: { priority: string; count: number }[];
  averageCompletionTime: number; // in days
  taskCompletionRate: number; // percentage
}

export interface TeamWorkloadDistribution {
  teamId: string;
  teamName: string;
  members: {
    memberId: string;
    memberName: string;
    activeTasks: number;
    completedTasks: number;
    overdueTasks: number;
    workloadScore: number; // calculated based on task priority and count
  }[];
  recommendations: {
    overloadedMembers: string[];
    underutilizedMembers: string[];
    suggestedReassignments: {
      taskId: string;
      fromMember: string;
      toMember: string;
      reason: string;
    }[];
  };
}

export class TeamTaskManagementServiceImpl implements TeamTaskManagementService {
  constructor(
    private databaseService: DatabaseService,
    private taskService: TaskManagementService
  ) {}

  // Reassign task to a different team member (admin only)
  async reassignTaskToTeamMember(
    taskId: string,
    meetingId: string,
    newAssigneeId: string,
    reassignedBy: string,
    teamId: string
  ): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!taskId?.trim() || !meetingId?.trim() || !newAssigneeId?.trim() || !reassignedBy?.trim() || !teamId?.trim()) {
          throw new AppError('Missing required parameters for task reassignment', 'VALIDATION_ERROR', false, 'All parameters are required');
        }

        // Check if user has permission to reassign tasks
        const canReassign = await this.canUserReassignTasks(reassignedBy, teamId);
        if (!canReassign) {
          throw new AppError('Permission denied', 'PERMISSION_DENIED', false, 'Only team admins can reassign tasks');
        }

        // Get team to validate new assignee is a team member
        const team = await this.databaseService.getTeamById(teamId);
        if (!team) {
          throw new AppError('Team not found', 'NOT_FOUND', false, 'Team not found');
        }

        // Validate new assignee is an active team member
        const newAssignee = team.members.find(member => 
          member.userId === newAssigneeId && member.status === 'active'
        );
        if (!newAssignee) {
          throw new AppError('Invalid assignee', 'VALIDATION_ERROR', false, 'New assignee must be an active team member');
        }

        // Get current meeting to check task exists
        const meeting = await this.databaseService.getMeetingById(meetingId, reassignedBy);
        if (!meeting) {
          throw new AppError('Meeting not found', 'NOT_FOUND', false, 'Meeting not found');
        }

        // Find the task in the meeting
        const taskIndex = meeting.actionItems.findIndex(item => item.id === taskId);
        if (taskIndex === -1) {
          throw new AppError('Task not found', 'NOT_FOUND', false, 'Task not found in meeting');
        }

        const currentTask = meeting.actionItems[taskIndex];

        // Use the task service to reassign the task
        await this.taskService.reassignTask(taskId, meetingId, newAssigneeId, reassignedBy);

        // Record assignment history (this would be stored in a separate collection in a full implementation)
        const historyEntry: TaskAssignmentHistory = {
          taskId: taskId,
          previousAssigneeId: currentTask.assigneeId,
          previousAssigneeName: currentTask.assigneeName,
          newAssigneeId: newAssigneeId,
          newAssigneeName: newAssignee.displayName,
          reassignedBy: reassignedBy,
          reassignedByName: team.members.find(m => m.userId === reassignedBy)?.displayName || 'Admin',
          reassignedAt: new Date(),
          reason: 'Manual reassignment by team admin'
        };

        console.log(`Task ${taskId} reassigned from ${currentTask.assigneeName} to ${newAssignee.displayName} by admin`);

        // Send notifications about the reassignment
        await this.sendTaskReassignmentNotifications(historyEntry, meeting.title, teamId);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Reassign Task To Team Member');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'PERMISSION_DENIED', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Bulk reassign multiple tasks
  async bulkReassignTasks(
    taskIds: string[],
    meetingId: string,
    newAssigneeId: string,
    reassignedBy: string,
    teamId: string
  ): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!taskIds?.length || !meetingId?.trim() || !newAssigneeId?.trim() || !reassignedBy?.trim() || !teamId?.trim()) {
          throw new AppError('Missing required parameters for bulk task reassignment', 'VALIDATION_ERROR', false, 'All parameters are required');
        }

        // Check permissions once for all tasks
        const canReassign = await this.canUserReassignTasks(reassignedBy, teamId);
        if (!canReassign) {
          throw new AppError('Permission denied', 'PERMISSION_DENIED', false, 'Only team admins can reassign tasks');
        }

        // Reassign tasks one by one
        const results = [];
        for (const taskId of taskIds) {
          try {
            await this.reassignTaskToTeamMember(taskId, meetingId, newAssigneeId, reassignedBy, teamId);
            results.push({ taskId, success: true });
          } catch (error) {
            console.error(`Failed to reassign task ${taskId}:`, error);
            results.push({ taskId, success: false, error: error.message });
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        console.log(`Bulk reassignment completed: ${successCount} successful, ${failureCount} failed`);

        if (failureCount > 0) {
          throw new AppError(
            `Bulk reassignment partially failed: ${successCount}/${results.length} tasks reassigned`,
            'PARTIAL_FAILURE',
            false,
            `${successCount} tasks were reassigned successfully, but ${failureCount} failed`
          );
        }

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Bulk Reassign Tasks');
      }
    }, {
      maxRetries: 1, // Don't retry bulk operations
      retryCondition: () => false
    });
  }

  // Get task assignment history (placeholder - would need separate collection in full implementation)
  async getTaskAssignmentHistory(taskId: string, meetingId: string): Promise<TaskAssignmentHistory[]> {
    try {
      // This is a placeholder implementation
      // In a full system, this would query a separate task_assignment_history collection
      console.log(`Getting assignment history for task ${taskId} in meeting ${meetingId}`);
      return [];
    } catch (error) {
      console.error('Error getting task assignment history:', error);
      return [];
    }
  }

  // Get team task analytics
  async getTeamTaskAnalytics(teamId: string): Promise<TeamTaskAnalytics> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Please provide a valid team ID');
        }

        // Get team and team tasks
        const [team, teamTasks] = await Promise.all([
          this.databaseService.getTeamById(teamId),
          this.taskService.getTeamTasks(teamId)
        ]);

        if (!team) {
          throw new AppError('Team not found', 'NOT_FOUND', false, 'Team not found');
        }

        // Calculate analytics
        const totalTasks = teamTasks.length;
        const assignedTasks = teamTasks.filter(task => task.assigneeId).length;
        const unassignedTasks = totalTasks - assignedTasks;
        const completedTasks = teamTasks.filter(task => task.status === 'completed').length;
        const overdueTasks = teamTasks.filter(task => 
          task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed'
        ).length;

        // Tasks by member
        const tasksByMember = team.members
          .filter(member => member.status === 'active')
          .map(member => {
            const memberTasks = teamTasks.filter(task => task.assigneeId === member.userId);
            const completedCount = memberTasks.filter(task => task.status === 'completed').length;
            
            return {
              memberId: member.userId,
              memberName: member.displayName,
              taskCount: memberTasks.length,
              completedCount: completedCount
            };
          });

        // Tasks by priority
        const priorityCounts = new Map<string, number>();
        teamTasks.forEach(task => {
          priorityCounts.set(task.priority, (priorityCounts.get(task.priority) || 0) + 1);
        });

        const tasksByPriority = Array.from(priorityCounts.entries()).map(([priority, count]) => ({
          priority,
          count
        }));

        // Calculate completion rate
        const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Calculate average completion time (simplified - would need task completion timestamps)
        const averageCompletionTime = 3; // Placeholder - would calculate from actual data

        const analytics: TeamTaskAnalytics = {
          totalTasks,
          assignedTasks,
          unassignedTasks,
          completedTasks,
          overdueTasks,
          tasksByMember,
          tasksByPriority,
          averageCompletionTime,
          taskCompletionRate: Math.round(taskCompletionRate * 10) / 10
        };

        return analytics;

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get Team Task Analytics');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Auto-assign unassigned tasks in team meetings
  async autoAssignUnassignedTasks(meetingId: string, teamId: string, assignedBy: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Check permissions
        const canAssign = await this.canUserManageTeamTasks(assignedBy, teamId);
        if (!canAssign) {
          throw new AppError('Permission denied', 'PERMISSION_DENIED', false, 'Only team admins can auto-assign tasks');
        }

        // Get meeting and team
        const [meeting, team] = await Promise.all([
          this.databaseService.getMeetingById(meetingId, assignedBy),
          this.databaseService.getTeamById(teamId)
        ]);

        if (!meeting) {
          throw new AppError('Meeting not found', 'NOT_FOUND', false, 'Meeting not found');
        }

        if (!team) {
          throw new AppError('Team not found', 'NOT_FOUND', false, 'Team not found');
        }

        // Use the task service's auto-assignment functionality
        await this.taskService.autoAssignTasksToTeamMembers(meeting, team);

        console.log(`Auto-assigned unassigned tasks in meeting ${meetingId} for team ${teamId}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Auto Assign Unassigned Tasks');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'PERMISSION_DENIED', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Get team workload distribution
  async getTeamWorkloadDistribution(teamId: string): Promise<TeamWorkloadDistribution> {
    return await retryOperation(async () => {
      try {
        // Get team and analytics
        const [team, analytics] = await Promise.all([
          this.databaseService.getTeamById(teamId),
          this.getTeamTaskAnalytics(teamId)
        ]);

        if (!team) {
          throw new AppError('Team not found', 'NOT_FOUND', false, 'Team not found');
        }

        // Calculate workload scores and generate recommendations
        const members = analytics.tasksByMember.map(member => {
          const activeTasks = member.taskCount - member.completedCount;
          const workloadScore = this.calculateWorkloadScore(member.taskCount, member.completedCount, activeTasks);
          
          return {
            memberId: member.memberId,
            memberName: member.memberName,
            activeTasks: activeTasks,
            completedTasks: member.completedCount,
            overdueTasks: 0, // Would calculate from actual task data
            workloadScore: workloadScore
          };
        });

        // Generate recommendations
        const averageWorkload = members.reduce((sum, m) => sum + m.workloadScore, 0) / members.length;
        const overloadedMembers = members.filter(m => m.workloadScore > averageWorkload * 1.5).map(m => m.memberName);
        const underutilizedMembers = members.filter(m => m.workloadScore < averageWorkload * 0.5).map(m => m.memberName);

        const distribution: TeamWorkloadDistribution = {
          teamId: teamId,
          teamName: team.name,
          members: members,
          recommendations: {
            overloadedMembers,
            underutilizedMembers,
            suggestedReassignments: [] // Would generate specific reassignment suggestions
          }
        };

        return distribution;

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get Team Workload Distribution');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Check if user can reassign tasks (team admin only)
  async canUserReassignTasks(userId: string, teamId: string): Promise<boolean> {
    try {
      const team = await this.databaseService.getTeamById(teamId);
      if (!team) {
        return false;
      }

      // Team creator is always admin
      if (team.createdBy === userId) {
        return true;
      }

      // Check if user has admin role
      const member = team.members.find(m => m.userId === userId);
      return member?.role === 'admin' && member.status === 'active';

    } catch (error) {
      console.error('Error checking task reassignment permissions:', error);
      return false;
    }
  }

  // Check if user can manage team tasks
  async canUserManageTeamTasks(userId: string, teamId: string): Promise<boolean> {
    // Same as reassign permission for now
    return this.canUserReassignTasks(userId, teamId);
  }

  // Helper method to calculate workload score
  private calculateWorkloadScore(totalTasks: number, completedTasks: number, activeTasks: number): number {
    // Simple workload calculation - could be enhanced with priority weighting
    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
    const activeTaskWeight = activeTasks * 1.5; // Active tasks have higher weight
    const completionBonus = completionRate * 0.5; // Bonus for high completion rate
    
    return Math.max(0, activeTaskWeight - completionBonus);
  }

  // Send notifications about task reassignment
  private async sendTaskReassignmentNotifications(
    history: TaskAssignmentHistory,
    meetingTitle: string,
    teamId: string
  ): Promise<void> {
    try {
      // Import notification service dynamically to avoid circular dependencies
      const { notificationService } = await import('./notification-service');

      // Notify the new assignee
      await notificationService.sendTaskAssignment(
        history.taskId,
        `Task reassigned: ${history.taskId}`, // Would get actual task description
        history.newAssigneeId,
        history.newAssigneeName,
        meetingTitle,
        history.reassignedBy,
        teamId
      );

      // Optionally notify the previous assignee if they exist
      if (history.previousAssigneeId) {
        // Could send a "task reassigned away from you" notification
      }

    } catch (error) {
      console.error('Failed to send task reassignment notifications:', error);
    }
  }
}

// Create and export a singleton instance
let teamTaskServiceInstance: TeamTaskManagementServiceImpl | null = null;

export function getTeamTaskManagementService(
  databaseService: DatabaseService,
  taskService: TaskManagementService
): TeamTaskManagementServiceImpl {
  if (!teamTaskServiceInstance) {
    teamTaskServiceInstance = new TeamTaskManagementServiceImpl(databaseService, taskService);
  }
  return teamTaskServiceInstance;
}

// Export the implementation class as well
export { TeamTaskManagementServiceImpl };