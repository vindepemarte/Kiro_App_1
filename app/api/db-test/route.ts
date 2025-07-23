import { NextResponse } from 'next/server';

export async function GET() {
  // Only run this test on the server
  if (typeof window !== 'undefined') {
    return NextResponse.json({ error: 'This endpoint can only be called from the server' });
  }

  const results = {
    environment: {
      USE_POSTGRES: process.env.USE_POSTGRES,
      USE_POSTGRES_UNDERSCORE: process.env.USE_POSTGRES,
      DATABASE_URL: process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set',
      NODE_ENV: process.env.NODE_ENV,
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
      // Dynamically import pg to avoid build-time issues
      const { Pool } = await import('pg');
      
      // Create a new pool for this test
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        // Set a short timeout to avoid hanging
        connectionTimeoutMillis: 5000,
      });
      
      // Try to connect and run a simple query
      const client = await pool.connect();
      try {
        const res = await client.query('SELECT version(), NOW()');
        results.connection.success = true;
        results.connection.serverVersion = res.rows[0].version;
        results.connection.timestamp = res.rows[0].now;
      } finally {
        // Make sure to release the client
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