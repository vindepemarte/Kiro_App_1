import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';
import { UserProfile } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, profile } = body;
    
    if (!userId || !profile) {
      return NextResponse.json({ error: 'User ID and profile data are required' }, { status: 400 });
    }
    
    const databaseService = await getRuntimeDatabaseService();
    await databaseService.createUserProfile(userId, profile as UserProfile);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating user profile:', error);
    return NextResponse.json({ 
      error: 'Failed to create user profile',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}