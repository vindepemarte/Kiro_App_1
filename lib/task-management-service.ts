// Task management service for extracting, assigning, and managing tasks from meetings

import { 
  Meeting, 
  ActionItem, 
  TaskWithContext, 
  Team, 
  TeamMember, 
  User,
  CreateNotificationData 
} from './types';
import { DatabaseService } from './database';
import { ErrorHandler, AppError, retryOperation } from './error-handler';

export interface TaskManagementService {
  // Task extraction and assignment
  extractTasksFromMeeting(meeting: Meeting, teamId?: string): Promise<TaskWithContext[]>;
  assignTaskToUser(taskId: string, meetingId: string, userId: string, assignedBy: string): Promise<void>;
  reassignTask(taskId: string, meetingId: string, newUserId: string, reassignedBy: string): Promise<void>;
  
  // Task retrieval and management
  getUserTasks(userId: string): Promise<TaskWithContext[]>;
  getTeamTasks(teamId: string): Promise<TaskWithContext[]>;
  updateTaskStatus(taskId: string, meetingId: string, status: ActionItem['status'], userId: string): Promise<void>;
  
  // Real-time subscriptions
  subscribeToUserTasks(userId: string, callback: (tasks: TaskWithContext[]) => void): () => void;
  subscribeToTeamTasks(teamId: string, callback: (tasks: TaskWithContext[]) => void): () => void;
  
  // Task assignment automation
  autoAssignTasksToTeamMembers(meeting: Meeting, team: Team): Promise<void>;
  matchTaskToTeamMember(task: ActionItem, teamMembers: TeamMember[]): TeamMember | null;
}

export class TaskManagementServiceImpl implements TaskManagementService {
  constructor(private databaseService: DatabaseService) {}

  // Extract tasks from meeting action items with full context
  async extractTasksFromMeeting(meeting: Meeting, teamId?: string): Promise<TaskWithContext[]> {
    return await retryOperation(async () => {
      try {
        const tasks: TaskWithContext[] = [];
        const now = new Date();

        // Get team information if teamId is provided
        let team: Team | null = null;
        if (teamId) {
          team = await this.databaseService.getTeamById(teamId);
        }

        for (const actionItem of meeting.actionItems) {
          const taskWithContext: TaskWithContext = {
            // Core ActionItem properties
            id: actionItem.id,
            description: actionItem.description,
            owner: actionItem.owner,
            assigneeId: actionItem.assigneeId || '',
            assigneeName: actionItem.assigneeName || '',
            deadline: actionItem.deadline,
            priority: actionItem.priority,
            status: actionItem.status,
            assignedBy: actionItem.assignedBy,
            assignedAt: actionItem.assignedAt,
            
            // Context information
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            meetingDate: meeting.date,
            teamId: teamId,
            teamName: team?.name,
            
            // Metadata
            createdAt: meeting.createdAt,
            updatedAt: now
          };

          tasks.push(taskWithContext);
        }

        return tasks;
      } catch (error) {
        throw ErrorHandler.handleError(error, 'Extract Tasks From Meeting');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable;
      }
    });
  }

  // Assign a task to a specific user
  async assignTaskToUser(taskId: string, meetingId: string, userId: string, assignedBy: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!taskId?.trim() || !meetingId?.trim() || !userId?.trim() || !assignedBy?.trim()) {
          throw new AppError('Missing required parameters for task assignment', 'VALIDATION_ERROR', false, 'All parameters are required');
        }

        // Get the meeting to update the task
        const meeting = await this.databaseService.getMeetingById(meetingId, assignedBy);
        if (!meeting) {
          throw new AppError('Meeting not found', 'NOT_FOUND', false, 'Cannot assign task to non-existent meeting');
        }

        // Find the task in the meeting's action items
        const taskIndex = meeting.actionItems.findIndex(item => item.id === taskId);
        if (taskIndex === -1) {
          throw new AppError('Task not found', 'NOT_FOUND', false, 'Task not found in meeting');
        }

        // Get user information for the assignee
        const userProfile = await this.databaseService.getUserProfile(userId);
        const assigneeName = userProfile?.displayName || `User ${userId.slice(0, 8)}`;

        // Update the task with assignment information
        const updatedActionItems = [...meeting.actionItems];
        updatedActionItems[taskIndex] = {
          ...updatedActionItems[taskIndex],
          assigneeId: userId,
          assigneeName: assigneeName,
          assignedBy: assignedBy,
          assignedAt: new Date()
        };

        // Update the meeting with the new action items
        await this.databaseService.updateMeeting(meetingId, assignedBy, { 
          actionItems: updatedActionItems 
        });

