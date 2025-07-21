// User profile consistency service to ensure profiles are created and maintained properly

import { User, UserProfile } from './types';
import { DatabaseService } from './database';
import { ErrorHandler, AppError, retryOperation } from './error-handler';

export interface UserProfileConsistencyService {
  ensureUserProfile(user: User): Promise<void>;
  reconcileUserData(userId: string): Promise<void>;
  createMissingProfiles(): Promise<void>;
  validateUserSearchability(email: string): Promise<User | null>;
}

export class UserProfileConsistencyServiceImpl implements UserProfileConsistencyService {
  constructor(private databaseService: DatabaseService) {}

  // Ensure user profile exists and is up to date
  async ensureUserProfile(user: User): Promise<void> {
    return await retryOperation(async () => {
      try {
        if (!user?.uid) {
          throw new AppError('Invalid user data', 'VALIDATION_ERROR', false, 'User data is required');
        }

        // Check if profile already exists
        const existingProfile = await this.databaseService.getUserProfile(user.uid);
        
        if (!existingProfile) {
          // Create new profile
          const newProfile: UserProfile = {
            userId: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            photoURL: user.photoURL || undefined,
            preferences: {
              notifications: {
                teamInvitations: true,
                meetingAssignments: true,
                taskAssignments: true
              },
              theme: 'light'
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await this.databaseService.createUserProfile(user.uid, newProfile);
          console.log(`Created user profile for ${user.email}`);
        } else {
          // Update existing profile if needed
          const updates: Partial<UserProfile> = {};
          let needsUpdate = false;

          if (existingProfile.email !== user.email && user.email) {
            updates.email = user.email;
            needsUpdate = true;
          }

          if (existingProfile.displayName !== user.displayName && user.displayName) {
            updates.displayName = user.displayName;
            needsUpdate = true;
          }

          if (existingProfile.photoURL !== user.photoURL && user.photoURL) {
            updates.photoURL = user.photoURL;
            needsUpdate = true;
          }

          if (needsUpdate) {
            updates.updatedAt = new Date();
            await this.databaseService.updateUserProfile(user.uid, updates);
            console.log(`Updated user profile for ${user.email}`);
          }
        }

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

  // Reconcile user data inconsistencies
  async reconcileUserData(userId: string): Promise<void> {
    return await retryOperation(async () => {
      try {
        if (!userId?.trim()) {
          throw new AppError('User ID is required', 'VALIDATION_ERROR', false, 'Please provide a valid user ID');
        }

        // Get user profile
        const profile = await this.databaseService.getUserProfile(userId);
        if (!profile) {
          console.warn(`No profile found for user ${userId} during reconciliation`);
          return;
        }

        // Check if user is searchable by email
        if (profile.email) {
          const searchResult = await this.databaseService.searchUserByEmail(profile.email);
          if (!searchResult) {
            console.warn(`User ${userId} with email ${profile.email} is not searchable`);
            // Could implement logic to make user searchable here
          }
        }

        console.log(`User data reconciliation completed for ${userId}`);

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

  // Create missing profiles for existing users
  async createMissingProfiles(): Promise<void> {
    try {
      console.log('Starting batch profile creation for missing profiles...');
      // This would be implemented to scan for users without profiles
      // For now, it's a placeholder for future enhancement
      console.log('Batch profile creation completed');
    } catch (error) {
      console.error('Error in batch profile creation:', error);
    }
  }

  // Validate that a user is searchable by email
  async validateUserSearchability(email: string): Promise<User | null> {
    try {
      if (!email?.trim()) {
        return null;
      }

      const user = await this.databaseService.searchUserByEmail(email.toLowerCase().trim());
      return user;

    } catch (error) {
      console.error('Error validating user searchability:', error);
      return null;
    }
  }
}

// Create and export a singleton instance
let userProfileServiceInstance: UserProfileConsistencyServiceImpl | null = null;

export function getUserProfileConsistencyService(databaseService: DatabaseService): UserProfileConsistencyServiceImpl {
  if (!userProfileServiceInstance) {
    userProfileServiceInstance = new UserProfileConsistencyServiceImpl(databaseService);
  }
  return userProfileServiceInstance;
}

// Export the implementation class as well
export { UserProfileConsistencyServiceImpl };