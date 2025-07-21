// Analytics service integration - combines database service and task service with analytics

import { databaseService } from './database';
import { taskService } from './task-service';
import { getAnalyticsService, AnalyticsService } from './analytics-service';

// Create and export the analytics service instance
export const analyticsService = getAnalyticsService(databaseService, taskService);

// Export the interface for type checking
export type { AnalyticsService, AnalyticsData } from './analytics-service';