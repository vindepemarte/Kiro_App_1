// User profile service for managing user settings and preferences

import { 
  UserProfile,
  User
} from './types';
import { 
  createUserProfile as dbCreateUserProfile,
  updateUserProfile as dbUpdateUserProfile,
  getUserProfile as dbGetUserProfile,
  subscribeToUserProfile as dbSubscribeToUserProfile
} from './database';

export interface UserProfileService {
  // Profile management
  createProfile(userId: string, user: User): Promise<void>;
  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void>;
  getProfile(userId: string): Promise<UserProfile | null>;
  subscribeToProfile(userId: string, callback: (profile: UserProfile | null) => void): () => void;
  
  // Settings management
  updateDisplayName(userId: string, displayName: string): Promise<void>;
  updateNotificationPreferences(userId: string, preferences: UserProfile['preferences']['notifications']): Promise<void>;
  updateTheme(userId: string, theme: UserProfile['preferences']['theme']): Promise<void>;
}

class UserProfileServiceImpl implements UserProfileService {
  
  // Create a user profile with default settings
  async createProfile(userId: string, user: User): Promise<void> {
    try {
      const defaultProfile: UserProfile = {
        userId,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        photoURL: user.photoURL || undefined,
        preferences: {
          notifications: {
            teamInvitations: true,
            meetingAssignments: true,
            taskAssignments: true,
          },
          theme: 'system',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await dbCreateUserProfile(userId, defaultProfile);
    } catch (error) {
      console.error('Failed to create user profile:', error);
      throw new Error(`Failed to create user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update user profile
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      await dbUpdateUserProfile(userId, updates);
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw new Error(`Failed to update user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get user profile
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await dbGetUserProfile(userId);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      // Return null instead of throwing to allow graceful fallbacks
      return null;
    }
  }

  // Subscribe to real-time profile updates
  subscribeToProfile(userId: string, callback: (profile: UserProfile | null) => void): () => void {
    try {
      return dbSubscribeToUserProfile(userId, callback);
    } catch (error) {
      console.error('Failed to subscribe to user profile:', error);
      // Return a no-op unsubscribe function
      callback(null);
      return () => {};
    }
  }

  // Update display name
  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    try {
      await this.updateProfile(userId, { displayName });
    } catch (error) {
      throw new Error(`Failed to update display name: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(
    userId: string, 
    preferences: UserProfile['preferences']['notifications']
  ): Promise<void> {
    try {
      const currentProfile = await this.getProfile(userId);
      if (!currentProfile) {
        throw new Error('User profile not found');
      }

      const updatedPreferences = {
        ...currentProfile.preferences,
        notifications: preferences,
      };

      await this.updateProfile(userId, { preferences: updatedPreferences });
    } catch (error) {
      throw new Error(`Failed to update notification preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update theme preference
  async updateTheme(userId: string, theme: UserProfile['preferences']['theme']): Promise<void> {
    try {
      const currentProfile = await this.getProfile(userId);
      if (!currentProfile) {
        throw new Error('User profile not found');
      }

      const updatedPreferences = {
        ...currentProfile.preferences,
        theme,
      };

      await this.updateProfile(userId, { preferences: updatedPreferences });
    } catch (error) {
      throw new Error(`Failed to update theme: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Create and export singleton instance
export const userProfileService = new UserProfileServiceImpl();

// Export the service class for testing
export { UserProfileServiceImpl };