        // CRITICAL FIX: Create task document in dedicated tasks collection
        try {
          await this.databaseService.createTask({
            id: updatedActionItems[taskIndex].id,
            description: updatedActionItems[taskIndex].description,
            assigneeId: userId,
            assigneeName: assigneeName,
            assignedBy: assignedBy,
            assignedAt: new Date(),
            status: updatedActionItems[taskIndex].status,
            priority: updatedActionItems[taskIndex].priority,
            deadline: updatedActionItems[taskIndex].deadline,
            meetingId: meetingId,
            meetingTitle: meeting.title,
            meetingDate: meeting.date,
            teamId: meeting.teamId,
            teamName: meeting.teamId ? (await this.databaseService.getTeamById(meeting.teamId))?.name : undefined,
            owner: updatedActionItems[taskIndex].owner
          });
          console.log(`✅ Task document created in tasks collection for task ${taskId}`);
        } catch (taskCreationError) {
          console.error('Failed to create task document:', taskCreationError);
          // Don't fail the entire assignment if task document creation fails
        }

        // Get team information for notification context
        let teamName: string | undefined;
        if (meeting.teamId) {
          try {
            const team = await this.databaseService.getTeamById(meeting.teamId);
            teamName = team?.name;
          } catch (error) {
            console.warn('Failed to get team information for notification:', error);
          }
        }

        // Send task assignment notification
        await this.sendTaskAssignmentNotification(
          taskId,
          updatedActionItems[taskIndex].description,
          userId,
          assigneeName,
          meeting.title,
          assignedBy,
          meeting.teamId,
          teamName
        );

        console.log(`Task ${taskId} assigned to user ${userId} by ${assignedBy}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Assign Task To User');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Reassign a task to a different user
  async reassignTask(taskId: string, meetingId: string, newUserId: string, reassignedBy: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!taskId?.trim() || !meetingId?.trim() || !newUserId?.trim() || !reassignedBy?.trim()) {
          throw new AppError('Missing required parameters for task reassignment', 'VALIDATION_ERROR', false, 'All parameters are required');
        }

        // Use the same logic as assignTaskToUser but with reassignment context
        await this.assignTaskToUser(taskId, meetingId, newUserId, reassignedBy);

        console.log(`Task ${taskId} reassigned to user ${newUserId} by ${reassignedBy}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Reassign Task');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Get all tasks assigned to a specific user
  async getUserTasks(userId: string): Promise<TaskWithContext[]> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please provide a valid user ID');
        }

        const allTasks: TaskWithContext[] = [];

        // CRITICAL FIX: Get tasks from ALL sources, including dedicated tasks collection
        
        // 1. FIRST: Try to get tasks from the dedicated tasks collection
        try {
          const tasksFromCollection = await this.databaseService.getUserTasksFromCollection(userId);
          console.log(`Found ${tasksFromCollection.length} tasks in dedicated tasks collection`);
          
          // Convert to TaskWithContext format
          const collectionTasks: TaskWithContext[] = tasksFromCollection.map(task => ({
            id: task.id,
            description: task.description,
            owner: task.owner,
            assigneeId: task.assigneeId,
            assigneeName: task.assigneeName,
            deadline: task.deadline,
            priority: task.priority,
            status: task.status,
            assignedBy: task.assignedBy,
            assignedAt: task.assignedAt,
            meetingId: task.meetingId,
            meetingTitle: task.meetingTitle,
            meetingDate: task.meetingDate,
            teamId: task.teamId,
            teamName: task.teamName,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt
          }));
          
          allTasks.push(...collectionTasks);
        } catch (error) {
          console.warn('Failed to load tasks from collection, falling back to meeting-based approach:', error);
        }
        
        // 2. CRITICAL FIX: Get user's own meetings (personal meetings with tasks)
        try {
          const userMeetings = await this.databaseService.getUserMeetings(userId);
          console.log(`Found ${userMeetings.length} personal meetings for user ${userId}`);
          
          for (const meeting of userMeetings) {
            const meetingTasks = await this.extractTasksFromMeeting(meeting, meeting.teamId);
            // For personal meetings, include ALL tasks (they should be assigned to the user)
            // For team meetings, only include tasks assigned to this user
            const userTasks = meetingTasks.filter(task => 
              task.assigneeId === userId || (!meeting.teamId && !task.assigneeId)
            );
            console.log(`Found ${userTasks.length} tasks in meeting ${meeting.title}`);
            allTasks.push(...userTasks);
          }
        } catch (error) {
          console.warn('Failed to load user meetings:', error);
        }
        
