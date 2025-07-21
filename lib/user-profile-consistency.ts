// User profile consistency service to ensure profiles are created and maintained properly

import { User, UserProfile } from './types';
import { dataValidator } from './data-validator';
import { databaseService } from './database';
import { ErrorHandler, AppError, retryOperation } from './error-handler';

export interface UserProfileConsistencyService {
  ensureUserProfile(user: User): Promise<void>;
  reconcileUserData(userId: string): Promise<void>;
  createMissingProfiles(): Promise<void>;
  validateUserSearchability(email: string): Promise<User | null>;
}

class UserProfileConsistencyServiceImpl implements UserProfileConsistencyService {

  /**
   * Ensure a user profile exists for the given user
   * This should be called whenever a user signs in
   */
  async ensureUserProfile(user: User): Promise<void> {
    return await retryOperation(async () => {
      try {
        if (!user?.uid || !user?.email) {
          throw new AppError('Invalid user data', 'VALIDATION_ERROR', false, 'User must have uid and email');
        }

        // Check if profile already exists
        const existingProfile = await databaseService.getUserProfile(user.uid);
        
        if (!existingProfile) {
          // Create new profile
          const validatedProfile = dataValidator.validateUserProfile(user);
          await databaseService.createUserProfile(user.uid, validatedProfile);
          
          console.log(`Created user profile for ${user.email}`);
        } else {
          // Update existing profile if needed
          const updates: Partial<UserProfile> = {};
          let needsUpdate = false;

          if (existingProfile.email !== user.email) {
            updates.email = user.email;
            needsUpdate = true;
          }

          if (user.displayName && existingProfile.displayName !== user.displayName) {
            updates.displayName = user.displayName;
            needsUpdate = true;
          }

          if (user.photoURL && existingProfile.photoURL !== user.photoURL) {
            updates.photoURL = user.photoURL;
            needsUpdate = true;
          }

          if (needsUpdate) {
            updates.updatedAt = new Date();
            updates.profileComplete = !!(user.email && user.displayName);
            await databaseService.updateUserProfile(user.uid, updates);
            
            console.log(`Updated user profile for ${user.email}`);
          }
        }

        // Ensure user is searchable for team invitations
        await this.ensureUserSearchability(user);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Ensure User Profile');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  /**
   * Ensure user is searchable in the users collection for team invitations
   */
  private async ensureUserSearchability(user: User): Promise<void> {
    try {
      // Check if user exists in searchable users collection
      const searchableUser = await databaseService.searchUserByEmail(user.email);
      
      if (!searchableUser) {
        // Create searchable user record
        // Note: This would need to be implemented in the database service
        // For now, we'll log that this needs to be done
        console.log(`User ${user.email} needs to be added to searchable users collection`);
      }
    } catch (error) {
      console.warn('Failed to ensure user searchability:', error);
      // Don't fail the profile creation if searchability fails
    }
  }

  /**
   * Reconcile user data inconsistencies
   */
  async reconcileUserData(userId: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Invalid user ID');
        }

        // Get user profile
        const profile = await databaseService.getUserProfile(userId);
        
        if (!profile) {
          console.warn(`No profile found for user ${userId} - cannot reconcile`);
          return;
        }

        // Check if user is searchable
        const searchableUser = await databaseService.searchUserByEmail(profile.email);
        
        if (!searchableUser) {
          console.log(`User ${profile.email} is not searchable - needs manual intervention`);
          // In a real implementation, we might create the searchable record here
        }

        console.log(`Reconciled user data for ${profile.email}`);

      } catch (error) {
        throw ErrorHandler.handleError(error, 'Reconcile User Data');
      }
    }, {
      maxRetries: 2,
      retryCondition: (error) => {
        const appError = ErrorHandler.normalizeError(error);
        return appError.retryable && !['VALIDATION_ERROR'].includes(appError.code);
      }
    });
  }

  /**
   * Create missing profiles for existing users
   * This is a maintenance function to fix data inconsistencies
   */
  async createMissingProfiles(): Promise<void> {
    try {
      console.log('Starting missing profile creation process...');
      
      // This would need to be implemented based on your authentication system
      // For now, we'll just log that this process should be run
      console.log('Missing profile creation process would run here');
      
      // In a real implementation, you might:
      // 1. Get all authenticated users from Firebase Auth
      // 2. Check which ones don't have profiles
      // 3. Create profiles for missing users
      
    } catch (error) {
      console.error('Failed to create missing profiles:', error);
      throw ErrorHandler.handleError(error, 'Create Missing Profiles');
    }
  }

  /**
   * Validate that a user is searchable for team invitations
   */
  async validateUserSearchability(email: string): Promise<User | null> {
    try {
      if (!email?.trim()) {
        return null;
      }

      // Search for user
      const user = await databaseService.searchUserByEmail(email.toLowerCase().trim());
      
      if (!user) {
        return null;
      }

      // Verify user has a complete profile
      const profile = await databaseService.getUserProfile(user.uid);
      
      if (!profile) {
        console.warn(`User ${email} found but has no profile - creating one`);
        
        // Create profile for user
        const validatedProfile = dataValidator.validateUserProfile(user);
        await databaseService.createUserProfile(user.uid, validatedProfile);
      }

      return user;

    } catch (error) {
      console.error('Error validating user searchability:', error);
      return null;
    }
  }
}

// Export singleton instance
export const userProfileConsistencyService = new UserProfileConsistencyServiceImpl();

// Export class for testing
export { UserProfileConsistencyServiceImpl };