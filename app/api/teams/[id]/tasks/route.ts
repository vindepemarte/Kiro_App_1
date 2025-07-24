import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const databaseService = await getRuntimeDatabaseService();
    const tasks = await databaseService.getTeamTasks(params.id);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error getting team tasks:', error);
    return NextResponse.json({ 
      error: 'Failed to get team tasks',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}