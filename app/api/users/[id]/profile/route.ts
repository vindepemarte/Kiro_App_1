import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const databaseService = await getRuntimeDatabaseService();
    const profile = await databaseService.getUserProfile(id);
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json({ 
      error: 'Failed to get user profile',
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
    await databaseService.updateUserProfile(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ 
      error: 'Failed to update user profile',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}