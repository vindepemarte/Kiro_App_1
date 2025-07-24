import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const databaseService = await getRuntimeDatabaseService();
    const team = await databaseService.getTeamById(id);
    
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    
    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error getting team:', error);
    return NextResponse.json({ 
      error: 'Failed to get team',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { updates } = body;
    
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.updateTeam(id, updates);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ 
      error: 'Failed to update team',
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
    const success = await databaseService.deleteTeam(id, userId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json({ 
      error: 'Failed to delete team',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}