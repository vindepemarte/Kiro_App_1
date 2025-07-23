// API client for server-side operations
// This ensures we use PostgreSQL on the server side

import { Team, CreateTeamData } from './types';

/**
 * Get teams for a user
 */
export async function getUserTeams(userId: string): Promise<Team[]> {
  try {
    const response = await fetch(`/api/teams?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get teams');
    }
    const data = await response.json();
    return data.teams;
  } catch (error) {
    console.error('Error getting teams:', error);
    throw error;
  }
}

/**
 * Create a new team
 */
export async function createTeam(teamData: CreateTeamData): Promise<string> {
  try {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teamData }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create team');
    }
    
    const data = await response.json();
    return data.teamId;
  } catch (error) {
    console.error('Error creating team:', error);
    throw error;
  }
}

// Add more API client functions as needed