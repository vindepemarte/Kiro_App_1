// Analytics service for tracking and displaying productivity metrics

import { 
  Meeting, 
  TaskWithContext, 
  Team, 
  Notification,
  User 
} from './types';
import { DatabaseService } from './database';
import { TaskManagementService } from './task-management-service';
import { ErrorHandler, AppError, retryOperation } from './error-handler';

export interface AnalyticsData {
  // Meeting analytics
  totalMeetings: number;
  meetingsThisWeek: number;
  meetingsThisMonth: number;
  averageMeetingsPerWeek: number;
  
  // Task analytics
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageTasksPerWeek: number;
  
  // Team analytics
  totalTeams: number;
  activeTeams: number;
  teamMeetings: number;
  teamTasks: number;
  
  // Time-based analytics
  meetingsByMonth: { month: string; count: number }[];
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  
  // Performance metrics
  taskCompletionTrend: { week: string; completed: number; created: number }[];
  meetingFrequency: { day: string; count: number }[];
  
  // Last updated
  lastUpdated: Date;
}

export interface AnalyticsService {
  // Get comprehensive analytics for a user
  getUserAnalytics(userId: string): Promise<AnalyticsData>;
  
  // Get team-specific analytics
  getTeamAnalytics(teamId: string): Promise<AnalyticsData>;
  
  // Get real-time analytics updates
  subscribeToAnalytics(userId: string, callback: (analytics: AnalyticsData) => void): () => void;
  
  // Export analytics data
  exportAnalyticsData(userId: string, format: 'json' | 'csv'): Promise<string>;
}

export class AnalyticsServiceImpl implements AnalyticsService {
  constructor(
    private databaseService: DatabaseService,
    private taskService: TaskManagementService
  ) {}

