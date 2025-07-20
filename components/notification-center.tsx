'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Users, CheckCircle, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useToast } from '../hooks/use-toast';
import { notificationService } from '../lib/notification-service';
import { Notification } from '../lib/types';
import { useAuth } from '../contexts/auth-context';
import { NotificationPreferences } from './notification-preferences';
import { useAsyncOperation } from '../hooks/use-async-operation';
import { LoadingSpinner, ErrorState, RetryButton } from './ui/loading-states';
import { useNetworkStatus } from '../hooks/use-network-status';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline, retryWhenOnline } = useNetworkStatus();
  
  // Use async operation hook for loading notifications
  const notificationLoader = useAsyncOperation<Notification[]>({
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    }
  });

  // Use async operation hook for notification actions
  const notificationActions = useAsyncOperation({
    onSuccess: (result) => {
      if (result?.message) {
        toast({
          title: 'Success',
          description: result.message,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Load notifications on mount and when user changes
  useEffect(() => {
    if (!user?.uid || !isOpen) return;

    const loadNotifications = async () => {
      if (isOnline) {
        return await notificationService.getUserNotifications(user.uid);
      } else {
        return await retryWhenOnline(() => notificationService.getUserNotifications(user.uid));
      }
    };

    notificationLoader.execute(loadNotifications);

    // Subscribe to real-time updates
    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
      }
    );

    return unsubscribe;
  }, [user?.uid, isOpen, isOnline]);

  // Handle accepting team invitation
  const handleAcceptInvitation = async (notificationId: string) => {
    if (!user?.uid) return;

    await notificationActions.execute(async () => {
      await notificationService.acceptTeamInvitation(notificationId, user.uid);
      return { message: 'Team invitation accepted successfully' };
    });
  };

  // Handle declining team invitation
  const handleDeclineInvitation = async (notificationId: string) => {
    if (!user?.uid) return;

    await notificationActions.execute(async () => {
      await notificationService.declineTeamInvitation(notificationId, user.uid);
      return { message: 'Team invitation declined' };
    });
  };

  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    await notificationActions.execute(async () => {
      await notificationService.markAsRead(notificationId);
    });
  };

  // Handle deleting notification
  const handleDeleteNotification = async (notificationId: string) => {
    await notificationActions.execute(async () => {
      await notificationService.deleteNotification(notificationId);
      return { message: 'Notification deleted' };
    });
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'team_invitation':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'task_assignment':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'task_completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'task_overdue':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // Format notification time
  const formatNotificationTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
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
          /* Enhanced mobile styling */
          animate-slide-up
        `}
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom)',
          maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 2rem)'
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-center-title"
      >
        <Card className="h-full">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle 
                id="notification-center-title"
                className={`
                  text-lg
                  sm:text-lg
                  md:text-lg
                  lg:text-lg
                `}
              >
                Notifications
              </CardTitle>
              <div className="flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPreferencesOpen(true)}
                  aria-label="Open notification settings"
                  className={`
                    h-10 w-10 min-h-[40px] min-w-[40px]
                    sm:h-8 sm:w-8 sm:min-h-[32px] sm:min-w-[32px]
                    md:h-8 md:w-8 md:min-h-[32px] md:min-w-[32px]
                    lg:h-8 lg:w-8 lg:min-h-[32px] lg:min-w-[32px]
                  `}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  aria-label="Close notifications"
                  className={`
                    h-10 w-10 min-h-[40px] min-w-[40px]
                    sm:h-8 sm:w-8 sm:min-h-[32px] sm:min-w-[32px]
                    md:h-8 md:w-8 md:min-h-[32px] md:min-w-[32px]
                    lg:h-8 lg:w-8 lg:min-h-[32px] lg:min-w-[32px]
                  `}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[60vh]">
              {notificationLoader.state.loading ? (
                <div className="p-4">
                  <LoadingSpinner text="Loading notifications..." />
                </div>
              ) : notificationLoader.state.error ? (
                <div className="p-4">
                  <ErrorState
                    title="Failed to load notifications"
                    message={notificationLoader.state.error}
                    onRetry={() => notificationLoader.retry()}
                    variant={isOnline ? 'error' : 'network'}
                  />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          if (!notification.read) {
                            handleMarkAsRead(notification.id)
                          }
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Notification: ${notification.title}. ${notification.read ? 'Read' : 'Unread'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                            
                            {notification.type === 'team_invitation' && (
                              <div className={`
                                flex gap-2
                                /* Mobile: stack buttons vertically */
                                flex-col
                                sm:flex-row
                                md:flex-row
                                lg:flex-row
                              `}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeclineInvitation(notification.id);
                                  }}
                                  disabled={notificationActions.state.loading}
                                  className={`
                                    h-10 px-3 text-sm min-h-[44px] min-w-[80px]
                                    sm:h-7 sm:px-2 sm:text-xs sm:min-h-[28px] sm:min-w-[60px]
                                    md:h-7 md:px-2 md:text-xs md:min-h-[28px] md:min-w-[60px]
                                    lg:h-7 lg:px-2 lg:text-xs lg:min-h-[28px] lg:min-w-[60px]
                                  `}
                                  aria-label={`Decline team invitation: ${notification.title}`}
                                >
                                  Decline
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcceptInvitation(notification.id);
                                  }}
                                  disabled={notificationActions.state.loading}
                                  className={`
                                    h-10 px-3 text-sm min-h-[44px] min-w-[80px]
                                    sm:h-7 sm:px-2 sm:text-xs sm:min-h-[28px] sm:min-w-[60px]
                                    md:h-7 md:px-2 md:text-xs md:min-h-[28px] md:min-w-[60px]
                                    lg:h-7 lg:px-2 lg:text-xs lg:min-h-[28px] lg:min-w-[60px]
                                  `}
                                  aria-label={`Accept team invitation: ${notification.title}`}
                                >
                                  Accept
                                </Button>
                              </div>
                            )}
                            
                            {notification.type !== 'team_invitation' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNotification(notification.id);
                                }}
                                className={`
                                  h-10 w-10 min-h-[44px] min-w-[44px] text-gray-500 hover:text-red-600
                                  sm:h-7 sm:w-7 sm:min-h-[28px] sm:min-w-[28px] sm:px-2 sm:text-xs
                                  md:h-7 md:w-7 md:min-h-[28px] md:min-w-[28px] md:px-2 md:text-xs
                                  lg:h-7 lg:w-7 lg:min-h-[28px] lg:min-w-[28px] lg:px-2 lg:text-xs
                                `}
                                aria-label={`Delete notification: ${notification.title}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Notification Preferences */}
      <NotificationPreferences 
        isOpen={preferencesOpen} 
        onClose={() => setPreferencesOpen(false)} 
      />
    </div>
  );
}

// Hook for notification badge count
export function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }

    const updateCount = async () => {
      try {
        const count = await notificationService.getUnreadCount(user.uid);
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to get unread count:', error);
        setUnreadCount(0);
      }
    };

    updateCount();

    // Subscribe to real-time updates
    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid,
      (notifications) => {
        const count = notifications.filter(n => !n.read).length;
        setUnreadCount(count);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  return unreadCount;
}