        // 2. Get tasks from ALL team meetings (this is where assigned tasks will be)
        const userTeams = await this.databaseService.getUserTeams(userId);
        
        for (const team of userTeams) {
          try {
            const teamMeetings = await this.databaseService.getTeamMeetings(team.id);
            for (const meeting of teamMeetings) {
              const meetingTasks = await this.extractTasksFromMeeting(meeting, team.id);
              const userTasks = meetingTasks.filter(task => task.assigneeId === userId);
              allTasks.push(...userTasks);
            }
          } catch (error) {
            console.warn(`Failed to load meetings for team ${team.name}:`, error);
          }
        }

        // 3. ADDITIONAL FIX: Search across ALL meetings in the system for tasks assigned to this user
        // This handles cases where tasks are assigned but not properly stored in team meetings
        try {
          // Get all users (this includes both real and fake users who uploaded meetings)
          const allUsers = await this.getAllUsersWithMeetings();
          
          for (const otherUserId of allUsers) {
            if (otherUserId === userId) continue; // Skip own meetings (already processed)
            
            try {
              const otherUserMeetings = await this.databaseService.getUserMeetings(otherUserId);
              for (const meeting of otherUserMeetings) {
                const meetingTasks = await this.extractTasksFromMeeting(meeting, meeting.teamId);
                const userTasks = meetingTasks.filter(task => task.assigneeId === userId);
                allTasks.push(...userTasks);
              }
            } catch (error) {
              // Silently continue if we can't access other user's meetings
            }
          }
        } catch (error) {
          console.warn('Failed to search across all meetings:', error);
        }

        // Deduplicate tasks (same task might be found in multiple places)
        const uniqueTasks = allTasks.filter((task, index, self) => 
          index === self.findIndex(t => t.id === task.id && t.meetingId === task.meetingId)
        );

        // Sort tasks by creation date (newest first)
        return uniqueTasks.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get User Tasks');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  // Helper method to get all users who have uploaded meetings
  private async getAllUsersWithMeetings(): Promise<string[]> {
    try {
      // This is a simplified approach - in a real system you'd want to index this better
      // For now, we'll get users from teams since team members are the ones who matter
      const allTeams = await this.databaseService.getAllTeams();
      const userIds = new Set<string>();
      
      for (const team of allTeams) {
        for (const member of team.members) {
          userIds.add(member.userId);
        }
        // Also add the team creator
        userIds.add(team.createdBy);
      }
      
      return Array.from(userIds);
    } catch (error) {
      console.warn('Failed to get all users with meetings:', error);
      return [];
    }
  }

