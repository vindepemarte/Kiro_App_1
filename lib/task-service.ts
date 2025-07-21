// Task service integration - combines database service with task management

import { databaseService } from './database';
import { getTaskManagementService, TaskManagementService } from './task-management-service';

// Create and export the task service instance
export const taskService = getTaskManagementService(databaseService);

// Export the interface for type checking
export type { TaskManagementService } from './task-management-service';

// Export all task-related types
export type { TaskWithContext } from './types';