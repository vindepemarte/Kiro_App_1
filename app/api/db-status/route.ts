import { NextResponse } from 'next/server';

export async function GET() {
  // Only run this on the server
  if (typeof window !== 'undefined') {
    return NextResponse.json({ error: 'This endpoint can only be called from the server' });
  }

  try {
    // Dynamically import the database service to avoid build-time issues
    const { getDatabaseServiceAsync } = await import('@/lib/database-factory');
    const db = await getDatabaseServiceAsync();
    
    return NextResponse.json({
      databaseType: db.constructor.name,
      environment: {
        USE_POSTGRES: process.env.USE_POSTGRES,
        USE_POSTGRES_UNDERSCORE: process.env.USE_POSTGRES,
        DATABASE_URL: process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set',
        NODE_ENV: process.env.NODE_ENV,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get database status',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}