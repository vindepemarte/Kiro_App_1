import { NextResponse } from 'next/server';
import { initializeDatabaseService } from '@/lib/database-factory';

// Initialize the database service when this route is accessed
let initialized = false;

export async function GET() {
  if (!initialized && typeof window === 'undefined') {
    try {
      await initializeDatabaseService();
      initialized = true;
      return NextResponse.json({ status: 'Database service initialized successfully' });
    } catch (error) {
      return NextResponse.json({ 
        status: 'Database initialization failed', 
        error: error instanceof Error ? error.message : String(error) 
      }, { status: 500 });
    }
  }
  
  return NextResponse.json({ status: 'Database service already initialized' });
}