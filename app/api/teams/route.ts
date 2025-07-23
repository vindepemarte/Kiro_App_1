import { NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';
import { CreateTeamData } from '@/lib/types';

export async function GET(request: Request) {
  // Get the user ID from the query parameters
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  try {
    // Get the user's teams using PostgreSQL
    const teams = await databaseService.getUserTeams(userId);
    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error getting teams:', error);
    return NextResponse.json({ 
      error: 'Failed to get teams',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teamData } = body;
    
    if (!teamData || !teamData.name || !teamData.createdBy) {
      return NextResponse.json({ error: 'Invalid team data' }, { status: 400 });
    }
    
    // Create the team using PostgreSQL
    const teamId = await databaseService.createTeam(teamData as CreateTeamData);
    return NextResponse.json({ teamId });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ 
      error: 'Failed to create team',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}