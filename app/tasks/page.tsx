"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { databaseService } from "@/lib/database"
import { Meeting, ActionItem, Team } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, CheckCircle2, Clock, Filter, Users, AlertCircle, ChevronRight, FileText } from "lucide-react"
import { ResponsiveNavigation } from "@/components/responsive-navigation"
import { ResponsiveContainer } from "@/components/ui/responsive-grid"
import { useMobile } from "@/hooks/use-mobile"
import { formatShortDate } from "@/lib/date-utils"
import { useEnhancedToast, ToastContainer } from "@/components/ui/enhanced-feedback"
import { MobileContainer, PullToRefresh } from "@/components/ui/mobile-optimizations"

interface TaskWithMeeting extends ActionItem {
  meetingId: string
  meetingTitle: string
  meetingDate: Date
  teamId?: string
  teamName?: string
}

type SortOption = 'date' | 'priority' | 'team'
type FilterOption = 'all' | 'pending' | 'completed'

const priorityOrder = { high: 3, medium: 2, low: 1 }
const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200'
}

export default function TasksPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const isMobile = useMobile()
  const toast = useEnhancedToast()

  const [tasks, setTasks] = useState<TaskWithMeeting[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [isClient, setIsClient] = useState(false)

  // Ensure client-side only rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // Load user teams
  useEffect(() => {
    if (!user) return

    const unsubscribe = databaseService.subscribeToUserTeams(
      user.uid,
      (userTeams) => {
        setTeams(userTeams)
      }
    )

    return unsubscribe
  }, [user])

  // Load user tasks from all meetings
  useEffect(() => {
    if (!user) return

    setTasksLoading(true)

    const loadTasks = async () => {
      try {
        // Get all user meetings
        const userMeetings = await databaseService.getUserMeetings(user.uid)
        
        // Get all team meetings for teams user is part of
        const teamMeetings: Meeting[] = []
        for (const team of teams) {
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

        // Extract tasks assigned to current user
        const userTasks: TaskWithMeeting[] = []
        
        uniqueMeetings.forEach(meeting => {
          meeting.actionItems.forEach(task => {
            if (task.assigneeId === user.uid) {
              const teamInfo = teams.find(t => t.id === meeting.teamId)
              userTasks.push({
                ...task,
                meetingId: meeting.id,
                meetingTitle: meeting.title,
                meetingDate: meeting.date,
                teamId: meeting.teamId,
                teamName: teamInfo?.name
              })
            }
          })
        })

        setTasks(userTasks)
      } catch (error) {
        console.error('Error loading tasks:', error)
        toast.error('Failed to load tasks', {
          title: 'Loading Error'
        })
      } finally {
        setTasksLoading(false)
      }
    }

    loadTasks()
  }, [user, teams, toast])

  // Handle task status update
  const handleTaskStatusUpdate = async (taskId: string, meetingId: string, newStatus: ActionItem['status']) => {
    if (!user) return

    try {
      // Get the meeting to update the task
      const meeting = await databaseService.getMeetingById(meetingId, user.uid)
      if (!meeting) {
        toast.error('Meeting not found', { title: 'Update Failed' })
        return
      }

      // Update the task status
      const updatedActionItems = meeting.actionItems.map(item => 
        item.id === taskId ? { ...item, status: newStatus } : item
      )

      await databaseService.updateMeeting(meetingId, user.uid, { actionItems: updatedActionItems })

      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      )

      toast.success(`Task marked as ${newStatus}`, {
        title: 'Task Updated'
      })
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error('Failed to update task status', {
        title: 'Update Failed'
      })
    }
  }

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(task => 
        filterBy === 'completed' ? task.status === 'completed' : task.status !== 'completed'
      )
    }

    // Apply team filter
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(task => task.teamId === selectedTeam)
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()
        case 'priority':
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'team':
          return (a.teamName || '').localeCompare(b.teamName || '')
        default:
          return 0
      }
    })
  }, [tasks, filterBy, selectedTeam, sortBy])

  // Get task statistics
  const taskStats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.status === 'completed').length
    const pending = total - completed
    const overdue = tasks.filter(t => 
      t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed'
    ).length

    return { total, completed, pending, overdue }
  }, [tasks])

  // Handle refresh
  const handleRefresh = async () => {
    if (!user) return
    setTasksLoading(true)
    // Trigger reload by updating a dependency
    setTimeout(() => setTasksLoading(false), 1000)
  }

  // Show loading screen
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
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
      {/* Enhanced Toast Container */}
      <ToastContainer toasts={toast.toasts} position="top-right" />
      
      <ResponsiveNavigation currentPage="tasks" />
      
      <ResponsiveContainer maxWidth="full" padding={{ mobile: 4, tablet: 6, desktop: 8 }}>
        <PullToRefresh onRefresh={handleRefresh}>
          <div className={`py-6 md:py-8 ${isMobile ? 'pb-24' : ''}`}>
            {/* Header */}
            <div className="mb-6 md:mb-8">
              <h1 className={`font-bold text-gray-900 mb-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                My Tasks
              </h1>
              <p className="text-gray-600">Manage your assigned tasks from team meetings</p>
            </div>

            {/* Task Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{taskStats.total}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-orange-600">{taskStats.pending}</p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold text-red-600">{taskStats.overdue}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Sorting */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Status
                    </label>
                    <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tasks</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Team
                    </label>
                    <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teams</SelectItem>
                        {teams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sort by
                    </label>
                    <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks List */}
            {tasksLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading tasks...</p>
              </div>
            ) : filteredAndSortedTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                  <p className="text-gray-600">
                    {filterBy === 'all' 
                      ? "You don't have any assigned tasks yet."
                      : `No ${filterBy} tasks found with current filters.`
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedTasks.map((task) => (
                  <Card key={`${task.meetingId}-${task.id}`} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                                {task.description}
                              </h3>
                              
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <Badge 
                                  variant="outline" 
                                  className={priorityColors[task.priority]}
                                >
                                  {task.priority} priority
                                </Badge>
                                
                                {task.teamName && (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    <Users className="h-3 w-3 mr-1" />
                                    {task.teamName}
                                  </Badge>
                                )}
                                
                                <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatShortDate(task.meetingDate)}
                                </Badge>
                                
                                {task.deadline && (
                                  <Badge 
                                    variant="outline" 
                                    className={
                                      new Date(task.deadline) < new Date() && task.status !== 'completed'
                                        ? "bg-red-50 text-red-700 border-red-200"
                                        : "bg-gray-50 text-gray-700"
                                    }
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    Due {formatShortDate(task.deadline)}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center text-sm text-gray-600">
                                <FileText className="h-4 w-4 mr-1" />
                                <span className="truncate">From: {task.meetingTitle}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 md:flex-col md:items-end">
                          <Select
                            value={task.status}
                            onValueChange={(value: ActionItem['status']) => 
                              handleTaskStatusUpdate(task.id, task.meetingId, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/report/${task.meetingId}`)}
                            className="whitespace-nowrap"
                          >
                            View Meeting
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </PullToRefresh>
      </ResponsiveContainer>
    </div>
  )
}