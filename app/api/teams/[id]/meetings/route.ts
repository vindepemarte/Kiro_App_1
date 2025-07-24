import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const databaseService = await getRuntimeDatabaseService();
    const meetings = await databaseService.getTeamMeetings(id);
    return NextResponse.json({ meetings });
  } catch (error) {
    console.error('Error getting team meetings:', error);
    return NextResponse.json({ 
      error: 'Failed to get team meetings',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}