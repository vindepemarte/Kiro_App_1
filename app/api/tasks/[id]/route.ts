import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { updates } = body;
    
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.updateTaskInCollection(params.id, updates);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ 
      error: 'Failed to update task',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}