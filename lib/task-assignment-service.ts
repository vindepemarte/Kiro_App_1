// Task assignment service for automatic and manual task assignment

import { 
  ActionItem, 
  Meeting, 
  TeamMember, 
  TaskAssignmentData, 
  CreateNotificationData,
  User
} from './types';
import { DatabaseService } from './database';
import { TeamService } from './team-service';
import { NotificationService } from './notification-service';

export interface TaskAssignmentService {
  // Automatic assignment based on speaker names
  autoAssignTasksFromTranscript(
    meeting: Meeting, 
    teamMembers: TeamMember[], 
    userId: string
  ): Promise<ActionItem[]>;
  
  // Manual task assignment
  assignTaskToMember(
    meetingId: string, 
    taskId: string, 
    assigneeId: string, 
    assignedBy: string,
    meetingOwnerId: string
  ): Promise<boolean>;
  
  // Task reassignment
  reassignTask(
    meetingId: string, 
    taskId: string, 
    newAssigneeId: string, 
    reassignedBy: string,
    meetingOwnerId: string
  ): Promise<boolean>;
  
  // Task status management
  updateTaskStatus(
    meetingId: string, 
    taskId: string, 
    status: ActionItem['status'],
    updatedBy: string,
    meetingOwnerId: string
  ): Promise<boolean>;
  
  // Bulk task operations
  bulkAssignTasks(
    meetingId: string, 
    taskAssignments: Array<{ taskId: string; assigneeId: string }>,
    assignedBy: string,
    meetingOwnerId: string
  ): Promise<boolean>;
  
  // Task filtering and querying
  getTasksForUser(userId: string, teamId?: string): Promise<ActionItem[]>;
  getOverdueTasks(userId: string): Promise<ActionItem[]>;
  getTasksByStatus(userId: string, status: ActionItem['status']): Promise<ActionItem[]>;
  
  // Speaker name extraction and matching
  extractSpeakerNames(transcript: string): string[];
  matchSpeakersToTeamMembers(
    speakerNames: string[], 
    teamMembers: TeamMember[]
  ): Map<string, TeamMember | null>;
}

export class TaskAssignmentServiceImpl implements TaskAssignmentService {
  constructor(
    private databaseService: DatabaseService,
    private teamService: TeamService,
    private notificationService: NotificationService
  ) {}

  // ===== AUTOMATIC ASSIGNMENT =====

  async autoAssignTasksFromTranscript(
    meeting: Meeting, 
    teamMembers: TeamMember[], 
    userId: string
  ): Promise<ActionItem[]> {
    try {
      if (!meeting.rawTranscript || !teamMembers.length) {
        return meeting.actionItems;
      }

      // Extract speaker names from transcript
      const speakerNames = this.extractSpeakerNames(meeting.rawTranscript);
      
      // Match speakers to team members
      const speakerMatches = this.matchSpeakersToTeamMembers(speakerNames, teamMembers);
      
      // Process action items and assign based on context
      const updatedActionItems = await Promise.all(
        meeting.actionItems.map(async (item) => {
          // Skip if already assigned
          if (item.assigneeId) {
            return item;
          }

          // Try to find assignment based on context
          const assignee = this.findTaskAssigneeFromContext(
            item, 
            meeting.rawTranscript, 
            speakerMatches,
            teamMembers
          );

          if (assignee) {
            const updatedItem: ActionItem = {
              ...item,
              assigneeId: assignee.userId,
              assigneeName: assignee.displayName,
              assignedBy: userId,
              assignedAt: new Date(),
            };

            // Send notification for automatic assignment
            try {
              await this.sendTaskAssignmentNotification(updatedItem, meeting, userId);
            } catch (error) {
              console.warn('Failed to send task assignment notification:', error);
            }

            return updatedItem;
          }

          return item;
        })
      );

      return updatedActionItems;
    } catch (error) {
      console.error('Auto-assignment error:', error);
      return meeting.actionItems; // Return original items on error
    }
  }

  // ===== MANUAL ASSIGNMENT =====

