// Database factory to switch between Firebase and PostgreSQL

import { DatabaseService } from './database';
import { databaseService as firebaseService } from './database';
import { postgresAdapter } from './postgres-adapter';

// Feature flag to control which database to use
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

// Export the appropriate database service based on the feature flag
export const databaseService: DatabaseService = USE_POSTGRES ? postgresAdapter : firebaseService;

// Helper function to check if we're using PostgreSQL
export const isUsingPostgres = (): boolean => USE_POSTGRES;

// Helper function to get both database services (for migration)
export const getDatabaseServices = () => ({
  firebase: firebaseService,
  postgres: postgresAdapter
});