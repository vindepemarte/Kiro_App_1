import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const databaseService = await getRuntimeDatabaseService();
    const success = await databaseService.deleteNotification(params.id);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ 
      error: 'Failed to delete notification',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}