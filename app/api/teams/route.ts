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
    
    const response = NextResponse.json({ teams });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('Error getting teams:', error);
    const errorResponse = NextResponse.json({ 
      error: 'Failed to get teams',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
    
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
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
    
    const response = NextResponse.json({ teamId });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('Error creating team:', error);
    const errorResponse = NextResponse.json({ 
      error: 'Failed to create team',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
    
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}