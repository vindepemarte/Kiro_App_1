import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';
import { ActionItem } from '@/lib/types';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { meetingId, taskId, status } = body;
    
    if (!meetingId || !taskId || !status) {
      return NextResponse.json({ error: 'Meeting ID, task ID, and status are required' }, { status: 400 });
    }
    
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.updateTaskStatus(meetingId, taskId, status as ActionItem['status']);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json({ 
      error: 'Failed to update task status',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}