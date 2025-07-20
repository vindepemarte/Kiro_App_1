// Example integration of task assignment system with existing services

import { databaseService } from './database';
import { getTeamService } from './team-service';
import { notificationService } from './notification-service';
import { createTaskAssignmentService } from './task-assignment-service';
import { getGeminiService } from './gemini';
import { Meeting, TeamMember, ActionItem } from './types';

// Create task assignment service instance
const teamService = getTeamService(databaseService);
const taskAssignmentService = createTaskAssignmentService(
  databaseService,
  teamService,
  notificationService
);

/**
 * Enhanced meeting processing with automatic task assignment
 */
export async function processTranscriptWithTaskAssignment(
  transcript: string,
  userId: string,
  teamId?: string
): Promise<Meeting> {
  try {
    // Get team members if this is a team meeting
    let teamMembers: TeamMember[] = [];
    if (teamId) {
      teamMembers = await teamService.getTeamMembers(teamId);
    }

    // Process transcript with Gemini AI (with team context)
    const geminiService = getGeminiService();
    const aiResponse = await geminiService.processTranscript(transcript, teamMembers);

    // Create meeting object
    const meeting: Meeting = {
      id: `meeting-${Date.now()}`,
      title: `Meeting - ${new Date().toLocaleDateString()}`,
      date: new Date(),
      summary: aiResponse.summary,
      actionItems: aiResponse.actionItems.map((item, index) => ({
        id: `task-${Date.now()}-${index}`,
        description: item.description,
        owner: item.owner,
        priority: item.priority,
        status: 'pending' as const,
        deadline: item.deadline,
      })),
      rawTranscript: transcript,
      teamId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Auto-assign tasks if this is a team meeting
    if (teamId && teamMembers.length > 0) {
      meeting.actionItems = await taskAssignmentService.autoAssignTasksFromTranscript(
        meeting,
        teamMembers,
        userId
      );
    }

    // Save meeting to database
    const meetingId = await databaseService.saveMeeting(userId, {
      summary: meeting.summary,
      actionItems: meeting.actionItems,
      rawTranscript: meeting.rawTranscript,
      metadata: {
        fileName: 'transcript.txt',
        fileSize: transcript.length,
        uploadedAt: new Date(),
        processingTime: 0,
      },
    });

    return { ...meeting, id: meetingId };
  } catch (error) {
    console.error('Error processing transcript with task assignment:', error);
    throw error;
  }
}

/**
 * Assign a task to a team member
 */
export async function assignTask(
  meetingId: string,
  taskId: string,
  assigneeId: string,
  assignedBy: string,
  meetingOwnerId: string
): Promise<void> {
  try {
    await taskAssignmentService.assignTaskToMember(
      meetingId,
      taskId,
      assigneeId,
      assignedBy,
      meetingOwnerId
    );
  } catch (error) {
    console.error('Error assigning task:', error);
    throw error;
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  meetingId: string,
  taskId: string,
  status: ActionItem['status'],
  updatedBy: string,
  meetingOwnerId: string
): Promise<void> {
  try {
    await taskAssignmentService.updateTaskStatus(
      meetingId,
      taskId,
      status,
      updatedBy,
      meetingOwnerId
    );
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

/**
 * Bulk assign tasks
 */
export async function bulkAssignTasks(
  meetingId: string,
  assignments: Array<{ taskId: string; assigneeId: string }>,
  assignedBy: string,
  meetingOwnerId: string
): Promise<void> {
  try {
    await taskAssignmentService.bulkAssignTasks(
      meetingId,
      assignments,
      assignedBy,
      meetingOwnerId
    );
  } catch (error) {
    console.error('Error bulk assigning tasks:', error);
    throw error;
  }
}

/**
 * Get tasks for a user
 */
export async function getUserTasks(
  userId: string,
  teamId?: string
): Promise<ActionItem[]> {
  try {
    return await taskAssignmentService.getTasksForUser(userId, teamId);
  } catch (error) {
    console.error('Error getting user tasks:', error);
    return [];
  }
}

/**
 * Get overdue tasks for a user
 */
export async function getOverdueTasks(userId: string): Promise<ActionItem[]> {
  try {
    return await taskAssignmentService.getOverdueTasks(userId);
  } catch (error) {
    console.error('Error getting overdue tasks:', error);
    return [];
  }
}

/**
 * Example usage workflow
 */
export async function exampleTaskAssignmentWorkflow() {
  const userId = 'user-123';
  const teamId = 'team-456';
  
  // Example transcript
  const transcript = `
John Doe: Let's review the quarterly report and update our project timeline.
Jane Smith: I can handle the report review by Friday.
Bob Wilson: I'll update the timeline and schedule our next meeting.
John Doe: Great, let's also make sure we follow up with the client.
  `;

  try {
    // 1. Process transcript with automatic task assignment
    console.log('Processing transcript with automatic task assignment...');
    const meeting = await processTranscriptWithTaskAssignment(transcript, userId, teamId);
    console.log('Meeting processed:', meeting.title);
    console.log('Action items:', meeting.actionItems.length);

    // 2. Manual task assignment (if needed)
    const unassignedTasks = meeting.actionItems.filter(item => !item.assigneeId);
    if (unassignedTasks.length > 0) {
      console.log('Manually assigning unassigned tasks...');
      await assignTask(
        meeting.id,
        unassignedTasks[0].id,
        'user-789', // Assign to another team member
        userId,
        userId
      );
    }

    // 3. Update task status
    console.log('Updating task status...');
    await updateTaskStatus(
      meeting.id,
      meeting.actionItems[0].id,
      'in_progress',
      userId,
      userId
    );

    // 4. Get user tasks
    console.log('Getting user tasks...');
    const userTasks = await getUserTasks(userId, teamId);
    console.log('User has', userTasks.length, 'tasks');

    // 5. Check for overdue tasks
    console.log('Checking for overdue tasks...');
    const overdueTasks = await getOverdueTasks(userId);
    console.log('User has', overdueTasks.length, 'overdue tasks');

    console.log('Task assignment workflow completed successfully!');
  } catch (error) {
    console.error('Task assignment workflow failed:', error);
  }
}

// Export the task assignment service for direct use
export { taskAssignmentService };