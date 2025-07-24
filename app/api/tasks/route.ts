import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  try {
    const databaseService = await getRuntimeDatabaseService();
    const tasks = await databaseService.getUserTasksFromCollection(userId);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error getting tasks:', error);
    return NextResponse.json({ 
      error: 'Failed to get tasks',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task } = body;
    
    if (!task) {
      return NextResponse.json({ error: 'Task data is required' }, { status: 400 });
    }
    
    const databaseService = await getRuntimeDatabaseService();
    const taskId = await databaseService.createTask(task);
    return NextResponse.json({ taskId });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ 
      error: 'Failed to create task',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}