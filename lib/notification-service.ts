// Notification service integration - combines database service with notification management

import { databaseService } from './database';
import { getNotificationManagementService, NotificationManagementService } from './notification-management-service';

// Create the notification management service instance
const notificationManagementService = getNotificationManagementService(databaseService);

// Create a wrapper service with the expected interface
export const notificationService = {
  // Existing methods from notification management service
  ...notificationManagementService,
  
  // Add the markAsRead method that the UI expects
  async markAsRead(notificationId: string): Promise<void> {
    // Get the notification first to find the userId
    try {
      // Use the database service to mark as read directly
      await databaseService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },
  
  // Add getUnreadCount method that the UI expects
  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await databaseService.getUserNotifications(userId);
    return notifications.filter(n => !n.read).length;
  }
};

// Export the interface for type checking
export type { NotificationManagementService } from './notification-management-service';