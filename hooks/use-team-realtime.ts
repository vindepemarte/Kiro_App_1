import { useState, useEffect, useCallback, useRef } from 'react'
import { Team, Meeting } from '@/lib/types'
import { subscribeToTeam, subscribeToUserTeams, subscribeToTeamMeetings } from '@/lib/database'
import { databaseOptimizer } from '@/lib/database-optimization'
import { dataCacheService } from '@/lib/data-cache-service'

// Hook for subscribing to a specific team's real-time updates with caching
export function useTeamRealtime(teamId: string | null) {
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!teamId) {
      setTeam(null)
      setLoading(false)
      setError(null)
      return
    }

    // Check cache first
    const cachedTeam = dataCacheService.getTeam(teamId)
    if (cachedTeam) {
      setTeam(cachedTeam)
      setLoading(false)
      setError(null)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      // Use optimized listener with batching
      const unsubscribe = databaseOptimizer.subscribeToOptimizedTeam(
        teamId, 
        (updatedTeam) => {
          setTeam(updatedTeam)
          setLoading(false)
          if (!updatedTeam) {
            setError('Team not found or access denied')
            dataCacheService.deleteTeam(teamId)
          } else {
            setError(null)
            dataCacheService.setTeam(teamId, updatedTeam)
          }
        },
        { batchDelay: 150 } // Batch updates for 150ms to reduce re-renders
      )

      unsubscribeRef.current = unsubscribe

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current()
          unsubscribeRef.current = null
        }
      }
    } catch (err) {
      console.error('Failed to subscribe to team updates:', err)
      setError(err instanceof Error ? err.message : 'Failed to subscribe to team updates')
      setLoading(false)
      return () => {}
    }
  }, [teamId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  return { team, loading, error }
}

// Hook for subscribing to user's teams with real-time updates and caching
export function useUserTeamsRealtime(userId: string | null) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!userId) {
      setTeams([])
      setLoading(false)
      setError(null)
      return
    }

    // Check cache first
    const cachedTeams = dataCacheService.getUserTeams(userId)
    if (cachedTeams) {
      setTeams(cachedTeams)
      setLoading(false)
      setError(null)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const unsubscribe = subscribeToUserTeams(userId, (userTeams) => {
        setTeams(userTeams)
        setLoading(false)
        setError(null)
        
        // Update cache
        dataCacheService.setUserTeams(userId, userTeams)
        // Cache individual teams
        userTeams.forEach(team => dataCacheService.setTeam(team.id, team))
      })

      unsubscribeRef.current = unsubscribe

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current()
          unsubscribeRef.current = null
        }
      }
    } catch (err) {
      console.error('Failed to subscribe to user teams updates:', err)
      setError(err instanceof Error ? err.message : 'Failed to subscribe to user teams updates')
      setLoading(false)
      setTeams([])
      return () => {}
    }
  }, [userId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  // Memoized helper functions
  const getTeamById = useCallback((teamId: string) => {
    return teams.find(team => team.id === teamId) || null
  }, [teams])

  const isTeamAdmin = useCallback((teamId: string, userId: string) => {
    const team = getTeamById(teamId)
    if (!team) return false
    
    // Team creator is always admin
    if (team.createdBy === userId) return true
    
    // Check if user has admin role
    const member = team.members.find(m => m.userId === userId)
    return member?.role === 'admin' && member.status === 'active'
  }, [teams, getTeamById])

  const canManageTeam = useCallback((teamId: string, userId: string) => {
    return isTeamAdmin(teamId, userId)
  }, [isTeamAdmin])

  const getTeamMember = useCallback((teamId: string, userId: string) => {
    const team = getTeamById(teamId)
    return team?.members.find(m => m.userId === userId) || null
  }, [getTeamById])

  return { 
    teams, 
    loading, 
    error, 
    getTeamById, 
    isTeamAdmin, 
    canManageTeam, 
    getTeamMember 
  }
}

// Hook for subscribing to team meetings with real-time updates and caching
export function useTeamMeetingsRealtime(teamId: string | null) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!teamId) {
      setMeetings([])
      setLoading(false)
      setError(null)
      return
    }

    // Check cache first
    const cachedMeetings = dataCacheService.getTeamMeetings(teamId)
    if (cachedMeetings) {
      setMeetings(cachedMeetings)
      setLoading(false)
      setError(null)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const unsubscribe = subscribeToTeamMeetings(teamId, (teamMeetings) => {
        setMeetings(teamMeetings)
        setLoading(false)
        setError(null)
        
        // Update cache
        dataCacheService.setTeamMeetings(teamId, teamMeetings)
        // Cache individual meetings
        teamMeetings.forEach(meeting => dataCacheService.setMeeting(meeting.id, meeting))
      })

      unsubscribeRef.current = unsubscribe

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current()
          unsubscribeRef.current = null
        }
      }
    } catch (err) {
      console.error('Failed to subscribe to team meetings updates:', err)
      setError(err instanceof Error ? err.message : 'Failed to subscribe to team meetings updates')
      setLoading(false)
      setMeetings([])
      return () => {}
    }
  }, [teamId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  return { meetings, loading, error }
}

// Hook for managing team member updates with optimistic updates
export function useTeamMemberUpdates() {
  const [operationLoading, setOperationLoading] = useState(false)
  const [operationError, setOperationError] = useState<string | null>(null)

  const executeOperation = useCallback(async (operation: () => Promise<void>) => {
    try {
      setOperationLoading(true)
      setOperationError(null)
      await operation()
    } catch (error) {
      console.error('Team operation failed:', error)
      setOperationError(error instanceof Error ? error.message : 'Operation failed')
    } finally {
      setOperationLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setOperationError(null)
  }, [])

  return {
    operationLoading,
    operationError,
    executeOperation,
    clearError
  }
}