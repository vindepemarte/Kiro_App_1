import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';
import { UserProfile } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user } = body;
    
    if (!user || !user.uid) {
      return NextResponse.json({ error: 'User data is required' }, { status: 400 });
    }
    
    const databaseService = await getRuntimeDatabaseService();
    
    // Check if profile already exists
    let existingProfile;
    try {
      existingProfile = await databaseService.getUserProfile(user.uid);
    } catch (error) {
      console.log('Profile not found, will create new one');
      existingProfile = null;
    }
    
    if (!existingProfile) {
      // Create new profile
      const newProfile: UserProfile = {
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || undefined,
        preferences: {
          notifications: {
            teamInvitations: true,
            meetingAssignments: true,
            taskAssignments: true
          },
          theme: 'light'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await databaseService.createUserProfile(user.uid, newProfile);
      console.log(`Created user profile for ${user.email}`);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Profile created successfully',
        profile: newProfile 
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        message: 'Profile already exists',
        profile: existingProfile 
      });
    }
    
  } catch (error) {
    console.error('Error creating user profile:', error);
    return NextResponse.json({ 
      error: 'Failed to create user profile',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}