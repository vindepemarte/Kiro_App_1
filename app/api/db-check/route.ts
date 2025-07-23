import { NextResponse } from 'next/server';

export async function GET() {
  // This is a server-side API route, so we can check environment variables here
  const usePostgres = process.env.USE_POSTGRES === 'true';
  const usePostgresUnderscore = process.env.USE_POSTGRES === 'true';
  const databaseUrl = process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set';
  
  // Get the database service
  let databaseType = 'Unknown';
  try {
    // Dynamically import to avoid build-time issues
    const { getDatabaseService } = await import('@/lib/database-factory');
    const db = getDatabaseService();
    databaseType = db.constructor.name;
  } catch (error) {
    console.error('Error getting database service:', error);
    databaseType = `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
  
  return NextResponse.json({
    environment: {
      USE_POSTGRES: usePostgres,
      USE_POSTGRES_UNDERSCORE: usePostgresUnderscore,
      DATABASE_URL: databaseUrl,
    },
    databaseType,
    nodeEnv: process.env.NODE_ENV,
  });
}