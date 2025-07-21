import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { databaseService } from '@/lib/database'
import { Meeting, Team } from '@/lib/types'

export function useTaskCount() {
  const { user } = useAuth()
  const [taskCount, setTaskCount] = useState(0)
  const [pendingTaskCount, setPendingTaskCount] = useState(0)

  useEffect(() => {
    if (!user) {
      setTaskCount(0)
      setPendingTaskCount(0)
      return
    }

    const loadTaskCount = async () => {
      try {
        // Get user teams first
        const userTeams = await databaseService.getUserTeams(user.uid)
        
        // Get all user meetings
        const userMeetings = await databaseService.getUserMeetings(user.uid)
        
        // Get all team meetings for teams user is part of
        const teamMeetings: Meeting[] = []
        for (const team of userTeams) {
          try {
            const meetings = await databaseService.getTeamMeetings(team.id)
            teamMeetings.push(...meetings)
          } catch (error) {
            console.warn(`Failed to load meetings for team ${team.name}:`, error)
          }
        }

        // Combine and deduplicate meetings
        const allMeetings = [...userMeetings, ...teamMeetings]
        const uniqueMeetings = allMeetings.filter((meeting, index, self) => 
          index === self.findIndex(m => m.id === meeting.id)
        )

        // Count tasks assigned to current user
        let totalTasks = 0
        let pendingTasks = 0
        
        uniqueMeetings.forEach(meeting => {
          meeting.actionItems.forEach(task => {
            if (task.assigneeId === user.uid) {
              totalTasks++
              if (task.status !== 'completed') {
                pendingTasks++
              }
            }
          })
        })

        setTaskCount(totalTasks)
        setPendingTaskCount(pendingTasks)
      } catch (error) {
        console.error('Error loading task count:', error)
        setTaskCount(0)
        setPendingTaskCount(0)
      }
    }

    loadTaskCount()

    // Set up real-time listeners for user meetings and teams
    const unsubscribeUserMeetings = databaseService.subscribeToUserMeetings(
      user.uid,
      () => loadTaskCount()
    )

    const unsubscribeUserTeams = databaseService.subscribeToUserTeams(
      user.uid,
      () => loadTaskCount()
    )

    return () => {
      unsubscribeUserMeetings()
      unsubscribeUserTeams()
    }
  }, [user])

  return { taskCount, pendingTaskCount }
}