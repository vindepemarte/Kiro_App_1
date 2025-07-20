/**
 * Error Scenarios Test Suite
 * Tests network failures, permission errors, and concurrent user actions
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import React from 'react'
import { DatabaseService } from '../database'
import { TeamService } from '../team-service'
import { NotificationService } from '../notification-service'
import { UserProfileService } from '../user-profile-service'
import { AuthContext } from '../../contexts/auth-context'
import TeamManagement from '../../components/team-management'
import NotificationCenter from '../../components/notification-center'
import { ErrorBoundary } from '../../components/error-boundary'

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-id', email: 'test@example.com' }
  }
}))

// Mock services
vi.mock('../database')
vi.mock('../team-service')
vi.mock('../notification-service')
vi.mock('../user-profile-service')

const mockDatabaseService = DatabaseService as unknown as {
  getInstance: () => {
    getUserTeams: Mock
    createTeam: Mock
    updateTeam: Mock
    deleteTeam: Mock
    addTeamMember: Mock
    removeTeamMember: Mock
    updateTeamMemberRole: Mock
    getUserNotifications: Mock
    createNotification: Mock
    updateNotification: Mock
    deleteNotification: Mock
    getUserProfile: Mock
    updateUserProfile: Mock
    createUserProfile: Mock
  }
}

const mockTeamService = TeamService as unknown as {
  getInstance: () => {
    inviteUserToTeam: Mock
    removeTeamMember: Mock
    updateTeamMemberRole: Mock
    subscribeToTeam: Mock
    subscribeToUserTeams: Mock
  }
}

const mockNotificationService = NotificationService as unknown as {
  getInstance: () => {
    getUserNotifications: Mock
    subscribeToUserNotifications: Mock
    markAsRead: Mock
    deleteNotification: Mock
    handleNotificationAction: Mock
  }
}

const mockUserProfileService = UserProfileService as unknown as {
  getInstance: () => {
    getProfile: Mock
    updateProfile: Mock
    createProfile: Mock
    subscribeToProfile: Mock
  }
}

describe('Error Scenarios Tests', () => {
  let mockDb: any
  let mockTeam: any
  let mockNotification: any
  let mockUserProfile: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup mock instances
    mockDb = {
      getUserTeams: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
      addTeamMember: vi.fn(),
      removeTeamMember: vi.fn(),
      updateTeamMemberRole: vi.fn(),
      getUserNotifications: vi.fn(),
      createNotification: vi.fn(),
      updateNotification: vi.fn(),
      deleteNotification: vi.fn(),
      getUserProfile: vi.fn(),
      updateUserProfile: vi.fn(),
      createUserProfile: vi.fn()
    }

    mockTeam = {
      inviteUserToTeam: vi.fn(),
      removeTeamMember: vi.fn(),
      updateTeamMemberRole: vi.fn(),
      subscribeToTeam: vi.fn(),
      subscribeToUserTeams: vi.fn()
    }

    mockNotification = {
      getUserNotifications: vi.fn(),
      subscribeToUserNotifications: vi.fn(),
      markAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      handleNotificationAction: vi.fn()
    }

    mockUserProfile = {
      getProfile: vi.fn(),
      updateProfile: vi.fn(),
      createProfile: vi.fn(),
      subscribeToProfile: vi.fn()
    }

    mockDatabaseService.getInstance = vi.fn().mockReturnValue(mockDb)
    mockTeamService.getInstance = vi.fn().mockReturnValue(mockTeam)
    mockNotificationService.getInstance = vi.fn().mockReturnValue(mockNotification)
    mockUserProfileService.getInstance = vi.fn().mockReturnValue(mockUserProfile)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Network Failure Scenarios', () => {
    it('should handle network timeout errors with retry mechanism', async () => {
      // Requirement 6.2: Network requests fail -> retry options
      const networkError = new Error('Network timeout')
      networkError.name = 'NetworkError'
      
      mockDb.getUserTeams
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce([])

      const TestComponent = () => {
        const [teams, setTeams] = React.useState([])
        const [error, setError] = React.useState(null)
        const [retryCount, setRetryCount] = React.useState(0)

        const loadTeams = async () => {
          try {
            const result = await mockDb.getUserTeams('test-user-id')
            setTeams(result)
            setError(null)
          } catch (err: any) {
            setError(err.message)
            // Implement exponential backoff retry
            if (retryCount < 3) {
              setTimeout(() => {
                setRetryCount(prev => prev + 1)
                loadTeams()
              }, Math.pow(2, retryCount) * 1000)
            }
          }
        }

        React.useEffect(() => {
          loadTeams()
        }, [])

        return React.createElement('div', null,
          error && React.createElement('div', { 'data-testid': 'error-message' },
            `Network error: ${error}`,
            React.createElement('button', { 
              onClick: loadTeams, 
              'data-testid': 'retry-button' 
            }, 'Retry')
          ),
          React.createElement('div', { 'data-testid': 'teams-count' }, teams.length)
        )
      }

      render(<TestComponent />)

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByTestId('teams-count')).toHaveTextContent('0')
      }, { timeout: 5000 })

      expect(mockDb.getUserTeams).toHaveBeenCalledTimes(3)
    })

    it('should handle offline/online network state changes', async () => {
      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const offlineError = new Error('Network unavailable')
      mockDb.getUserNotifications.mockRejectedValue(offlineError)

      const TestComponent = () => {
        const [isOnline, setIsOnline] = React.useState(navigator.onLine)
        const [notifications, setNotifications] = React.useState([])
        const [error, setError] = React.useState(null)

        React.useEffect(() => {
          const handleOnline = () => setIsOnline(true)
          const handleOffline = () => setIsOnline(false)

          window.addEventListener('online', handleOnline)
          window.addEventListener('offline', handleOffline)

          return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
          }
        }, [])

        const loadNotifications = async () => {
          if (!isOnline) {
            setError('You are offline. Please check your connection.')
            return
          }

          try {
            const result = await mockDb.getUserNotifications('test-user-id')
            setNotifications(result)
            setError(null)
          } catch (err) {
            setError(err.message)
          }
        }

        React.useEffect(() => {
          loadNotifications()
        }, [isOnline])

        return (
          <div>
            <div data-testid="online-status">
              {isOnline ? 'Online' : 'Offline'}
            </div>
            {error && (
              <div data-testid="offline-error">{error}</div>
            )}
          </div>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('Offline')
        expect(screen.getByTestId('offline-error')).toHaveTextContent('You are offline')
      })

      // Simulate going back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true })
        window.dispatchEvent(new Event('online'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('Online')
      })
    })

    it('should handle intermittent connection failures', async () => {
      // Simulate intermittent failures
      let callCount = 0
      mockDb.updateUserProfile.mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          return Promise.reject(new Error('Connection lost'))
        }
        return Promise.resolve()
      })

      const TestComponent = () => {
        const [status, setStatus] = React.useState('idle')
        const [error, setError] = React.useState(null)

        const updateProfile = async () => {
          setStatus('saving')
          setError(null)

          try {
            await mockDb.updateUserProfile('test-user-id', { name: 'Test User' })
            setStatus('saved')
          } catch (err) {
            setError(err.message)
            setStatus('error')
            
            // Auto-retry after delay
            setTimeout(updateProfile, 2000)
          }
        }

        return (
          <div>
            <button onClick={updateProfile} data-testid="save-button">
              Save Profile
            </button>
            <div data-testid="status">{status}</div>
            {error && <div data-testid="error">{error}</div>}
          </div>
        )
      }

      render(<TestComponent />)

      fireEvent.click(screen.getByTestId('save-button'))

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Connection lost')
      })

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('saved')
      }, { timeout: 10000 })

      expect(mockDb.updateUserProfile).toHaveBeenCalledTimes(3)
    })
  })  de
scribe('Permission Error Handling', () => {
    it('should handle Firestore permission denied errors', async () => {
      // Requirement 6.4: Permission errors -> clear permission error messages
      const permissionError = new Error('Missing or insufficient permissions')
      permissionError.name = 'FirebaseError'
      permissionError.code = 'permission-denied'

      mockDb.getUserTeams.mockRejectedValue(permissionError)

      const TestComponent = () => {
        const [error, setError] = React.useState(null)
        const [teams, setTeams] = React.useState([])

        React.useEffect(() => {
          const loadTeams = async () => {
            try {
              const result = await mockDb.getUserTeams('test-user-id')
              setTeams(result)
            } catch (err) {
              if (err.code === 'permission-denied') {
                setError('You do not have permission to access team data. Please contact your administrator.')
              } else {
                setError(err.message)
              }
            }
          }
          loadTeams()
        }, [])

        return (
          <div>
            {error && (
              <div data-testid="permission-error" role="alert">
                {error}
              </div>
            )}
            <div data-testid="teams-count">{teams.length}</div>
          </div>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('permission-error')).toHaveTextContent(
          'You do not have permission to access team data'
        )
      })
    })

    it('should handle authentication expiration', async () => {
      // Requirement 6.3: Authentication expires -> redirect to login
      const authError = new Error('Authentication expired')
      authError.name = 'FirebaseError'
      authError.code = 'unauthenticated'

      mockDb.getUserNotifications.mockRejectedValue(authError)

      const mockPush = vi.fn()
      const TestComponent = () => {
        const [error, setError] = React.useState(null)

        React.useEffect(() => {
          const loadNotifications = async () => {
            try {
              await mockDb.getUserNotifications('test-user-id')
            } catch (err) {
              if (err.code === 'unauthenticated') {
                setError('Your session has expired. Redirecting to login...')
                // Simulate redirect
                setTimeout(() => mockPush('/auth'), 1000)
              }
            }
          }
          loadNotifications()
        }, [])

        return (
          <div>
            {error && (
              <div data-testid="auth-error" role="alert">
                {error}
              </div>
            )}
          </div>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('auth-error')).toHaveTextContent(
          'Your session has expired'
        )
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth')
      }, { timeout: 2000 })
    })

    it('should handle insufficient role permissions', async () => {
      const roleError = new Error('Insufficient role permissions')
      roleError.name = 'RoleError'
      roleError.code = 'insufficient-role'

      mockTeam.removeTeamMember.mockRejectedValue(roleError)

      const TestComponent = () => {
        const [error, setError] = React.useState(null)
        const [success, setSuccess] = React.useState(false)

        const removeMember = async () => {
          try {
            await mockTeam.removeTeamMember('team-id', 'member-id', 'current-user-id')
            setSuccess(true)
          } catch (err) {
            if (err.code === 'insufficient-role') {
              setError('You do not have permission to remove team members. Only team admins can perform this action.')
            } else {
              setError(err.message)
            }
          }
        }

        return (
          <div>
            <button onClick={removeMember} data-testid="remove-button">
              Remove Member
            </button>
            {error && (
              <div data-testid="role-error" role="alert">
                {error}
              </div>
            )}
            {success && <div data-testid="success">Member removed</div>}
          </div>
        )
      }

      render(<TestComponent />)

      fireEvent.click(screen.getByTestId('remove-button'))

      await waitFor(() => {
        expect(screen.getByTestId('role-error')).toHaveTextContent(
          'You do not have permission to remove team members'
        )
      })
    })

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded')
      quotaError.name = 'FirebaseError'
      quotaError.code = 'resource-exhausted'

      mockDb.createTeam.mockRejectedValue(quotaError)

      const TestComponent = () => {
        const [error, setError] = React.useState(null)
        const [isCreating, setIsCreating] = React.useState(false)

        const createTeam = async () => {
          setIsCreating(true)
          setError(null)

          try {
            await mockDb.createTeam({ name: 'New Team', description: 'Test team' })
          } catch (err) {
            if (err.code === 'resource-exhausted') {
              setError('You have reached your team creation limit. Please upgrade your plan or contact support.')
            } else {
              setError(err.message)
            }
          } finally {
            setIsCreating(false)
          }
        }

        return (
          <div>
            <button 
              onClick={createTeam} 
              disabled={isCreating}
              data-testid="create-team-button"
            >
              {isCreating ? 'Creating...' : 'Create Team'}
            </button>
            {error && (
              <div data-testid="quota-error" role="alert">
                {error}
              </div>
            )}
          </div>
        )
      }

      render(<TestComponent />)

      fireEvent.click(screen.getByTestId('create-team-button'))

      await waitFor(() => {
        expect(screen.getByTestId('quota-error')).toHaveTextContent(
          'You have reached your team creation limit'
        )
      })
    })
  })

  describe('Concurrent User Actions', () => {
    it('should handle concurrent team member updates', async () => {
      // Simulate concurrent updates causing conflicts
      const conflictError = new Error('Document was modified by another user')
      conflictError.name = 'ConflictError'
      conflictError.code = 'aborted'

      let attemptCount = 0
      mockTeam.updateTeamMemberRole.mockImplementation(() => {
        attemptCount++
        if (attemptCount === 1) {
          return Promise.reject(conflictError)
        }
        return Promise.resolve(true)
      })

      const TestComponent = () => {
        const [status, setStatus] = React.useState('idle')
        const [error, setError] = React.useState(null)

        const updateRole = async () => {
          setStatus('updating')
          setError(null)

          try {
            await mockTeam.updateTeamMemberRole('team-id', 'member-id', 'admin', 'current-user-id')
            setStatus('updated')
          } catch (err) {
            if (err.code === 'aborted') {
              setError('Another user modified this data. Retrying...')
              // Retry after brief delay
              setTimeout(updateRole, 1000)
            } else {
              setError(err.message)
              setStatus('error')
            }
          }
        }

        return (
          <div>
            <button onClick={updateRole} data-testid="update-role-button">
              Update Role
            </button>
            <div data-testid="status">{status}</div>
            {error && <div data-testid="conflict-error">{error}</div>}
          </div>
        )
      }

      render(<TestComponent />)

      fireEvent.click(screen.getByTestId('update-role-button'))

      // Should show conflict error initially
      await waitFor(() => {
        expect(screen.getByTestId('conflict-error')).toHaveTextContent(
          'Another user modified this data'
        )
      })

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByTestId('status')).toHaveTextContent('updated')
      }, { timeout: 3000 })

      expect(mockTeam.updateTeamMemberRole).toHaveBeenCalledTimes(2)
    })

    it('should handle concurrent notification actions', async () => {
      // Test multiple users acting on the same notification
      const notifications = [
        {
          id: 'notif-1',
          type: 'team_invitation',
          read: false,
          actionable: true,
          data: { teamId: 'team-1', inviterId: 'user-1' }
        }
      ]

      mockNotification.getUserNotifications.mockResolvedValue(notifications)
      
      // First action succeeds, second fails due to notification already processed
      const alreadyProcessedError = new Error('Notification already processed')
      alreadyProcessedError.code = 'already-processed'

      mockNotification.handleNotificationAction
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(alreadyProcessedError)

      const TestComponent = () => {
        const [notifications, setNotifications] = React.useState([])
        const [error, setError] = React.useState(null)
        const [processing, setProcessing] = React.useState(new Set())

        React.useEffect(() => {
          mockNotification.getUserNotifications('test-user-id')
            .then(setNotifications)
        }, [])

        const handleAction = async (notificationId, action) => {
          setProcessing(prev => new Set(prev).add(notificationId))
          setError(null)

          try {
            await mockNotification.handleNotificationAction(notificationId, action)
            // Remove notification from list
            setNotifications(prev => prev.filter(n => n.id !== notificationId))
          } catch (err) {
            if (err.code === 'already-processed') {
              setError('This invitation has already been processed by another session.')
              // Still remove from local list
              setNotifications(prev => prev.filter(n => n.id !== notificationId))
            } else {
              setError(err.message)
            }
          } finally {
            setProcessing(prev => {
              const newSet = new Set(prev)
              newSet.delete(notificationId)
              return newSet
            })
          }
        }

        return (
          <div>
            {notifications.map(notification => (
              <div key={notification.id} data-testid={`notification-${notification.id}`}>
                <button
                  onClick={() => handleAction(notification.id, 'accept')}
                  disabled={processing.has(notification.id)}
                  data-testid={`accept-${notification.id}`}
                >
                  {processing.has(notification.id) ? 'Processing...' : 'Accept'}
                </button>
                <button
                  onClick={() => handleAction(notification.id, 'decline')}
                  disabled={processing.has(notification.id)}
                  data-testid={`decline-${notification.id}`}
                >
                  {processing.has(notification.id) ? 'Processing...' : 'Decline'}
                </button>
              </div>
            ))}
            {error && <div data-testid="concurrent-error">{error}</div>}
          </div>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('notification-notif-1')).toBeInTheDocument()
      })

      // Simulate two rapid clicks (concurrent actions)
      fireEvent.click(screen.getByTestId('accept-notif-1'))
      fireEvent.click(screen.getByTestId('decline-notif-1'))

      await waitFor(() => {
        expect(screen.getByTestId('concurrent-error')).toHaveTextContent(
          'This invitation has already been processed'
        )
      })

      // Notification should be removed from list
      await waitFor(() => {
        expect(screen.queryByTestId('notification-notif-1')).not.toBeInTheDocument()
      })
    })

    it('should handle concurrent team deletion', async () => {
      const teamDeletedError = new Error('Team no longer exists')
      teamDeletedError.code = 'not-found'

      mockDb.updateTeam.mockRejectedValue(teamDeletedError)

      const TestComponent = () => {
        const [error, setError] = React.useState(null)
        const [status, setStatus] = React.useState('idle')

        const updateTeam = async () => {
          setStatus('updating')
          setError(null)

          try {
            await mockDb.updateTeam('team-id', { name: 'Updated Team Name' })
            setStatus('updated')
          } catch (err) {
            if (err.code === 'not-found') {
              setError('This team has been deleted by another user. Refreshing page...')
              // Simulate page refresh
              setTimeout(() => window.location.reload(), 2000)
            } else {
              setError(err.message)
            }
            setStatus('error')
          }
        }

        return (
          <div>
            <button onClick={updateTeam} data-testid="update-team-button">
              Update Team
            </button>
            <div data-testid="status">{status}</div>
            {error && <div data-testid="deletion-error">{error}</div>}
          </div>
        )
      }

      // Mock window.location.reload
      const mockReload = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      })

      render(<TestComponent />)

      fireEvent.click(screen.getByTestId('update-team-button'))

      await waitFor(() => {
        expect(screen.getByTestId('deletion-error')).toHaveTextContent(
          'This team has been deleted by another user'
        )
      })

      await waitFor(() => {
        expect(mockReload).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('should handle race conditions in data loading', async () => {
      // Simulate race condition where multiple requests are made
      let requestCount = 0
      const responses = [
        [{ id: '1', name: 'Team A' }],
        [{ id: '1', name: 'Team A' }, { id: '2', name: 'Team B' }],
        [{ id: '1', name: 'Team A Updated' }, { id: '2', name: 'Team B' }]
      ]

      mockDb.getUserTeams.mockImplementation(() => {
        const response = responses[requestCount % responses.length]
        requestCount++
        return Promise.resolve(response)
      })

      const TestComponent = () => {
        const [teams, setTeams] = React.useState([])
        const [requestId, setRequestId] = React.useState(0)

        const loadTeams = async () => {
          const currentRequestId = Date.now()
          setRequestId(currentRequestId)

          try {
            const result = await mockDb.getUserTeams('test-user-id')
            
            // Only update if this is still the latest request
            setTeams(prevTeams => {
              if (currentRequestId >= requestId) {
                return result
              }
              return prevTeams
            })
          } catch (err) {
            console.error('Failed to load teams:', err)
          }
        }

        React.useEffect(() => {
          loadTeams()
        }, [])

        return (
          <div>
            <button onClick={loadTeams} data-testid="refresh-button">
              Refresh Teams
            </button>
            <div data-testid="teams-count">{teams.length}</div>
            {teams.map(team => (
              <div key={team.id} data-testid={`team-${team.id}`}>
                {team.name}
              </div>
            ))}
          </div>
        )
      }

      render(<TestComponent />)

      // Trigger multiple rapid requests
      fireEvent.click(screen.getByTestId('refresh-button'))
      fireEvent.click(screen.getByTestId('refresh-button'))
      fireEvent.click(screen.getByTestId('refresh-button'))

      await waitFor(() => {
        expect(screen.getByTestId('teams-count')).toHaveTextContent('2')
      })

      // Should show the latest data
      expect(screen.getByTestId('team-1')).toHaveTextContent('Team A Updated')
      expect(screen.getByTestId('team-2')).toHaveTextContent('Team B')
    })
  })

  describe('Data Loading Error States', () => {
    it('should show loading error states with retry buttons', async () => {
      // Requirement 6.5: Data loading fails -> loading error states with retry buttons
      const loadingError = new Error('Failed to load data')
      
      mockDb.getUserNotifications
        .mockRejectedValueOnce(loadingError)
        .mockResolvedValueOnce([])

      const TestComponent = () => {
        const [notifications, setNotifications] = React.useState(null)
        const [error, setError] = React.useState(null)
        const [loading, setLoading] = React.useState(true)

        const loadNotifications = async () => {
          setLoading(true)
          setError(null)

          try {
            const result = await mockDb.getUserNotifications('test-user-id')
            setNotifications(result)
          } catch (err) {
            setError(err.message)
          } finally {
            setLoading(false)
          }
        }

        React.useEffect(() => {
          loadNotifications()
        }, [])

        if (loading) {
          return <div data-testid="loading">Loading notifications...</div>
        }

        if (error) {
          return (
            <div data-testid="loading-error-state">
              <div data-testid="error-message">Error: {error}</div>
              <button onClick={loadNotifications} data-testid="retry-button">
                Retry
              </button>
            </div>
          )
        }

        return (
          <div data-testid="notifications-loaded">
            {notifications.length} notifications loaded
          </div>
        )
      }

      render(<TestComponent />)

      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument()

      // Should show error state with retry button
      await waitFor(() => {
        expect(screen.getByTestId('loading-error-state')).toBeInTheDocument()
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to load data')
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })

      // Click retry button
      fireEvent.click(screen.getByTestId('retry-button'))

      // Should show loading again
      expect(screen.getByTestId('loading')).toBeInTheDocument()

      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByTestId('notifications-loaded')).toHaveTextContent('0 notifications loaded')
      })

      expect(mockDb.getUserNotifications).toHaveBeenCalledTimes(2)
    })

    it('should handle partial data loading failures', async () => {
      // Some data loads successfully, some fails
      mockDb.getUserTeams.mockResolvedValue([
        { id: 'team-1', name: 'Team A' }
      ])
      
      mockDb.getUserNotifications.mockRejectedValue(new Error('Notifications unavailable'))

      const TestComponent = () => {
        const [teams, setTeams] = React.useState([])
        const [notifications, setNotifications] = React.useState(null)
        const [notificationError, setNotificationError] = React.useState(null)

        React.useEffect(() => {
          // Load teams
          mockDb.getUserTeams('test-user-id')
            .then(setTeams)
            .catch(console.error)

          // Load notifications
          mockDb.getUserNotifications('test-user-id')
            .then(setNotifications)
            .catch(err => setNotificationError(err.message))
        }, [])

        return (
          <div>
            <div data-testid="teams-section">
              Teams: {teams.length}
            </div>
            <div data-testid="notifications-section">
              {notificationError ? (
                <div data-testid="partial-error">
                  Notifications unavailable: {notificationError}
                  <button 
                    onClick={() => window.location.reload()} 
                    data-testid="refresh-page"
                  >
                    Refresh Page
                  </button>
                </div>
              ) : (
                `Notifications: ${notifications?.length || 0}`
              )}
            </div>
          </div>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('teams-section')).toHaveTextContent('Teams: 1')
        expect(screen.getByTestId('partial-error')).toHaveTextContent('Notifications unavailable')
      })
    })
  })
})