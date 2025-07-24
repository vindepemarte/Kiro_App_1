import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';
import { ProcessedMeeting } from '@/lib/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  try {
    const databaseService = await getRuntimeDatabaseService();
    const meetings = await databaseService.getUserMeetings(userId);
    
    const response = NextResponse.json({ meetings });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('Error getting meetings:', error);
    const errorResponse = NextResponse.json({ 
      error: 'Failed to get meetings',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
    
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, meeting, teamId } = body;
    
    if (!userId || !meeting) {
      return NextResponse.json({ error: 'User ID and meeting data are required' }, { status: 400 });
    }
    
    const databaseService = await getRuntimeDatabaseService();
    const meetingId = await databaseService.saveMeeting(userId, meeting as ProcessedMeeting, teamId);
    
    const response = NextResponse.json({ meetingId });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('Error saving meeting:', error);
    const errorResponse = NextResponse.json({ 
      error: 'Failed to save meeting',
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