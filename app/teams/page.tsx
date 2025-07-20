"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ResponsiveNavigation } from "@/components/responsive-navigation"
import { ResponsiveContainer } from "@/components/ui/responsive-grid"
import TeamManagement from "@/components/team-management"
import { authService } from "@/lib/auth"
import { 
  Users, 
  Plus, 
  Settings, 
  UserPlus, 
  Crown,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { Team } from "@/lib/types"
import { databaseService } from "@/lib/database"

export default function TeamsPage() {
  const { user, loading, error } = useAuth()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [teamsError, setTeamsError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // Load user teams
  useEffect(() => {
    if (!user) {
      setTeams([])
      setTeamsLoading(false)
      return
    }

    setTeamsLoading(true)
    setTeamsError(null)

    try {
      const unsubscribe = databaseService.subscribeToUserTeams(
        user.uid,
        (userTeams) => {
          setTeams(userTeams)
          setTeamsLoading(false)
        }
      )

      return () => {
        unsubscribe()
      }
    } catch (error) {
      console.error('Error loading teams:', error)
      setTeamsError('Failed to load teams')
      setTeamsLoading(false)
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
        currentPage="teams" 
        onLogout={handleLogout}
      />

      <ResponsiveContainer maxWidth="full" padding={{ mobile: 4, tablet: 6, desktop: 8 }}>
        <div className="py-6 md:py-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Team Management
            </h1>
            <p className="text-gray-600">
              Create and manage your teams for collaborative meeting processing
            </p>
          </div>

          {teamsError && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span>{teamsError}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  My Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {teams.length}
                </div>
                <p className="text-sm text-gray-600">
                  {teams.length === 1 ? 'team' : 'teams'} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  Admin Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600 mb-1">
                  {teams.filter(team => 
                    team.createdBy === user.uid || 
                    team.members.some(m => m.userId === user.uid && m.role === 'admin')
                  ).length}
                </div>
                <p className="text-sm text-gray-600">admin privileges</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-green-600" />
                  Active Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {teams.reduce((total, team) => 
                    total + team.members.filter(m => m.status === 'active').length, 0
                  )}
                </div>
                <p className="text-sm text-gray-600">across all teams</p>
              </CardContent>
            </Card>
          </div>

          {/* Team Management Component */}
          <TeamManagement />
        </div>
      </ResponsiveContainer>
    </div>
  )
}