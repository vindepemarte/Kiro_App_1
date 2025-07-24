import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { meetingId, taskId, assigneeId, assignedBy, meetingOwnerId } = body;
    
    if (!meetingId || !taskId || !assigneeId || !assignedBy || !meetingOwnerId) {
      return NextResponse.json({ error: 'All task assignment parameters are required' }, { status: 400 });
    }
    
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.assignTask(meetingId, taskId, assigneeId, assignedBy, meetingOwnerId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error assigning task:', error);
    return NextResponse.json({ 
      error: 'Failed to assign task',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}