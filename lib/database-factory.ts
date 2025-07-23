// Database factory - conditionally imports PostgreSQL adapter only on server-side
import { DatabaseService } from './types';
import { FirestoreService } from './database';

/**
 * Get the appropriate database service based on environment and configuration
 */
export async function getDatabaseServiceAsync(): Promise<DatabaseService> {
  // Log all relevant environment variables for debugging
  if (typeof window === 'undefined') {
    console.log('Database factory environment check:', {
      USE_POSTGRES: process.env.USE_POSTGRES,
      USE_POSTGRES_UNDERSCORE: process.env.USE_POSTGRES,
      DATABASE_URL: process.env.DATABASE_URL ? 'Set (value hidden)' : 'Not set',
      NODE_ENV: process.env.NODE_ENV,
    });
  }
  
  // Check both variants of the environment variable name
  const usePostgres = process.env.USE_POSTGRES === 'true';
  const usePostgresUnderscore = process.env.USE_POSTGRES === 'true';
  const USE_POSTGRES = usePostgres || usePostgresUnderscore;
  
  console.log(`Should use PostgreSQL? ${USE_POSTGRES ? 'Yes' : 'No'}`);
  
  if (USE_POSTGRES && typeof window === 'undefined' && process.env.DATABASE_URL) {
    try {
      console.log('Attempting to use PostgreSQL adapter');
      // Dynamic import of PostgreSQL adapter (server-side only)
      const { PostgresAdapter } = await import('./postgres-adapter');
      console.log('PostgreSQL adapter imported successfully');
      return new PostgresAdapter();
    } catch (error) {
      console.error('Failed to initialize PostgreSQL adapter, falling back to Firebase:', error);
      return new FirestoreService();
    }
  } else {
    // Use Firebase for client-side or when PostgreSQL is not available
    console.log('Using Firebase database service');
    return new FirestoreService();
  }
}

/**
 * Synchronous version that doesn't use dynamic imports
 * This is safer for build-time usage
 */
export function getDatabaseService(): DatabaseService {
  // For safety, always return Firebase during build
  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    // In production server environment, we can check if PostgreSQL is enabled
    const USE_POSTGRES = process.env.USE_POSTGRES === 'true' || process.env.USE_POSTGRES === 'true';
    
    if (USE_POSTGRES) {
      console.log('PostgreSQL is enabled, but using synchronous factory. For PostgreSQL support, use getDatabaseServiceAsync instead.');
    }
  }
  
  // Default to Firebase for safety
  return new FirestoreService();
}

/**
 * Get both database services for migration purposes
 * This should only be used in server-side scripts
 */
export function getDatabaseServices() {
  if (typeof window !== 'undefined') {
    throw new Error('getDatabaseServices can only be used on the server');
  }

  const firebase = new FirestoreService();
  let postgres = null;

  if (PostgresAdapter) {
    try {
      postgres = new PostgresAdapter();
    } catch (error) {
      console.error('Failed to initialize PostgreSQL adapter for migration:', error);
    }
  }

  return { firebase, postgres };
}