  // Get all tasks for a specific team
  async getTeamTasks(teamId: string): Promise<TaskWithContext[]> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Please provide a valid team ID');
        }

        const allTasks: TaskWithContext[] = [];

        // Get all team meetings
        const teamMeetings = await this.databaseService.getTeamMeetings(teamId);

        // Extract all tasks from team meetings
        for (const meeting of teamMeetings) {
          const meetingTasks = await this.extractTasksFromMeeting(meeting, teamId);
          allTasks.push(...meetingTasks);
        }

        // Sort tasks by creation date (newest first)
        return allTasks.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get Team Tasks');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  // Update task status
  async updateTaskStatus(taskId: string, meetingId: string, status: ActionItem['status'], userId: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!taskId?.trim() || !meetingId?.trim() || !status || !userId?.trim()) {
          throw new AppError('Missing required parameters for task status update', 'VALIDATION_ERROR', false, 'All parameters are required');
        }

        // Get the meeting to update the task
        const meeting = await this.databaseService.getMeetingById(meetingId, userId);
        if (!meeting) {
          throw new AppError('Meeting not found', 'NOT_FOUND', false, 'Cannot update task in non-existent meeting');
        }

        // Find the task in the meeting's action items
        const taskIndex = meeting.actionItems.findIndex(item => item.id === taskId);
        if (taskIndex === -1) {
          throw new AppError('Task not found', 'NOT_FOUND', false, 'Task not found in meeting');
        }

        // Update the task status
        const updatedActionItems = [...meeting.actionItems];
        updatedActionItems[taskIndex] = {
          ...updatedActionItems[taskIndex],
          status: status
        };

        // Update the meeting with the new action items
        await this.databaseService.updateMeeting(meetingId, userId, { 
          actionItems: updatedActionItems 
        });

        // Send task status change notification if completed
        if (status === 'completed') {
          await this.sendTaskCompletionNotification(
            taskId,
            updatedActionItems[taskIndex].description,
            userId,
            meeting.title
          );
        }

        console.log(`Task ${taskId} status updated to ${status} by user ${userId}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Update Task Status');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Subscribe to real-time user task updates
  subscribeToUserTasks(userId: string, callback: (tasks: TaskWithContext[]) => void): () => void {
    try {
      const unsubscribeFunctions: (() => void)[] = [];
      let updateTimeout: NodeJS.Timeout | null = null;
      let isUpdating = false;
      
      // Debounced function to collect and update all user tasks
      const debouncedUpdateUserTasks = () => {
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        
        updateTimeout = setTimeout(async () => {
          if (isUpdating) {
            return; // Skip if already updating
          }
          
          isUpdating = true;
          
          try {
            const userTasks: TaskWithContext[] = [];
            const processedMeetingIds = new Set<string>();
            
            // Get user teams first
            const userTeams = await this.databaseService.getUserTeams(userId);
            
            // Get user meetings
            const userMeetings = await this.databaseService.getUserMeetings(userId);
            
            // Extract tasks from user meetings
            for (const meeting of userMeetings) {
              if (processedMeetingIds.has(meeting.id)) continue;
              processedMeetingIds.add(meeting.id);
              
              try {
                const meetingTasks = await this.extractTasksFromMeeting(meeting, meeting.teamId);
                const assignedTasks = meetingTasks.filter(task => task.assigneeId === userId);
                userTasks.push(...assignedTasks);
              } catch (error) {
                console.warn(`Failed to extract tasks from meeting ${meeting.id}:`, error);
              }
            }

            // Get team meetings and extract tasks (avoid duplicates)
            for (const team of userTeams) {
              try {
                const teamMeetings = await this.databaseService.getTeamMeetings(team.id);
                for (const meeting of teamMeetings) {
                  if (processedMeetingIds.has(meeting.id)) continue;
                  processedMeetingIds.add(meeting.id);
                  
                  try {
                    const meetingTasks = await this.extractTasksFromMeeting(meeting, team.id);
                    const assignedTasks = meetingTasks.filter(task => task.assigneeId === userId);
                    userTasks.push(...assignedTasks);
                  } catch (error) {
                    console.warn(`Failed to extract tasks from team meeting ${meeting.id}:`, error);
                  }
                }
              } catch (error) {
                console.warn(`Failed to load team meetings for team ${team.id}:`, error);
              }
            }

            // Deduplicate and sort tasks
            const uniqueTasks = userTasks.filter((task, index, self) => 
              index === self.findIndex(t => t.id === task.id && t.meetingId === task.meetingId)
            );
            
            const sortedTasks = uniqueTasks.sort((a, b) => {
              const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
              const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
              return dateB.getTime() - dateA.getTime();
            });
            
            callback(sortedTasks);
          } catch (error) {
            console.error('Error updating user tasks:', error);
            callback([]);
          } finally {
            isUpdating = false;
          }
        }, 500); // 500ms debounce to prevent rapid updates
      };

      // Subscribe to user meetings changes
      const unsubscribeUserMeetings = this.databaseService.subscribeToUserMeetings(userId, () => {
        debouncedUpdateUserTasks();
      });
      unsubscribeFunctions.push(unsubscribeUserMeetings);

      // Subscribe to user teams changes (but don't create nested subscriptions)
      const unsubscribeUserTeams = this.databaseService.subscribeToUserTeams(userId, () => {
        debouncedUpdateUserTasks();
      });
      unsubscribeFunctions.push(unsubscribeUserTeams);

      // Initial load
      debouncedUpdateUserTasks();

      // Return cleanup function
      return () => {
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        
        unsubscribeFunctions.forEach(unsubscribe => {
          try {
            unsubscribe();
          } catch (error) {
            console.warn('Error unsubscribing from task updates:', error);
          }
        });
      };
    } catch (error) {
      console.error('Failed to subscribe to user tasks:', error);
      return () => {};
    }
  }

  // Subscribe to real-time team task updates
  subscribeToTeamTasks(teamId: string, callback: (tasks: TaskWithContext[]) => void): () => void {
    try {
      // Subscribe to team meetings and extract tasks in real-time
      const unsubscribeTeamMeetings = this.databaseService.subscribeToTeamMeetings(teamId, async (meetings) => {
        try {
          const teamTasks: TaskWithContext[] = [];
          
          // Extract tasks from team meetings
          for (const meeting of meetings) {
            const meetingTasks = await this.extractTasksFromMeeting(meeting, teamId);
            teamTasks.push(...meetingTasks);
          }

          // Sort tasks by creation date
          const sortedTasks = teamTasks.sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
          });
          
          callback(sortedTasks);
        } catch (error) {
          console.error('Error in team tasks subscription:', error);
          callback([]);
        }
      });

      return unsubscribeTeamMeetings;
    } catch (error) {
      console.error('Failed to subscribe to team tasks:', error);
      return () => {};
    }
  }

  // Auto-assign tasks to team members based on context
  async autoAssignTasksToTeamMembers(meeting: Meeting, team: Team): Promise<void> {
    try {
      const activeMembers = team.members.filter(member => member.status === 'active');
      
      if (activeMembers.length === 0) {
        console.warn('No active team members to assign tasks to');
        return;
      }

      const updatedActionItems = [...meeting.actionItems];
      let hasUpdates = false;

      for (let i = 0; i < updatedActionItems.length; i++) {
        const task = updatedActionItems[i];
        
        // Skip if task is already assigned
        if (task.assigneeId) {
          continue;
        }

        // Try to match task to team member
        const matchedMember = this.matchTaskToTeamMember(task, activeMembers);
        
        if (matchedMember) {
          updatedActionItems[i] = {
            ...task,
            assigneeId: matchedMember.userId,
            assigneeName: matchedMember.displayName,
            assignedBy: 'system',
            assignedAt: new Date()
          };
          hasUpdates = true;

          // Send assignment notification
          await this.sendTaskAssignmentNotification(
            task.id,
            task.description,
            matchedMember.userId,
            matchedMember.displayName,
            meeting.title,
            'system'
          );
        }
      }

      // Update meeting if there were assignments
      if (hasUpdates) {
        await this.databaseService.updateMeeting(meeting.id, team.createdBy, {
          actionItems: updatedActionItems
        });
        
        console.log(`Auto-assigned ${updatedActionItems.filter(t => t.assigneeId).length} tasks in meeting ${meeting.title}`);
      }

    } catch (error) {
      console.error('Error in auto-assigning tasks:', error);
    }
  }

  // Match a task to the most appropriate team member
  matchTaskToTeamMember(task: ActionItem, teamMembers: TeamMember[]): TeamMember | null {
    if (!teamMembers.length) {
      return null;
    }

    // If task has an owner specified, try to match by name
    if (task.owner) {
      const normalizedOwner = task.owner.toLowerCase().trim();
      
      // Try exact match first
      for (const member of teamMembers) {
        if (member.displayName.toLowerCase().trim() === normalizedOwner) {
          return member;
        }
      }

      // Try partial match
      for (const member of teamMembers) {
        const normalizedMemberName = member.displayName.toLowerCase().trim();
        if (normalizedMemberName.includes(normalizedOwner) || normalizedOwner.includes(normalizedMemberName)) {
          return member;
        }
      }

      // Try email prefix match
      for (const member of teamMembers) {
        const emailPrefix = member.email.split('@')[0].toLowerCase();
        if (emailPrefix === normalizedOwner || normalizedOwner.includes(emailPrefix)) {
          return member;
        }
      }
    }

    // If no specific match, assign to a team admin or first available member
    const adminMember = teamMembers.find(member => member.role === 'admin');
    return adminMember || teamMembers[0];
  }

  // Send task assignment notification
  private async sendTaskAssignmentNotification(
    taskId: string,
    taskDescription: string,
    assigneeId: string,
    assigneeName: string,
    meetingTitle: string,
    assignedBy: string,
    teamId?: string,
    teamName?: string
  ): Promise<void> {
    try {
      // Import notification service dynamically to avoid circular dependencies
      const { notificationService } = await import('./notification-service');
      
      await notificationService.sendTaskAssignment(
        taskId,
        taskDescription,
        assigneeId,
        assigneeName,
        meetingTitle,
        assignedBy,
        teamId,
        teamName
      );
    } catch (error) {
      console.error('Failed to send task assignment notification:', error);
    }
  }

  // Send task completion notification
  private async sendTaskCompletionNotification(
    taskId: string,
    taskDescription: string,
    completedBy: string,
    meetingTitle: string
  ): Promise<void> {
    try {
      // For now, we could send this to team admins or meeting owner
      // This is a placeholder for future enhancement
      console.log(`Task "${taskDescription}" completed by user ${completedBy} in meeting "${meetingTitle}"`);
    } catch (error) {
      console.error('Failed to send task completion notification:', error);
    }
  }
}

// Create and export a singleton instance
let taskManagementServiceInstance: TaskManagementServiceImpl | null = null;

export function getTaskManagementService(databaseService: DatabaseService): TaskManagementServiceImpl {
  if (!taskManagementServiceInstance) {
    taskManagementServiceInstance = new TaskManagementServiceImpl(databaseService);
  }
  return taskManagementServiceInstance;
}

// TaskManagementServiceImpl is already exported above as a class declaration