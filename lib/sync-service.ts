// Sync service integration - combines database service, task service, and real-time sync engine

import { databaseService } from './database';
import { taskService } from './task-service';
import { getRealTimeSyncEngine, RealTimeSyncEngine } from './real-time-sync-engine';

// Create and export the sync service instance
export const syncService = getRealTimeSyncEngine(databaseService, taskService);

// Export the interface for type checking
export type { RealTimeSyncEngine, UserDataSnapshot } from './real-time-sync-engine';