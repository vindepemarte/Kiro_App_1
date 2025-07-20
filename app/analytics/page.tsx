"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ResponsiveNavigation } from "@/components/responsive-navigation"
import { ResponsiveContainer } from "@/components/ui/responsive-grid"
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  Target,
  Activity
} from "lucide-react"
import { Meeting, Team } from "@/lib/types"
import { databaseService } from "@/lib/database"
import { authService } from "@/lib/auth"

export default function AnalyticsPage() {
  const { user, loading, error } = useAuth()
  const router = useRouter()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // Load user data
  useEffect(() => {
    if (!user) {
      setMeetings([])
      setTeams([])
      setDataLoading(false)
      return
    }

    setDataLoading(true)
    setDataError(null)

    try {
      // Load meetings
      const unsubscribeMeetings = databaseService.subscribeToUserMeetings(
        user.uid,
        (userMeetings) => {
          setMeetings(userMeetings)
        }
      )

      // Load teams
      const unsubscribeTeams = databaseService.subscribeToUserTeams(
        user.uid,
        (userTeams) => {
          setTeams(userTeams)
          setDataLoading(false)
        }
      )

      return () => {
        unsubscribeMeetings()
        unsubscribeTeams()
      }
    } catch (error) {
      console.error('Error loading analytics data:', error)
      setDataError('Failed to load analytics data')
      setDataLoading(false)
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await authService.signOutUser()
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Calculate analytics
  const analytics = {
    totalMeetings: meetings.length,
    personalMeetings: meetings.filter(m => !m.teamId).length,
    teamMeetings: meetings.filter(m => m.teamId).length,
    totalTasks: meetings.reduce((sum, m) => sum + (m.actionItems?.length || 0), 0),
    completedTasks: meetings.reduce((sum, m) => 
      sum + (m.actionItems?.filter(item => item.status === 'completed').length || 0), 0),
    pendingTasks: meetings.reduce((sum, m) => 
      sum + (m.actionItems?.filter(item => item.status === 'pending').length || 0), 0),
    inProgressTasks: meetings.reduce((sum, m) => 
      sum + (m.actionItems?.filter(item => item.status === 'in_progress').length || 0), 0),
    myTasks: meetings.reduce((sum, m) => 
      sum + (m.actionItems?.filter(item => item.assigneeId === user?.uid).length || 0), 0),
    thisMonth: meetings.filter(m => {
      const now = new Date()
      const meetingDate = new Date(m.date)
      return meetingDate.getMonth() === now.getMonth() && 
             meetingDate.getFullYear() === now.getFullYear()
    }).length,
    completionRate: 0
  }

  analytics.completionRate = analytics.totalTasks > 0 
    ? Math.round((analytics.completedTasks / analytics.totalTasks) * 100)
    : 0

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
        currentPage="analytics" 
        onLogout={handleLogout}
      />

      <ResponsiveContainer maxWidth="full" padding={{ mobile: 4, tablet: 6, desktop: 8 }}>
        <div className="py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600">
              Track your meeting processing and task completion metrics
            </p>
          </div>

          {dataError && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>{dataError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {dataLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Overview Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Total Meetings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {analytics.totalMeetings}
                    </div>
                    <p className="text-sm text-gray-600">
                      {analytics.personalMeetings} personal, {analytics.teamMeetings} team
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-600" />
                      Task Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {analytics.completionRate}%
                    </div>
                    <p className="text-sm text-gray-600">
                      {analytics.completedTasks} of {analytics.totalTasks} tasks
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      My Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {analytics.myTasks}
                    </div>
                    <p className="text-sm text-gray-600">assigned to me</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      This Month
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      {analytics.thisMonth}
                    </div>
                    <p className="text-sm text-gray-600">meetings processed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Task Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Task Status Breakdown
                  </CardTitle>
                  <CardDescription>
                    Overview of all task statuses across your meetings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-900">Completed</p>
                          <p className="text-sm text-green-700">{analytics.completedTasks} tasks</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {analytics.totalTasks > 0 ? Math.round((analytics.completedTasks / analytics.totalTasks) * 100) : 0}%
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <Activity className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="font-semibold text-blue-900">In Progress</p>
                          <p className="text-sm text-blue-700">{analytics.inProgressTasks} tasks</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {analytics.totalTasks > 0 ? Math.round((analytics.inProgressTasks / analytics.totalTasks) * 100) : 0}%
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <Clock className="h-8 w-8 text-gray-600" />
                        <div>
                          <p className="font-semibold text-gray-900">Pending</p>
                          <p className="text-sm text-gray-700">{analytics.pendingTasks} tasks</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        {analytics.totalTasks > 0 ? Math.round((analytics.pendingTasks / analytics.totalTasks) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Team Analytics */}
              {teams.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Analytics
                    </CardTitle>
                    <CardDescription>
                      Performance metrics for your teams
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {teams.map(team => {
                        const teamMeetings = meetings.filter(m => m.teamId === team.id)
                        const teamTasks = teamMeetings.reduce((sum, m) => sum + (m.actionItems?.length || 0), 0)
                        const teamCompleted = teamMeetings.reduce((sum, m) => 
                          sum + (m.actionItems?.filter(item => item.status === 'completed').length || 0), 0)
                        const teamCompletionRate = teamTasks > 0 ? Math.round((teamCompleted / teamTasks) * 100) : 0

                        return (
                          <div key={team.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{team.name}</p>
                                <p className="text-sm text-gray-600">
                                  {teamMeetings.length} meetings, {teamTasks} tasks
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">{teamCompletionRate}%</div>
                              <p className="text-sm text-gray-600">completion rate</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {analytics.totalMeetings === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Process your first meeting to see analytics and insights
                    </p>
                    <Button onClick={() => router.push('/dashboard')}>
                      Go to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </ResponsiveContainer>
    </div>
  )
}