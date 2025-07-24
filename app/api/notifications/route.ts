import { NextResponse } from 'next/server';
import { getRuntimeDatabaseService } from '@/lib/database-factory';
import { CreateNotificationData } from '@/lib/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  try {
    const databaseService = await getRuntimeDatabaseService();
    const notifications = await databaseService.getUserNotifications(userId);
    
    const response = NextResponse.json({ notifications });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('Error getting notifications:', error);
    const errorResponse = NextResponse.json({ 
      error: 'Failed to get notifications',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
    
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { notification } = body;
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification data is required' }, { status: 400 });
    }
    
    const databaseService = await getRuntimeDatabaseService();
    const notificationId = await databaseService.createNotification(notification as CreateNotificationData);
    
    const response = NextResponse.json({ notificationId });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
  } catch (error) {
    console.error('Error creating notification:', error);
    const errorResponse = NextResponse.json({ 
      error: 'Failed to create notification',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
    
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errorResponse;
  }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}