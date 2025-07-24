'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Settings, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../contexts/auth-context';

interface NotificationPreferences {
  teamInvitations: boolean;
  taskAssignments: boolean;
  taskCompletions: boolean;
  taskOverdue: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPreferences({ isOpen, onClose }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    teamInvitations: true,
    taskAssignments: true,
    taskCompletions: true,
    taskOverdue: true,
    emailNotifications: false, // Disabled by default since we don't have email service
    pushNotifications: false, // Disabled by default since we don't have push service
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load preferences on mount
  useEffect(() => {
    if (!user?.uid || !isOpen) return;

    const loadPreferences = async () => {
      try {
        // In a real implementation, this would load from database
        // For now, we'll use localStorage as a simple persistence layer
        const saved = localStorage.getItem(`notification-preferences-${user.uid}`);
        if (saved) {
          const savedPreferences = JSON.parse(saved);
          setPreferences(savedPreferences);
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    };

    loadPreferences();
  }, [user?.uid, isOpen]);

  // Handle preference change
  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
  };

  // Save preferences
  const handleSave = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      // In a real implementation, this would save to database
      // For now, we'll use localStorage
      localStorage.setItem(`notification-preferences-${user.uid}`, JSON.stringify(preferences));
      
      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Notification preferences saved successfully',
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setPreferences({
      teamInvitations: true,
      taskAssignments: true,
      taskCompletions: true,
      taskOverdue: true,
      emailNotifications: false,
      pushNotifications: false,
    });
    setHasChanges(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div 
        className={`
          fixed bg-white shadow-lg border transition-all duration-300 ease-out
          /* Mobile: full screen modal with safe areas */
          inset-x-2 inset-y-4 rounded-xl
          /* Tablet: positioned modal */
          sm:right-4 sm:top-16 sm:left-auto sm:bottom-auto sm:w-96 sm:max-h-[85vh] sm:rounded-lg
          /* Desktop: positioned modal */
          md:right-4 md:top-16 md:left-auto md:bottom-auto md:w-96 md:max-h-[80vh]
          lg:right-4 lg:top-16 lg:left-auto lg:bottom-auto lg:w-96 lg:max-h-[80vh]
          animate-slide-up
        `}
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom)',
          maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 2rem)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* In-App Notifications */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">In-App Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="team-invitations" className="text-sm">
                    Team Invitations
                  </Label>
                  <Switch
                    id="team-invitations"
                    checked={preferences.teamInvitations}
                    onCheckedChange={(checked) => handlePreferenceChange('teamInvitations', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-assignments" className="text-sm">
                    Task Assignments
                  </Label>
                  <Switch
                    id="task-assignments"
                    checked={preferences.taskAssignments}
                    onCheckedChange={(checked) => handlePreferenceChange('taskAssignments', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-completions" className="text-sm">
                    Task Completions
                  </Label>
                  <Switch
                    id="task-completions"
                    checked={preferences.taskCompletions}
                    onCheckedChange={(checked) => handlePreferenceChange('taskCompletions', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="task-overdue" className="text-sm">
                    Overdue Tasks
                  </Label>
                  <Switch
                    id="task-overdue"
                    checked={preferences.taskOverdue}
                    onCheckedChange={(checked) => handlePreferenceChange('taskOverdue', checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* External Notifications */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">External Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications" className="text-sm">
                      Email Notifications
                    </Label>
                    <p className="text-xs text-gray-500">Coming soon</p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={preferences.emailNotifications}
                    onCheckedChange={(checked) => handlePreferenceChange('emailNotifications', checked)}
                    disabled
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="push-notifications" className="text-sm">
                      Push Notifications
                    </Label>
                    <p className="text-xs text-gray-500">Coming soon</p>
                  </div>
                  <Switch
                    id="push-notifications"
                    checked={preferences.pushNotifications}
                    onCheckedChange={(checked) => handlePreferenceChange('pushNotifications', checked)}
                    disabled
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={loading}
              >
                Reset to Defaults
              </Button>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || loading}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Hook to get current notification preferences
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    teamInvitations: true,
    taskAssignments: true,
    taskCompletions: true,
    taskOverdue: true,
    emailNotifications: false,
    pushNotifications: false,
  });
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;

    const loadPreferences = () => {
      try {
        const saved = localStorage.getItem(`notification-preferences-${user.uid}`);
        if (saved) {
          const savedPreferences = JSON.parse(saved);
          setPreferences(savedPreferences);
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    };

    loadPreferences();
  }, [user?.uid]);

  return preferences;
}