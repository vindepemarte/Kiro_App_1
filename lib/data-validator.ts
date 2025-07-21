// Data validation utilities for ensuring clean database operations

import { ProcessedMeeting, ActionItem, TeamMember, User } from './types';
import { Timestamp } from 'firebase/firestore';

export interface DataValidator {
  validateMeetingData(meeting: ProcessedMeeting, teamId?: string): ValidatedMeetingData;
  validateUserProfile(user: User): ValidatedUserProfile;
  validateTeamMember(member: TeamMember): ValidatedTeamMember;
  sanitizeUndefinedFields<T>(data: T): T;
}

export interface ValidatedMeetingData {
  title: string;
  date: Timestamp;
  summary: string;
  actionItems: ActionItem[];
  rawTranscript: string;
  teamId?: string; // Optional, omitted if undefined
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: {
    fileName: string;
    fileSize: number;
    uploadedAt: Timestamp;
    processingTime: number;
  };
}

export interface ValidatedUserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  searchable: boolean;
  profileComplete: boolean;
}

export interface ValidatedTeamMember {
  userId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member';
  status: 'active' | 'invited';
  joinedAt: Timestamp;
  invitedAt?: Timestamp;
  invitedBy?: string;
}

class DataValidatorImpl implements DataValidator {
  
  /**
   * Remove undefined fields from an object to prevent Firestore errors
   */
  sanitizeUndefinedFields<T>(data: T): T {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeUndefinedFields(item)) as T;
    }

    const sanitized = {} as T;
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key as keyof T] = this.sanitizeUndefinedFields(value);
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize meeting data before database operations
   */
  validateMeetingData(meeting: ProcessedMeeting, teamId?: string): ValidatedMeetingData {
    const now = Timestamp.fromDate(new Date());
    
    // Create base meeting data with required fields
    const validatedData: ValidatedMeetingData = {
      title: meeting.title || this.generateMeetingTitle(meeting.rawTranscript, meeting.summary),
      date: meeting.date ? Timestamp.fromDate(new Date(meeting.date)) : now,
      summary: meeting.summary || '',
      actionItems: this.validateActionItems(meeting.actionItems || []),
      rawTranscript: meeting.rawTranscript || '',
      createdAt: now,
      updatedAt: now,
      metadata: {
        fileName: meeting.metadata?.fileName || 'unknown',
        fileSize: meeting.metadata?.fileSize || 0,
        uploadedAt: meeting.metadata?.uploadedAt ? Timestamp.fromDate(new Date(meeting.metadata.uploadedAt)) : now,
        processingTime: meeting.metadata?.processingTime || 0,
      }
    };

    // Only add teamId if it's a valid non-empty string
    if (teamId && teamId.trim() && teamId !== 'undefined' && teamId !== 'null') {
      validatedData.teamId = teamId.trim();
    }

    // Remove any undefined fields
    return this.sanitizeUndefinedFields(validatedData);
  }

  /**
   * Validate action items and ensure they have proper structure
   */
  private validateActionItems(actionItems: ActionItem[]): ActionItem[] {
    return actionItems.map((item, index) => {
      const validatedItem: ActionItem = {
        id: item.id || `action-${Date.now()}-${index}`,
        description: item.description || '',
        priority: item.priority || 'medium',
        status: item.status || 'pending',
      };

      // Only add owner if it exists and is not empty
      if (item.owner && item.owner.trim()) {
        validatedItem.owner = item.owner.trim();
      }

      // Handle deadline properly
      if (item.deadline) {
        const deadline = item.deadline instanceof Date ? item.deadline : new Date(item.deadline);
        if (!isNaN(deadline.getTime())) {
          validatedItem.deadline = deadline;
        }
      }

      return validatedItem;
    });
  }

  /**
   * Generate a meeting title from transcript or summary
   */
  private generateMeetingTitle(transcript: string, summary: string): string {
    // Try to extract title from first line of transcript
    const firstLine = transcript?.split('\n')[0]?.trim();
    if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
      return firstLine;
    }

    // Try to extract title from summary
    const summaryFirstSentence = summary?.split('.')[0]?.trim();
    if (summaryFirstSentence && summaryFirstSentence.length > 0 && summaryFirstSentence.length < 100) {
      return summaryFirstSentence;
    }

    // Fallback to date-based title
    return `Meeting - ${new Date().toLocaleDateString()}`;
  }

  /**
   * Validate user profile data
   */
  validateUserProfile(user: User): ValidatedUserProfile {
    const now = Timestamp.fromDate(new Date());
    
    const validatedProfile: ValidatedUserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      createdAt: now,
      updatedAt: now,
      searchable: true,
      profileComplete: !!(user.email && user.displayName),
    };

    // Only add photoURL if it exists
    if (user.photoURL && user.photoURL.trim()) {
      validatedProfile.photoURL = user.photoURL.trim();
    }

    return this.sanitizeUndefinedFields(validatedProfile);
  }

  /**
   * Validate team member data
   */
  validateTeamMember(member: TeamMember): ValidatedTeamMember {
    const now = Timestamp.fromDate(new Date());
    
    const validatedMember: ValidatedTeamMember = {
      userId: member.userId,
      email: member.email || '',
      displayName: member.displayName || member.email?.split('@')[0] || 'User',
      role: member.role || 'member',
      status: member.status || 'active',
      joinedAt: member.joinedAt ? Timestamp.fromDate(new Date(member.joinedAt)) : now,
    };

    // Only add optional fields if they exist
    if (member.invitedAt) {
      validatedMember.invitedAt = Timestamp.fromDate(new Date(member.invitedAt));
    }

    if (member.invitedBy && member.invitedBy.trim()) {
      validatedMember.invitedBy = member.invitedBy.trim();
    }

    return this.sanitizeUndefinedFields(validatedMember);
  }
}

// Export singleton instance
export const dataValidator = new DataValidatorImpl();

// Export class for testing
export { DataValidatorImpl };