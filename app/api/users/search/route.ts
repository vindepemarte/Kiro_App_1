import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }
  
  try {
    const databaseService = await getRuntimeDatabaseService();
    const user = await databaseService.searchUserByEmail(email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error searching user:', error);
    return NextResponse.json({ 
      error: 'Failed to search user',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}