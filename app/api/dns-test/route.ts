import { NextResponse } from 'next/server';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

export async function GET() {
  // Only run this on the server
  if (typeof window !== 'undefined') {
    return NextResponse.json({ error: 'This endpoint can only be called from the server' });
  }

  // Extract hostname from DATABASE_URL
  let hostname = 'unknown';
  let databaseUrl = process.env.DATABASE_URL || '';
  
  try {
    // Try to extract hostname from DATABASE_URL
    const url = new URL(databaseUrl);
    hostname = url.hostname;
  } catch (error) {
    return NextResponse.json({
      error: 'Invalid DATABASE_URL format',
      databaseUrlFormat: databaseUrl ? databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//USER:PASSWORD@') : 'Not set'
    });
  }

  // Try to resolve the hostname
  try {
    const result = await lookup(hostname);
    return NextResponse.json({
      hostname,
      resolved: true,
      ip: result.address,
      family: `IPv${result.family}`
    });
  } catch (error) {
    return NextResponse.json({
      hostname,
      resolved: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}