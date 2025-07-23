import { NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

export async function GET() {
  // Only run this on the server
  if (typeof window !== 'undefined') {
    return NextResponse.json({ error: 'This endpoint can only be called from the server' });
  }

  try {
    // Try to perform a simple database operation
    const testUser = {
      uid: 'test-user-' + Date.now(),
      email: 'test@example.com',
      displayName: 'Test User',
    };
    
    // Create a user profile
    await databaseService.createUserProfile(testUser.uid, {
      userId: testUser.uid,
      email: testUser.email,
      displayName: testUser.displayName,
      createdAt: new Date(),
    });
    
    // Get the user profile
    const profile = await databaseService.getUserProfile(testUser.uid);
    
    return NextResponse.json({
      success: true,
      profile,
      message: 'Database operation successful',
      environment: {
        USE_POSTGRES: process.env.USE_POSTGRES,
        USE_POSTGRES_UNDERSCORE: process.env.USE_POSTGRES,
        DATABASE_URL: process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set',
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      environment: {
        USE_POSTGRES: process.env.USE_POSTGRES,
        USE_POSTGRES_UNDERSCORE: process.env.USE_POSTGRES,
        DATABASE_URL: process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set',
      }
    }, { status: 500 });
  }
}