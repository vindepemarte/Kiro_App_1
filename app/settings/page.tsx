"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ResponsiveNavigation } from "@/components/responsive-navigation"
import { ResponsiveContainer } from "@/components/ui/responsive-grid"
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Trash2,
  AlertCircle,
  Save,
  Eye,
  EyeOff
} from "lucide-react"
import { authService } from "@/lib/auth"
import { userProfileService } from "@/lib/user-profile-service"
import { UserProfile } from "@/lib/types"

export default function SettingsPage() {
  const { user, loading, error } = useAuth()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState({
    displayName: '',
    email: '',
    notifications: {
      taskAssignments: true,
      teamInvitations: true,
      meetingAssignments: true,
    },
    theme: 'system' as UserProfile['preferences']['theme']
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [successTimeoutId, setSuccessTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // Load user profile and settings
  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const loadUserProfile = async () => {
      try {
        setIsLoading(true)
        setSaveError(null)

        // Try to get existing user profile
        let profile = await userProfileService.getProfile(user.uid)
        
        // If no profile exists, create one with default settings
        if (!profile) {
          await userProfileService.createProfile(user.uid, user)
          profile = await userProfileService.getProfile(user.uid)
        }

        if (profile) {
          setUserProfile(profile)
          setSettings({
            displayName: profile.displayName,
            email: profile.email,
            notifications: {
              taskAssignments: profile.preferences?.notifications?.taskAssignments ?? true,
              teamInvitations: profile.preferences?.notifications?.teamInvitations ?? true,
              meetingAssignments: profile.preferences?.notifications?.meetingAssignments ?? true,
            },
            theme: profile.preferences?.theme ?? 'system'
          })
        } else {
          // Fallback to user auth data
          setSettings(prev => ({
            ...prev,
            displayName: user.displayName || '',
            email: user.email || ''
          }))
        }
      } catch (error) {
        console.error('Failed to load user profile:', error)
        setSaveError('Failed to load user settings')
        // Fallback to user auth data
        setSettings(prev => ({
          ...prev,
          displayName: user.displayName || '',
          email: user.email || ''
        }))
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [user])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutId) {
        clearTimeout(successTimeoutId)
      }
    }
  }, [successTimeoutId])

  const handleLogout = async () => {
    try {
      await authService.signOutUser()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const validateSettings = (): string | null => {
    if (!settings.displayName.trim()) {
      return 'Display name is required'
    }
    if (settings.displayName.length > 50) {
      return 'Display name must be 50 characters or less'
    }
    if (!settings.email.trim()) {
      return 'Email address is required'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      return 'Please enter a valid email address'
    }
    return null
  }

  const handleSaveSettings = async () => {
    if (!user) return

    // Validate settings before saving
    const validationError = validateSettings()
    if (validationError) {
      setSaveError(validationError)
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      // Update user profile with new settings
      const profileUpdates: Partial<UserProfile> = {
        displayName: settings.displayName.trim(),
        email: settings.email.trim(),
        preferences: {
          notifications: {
            teamInvitations: settings.notifications.teamInvitations,
            meetingAssignments: settings.notifications.meetingAssignments,
            taskAssignments: settings.notifications.taskAssignments,
          },
          theme: settings.theme,
        }
      }

      await userProfileService.updateProfile(user.uid, profileUpdates)
      
      // Reload the profile to get the updated data
      const updatedProfile = await userProfileService.getProfile(user.uid)
      if (updatedProfile) {
        setUserProfile(updatedProfile)
        // Update local settings state to match saved data
        setSettings({
          displayName: updatedProfile.displayName,
          email: updatedProfile.email,
          notifications: {
            taskAssignments: updatedProfile.preferences?.notifications?.taskAssignments ?? true,
            teamInvitations: updatedProfile.preferences?.notifications?.teamInvitations ?? true,
            meetingAssignments: updatedProfile.preferences?.notifications?.meetingAssignments ?? true,
          },
          theme: updatedProfile.preferences?.theme ?? 'system'
        })
      }
      
      setIsEditing(false)
      setSaveSuccess(true)
      
      // Clear success message after 5 seconds with proper cleanup
      if (successTimeoutId) {
        clearTimeout(successTimeoutId)
      }
      const timeoutId = setTimeout(() => setSaveSuccess(false), 5000)
      setSuccessTimeoutId(timeoutId)
    } catch (error) {
      console.error('Failed to save settings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings. Please try again.'
      setSaveError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleNotificationChange = async (type: keyof typeof settings.notifications, value: boolean) => {
    if (!user) return

    // Update local state immediately for responsive UI
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: value
      }
    }))

    try {
      // Save notification preference immediately
      await userProfileService.updateNotificationPreferences(user.uid, {
        ...settings.notifications,
        [type]: value
      })
      
      // Show brief success feedback
      setSaveSuccess(true)
      if (successTimeoutId) {
        clearTimeout(successTimeoutId)
      }
      const timeoutId = setTimeout(() => setSaveSuccess(false), 2000)
      setSuccessTimeoutId(timeoutId)
    } catch (error) {
      console.error('Failed to save notification preference:', error)
      // Revert the change on error
      setSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [type]: !value
        }
      }))
      setSaveError('Failed to save notification preference')
      // Clear error message after 3 seconds
      setTimeout(() => setSaveError(null), 3000)
    }
  }

  const handleThemeChange = async (theme: UserProfile['preferences']['theme']) => {
    if (!user) return

    // Update local state immediately for responsive UI
    setSettings(prev => ({
      ...prev,
      theme
    }))

    try {
      // Save theme preference immediately
      await userProfileService.updateTheme(user.uid, theme)
      
      // Show brief success feedback
      setSaveSuccess(true)
      if (successTimeoutId) {
        clearTimeout(successTimeoutId)
      }
      const timeoutId = setTimeout(() => setSaveSuccess(false), 2000)
      setSuccessTimeoutId(timeoutId)
    } catch (error) {
      console.error('Failed to save theme preference:', error)
      // Revert the change on error
      setSettings(prev => ({
        ...prev,
        theme: userProfile?.preferences.theme || 'system'
      }))
      setSaveError('Failed to save theme preference')
      // Clear error message after 3 seconds
      setTimeout(() => setSaveError(null), 3000)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        // In a real app, you would delete the user account
        alert('Account deletion is not implemented in this demo.')
      } catch (error) {
        console.error('Account deletion error:', error)
      }
    }
  }

  // Show loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error screen
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/')}>
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ResponsiveNavigation 
        currentPage="settings" 
        onLogout={handleLogout}
      />

      <ResponsiveContainer maxWidth="4xl" padding={{ mobile: 4, tablet: 6, desktop: 8 }}>
        <div className="py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Settings
            </h1>
            <p className="text-gray-600">
              Manage your account preferences and privacy settings
            </p>
          </div>

          {saveError && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>{saveError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {saveSuccess && (
            <Card className="mb-6 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <Save className="h-4 w-4" />
                  <span>Settings saved successfully!</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-6">
            {/* Profile Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your personal information and profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={settings.displayName}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        displayName: e.target.value
                      }))}
                      disabled={!isEditing}
                      placeholder="Enter your display name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        email: e.target.value
                      }))}
                      disabled={!isEditing}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pt-4">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task Assignments</Label>
                    <p className="text-sm text-gray-600">
                      Get notified when tasks are assigned to you
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.taskAssignments}
                    onCheckedChange={(checked) => handleNotificationChange('taskAssignments', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Team Invitations</Label>
                    <p className="text-sm text-gray-600">
                      Get notified when you're invited to join a team
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.teamInvitations}
                    onCheckedChange={(checked) => handleNotificationChange('teamInvitations', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Meeting Assignments</Label>
                    <p className="text-sm text-gray-600">
                      Get notified when meetings are assigned to your teams
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.meetingAssignments}
                    onCheckedChange={(checked) => handleNotificationChange('meetingAssignments', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Appearance & Theme
                </CardTitle>
                <CardDescription>
                  Customize your app appearance and theme preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Theme</Label>
                    <p className="text-sm text-gray-600">
                      Choose your preferred theme for the application
                    </p>
                  </div>
                  <select
                    value={settings.theme}
                    onChange={(e) => handleThemeChange(e.target.value as UserProfile['preferences']['theme'])}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Account Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Account Management
                </CardTitle>
                <CardDescription>
                  Manage your account and data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Account Type</p>
                    <p className="text-sm text-gray-600">
                      {user.isAnonymous ? 'Anonymous User' : 'Registered User'}
                    </p>
                  </div>
                  {user.isAnonymous && (
                    <Button variant="outline" size="sm">
                      Upgrade Account
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Data Export</p>
                    <p className="text-sm text-gray-600">
                      Download all your meeting data and analytics
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Export Data
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div>
                      <p className="font-medium text-red-900">Delete Account</p>
                      <p className="text-sm text-red-700">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteAccount}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ResponsiveContainer>
    </div>
  )
}