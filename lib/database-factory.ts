// Database factory - conditionally imports PostgreSQL adapter only on server-side
import { DatabaseService, FirestoreService } from './database';
import { ClientDatabaseAdapter } from './client-database-adapter';

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
  const USE_POSTGRES = process.env.USE_POSTGRES === 'true' || process.env.USE_POSTGRES === 'true';
  
  // Client-side: For synchronous calls, we can't check the API, so we default to Firebase
  // The async version should be used for proper PostgreSQL detection
  if (typeof window !== 'undefined') {
    console.log('CLIENT DATABASE MODE: Firebase (synchronous fallback)');
    return new FirestoreService();
  }
  
  // Server-side: For safety, always return Firebase during build unless explicitly configured
  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    if (USE_POSTGRES) {
      console.log('PostgreSQL is enabled, but using synchronous factory. For PostgreSQL support, use getRuntimeDatabaseService instead.');
      
      // Try to load PostgreSQL adapter synchronously (this will only work in certain environments)
      try {
        // This is a synchronous require, which may not work in all environments
        const PostgresAdapter = require('./postgres-adapter').PostgresAdapter;
        return new PostgresAdapter();
      } catch (error) {
        console.error('Failed to load PostgreSQL adapter synchronously, falling back to Firebase:', error);
      }
    }
  }
  
  // Default to Firebase for safety
  return new FirestoreService();
}

// Cache for the database service instance
let cachedDatabaseService: DatabaseService | null = null;

/**
 * Get the database service with runtime detection
 * This function will be called on-demand and cache the result
 */
export async function getRuntimeDatabaseService(): Promise<DatabaseService> {
  // Return cached instance if available
  if (cachedDatabaseService) {
    return cachedDatabaseService;
  }

  // Check environment variables at runtime
  const usePostgres = process.env.USE_POSTGRES === 'true';
  const usePostgresUnderscore = process.env.USE_POSTGRES === 'true';
  const USE_POSTGRES = usePostgres || usePostgresUnderscore;
  const DATABASE_URL = process.env.DATABASE_URL;
  
  console.log('Runtime database service initialization:', {
    USE_POSTGRES,
    DATABASE_URL: DATABASE_URL ? 'Set (value hidden)' : 'Not set',
    isServer: typeof window === 'undefined'
  });
  
  // Client-side: Check database mode via API
  if (typeof window !== 'undefined') {
    const shouldUsePostgres = await ClientDatabaseAdapter.shouldUse();
    if (shouldUsePostgres) {
      console.log('CLIENT DATABASE MODE: API Adapter (PostgreSQL backend)');
      cachedDatabaseService = new ClientDatabaseAdapter();
      return cachedDatabaseService;
    } else {
      console.log('CLIENT DATABASE MODE: Firebase');
      cachedDatabaseService = new FirestoreService();
      return cachedDatabaseService;
    }
  }
  
  // Server-side: Try to use PostgreSQL if configured
  if (USE_POSTGRES && DATABASE_URL) {
    try {
      console.log('Attempting to use PostgreSQL adapter');
      // Dynamic import of PostgreSQL adapter (server-side only)
      const { PostgresAdapter } = await import('./postgres-adapter');
      cachedDatabaseService = new PostgresAdapter();
      console.log('SERVER DATABASE MODE: PostgreSQL');
      return cachedDatabaseService;
    } catch (error) {
      console.error('Failed to initialize PostgreSQL adapter, falling back to Firebase:', error);
    }
  } else {
    console.log('PostgreSQL not configured properly. USE_POSTGRES:', USE_POSTGRES, 'DATABASE_URL:', DATABASE_URL ? 'Set' : 'Not set');
  }
  
  // Use Firebase as fallback
  console.log('SERVER DATABASE MODE: Firebase');
  cachedDatabaseService = new FirestoreService();
  return cachedDatabaseService;
}

/**
 * Get both database services for migration purposes
 * This should only be used in server-side scripts
 */
export async function getDatabaseServices() {
  if (typeof window !== 'undefined') {
    throw new Error('getDatabaseServices can only be used on the server');
  }

  const firebase = new FirestoreService();
  let postgres = null;

  try {
    // Dynamic import of PostgreSQL adapter
    const { PostgresAdapter } = await import('./postgres-adapter');
    postgres = new PostgresAdapter();
  } catch (error) {
    console.error('Failed to initialize PostgreSQL adapter for migration:', error);
  }

  return { firebase, postgres };
}