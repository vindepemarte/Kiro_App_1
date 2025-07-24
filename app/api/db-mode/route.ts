import { NextResponse } from 'next/server';

export async function GET() {
  const usePostgres = process.env.USE_POSTGRES === 'true';
  const databaseUrl = process.env.DATABASE_URL ? 'configured' : 'not_configured';
  
  return NextResponse.json({
    usePostgres,
    databaseUrl,
    mode: usePostgres && process.env.DATABASE_URL ? 'postgresql' : 'firebase'
  });
}