  // Get comprehensive analytics for a user
  async getUserAnalytics(userId: string): Promise<AnalyticsData> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please provide a valid user ID');
        }

        // Get all user data
        const [meetings, tasks, teams] = await Promise.all([
          this.databaseService.getUserMeetings(userId),
          this.taskService.getUserTasks(userId),
          this.databaseService.getUserTeams(userId)
        ]);

        // Calculate time periods
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Meeting analytics
        const meetingsThisWeek = meetings.filter(m => m.createdAt >= oneWeekAgo).length;
        const meetingsThisMonth = meetings.filter(m => m.createdAt >= oneMonthAgo).length;
        const averageMeetingsPerWeek = meetings.length > 0 ? 
          meetings.length / Math.max(1, Math.ceil((now.getTime() - meetings[meetings.length - 1]?.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0;

        // Task analytics
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
        const overdueTasks = tasks.filter(t => 
          t.deadline && new Date(t.deadline) < now && t.status !== 'completed'
        ).length;
        const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;
        const averageTasksPerWeek = tasks.length > 0 ? 
          tasks.length / Math.max(1, Math.ceil((now.getTime() - tasks[tasks.length - 1]?.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000))) : 0;

        // Team analytics
        const activeTeams = teams.filter(t => t.members.some(m => m.userId === userId && m.status === 'active')).length;
        const teamMeetings = meetings.filter(m => m.teamId).length;
        const teamTasks = tasks.filter(t => t.teamId).length;

        // Time-based analytics
        const meetingsByMonth = this.calculateMeetingsByMonth(meetings);
        const tasksByStatus = this.calculateTasksByStatus(tasks);
        const tasksByPriority = this.calculateTasksByPriority(tasks);
        const taskCompletionTrend = this.calculateTaskCompletionTrend(tasks);
        const meetingFrequency = this.calculateMeetingFrequency(meetings);

        const analytics: AnalyticsData = {
          // Meeting analytics
          totalMeetings: meetings.length,
          meetingsThisWeek,
          meetingsThisMonth,
          averageMeetingsPerWeek: Math.round(averageMeetingsPerWeek * 10) / 10,
          
          // Task analytics
          totalTasks: tasks.length,
          completedTasks,
          pendingTasks,
          overdueTasks,
          completionRate: Math.round(completionRate * 10) / 10,
          averageTasksPerWeek: Math.round(averageTasksPerWeek * 10) / 10,
          
          // Team analytics
          totalTeams: teams.length,
          activeTeams,
          teamMeetings,
          teamTasks,
          
          // Time-based analytics
          meetingsByMonth,
          tasksByStatus,
          tasksByPriority,
          taskCompletionTrend,
          meetingFrequency,
          
          // Last updated
          lastUpdated: now
        };

        console.log(`Analytics calculated for user ${userId}:`, {
          meetings: analytics.totalMeetings,
          tasks: analytics.totalTasks,
          teams: analytics.totalTeams,
          completionRate: analytics.completionRate
        });

        return analytics;

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get User Analytics');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  // Get team-specific analytics
  async getTeamAnalytics(teamId: string): Promise<AnalyticsData> {
    return await retryOperation(async () => {
      try {
        // Validate inputs
        if (!teamId?.trim()) {
          throw new AppError('Team ID is required', 'VALIDATION_ERROR', false, 'Please provide a valid team ID');
        }

        // Get team data
        const [team, meetings, tasks] = await Promise.all([
          this.databaseService.getTeamById(teamId),
          this.databaseService.getTeamMeetings(teamId),
          this.taskService.getTeamTasks(teamId)
        ]);

        if (!team) {
          throw new AppError('Team not found', 'NOT_FOUND', false, 'Team not found');
        }

        // Calculate analytics similar to user analytics but for team context
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const meetingsThisWeek = meetings.filter(m => m.createdAt >= oneWeekAgo).length;
        const meetingsThisMonth = meetings.filter(m => m.createdAt >= oneMonthAgo).length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
        const overdueTasks = tasks.filter(t => 
          t.deadline && new Date(t.deadline) < now && t.status !== 'completed'
        ).length;

        const analytics: AnalyticsData = {
          totalMeetings: meetings.length,
          meetingsThisWeek,
          meetingsThisMonth,
          averageMeetingsPerWeek: 0, // Calculate based on team creation date
          
          totalTasks: tasks.length,
          completedTasks,
          pendingTasks,
          overdueTasks,
          completionRate: tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0,
          averageTasksPerWeek: 0,
          
          totalTeams: 1,
          activeTeams: 1,
          teamMeetings: meetings.length,
          teamTasks: tasks.length,
          
          meetingsByMonth: this.calculateMeetingsByMonth(meetings),
          tasksByStatus: this.calculateTasksByStatus(tasks),
          tasksByPriority: this.calculateTasksByPriority(tasks),
          taskCompletionTrend: this.calculateTaskCompletionTrend(tasks),
          meetingFrequency: this.calculateMeetingFrequency(meetings),
          
          lastUpdated: now
        };

        return analytics;

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Get Team Analytics');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.code);
      }
    });
  }

  // Subscribe to real-time analytics updates
  subscribeToAnalytics(userId: string, callback: (analytics: AnalyticsData) => void): () => void {
    try {
      // Subscribe to user meetings and tasks, then recalculate analytics
      const unsubscribeMeetings = this.databaseService.subscribeToUserMeetings(userId, async () => {
        try {
          const analytics = await this.getUserAnalytics(userId);
          callback(analytics);
        } catch (error) {
          console.error('Error updating analytics from meetings:', error);
        }
      });

      const unsubscribeTasks = this.taskService.subscribeToUserTasks(userId, async () => {
        try {
          const analytics = await this.getUserAnalytics(userId);
          callback(analytics);
        } catch (error) {
          console.error('Error updating analytics from tasks:', error);
        }
      });

      // Return cleanup function
      return () => {
        unsubscribeMeetings();
        unsubscribeTasks();
      };

    } catch (error) {
      console.error('Failed to subscribe to analytics updates:', error);
      return () => {};
    }
  }

  // Export analytics data
  async exportAnalyticsData(userId: string, format: 'json' | 'csv'): Promise<string> {
    try {
      const analytics = await this.getUserAnalytics(userId);

      if (format === 'json') {
        return JSON.stringify(analytics, null, 2);
      } else if (format === 'csv') {
        // Convert to CSV format
        const csvLines = [
          'Metric,Value',
          `Total Meetings,${analytics.totalMeetings}`,
          `Meetings This Week,${analytics.meetingsThisWeek}`,
          `Meetings This Month,${analytics.meetingsThisMonth}`,
          `Total Tasks,${analytics.totalTasks}`,
          `Completed Tasks,${analytics.completedTasks}`,
          `Pending Tasks,${analytics.pendingTasks}`,
          `Overdue Tasks,${analytics.overdueTasks}`,
          `Completion Rate,${analytics.completionRate}%`,
          `Total Teams,${analytics.totalTeams}`,
          `Active Teams,${analytics.activeTeams}`,
          `Team Meetings,${analytics.teamMeetings}`,
          `Team Tasks,${analytics.teamTasks}`
        ];

        return csvLines.join('\n');
      }

      throw new Error('Unsupported export format');

    } catch (error) {
      console.error('Error exporting analytics data:', error);
      throw error;
    }
  }

  // Helper methods for calculations
  private calculateMeetingsByMonth(meetings: Meeting[]): { month: string; count: number }[] {
    const monthCounts = new Map<string, number>();
    
    meetings.forEach(meeting => {
      const month = meeting.createdAt.toISOString().slice(0, 7); // YYYY-MM format
      monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    });

    return Array.from(monthCounts.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateTasksByStatus(tasks: TaskWithContext[]): { status: string; count: number }[] {
    const statusCounts = new Map<string, number>();
    
    tasks.forEach(task => {
      statusCounts.set(task.status, (statusCounts.get(task.status) || 0) + 1);
    });

    return Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }));
  }

  private calculateTasksByPriority(tasks: TaskWithContext[]): { priority: string; count: number }[] {
    const priorityCounts = new Map<string, number>();
    
    tasks.forEach(task => {
      priorityCounts.set(task.priority, (priorityCounts.get(task.priority) || 0) + 1);
    });

    return Array.from(priorityCounts.entries())
      .map(([priority, count]) => ({ priority, count }));
  }

  private calculateTaskCompletionTrend(tasks: TaskWithContext[]): { week: string; completed: number; created: number }[] {
    const weeklyData = new Map<string, { completed: number; created: number }>();
    
    tasks.forEach(task => {
      const createdWeek = this.getWeekString(task.createdAt);
      const current = weeklyData.get(createdWeek) || { completed: 0, created: 0 };
      current.created += 1;
      
      if (task.status === 'completed') {
        current.completed += 1;
      }
      
      weeklyData.set(createdWeek, current);
    });

    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private calculateMeetingFrequency(meetings: Meeting[]): { day: string; count: number }[] {
    const dayCounts = new Map<string, number>();
    
    meetings.forEach(meeting => {
      const day = meeting.date.toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return daysOfWeek.map(day => ({
      day,
      count: dayCounts.get(day) || 0
    }));
  }

  private getWeekString(date: Date): string {
    const year = date.getFullYear();
    const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
}

// Create and export a singleton instance
let analyticsServiceInstance: AnalyticsServiceImpl | null = null;

export function getAnalyticsService(
  databaseService: DatabaseService,
  taskService: TaskManagementService
): AnalyticsServiceImpl {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsServiceImpl(databaseService, taskService);
  }
  return analyticsServiceInstance;
}

// AnalyticsServiceImpl is already exported above as a class declaration