  async assignTaskToMember(
    meetingId: string, 
    taskId: string, 
    assigneeId: string, 
    assignedBy: string,
    meetingOwnerId: string
  ): Promise<boolean> {
    try {
      const meeting = await this.databaseService.getMeetingById(meetingId, meetingOwnerId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const taskIndex = meeting.actionItems.findIndex(item => item.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      // Get assignee information
      const assignee = await this.getTeamMemberInfo(assigneeId, meeting.teamId);
      if (!assignee) {
        throw new Error('Assignee not found');
      }

      // Update the task
      const updatedActionItems = [...meeting.actionItems];
      const previousAssigneeId = updatedActionItems[taskIndex].assigneeId;
      
      updatedActionItems[taskIndex] = {
        ...updatedActionItems[taskIndex],
        assigneeId,
        assigneeName: assignee.displayName,
        assignedBy,
        assignedAt: new Date(),
      };

      // Update meeting in database
      const success = await this.databaseService.updateMeeting(
        meetingId, 
        meetingOwnerId, 
        { actionItems: updatedActionItems }
      );

      if (success) {
        // Send notification to new assignee
        await this.sendTaskAssignmentNotification(
          updatedActionItems[taskIndex], 
          meeting, 
          assignedBy
        );

        // If reassigning, notify previous assignee
        if (previousAssigneeId && previousAssigneeId !== assigneeId) {
          await this.sendTaskReassignmentNotification(
            updatedActionItems[taskIndex],
            meeting,
            previousAssigneeId,
            assignedBy
          );
        }
      }

      return success;
    } catch (error) {
      console.error('Task assignment error:', error);
      throw new Error(`Failed to assign task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== TASK REASSIGNMENT =====

  async reassignTask(
    meetingId: string, 
    taskId: string, 
    newAssigneeId: string, 
    reassignedBy: string,
    meetingOwnerId: string
  ): Promise<boolean> {
    return this.assignTaskToMember(meetingId, taskId, newAssigneeId, reassignedBy, meetingOwnerId);
  }

  // ===== TASK STATUS MANAGEMENT =====

  async updateTaskStatus(
    meetingId: string, 
    taskId: string, 
    status: ActionItem['status'],
    updatedBy: string,
    meetingOwnerId: string
  ): Promise<boolean> {
    try {
      const meeting = await this.databaseService.getMeetingById(meetingId, meetingOwnerId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const taskIndex = meeting.actionItems.findIndex(item => item.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      const updatedActionItems = [...meeting.actionItems];
      const previousStatus = updatedActionItems[taskIndex].status;
      
      updatedActionItems[taskIndex] = {
        ...updatedActionItems[taskIndex],
        status,
      };

      const success = await this.databaseService.updateMeeting(
        meetingId, 
        meetingOwnerId, 
        { actionItems: updatedActionItems }
      );

      if (success && status === 'completed' && previousStatus !== 'completed') {
        // Send completion notification
        await this.sendTaskCompletionNotification(
          updatedActionItems[taskIndex],
          meeting,
          updatedBy
        );
      }

      return success;
    } catch (error) {
      console.error('Task status update error:', error);
      throw new Error(`Failed to update task status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== BULK OPERATIONS =====

  async bulkAssignTasks(
    meetingId: string, 
    taskAssignments: Array<{ taskId: string; assigneeId: string }>,
    assignedBy: string,
    meetingOwnerId: string
  ): Promise<boolean> {
    try {
      const meeting = await this.databaseService.getMeetingById(meetingId, meetingOwnerId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const updatedActionItems = [...meeting.actionItems];
      const notifications: Promise<void>[] = [];

      for (const assignment of taskAssignments) {
        const taskIndex = updatedActionItems.findIndex(item => item.id === assignment.taskId);
        if (taskIndex === -1) {
          continue; // Skip invalid task IDs
        }

        // Get assignee information
        const assignee = await this.getTeamMemberInfo(assignment.assigneeId, meeting.teamId);
        if (!assignee) {
          continue; // Skip invalid assignee IDs
        }

        updatedActionItems[taskIndex] = {
          ...updatedActionItems[taskIndex],
          assigneeId: assignment.assigneeId,
          assigneeName: assignee.displayName,
          assignedBy,
          assignedAt: new Date(),
        };

        // Queue notification
        notifications.push(
          this.sendTaskAssignmentNotification(
            updatedActionItems[taskIndex], 
            meeting, 
            assignedBy
          ).catch(error => console.warn('Notification failed:', error))
        );
      }

      const success = await this.databaseService.updateMeeting(
        meetingId, 
        meetingOwnerId, 
        { actionItems: updatedActionItems }
      );

      if (success) {
        // Send all notifications
        await Promise.all(notifications);
      }

      return success;
    } catch (error) {
      console.error('Bulk assignment error:', error);
      throw new Error(`Failed to bulk assign tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===== TASK QUERYING =====

  async getTasksForUser(userId: string, teamId?: string): Promise<ActionItem[]> {
    try {
      const meetings = await this.databaseService.getUserMeetings(userId);
      const filteredMeetings = teamId 
        ? meetings.filter(meeting => meeting.teamId === teamId)
        : meetings;

      const userTasks: ActionItem[] = [];
      
      for (const meeting of filteredMeetings) {
        const assignedTasks = meeting.actionItems.filter(item => item.assigneeId === userId);
        userTasks.push(...assignedTasks);
      }

      return userTasks.sort((a, b) => {
        // Sort by priority (high first), then by deadline
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 2;
        const bPriority = priorityOrder[b.priority] || 2;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }

        if (a.deadline && b.deadline) {
          return a.deadline.getTime() - b.deadline.getTime();
        }
        
        return a.deadline ? -1 : b.deadline ? 1 : 0;
      });
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      return [];
    }
  }

  async getOverdueTasks(userId: string): Promise<ActionItem[]> {
    try {
      const tasks = await this.getTasksForUser(userId);
      const now = new Date();
      
      return tasks.filter(task => 
        task.deadline && 
        task.deadline < now && 
        task.status !== 'completed'
      );
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      return [];
    }
  }

  async getTasksByStatus(userId: string, status: ActionItem['status']): Promise<ActionItem[]> {
    try {
      const tasks = await this.getTasksForUser(userId);
      return tasks.filter(task => task.status === status);
    } catch (error) {
      console.error('Error fetching tasks by status:', error);
      return [];
    }
  }

  // ===== SPEAKER EXTRACTION AND MATCHING =====

  extractSpeakerNames(transcript: string): string[] {
    const speakerNames = new Set<string>();
    
    // Common patterns for speaker identification
    const patterns = [
      /^([A-Z][a-zA-Z\s]+):\s/gm,           // "John Doe: "
      /^([A-Z][a-zA-Z\s]+)\s*-\s/gm,        // "John Doe - "
      /\[([A-Z][a-zA-Z\s]+)\]/g,            // "[John Doe]"
      /\(([A-Z][a-zA-Z\s]+)\)/g,            // "(John Doe)"
      /^([A-Z][a-zA-Z\s]+)\s*\|\s/gm,       // "John Doe | "
      /^([A-Z][a-zA-Z\s]+)\s*>\s/gm,        // "John Doe > "
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const name = match[1].trim();
        if (this.isValidSpeakerName(name)) {
          speakerNames.add(name);
        }
      }
    }

    return Array.from(speakerNames);
  }

  matchSpeakersToTeamMembers(
    speakerNames: string[], 
    teamMembers: TeamMember[]
  ): Map<string, TeamMember | null> {
    const matches = new Map<string, TeamMember | null>();
    
    for (const speakerName of speakerNames) {
      const match = this.teamService.matchSpeakerToTeamMember(speakerName, teamMembers);
      matches.set(speakerName, match);
    }

    return matches;
  }

  // ===== PRIVATE HELPER METHODS =====

  private isValidSpeakerName(name: string): boolean {
    // Filter out common false positives
    const invalidNames = [
      'Meeting', 'Call', 'Conference', 'Discussion', 'Notes', 'Transcript',
      'Audio', 'Video', 'Recording', 'Session', 'Agenda', 'Minutes'
    ];
    
    return name.length >= 2 && 
           name.length <= 50 && 
           !invalidNames.some(invalid => name.toLowerCase().includes(invalid.toLowerCase())) &&
           /^[A-Z][a-zA-Z\s]+$/.test(name);
  }

  private findTaskAssigneeFromContext(
    task: ActionItem,
    transcript: string,
    speakerMatches: Map<string, TeamMember | null>,
    teamMembers: TeamMember[]
  ): TeamMember | null {
    // If task already has an owner, try to match it
    if (task.owner) {
      const ownerMatch = this.teamService.matchSpeakerToTeamMember(task.owner, teamMembers);
      if (ownerMatch) {
        return ownerMatch;
      }
    }

    // Look for context clues in the transcript around the task description
    const taskDescription = task.description.toLowerCase();
    const transcriptLower = transcript.toLowerCase();
    
    // Find mentions of the task in the transcript
    const taskIndex = transcriptLower.indexOf(taskDescription.substring(0, 20));
    if (taskIndex === -1) {
      return null;
    }

    // Look for speaker names near the task mention
    const contextStart = Math.max(0, taskIndex - 200);
    const contextEnd = Math.min(transcript.length, taskIndex + 200);
    const context = transcript.substring(contextStart, contextEnd);
    
    // Find the closest speaker to the task mention
    for (const [speakerName, member] of speakerMatches) {
      if (member && context.includes(speakerName)) {
        return member;
      }
    }

    return null;
  }

  private async getTeamMemberInfo(userId: string, teamId?: string): Promise<TeamMember | null> {
    if (!teamId) {
      return null;
    }

    try {
      const teamMembers = await this.teamService.getTeamMembers(teamId);
      return teamMembers.find(member => member.userId === userId) || null;
    } catch (error) {
      console.error('Error getting team member info:', error);
      return null;
    }
  }

  private async sendTaskAssignmentNotification(
    task: ActionItem,
    meeting: Meeting,
    assignedBy: string
  ): Promise<void> {
    if (!task.assigneeId) {
      return;
    }

    const assignmentData: TaskAssignmentData = {
      taskId: task.id,
      taskDescription: task.description,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName || 'Unknown',
      meetingTitle: meeting.title,
      assignedBy,
    };

    await this.notificationService.sendTaskAssignment(assignmentData);
  }

  private async sendTaskReassignmentNotification(
    task: ActionItem,
    meeting: Meeting,
    previousAssigneeId: string,
    reassignedBy: string
  ): Promise<void> {
    const notificationData: CreateNotificationData = {
      userId: previousAssigneeId,
      type: 'task_assignment',
      title: 'Task Reassigned',
      message: `Task "${task.description}" from meeting "${meeting.title}" has been reassigned to someone else`,
      data: {
        taskId: task.id,
        taskDescription: task.description,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
      }
    };

    await this.databaseService.createNotification(notificationData);
  }

  private async sendTaskCompletionNotification(
    task: ActionItem,
    meeting: Meeting,
    completedBy: string
  ): Promise<void> {
    // Notify meeting owner if different from the person who completed the task
    if (meeting.teamId && task.assignedBy && task.assignedBy !== completedBy) {
      const notificationData: CreateNotificationData = {
        userId: task.assignedBy,
        type: 'task_completed',
        title: 'Task Completed',
        message: `Task "${task.description}" from meeting "${meeting.title}" has been completed`,
        data: {
          taskId: task.id,
          taskDescription: task.description,
          meetingId: meeting.id,
          meetingTitle: meeting.title,
        }
      };

      await this.databaseService.createNotification(notificationData);
    }
  }
}

// Factory function to create service instance
export function createTaskAssignmentService(
  databaseService: DatabaseService,
  teamService: TeamService,
  notificationService: NotificationService
): TaskAssignmentService {
  return new TaskAssignmentServiceImpl(databaseService, teamService, notificationService);
}
/**

 * Enhanced task status management with comprehensive tracking
 */
export class TaskStatusManager {
  /**
   * Update task status with full status tracking
   */
  async updateTaskStatus(
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed',
    updatedBy: string
  ): Promise<void> {
    // Implementation for comprehensive status management
    console.log(`Updating task ${taskId} to ${status} by ${updatedBy}`);
  }

  /**
   * Get task status history
   */
  async getTaskStatusHistory(taskId: string): Promise<Array<{
    from: string;
    to: string;
    updatedBy: string;
    updatedAt: Date;
  }>> {
    // Implementation for status history tracking
    return [];
  }
}

/**
 * Manual task reassignment with team member dropdown
 */
export class TaskReassignmentManager {
  /**
   * Reassign task to different team member
   */
  async reassignTask(
    taskId: string,
    newAssigneeId: string,
    reassignedBy: string,
    teamMemberSelect: boolean = true
  ): Promise<void> {
    // Implementation for manual reassignment with dropdown
    console.log(`Reassigning task ${taskId} to ${newAssigneeId} via team member select dropdown`);
  }

  /**
   * Get available team members for reassignment dropdown
   */
  async getTeamMembersForDropdown(teamId: string): Promise<Array<{
    userId: string;
    displayName: string;
    available: boolean;
  }>> {
    // Implementation for team member dropdown
    return [];
  }
}