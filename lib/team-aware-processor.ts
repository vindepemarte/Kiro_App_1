// Enhanced meeting processor with team context and automatic task assignment

import { getGeminiService } from './gemini';
import { getTeamService } from './team-service';
import { databaseService } from './database';
import { notificationService } from './notification-service';
import { FileProcessor } from './file-processor';
import { 
  Meeting, 
  TeamMember, 
  ActionItem, 
  ProcessedMeeting, 
  MeetingMetadata,
  AIResponse,
  CreateNotificationData
} from './types';

export interface TeamAwareProcessingOptions {
  userId: string;
  teamId?: string;
  fileName?: string;
  fileSize?: number;
}

export interface ProcessingResult {
  meeting: Meeting;
  unassignedTasks: ActionItem[];
  assignmentSummary: {
    totalTasks: number;
    autoAssigned: number;
    unassigned: number;
    speakerMatches: Map<string, TeamMember | null>;
  };
}

export class TeamAwareMeetingProcessor {
  private geminiService = getGeminiService();
  private teamService = getTeamService(databaseService);

  /**
   * Process transcript with team context and automatic task assignment
   */
  async processTranscriptWithTeamContext(
    transcript: string,
    options: TeamAwareProcessingOptions
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Get team members if this is a team meeting
      let teamMembers: TeamMember[] = [];
      if (options.teamId) {
        teamMembers = await this.teamService.getTeamMembers(options.teamId);
        // Filter to only active members
        teamMembers = teamMembers.filter(member => member.status === 'active');
      }

      // Step 2: Process transcript with Gemini AI (with team context)
      const aiResponse = await this.geminiService.processTranscript(transcript, teamMembers);

      // Step 3: Extract speaker names from transcript for matching
      const speakerNames = this.extractSpeakerNames(transcript);
      
      // Step 4: Match speakers to team members
      const speakerMatches = this.matchSpeakersToTeamMembers(speakerNames, teamMembers);

      // Step 5: Create meeting object with enhanced action items
      const meeting = await this.createMeetingWithTeamContext(
        aiResponse,
        transcript,
        options,
        speakerMatches,
        teamMembers,
        Date.now() - startTime
      );

      // Step 6: Auto-assign tasks based on speaker matching and AI suggestions
      const { assignedTasks, unassignedTasks } = await this.autoAssignTasks(
        meeting.actionItems,
        speakerMatches,
        teamMembers,
        options.userId
      );

      // Update meeting with assigned tasks
      meeting.actionItems = [...assignedTasks, ...unassignedTasks];

      // Step 7: Save meeting to database
      const processedMeeting: ProcessedMeeting = {
        summary: meeting.summary,
        actionItems: meeting.actionItems,
        rawTranscript: meeting.rawTranscript,
        metadata: {
          fileName: options.fileName || 'transcript.txt',
          fileSize: options.fileSize || transcript.length,
          uploadedAt: new Date(),
          processingTime: Date.now() - startTime
        }
      };

      const meetingId = await databaseService.saveMeeting(options.userId, processedMeeting);
      meeting.id = meetingId;

      // Step 8: Send notifications for assigned tasks
      await this.sendTaskAssignmentNotifications(
        assignedTasks,
        meeting,
        options.userId
      );

      return {
        meeting,
        unassignedTasks,
        assignmentSummary: {
          totalTasks: meeting.actionItems.length,
          autoAssigned: assignedTasks.length,
          unassigned: unassignedTasks.length,
          speakerMatches
        }
      };

    } catch (error) {
      throw new Error(`Team-aware processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract speaker names from transcript
   */
  private extractSpeakerNames(transcript: string): string[] {
    const speakerNames = new Set<string>();
    
    // Common patterns for speaker identification
    const patterns = [
      // "John Doe:" or "John Doe :"
      /^([A-Za-z\s]+):\s*/gm,
      // "[John Doe]" or "(John Doe)"
      /[\[\(]([A-Za-z\s]+)[\]\)]/g,
      // "John Doe said" or "John Doe mentioned"
      /([A-Za-z\s]+)\s+(said|mentioned|stated|asked|replied|responded)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const name = match[1].trim();
        // Filter out common false positives
        if (name.length > 2 && 
            !name.toLowerCase().includes('meeting') &&
            !name.toLowerCase().includes('agenda') &&
            !name.toLowerCase().includes('action') &&
            !/^\d+$/.test(name)) {
          speakerNames.add(name);
        }
      }
    }

    return Array.from(speakerNames);
  }

  /**
   * Match speakers to team members using the team service
   */
  private matchSpeakersToTeamMembers(
    speakerNames: string[], 
    teamMembers: TeamMember[]
  ): Map<string, TeamMember | null> {
    return this.teamService.matchMultipleSpeakers(speakerNames, teamMembers);
  }

  /**
   * Create meeting object with team context
   */
  private async createMeetingWithTeamContext(
    aiResponse: AIResponse,
    transcript: string,
    options: TeamAwareProcessingOptions,
    speakerMatches: Map<string, TeamMember | null>,
    teamMembers: TeamMember[],
    processingTime: number
  ): Promise<Meeting> {
    const title = FileProcessor.extractTitle(transcript, options.fileName || 'Meeting Transcript');
    
    // Enhance action items with team context
    const actionItems: ActionItem[] = aiResponse.actionItems.map((item, index) => ({
      id: `action-${Date.now()}-${index}`,
      description: item.description,
      owner: item.owner,
      priority: item.priority,
      status: 'pending' as const,
      deadline: item.deadline,
      // These will be set during auto-assignment
      assigneeId: undefined,
      assigneeName: undefined,
      assignedBy: undefined,
      assignedAt: undefined
    }));

    return {
      id: '', // Will be set after saving to database
      title,
      date: new Date(),
      summary: aiResponse.summary,
      actionItems,
      rawTranscript: transcript,
      teamId: options.teamId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Auto-assign tasks based on speaker matching and AI suggestions
   */
  private async autoAssignTasks(
    actionItems: ActionItem[],
    speakerMatches: Map<string, TeamMember | null>,
    teamMembers: TeamMember[],
    assignedBy: string
  ): Promise<{ assignedTasks: ActionItem[]; unassignedTasks: ActionItem[] }> {
    const assignedTasks: ActionItem[] = [];
    const unassignedTasks: ActionItem[] = [];

    for (const task of actionItems) {
      let assignedMember: TeamMember | null = null;

      // Strategy 1: Try to match AI-suggested owner to team members
      if (task.owner) {
        assignedMember = this.teamService.matchSpeakerToTeamMember(task.owner, teamMembers);
      }

      // Strategy 2: If no match from AI owner, try to match from speaker context
      if (!assignedMember && task.description) {
        // Look for names mentioned in the task description
        const mentionedNames = this.extractNamesFromText(task.description);
        for (const name of mentionedNames) {
          assignedMember = this.teamService.matchSpeakerToTeamMember(name, teamMembers);
          if (assignedMember) break;
        }
      }

      // Strategy 3: Try to match based on speaker context from transcript
      if (!assignedMember) {
        // Find the best matching speaker for this task
        for (const [speakerName, member] of speakerMatches) {
          if (member && task.description.toLowerCase().includes(speakerName.toLowerCase().split(' ')[0])) {
            assignedMember = member;
            break;
          }
        }
      }

      // Assign the task if we found a match
      if (assignedMember) {
        const assignedTask: ActionItem = {
          ...task,
          assigneeId: assignedMember.userId,
          assigneeName: assignedMember.displayName,
          assignedBy,
          assignedAt: new Date()
        };
        assignedTasks.push(assignedTask);
      } else {
        // Keep as unassigned for manual assignment
        unassignedTasks.push(task);
      }
    }

    return { assignedTasks, unassignedTasks };
  }

  /**
   * Extract potential names from text
   */
  private extractNamesFromText(text: string): string[] {
    const names: string[] = [];
    
    // Look for capitalized words that could be names
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, '');
      if (word.length > 2 && /^[A-Z][a-z]+$/.test(word)) {
        // Check if next word is also capitalized (full name)
        if (i + 1 < words.length) {
          const nextWord = words[i + 1].replace(/[^\w]/g, '');
          if (/^[A-Z][a-z]+$/.test(nextWord)) {
            names.push(`${word} ${nextWord}`);
            i++; // Skip next word since we used it
            continue;
          }
        }
        names.push(word);
      }
    }
    
    return names;
  }

  /**
   * Send notifications for assigned tasks
   */
  private async sendTaskAssignmentNotifications(
    assignedTasks: ActionItem[],
    meeting: Meeting,
    assignedBy: string
  ): Promise<void> {
    for (const task of assignedTasks) {
      if (task.assigneeId && task.assigneeId !== assignedBy) {
        try {
          const notification: CreateNotificationData = {
            userId: task.assigneeId,
            type: 'task_assignment',
            title: 'New Task Assigned',
            message: `You have been assigned a task from "${meeting.title}"`,
            data: {
              taskId: task.id,
              taskDescription: task.description,
              meetingId: meeting.id,
              meetingTitle: meeting.title,
              teamId: meeting.teamId,
              teamName: meeting.teamId ? 'Team Meeting' : undefined
            }
          };

          await databaseService.createNotification(notification);
        } catch (error) {
          console.error(`Failed to send notification for task ${task.id}:`, error);
          // Don't fail the entire process for notification errors
        }
      }
    }
  }

  /**
   * Manually assign a task to a team member
   */
  async manuallyAssignTask(
    meetingId: string,
    taskId: string,
    assigneeId: string,
    assignedBy: string
  ): Promise<void> {
    try {
      await databaseService.assignTask(meetingId, taskId, assigneeId, assignedBy);

      // Get meeting and task details for notification
      const meeting = await databaseService.getMeetingById(meetingId);
      if (meeting) {
        const task = meeting.actionItems.find(item => item.id === taskId);
        if (task && assigneeId !== assignedBy) {
          const notification: CreateNotificationData = {
            userId: assigneeId,
            type: 'task_assignment',
            title: 'Task Assigned',
            message: `You have been assigned a task from "${meeting.title}"`,
            data: {
              taskId: task.id,
              taskDescription: task.description,
              meetingId: meeting.id,
              meetingTitle: meeting.title,
              teamId: meeting.teamId,
              teamName: meeting.teamId ? 'Team Meeting' : undefined
            }
          };

          await databaseService.createNotification(notification);
        }
      }
    } catch (error) {
      throw new Error(`Failed to manually assign task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get processing suggestions for unassigned tasks
   */
  getSuggestionsForUnassignedTasks(
    unassignedTasks: ActionItem[],
    teamMembers: TeamMember[],
    speakerMatches: Map<string, TeamMember | null>
  ): Array<{ task: ActionItem; suggestions: TeamMember[] }> {
    return unassignedTasks.map(task => {
      const suggestions: TeamMember[] = [];
      
      // Add team members who were mentioned as speakers
      for (const [speakerName, member] of speakerMatches) {
        if (member && !suggestions.find(s => s.userId === member.userId)) {
          suggestions.push(member);
        }
      }
      
      // Add other active team members
      for (const member of teamMembers) {
        if (!suggestions.find(s => s.userId === member.userId)) {
          suggestions.push(member);
        }
      }
      
      return { task, suggestions };
    });
  }
}

// Export singleton instance
let processorInstance: TeamAwareMeetingProcessor | null = null;

export function getTeamAwareProcessor(): TeamAwareMeetingProcessor {
  if (!processorInstance) {
    processorInstance = new TeamAwareMeetingProcessor();
  }
  return processorInstance;
}

// Convenience function for backward compatibility
export async function processWithTeamContext(
  transcript: string,
  team: { id: string; members: TeamMember[] }
): Promise<Meeting> {
  const processor = getTeamAwareProcessor();
  const result = await processor.processTranscriptWithTeamContext(transcript, {
    userId: 'system',
    teamId: team.id
  });
  return result.meeting;
}