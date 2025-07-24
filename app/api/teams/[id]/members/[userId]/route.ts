import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function PUT(request: Request, { params }: { params: { id: string, userId: string } }) {
  try {
    const body = await request.json();
    const { updates } = body;
    
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.updateTeamMember(params.id, params.userId, updates);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json({ 
      error: 'Failed to update team member',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string, userId: string } }) {
  try {
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.removeTeamMember(params.id, params.userId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ 
      error: 'Failed to remove team member',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}