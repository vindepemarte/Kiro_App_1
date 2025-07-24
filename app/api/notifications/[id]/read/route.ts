import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.markNotificationAsRead(params.id);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ 
      error: 'Failed to mark notification as read',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}