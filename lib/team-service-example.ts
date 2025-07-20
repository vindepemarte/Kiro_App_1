// Example usage of the team management service

import { databaseService } from './database';
import { getTeamService } from './team-service';
import { CreateTeamData, TeamMember } from './types';

// Example of how to use the team service
export async function teamServiceExample() {
  // Get the team service instance
  const teamService = getTeamService(databaseService);

  try {
    // 1. Create a new team
    console.log('Creating a new team...');
    const teamData: CreateTeamData = {
      name: 'Engineering Team',
      description: 'Software development team for the MeetingAI project',
      createdBy: 'user-admin-123'
    };
    
    const teamId = await teamService.createTeam(teamData);
    console.log(`Team created with ID: ${teamId}`);

    // 2. Search for users to invite
    console.log('Searching for users to invite...');
    const user1 = await teamService.searchUserByEmail('john.doe@company.com');
    const user2 = await teamService.searchUserByEmail('jane.smith@company.com');
    
    if (user1 && user2) {
      console.log(`Found users: ${user1.displayName}, ${user2.displayName}`);

      // 3. Invite users to the team
      console.log('Inviting users to team...');
      await teamService.inviteUserToTeam(
        teamId, 
        'user-admin-123', 
        user1.email!, 
        'John Doe'
      );
      
      await teamService.inviteUserToTeam(
        teamId, 
        'user-admin-123', 
        user2.email!, 
        'Jane Smith'
      );
      
      console.log('Invitations sent successfully');
    }

    // 4. Get team information
    const team = await teamService.getTeam(teamId);
    if (team) {
      console.log(`Team "${team.name}" has ${team.members.length} members`);
      
      // 5. Test speaker matching
      console.log('Testing speaker matching...');
      const speakerNames = ['John Doe', 'Jane', 'Unknown Speaker', 'john.doe'];
      const matches = teamService.matchMultipleSpeakers(speakerNames, team.members);
      
      matches.forEach((match, speakerName) => {
        if (match) {
          console.log(`Speaker "${speakerName}" matched to team member: ${match.displayName}`);
        } else {
          console.log(`Speaker "${speakerName}" could not be matched to any team member`);
        }
      });
    }

    // 6. Check permissions
    const isAdmin = await teamService.isTeamAdmin(teamId, 'user-admin-123');
    console.log(`User is team admin: ${isAdmin}`);

    return teamId;

  } catch (error) {
    console.error('Team service example error:', error);
    throw error;
  }
}

// Example of handling team invitations
export async function handleTeamInvitationExample(userId: string) {
  const teamService = getTeamService(databaseService);

  try {
    // Get user's notifications (invitations)
    const notifications = await databaseService.getUserNotifications(userId);
    const teamInvitations = notifications.filter(n => n.type === 'team_invitation' && !n.read);

    console.log(`User has ${teamInvitations.length} pending team invitations`);

    for (const invitation of teamInvitations) {
      console.log(`Invitation to join team: ${invitation.data.teamName}`);
      console.log(`From: ${invitation.data.inviterName}`);
      
      // Example: Accept the first invitation
      if (teamInvitations.indexOf(invitation) === 0) {
        console.log('Accepting invitation...');
        await teamService.acceptTeamInvitation(invitation.id, userId);
        console.log('Invitation accepted successfully');
      } else {
        console.log('Declining invitation...');
        await teamService.declineTeamInvitation(invitation.id, userId);
        console.log('Invitation declined');
      }
    }

  } catch (error) {
    console.error('Invitation handling error:', error);
    throw error;
  }
}

// Example of automatic task assignment using speaker matching
export async function autoAssignTasksExample(
  meetingTranscript: string, 
  actionItems: Array<{ description: string; owner?: string }>,
  teamId: string
) {
  const teamService = getTeamService(databaseService);

  try {
    // Get team members
    const teamMembers = await teamService.getTeamMembers(teamId);
    
    // Extract speaker names from transcript (simplified example)
    const speakerPattern = /^([A-Za-z\s]+):/gm;
    const speakerMatches = meetingTranscript.match(speakerPattern);
    const speakerNames = speakerMatches 
      ? speakerMatches.map(match => match.replace(':', '').trim())
      : [];

    console.log(`Found speakers in transcript: ${speakerNames.join(', ')}`);

    // Match speakers to team members
    const speakerMatches = teamService.matchMultipleSpeakers(speakerNames, teamMembers);

    // Auto-assign tasks based on speaker matching
    const assignedTasks = actionItems.map(task => {
      if (task.owner) {
        // Try to match the owner to a team member
        const match = teamService.matchSpeakerToTeamMember(task.owner, teamMembers);
        return {
          ...task,
          assigneeId: match?.userId,
          assigneeName: match?.displayName,
          matchConfidence: match ? 'high' : 'none'
        };
      }
      return {
        ...task,
        assigneeId: undefined,
        assigneeName: undefined,
        matchConfidence: 'none'
      };
    });

    console.log('Task assignment results:');
    assignedTasks.forEach((task, index) => {
      console.log(`Task ${index + 1}: ${task.description}`);
      if (task.assigneeId) {
        console.log(`  Assigned to: ${task.assigneeName} (${task.matchConfidence} confidence)`);
      } else {
        console.log(`  Unassigned - requires manual assignment`);
      }
    });

    return assignedTasks;

  } catch (error) {
    console.error('Auto-assignment error:', error);
    throw error;
  }
}

// Export all examples
export const TeamServiceExamples = {
  teamServiceExample,
  handleTeamInvitationExample,
  autoAssignTasksExample
};