import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';
import { TeamMember } from '@/lib/types';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const databaseService = await getRuntimeDatabaseService();
    const members = await databaseService.getTeamMembers(params.id);
    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error getting team members:', error);
    return NextResponse.json({ 
      error: 'Failed to get team members',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { member } = body;
    
    if (!member) {
      return NextResponse.json({ error: 'Member data is required' }, { status: 400 });
    }
    
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.addTeamMember(params.id, member as Omit<TeamMember, 'joinedAt'>);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ 
      error: 'Failed to add team member',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}