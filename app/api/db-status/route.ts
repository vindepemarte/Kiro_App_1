import { NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/database';

export async function GET() {
  // Only run this on the server
  if (typeof window !== 'undefined') {
    return NextResponse.json({ error: 'This endpoint can only be called from the server' });
  }

  // Use a simple check to avoid build-time issues
  const usePostgres = process.env.USE_POSTGRES === 'true';
  const usePostgresUnderscore = process.env.USE_POSTGRES === 'true';
  const USE_POSTGRES = usePostgres || usePostgresUnderscore;
  const DATABASE_URL = process.env.DATABASE_URL;
  
  let databaseType = 'Firebase';
  let postgresAvailable = false;
  
  // Only try to use PostgreSQL at runtime, not during build
  if (USE_POSTGRES && DATABASE_URL) {
    try {
      // Dynamic import to avoid build-time issues
      const pg = await import('pg');
      postgresAvailable = true;
      databaseType = 'PostgreSQL';
    } catch (error) {
      console.error('Error importing pg:', error);
    }
  }
  
  return NextResponse.json({
    databaseType,
    postgresAvailable,
    environment: {
      USE_POSTGRES: process.env.USE_POSTGRES,
      USE_POSTGRES_UNDERSCORE: process.env.USE_POSTGRES,
      DATABASE_URL: process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set',
      NODE_ENV: process.env.NODE_ENV,
    }
  });
}