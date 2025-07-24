import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function GET() {
  try {
    const databaseService = await getRuntimeDatabaseService();
    const teams = await databaseService.getAllTeams();
    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error getting all teams:', error);
    return NextResponse.json({ 
      error: 'Failed to get all teams',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}