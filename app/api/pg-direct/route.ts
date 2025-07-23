import { NextResponse } from 'next/server';

export async function GET() {
  // Only run this on the server
  if (typeof window !== 'undefined') {
    return NextResponse.json({ error: 'This endpoint can only be called from the server' });
  }

  const results = {
    environment: {
      USE_POSTGRES: process.env.USE_POSTGRES,
      USE_POSTGRES_UNDERSCORE: process.env.USE_POSTGRES,
      DATABASE_URL: process.env.DATABASE_URL ? '[REDACTED]' : 'Not set',
    },
    connection: {
      attempted: false,
      success: false,
      error: null,
      serverVersion: null,
      timestamp: null,
    }
  };

  // Only attempt connection if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    results.connection.attempted = true;
    
    try {
      // Dynamically import pg
      const pg = await import('pg');
      
      // Create a connection pool
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 5000,
      });
      
      // Try to connect
      const client = await pool.connect();
      
      try {
        // Run a simple query
        const res = await client.query('SELECT version(), NOW()');
        
        results.connection.success = true;
        results.connection.serverVersion = res.rows[0].version;
        results.connection.timestamp = res.rows[0].now;
      } finally {
        client.release();
      }
      
      // Close the pool
      await pool.end();
      
    } catch (error) {
      results.connection.success = false;
      results.connection.error = error instanceof Error ? error.message : String(error);
    }
  }

  return NextResponse.json(results);
}