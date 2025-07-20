"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  UserPlus, 
  Settings, 
  Trash2, 
  Crown, 
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  X
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Team, TeamMember, CreateTeamData, User as UserType } from "@/lib/types"
import { 
  databaseService, 
  createTeam, 
  getUserTeams, 
  addTeamMember, 
  removeTeamMember, 
  updateTeamMember, 
  updateTeam,
  deleteTeam,
  subscribeToUserTeams,
  searchUserByEmail,
  createNotification
} from "@/lib/database"
import { getTeamService } from "@/lib/team-service"
import { useMobile } from "@/hooks/use-mobile"
import { useUserTeamsRealtime, useTeamMemberUpdates } from "@/hooks/use-team-realtime"
import { ResponsiveGrid, ResponsiveContainer } from "@/components/ui/responsive-grid"
import { useAsyncOperation } from "@/hooks/use-async-operation"
import { LoadingStateManager } from "@/lib/loading-state-manager"
import { LoadingSpinner, ErrorState, LoadingOverlay, SkeletonCard } from "@/components/ui/loading-states"
import { useNetworkStatus } from "@/hooks/use-network-status"

interface TeamManagementProps {
  className?: string
}

export function TeamManagement({ className }: TeamManagementProps) {
  const { user } = useAuth()
  const isMobile = useMobile()
  const teamService = getTeamService(databaseService)
  
  // Use real-time hooks for better performance and error handling
  const { 
    teams, 
    loading, 
    error, 
    isTeamAdmin: checkIsTeamAdmin, 
    canManageTeam 
  } = useUserTeamsRealtime(user?.uid || null)
  
  const { 
    operationLoading, 
    operationError, 
    executeOperation, 
    clearError 
  } = useTeamMemberUpdates()
  
  // Dialog states
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showInviteMember, setShowInviteMember] = useState(false)
  const [showTeamSettings, setShowTeamSettings] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  
  // Form states
  const [createTeamForm, setCreateTeamForm] = useState({
    name: '',
    description: ''
  })
  const [inviteMemberForm, setInviteMemberForm] = useState({
    email: '',
    displayName: ''
  })
  const [teamSettingsForm, setTeamSettingsForm] = useState({
    name: '',
    description: ''
  })
  const [searchResults, setSearchResults] = useState<UserType | null>(null)
  const [searching, setSearching] = useState(false)
  
  // No need for manual loading since we're using real-time hooks

  const handleCreateTeam = useCallback(async () => {
    if (!user || !createTeamForm.name.trim()) return

    await executeOperation(async () => {
      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error('Team creation is only available in browser environment')
      }

      // Validate database service
      if (!databaseService) {
        throw new Error('Database service is not available')
      }

      const teamData: CreateTeamData = {
        name: createTeamForm.name.trim(),
        description: createTeamForm.description.trim(),
        createdBy: user.uid
      }

      // Use bound createTeam function to prevent context loss
      const teamId = await createTeam(teamData)
      
      // Reset form and close dialog
      setCreateTeamForm({ name: '', description: '' })
      setShowCreateTeam(false)
      
      // Teams will update automatically via real-time listener
    })
  }, [user, createTeamForm, executeOperation])

  const handleSearchUser = useCallback(async () => {
    if (!inviteMemberForm.email.trim()) return

    await executeOperation(async () => {
      setSearching(true)
      
      const foundUser = await searchUserByEmail(inviteMemberForm.email.trim())
      setSearchResults(foundUser)
      
      if (foundUser && !inviteMemberForm.displayName) {
        setInviteMemberForm(prev => ({
          ...prev,
          displayName: foundUser.displayName || foundUser.email?.split('@')[0] || ''
        }))
      }
      
      setSearching(false)
    })
  }, [inviteMemberForm.email, inviteMemberForm.displayName, executeOperation])

  const handleInviteMember = useCallback(async () => {
    if (!user || !selectedTeam || !inviteMemberForm.email.trim() || !inviteMemberForm.displayName.trim()) return

    await executeOperation(async () => {
      // Add user as invited member directly
      const newMember: Omit<TeamMember, 'joinedAt'> = {
        userId: searchResults?.uid || `temp-${Date.now()}`,
        email: inviteMemberForm.email.toLowerCase(),
        displayName: inviteMemberForm.displayName.trim(),
        role: 'member',
        status: 'invited'
      }

      await addTeamMember(selectedTeam.id, newMember)

      // Create invitation notification
      if (searchResults) {
        await createNotification({
          userId: searchResults.uid,
          type: 'team_invitation',
          title: `Team Invitation: ${selectedTeam.name}`,
          message: `You have been invited to join the team "${selectedTeam.name}"`,
          data: {
            teamId: selectedTeam.id,
            teamName: selectedTeam.name,
            inviterId: user.uid,
            inviterName: user.displayName || user.email || 'Team Admin',
          }
        })
      }

      // Reset form and close dialog
      setInviteMemberForm({ email: '', displayName: '' })
      setSearchResults(null)
      setShowInviteMember(false)
      setSelectedTeam(null)
      
      // Teams will update automatically via real-time listener
    })
  }, [user, selectedTeam, inviteMemberForm, searchResults, executeOperation])

  const handleRemoveMember = useCallback(async (teamId: string, userId: string) => {
    if (!user) return

    await executeOperation(async () => {
      await removeTeamMember(teamId, userId)
      // Teams will update automatically via real-time listener
    })
  }, [user, executeOperation])

  const handleUpdateMemberRole = useCallback(async (teamId: string, userId: string, role: TeamMember['role']) => {
    if (!user) return

    await executeOperation(async () => {
      await updateTeamMember(teamId, userId, { role })
      // Teams will update automatically via real-time listener
    })
  }, [user, executeOperation])

  const handleUpdateTeam = useCallback(async () => {
    if (!user || !selectedTeam || !teamSettingsForm.name.trim()) return

    await executeOperation(async () => {
      const updates: Partial<Team> = {
        name: teamSettingsForm.name.trim(),
        description: teamSettingsForm.description.trim()
      }

      await updateTeam(selectedTeam.id, updates)
      
      // Reset form and close dialog
      setTeamSettingsForm({ name: '', description: '' })
      setShowTeamSettings(false)
      setSelectedTeam(null)
      
      // Teams will update automatically via real-time listener
    })
  }, [user, selectedTeam, teamSettingsForm, executeOperation])

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    if (!user) return

    await executeOperation(async () => {
      await deleteTeam(teamId, user.uid)
      // Teams will update automatically via real-time listener
    })
  }, [user, executeOperation])

  const isTeamAdmin = (team: Team): boolean => {
    if (!user) return false
    if (team.createdBy === user.uid) return true
    
    const member = team.members.find(m => m.userId === user.uid)
    return member?.role === 'admin' && member.status === 'active'
  }

  const getStatusIcon = (status: TeamMember['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'invited':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'inactive':
        return <X className="h-4 w-4 text-gray-400" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: TeamMember['status']) => {
    const variants = {
      active: 'default',
      invited: 'secondary',
      inactive: 'outline'
    } as const

    return (
      <Badge variant={variants[status]} className="text-xs">
        {status}
      </Badge>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Please sign in to manage teams</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer maxWidth="full" padding={{ mobile: 4, tablet: 6, desktop: 8 }} className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Team Management
            </h1>
            <p className="text-gray-600 mt-1">Create and manage your teams for collaborative meeting management</p>
          </div>
          
          <Button 
            onClick={() => setShowCreateTeam(true)}
            className="w-full sm:w-auto"
            size={isMobile ? "default" : "default"}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>

        {/* Error Display */}
        {(error || operationError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error || operationError}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => clearError()}
                className="ml-2"
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Teams Grid */}
        {loading ? (
          <ResponsiveGrid 
            cols={{ mobile: 1, tablet: 2, desktop: 3 }}
            gap={{ mobile: 4, tablet: 6, desktop: 6 }}
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </ResponsiveGrid>
        ) : error ? (
          <ErrorState
            title="Failed to load teams"
            message={error}
            onRetry={() => window.location.reload()}
            variant="error"
          />
        ) : teams.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
              <p className="text-gray-600 mb-4">Create your first team to start collaborating on meetings</p>
              <Button onClick={() => setShowCreateTeam(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ResponsiveGrid 
            cols={{ mobile: 1, tablet: 2, desktop: 3 }}
            gap={{ mobile: 4, tablet: 6, desktop: 6 }}
          >
            {teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                isAdmin={isTeamAdmin(team)}
                currentUserId={user.uid}
                onInviteMember={(team) => {
                  setSelectedTeam(team)
                  setShowInviteMember(true)
                }}
                onRemoveMember={handleRemoveMember}
                onUpdateMemberRole={handleUpdateMemberRole}
                onDeleteTeam={handleDeleteTeam}
                onTeamSettings={(team) => {
                  setSelectedTeam(team)
                  setTeamSettingsForm({
                    name: team.name,
                    description: team.description || ''
                  })
                  setShowTeamSettings(true)
                }}
                getStatusIcon={getStatusIcon}
                getStatusBadge={getStatusBadge}
                operationLoading={operationLoading}
              />
            ))}
          </ResponsiveGrid>
        )}

        {/* Create Team Dialog */}
        <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a team to collaborate with colleagues on meeting management
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  placeholder="Enter team name"
                  value={createTeamForm.name}
                  onChange={(e) => setCreateTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="team-description">Description (Optional)</Label>
                <Textarea
                  id="team-description"
                  placeholder="Describe your team's purpose"
                  value={createTeamForm.description}
                  onChange={(e) => setCreateTeamForm(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateTeam(false)}
                disabled={operationLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTeam}
                disabled={!createTeamForm.name.trim() || operationLoading}
              >
                {operationLoading ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite Member Dialog */}
        <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Search for a user by email and invite them to join {selectedTeam?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="member-email">Email Address</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteMemberForm.email}
                    onChange={(e) => setInviteMemberForm(prev => ({ ...prev, email: e.target.value }))}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleSearchUser}
                    disabled={!inviteMemberForm.email.trim() || searching}
                    size="icon"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {searchResults && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">User found: {searchResults.email}</span>
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="member-display-name">Display Name</Label>
                <Input
                  id="member-display-name"
                  placeholder="How they'll appear in the team"
                  value={inviteMemberForm.displayName}
                  onChange={(e) => setInviteMemberForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowInviteMember(false)
                  setInviteMemberForm({ email: '', displayName: '' })
                  setSearchResults(null)
                  setSelectedTeam(null)
                }}
                disabled={operationLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleInviteMember}
                disabled={!inviteMemberForm.email.trim() || !inviteMemberForm.displayName.trim() || operationLoading}
              >
                {operationLoading ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Team Settings Dialog */}
        <Dialog open={showTeamSettings} onOpenChange={setShowTeamSettings}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Team Settings</DialogTitle>
              <DialogDescription>
                Manage settings for {selectedTeam?.name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTeam && (
              <div className="space-y-4">
                {/* Editable Team Information */}
                {isTeamAdmin(selectedTeam) ? (
                  <>
                    <div>
                      <Label htmlFor="settings-team-name">Team Name</Label>
                      <Input
                        id="settings-team-name"
                        placeholder="Enter team name"
                        value={teamSettingsForm.name}
                        onChange={(e) => setTeamSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="settings-team-description">Description</Label>
                      <Textarea
                        id="settings-team-description"
                        placeholder="Describe your team's purpose"
                        value={teamSettingsForm.description}
                        onChange={(e) => setTeamSettingsForm(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Team Name</Label>
                      <p className="text-sm text-gray-600 mt-1">{selectedTeam.name}</p>
                    </div>
                    
                    {selectedTeam.description && (
                      <div>
                        <Label>Description</Label>
                        <p className="text-sm text-gray-600 mt-1">{selectedTeam.description}</p>
                      </div>
                    )}
                  </>
                )}
                
                <div>
                  <Label>Created</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedTeam.createdAt.toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <Label>Members</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedTeam.members.length} total ({selectedTeam.members.filter(m => m.status === 'active').length} active)
                  </p>
                </div>

                {/* Danger Zone */}
                {selectedTeam.createdBy === user?.uid && (
                  <div className="pt-4 border-t border-red-200">
                    <Label className="text-red-600">Danger Zone</Label>
                    <p className="text-sm text-gray-600 mt-1 mb-3">
                      Deleting a team is permanent and cannot be undone. All team data will be lost.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${selectedTeam.name}"? This action cannot be undone.`)) {
                          handleDeleteTeam(selectedTeam.id)
                          setShowTeamSettings(false)
                          setSelectedTeam(null)
                        }
                      }}
                      disabled={operationLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Team
                    </Button>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTeamSettings(false)
                  setSelectedTeam(null)
                  setTeamSettingsForm({ name: '', description: '' })
                }}
                disabled={operationLoading}
              >
                Cancel
              </Button>
              {selectedTeam && isTeamAdmin(selectedTeam) && (
                <Button 
                  onClick={handleUpdateTeam}
                  disabled={!teamSettingsForm.name.trim() || operationLoading}
                >
                  {operationLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveContainer>
  )
}

// Team Card Component
interface TeamCardProps {
  team: Team
  isAdmin: boolean
  currentUserId: string
  onInviteMember: (team: Team) => void
  onRemoveMember: (teamId: string, userId: string) => void
  onUpdateMemberRole: (teamId: string, userId: string, role: TeamMember['role']) => void
  onDeleteTeam: (teamId: string) => void
  onTeamSettings: (team: Team) => void
  getStatusIcon: (status: TeamMember['status']) => React.ReactNode
  getStatusBadge: (status: TeamMember['status']) => React.ReactNode
  operationLoading: boolean
}

function TeamCard({ 
  team, 
  isAdmin, 
  currentUserId,
  onInviteMember,
  onRemoveMember,
  onUpdateMemberRole,
  onDeleteTeam,
  onTeamSettings,
  getStatusIcon,
  getStatusBadge,
  operationLoading
}: TeamCardProps) {
  const activeMembers = team.members.filter(m => m.status === 'active')
  const invitedMembers = team.members.filter(m => m.status === 'invited')

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{team.name}</CardTitle>
            {team.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {team.description}
              </CardDescription>
            )}
          </div>
          
          {isAdmin && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onTeamSettings(team)}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600 pt-2">
          <span>{activeMembers.length} active</span>
          {invitedMembers.length > 0 && (
            <span>{invitedMembers.length} invited</span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Members List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Members</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {team.members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(member.status)}
                    <span className="truncate">{member.displayName}</span>
                    {member.role === 'admin' && (
                      <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(member.status)}
                    
                    {isAdmin && member.userId !== currentUserId && (
                      <div className="flex items-center gap-1">
                        {member.status === 'active' && (
                          <Select
                            value={member.role}
                            onValueChange={(role: TeamMember['role']) => 
                              onUpdateMemberRole(team.id, member.userId, role)
                            }
                            disabled={operationLoading}
                          >
                            <SelectTrigger className="h-6 w-16 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRemoveMember(team.id, member.userId)}
                          className="h-6 w-6 text-red-600 hover:text-red-700"
                          disabled={operationLoading}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          {isAdmin && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInviteMember(team)}
                className="flex-1"
                disabled={operationLoading}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Invite
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}