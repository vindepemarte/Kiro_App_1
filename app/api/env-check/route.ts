import { NextResponse } from 'next/server';

export async function GET() {
  // Only run this on the server
  if (typeof window !== 'undefined') {
    return NextResponse.json({ error: 'This endpoint can only be called from the server' });
  }

  // Get all environment variables, but redact sensitive values
  const envVars: Record<string, string> = {};
  
  for (const key in process.env) {
    // Skip internal Next.js variables
    if (key.startsWith('__NEXT_')) continue;
    
    // Redact sensitive values
    if (
      key.includes('KEY') || 
      key.includes('SECRET') || 
      key.includes('PASSWORD') || 
      key.includes('TOKEN') ||
      key === 'DATABASE_URL'
    ) {
      envVars[key] = '[REDACTED]';
    } else {
      envVars[key] = process.env[key] || '';
    }
  }

  return NextResponse.json({
    environment: envVars,
    // Add some specific checks
    checks: {
      usePostgres: process.env.USE_POSTGRES === 'true',
      usePostgresUnderscore: process.env.USE_POSTGRES === 'true',
      databaseUrlSet: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
    }
  });
}