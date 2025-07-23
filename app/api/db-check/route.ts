import { NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database-factory';

export async function GET() {
  // This is a server-side API route, so we can check environment variables here
  const usePostgres = process.env.USE_POSTGRES === 'true';
  const usePostgresUnderscore = process.env.USE_POSTGRES === 'true';
  const databaseUrl = process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set';
  
  // Get the database service
  let databaseType = 'Unknown';
  try {
    const db = getDatabaseService();
    databaseType = db.constructor.name;
  } catch (error) {
    console.error('Error getting database service:', error);
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