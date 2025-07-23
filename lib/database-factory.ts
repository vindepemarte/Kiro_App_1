// Database factory - conditionally imports PostgreSQL adapter only on server-side
import { DatabaseService } from './types';
import { FirestoreService } from './database';

// Only import PostgreSQL on the server
let PostgresAdapter: any = null;
if (typeof window === 'undefined') {
  try {
    // Server-side only import
    // Using dynamic import to ensure it's only loaded on the server
    PostgresAdapter = require('./postgres-adapter').PostgresAdapter;
  } catch (error) {
    console.error('Failed to import PostgreSQL adapter:', error);
  }
}

/**
 * Get the appropriate database service based on environment and configuration
 */
export function getDatabaseService(): DatabaseService {
  // Check both variants of the environment variable name
  const USE_POSTGRES = process.env.USE_POSTGRES === 'true' || process.env.USE_POSTGRES === 'true';
  
  if (USE_POSTGRES && typeof window === 'undefined' && PostgresAdapter) {
    // Only use PostgreSQL on the server
    try {
      return new PostgresAdapter();
    } catch (error) {
      console.error('Failed to initialize PostgreSQL adapter, falling back to Firebase:', error);
      return new FirestoreService();
    }
  } else {
    // Use Firebase for client-side or when PostgreSQL is not available
    return new FirestoreService();
  }
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