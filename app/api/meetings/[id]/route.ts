import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';
import { Meeting } from '@/lib/types';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  try {
    const databaseService = await getRuntimeDatabaseService();
    const meeting = await databaseService.getMeetingById(id, userId);
    
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    
    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Error getting meeting:', error);
    return NextResponse.json({ 
      error: 'Failed to get meeting',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, updates } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.updateMeeting(id, userId, updates);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json({ 
      error: 'Failed to update meeting',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.deleteMeeting(id, userId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return NextResponse.json({ 
      error: 'Failed to delete meeting',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}