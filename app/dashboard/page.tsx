"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, Upload, FileText, Calendar, User, LogOut, Eye, Download, Trash2, AlertCircle, Users, Filter, Settings } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { FileProcessor, FileProcessingError } from "@/lib/file-processor"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { databaseService } from "@/lib/database"
import { getGeminiService } from "@/lib/gemini"
import { Meeting, ProcessedMeeting as ProcessedMeetingType, Team, TeamMember } from "@/lib/types"
import { useRouter } from "next/navigation"
import { 
  ErrorHandler, 
  handleFileError, 
  handleDatabaseError, 
  handleAIError,
  showSuccess,
  retryOperation 
} from "@/lib/error-handler"
import { ipLimiter } from "@/lib/ip-limiter"
import { formatShortDate, isSameMonth } from "@/lib/date-utils"
import { ResponsiveNavigation } from "@/components/responsive-navigation"
import { ResponsiveGrid, ResponsiveContainer } from "@/components/ui/responsive-grid"
import { MobileCard, MeetingCard } from "@/components/ui/mobile-card"
import { useMobile } from "@/hooks/use-mobile"
import { getTouchOptimizedClasses, getResponsiveGridClasses, GRID_CONFIGS } from "@/lib/responsive-utils"
import { getTeamService } from "@/lib/team-service"
import { TaskAssignment } from "@/components/task-assignment"
import { getTeamAwareProcessor } from "@/lib/team-aware-processor"
import { useEnhancedToast, ToastContainer } from "@/components/ui/enhanced-feedback"
import { MobileContainer, CollapsibleSection, MobileTabs, PullToRefresh } from "@/components/ui/mobile-optimizations"

export default function Dashboard() {
  const { user, loading, error, signOut } = useAuth()
  const router = useRouter()
  const isMobile = useMobile()
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(true)
  const [meetingsError, setMeetingsError] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'personal' | 'team'>('personal')
  const [selectedUploadTeam, setSelectedUploadTeam] = useState<string>('personal')
  const [isClient, setIsClient] = useState(false)
  
  // Enhanced toast system
  const toast = useEnhancedToast()

  // Ensure client-side only rendering to prevent hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handle navigation when user becomes null (after logout)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  // Load user meetings on component mount and when user changes
  useEffect(() => {
    if (!user) {
      setMeetings([])
      setMeetingsLoading(false)
      return
    }

    setMeetingsLoading(true)
    setMeetingsError(null)

    try {
      // Subscribe to real-time updates for user meetings
      const unsubscribe = databaseService.subscribeToUserMeetings(
        user.uid,
        (userMeetings) => {
          setMeetings(userMeetings)
          setMeetingsLoading(false)
          setMeetingsError(null)
        }
      )

      // Cleanup subscription on unmount
      return () => {
        unsubscribe()
      }
    } catch (error) {
      const handledError = handleDatabaseError(error)
      setMeetingsError(handledError.userMessage)
      setMeetingsLoading(false)
    }
  }, [user])

  // Load user teams on component mount and when user changes
  useEffect(() => {
    if (!user) {
      setTeams([])
      setTeamsLoading(false)
      return
    }

    setTeamsLoading(true)

    try {
      // Subscribe to real-time updates for user teams
      const unsubscribe = databaseService.subscribeToUserTeams(
        user.uid,
        (userTeams) => {
          setTeams(userTeams)
          setTeamsLoading(false)
        }
      )

      // Cleanup subscription on unmount
      return () => {
        unsubscribe()
      }
    } catch (error) {
      console.error('Error loading teams:', error)
      setTeamsLoading(false)
    }
  }, [user])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file || !user) return

    setIsProcessing(true)
    setUploadProgress(0)
    setProcessingError(null)

    try {
      // Check IP limits for anonymous users
      if (user.isAnonymous) {
        // Create a mock request object to get IP (in real app this would come from server)
        const mockRequest = new Request('http://localhost', {
          headers: {
            'x-forwarded-for': '127.0.0.1', // This would be the real IP in production
          }
        });
        
        const ip = ipLimiter.getClientIP(mockRequest);
        const limitCheck = ipLimiter.checkIPLimit(ip);
        
        if (!limitCheck.allowed) {
          setProcessingError(limitCheck.reason || 'Rate limit exceeded');
          setIsProcessing(false);
          return;
        }
        
        // Record the usage
        ipLimiter.recordIPUsage(ip);
      }

      // Step 1: Validate and read file (20% progress)
      setUploadProgress(20)
      const { content, metadata } = await retryOperation(
        () => FileProcessor.processFile(file),
        { maxRetries: 2, baseDelay: 1000 }
      )
      
      // Step 2: Sanitize content (30% progress)
      setUploadProgress(30)
      const sanitizedContent = FileProcessor.sanitizeContent(content)
      
      // Step 3: Determine if this should be a team meeting
      const selectedTeamId = selectedUploadTeam !== 'personal' ? selectedUploadTeam : undefined
      
      // Step 4: Process with team-aware processor (80% progress)
      setUploadProgress(50)
      const teamAwareProcessor = getTeamAwareProcessor()
      const processingResult = await retryOperation(
        () => teamAwareProcessor.processTranscriptWithTeamContext(sanitizedContent, {
          userId: user.uid,
          teamId: selectedTeamId,
          fileName: file.name,
          fileSize: file.size
        }),
        { maxRetries: 3, baseDelay: 2000 }
      )
      
      // Step 5: Complete processing (100% progress)
      setUploadProgress(100)
      setIsProcessing(false)
      
      // Show enhanced success notification with assignment summary
      const { meeting, assignmentSummary } = processingResult
      let successMessage = `Meeting "${meeting.title}" has been processed successfully!`
      
      if (selectedTeamId && assignmentSummary.totalTasks > 0) {
        successMessage += ` ${assignmentSummary.autoAssigned} of ${assignmentSummary.totalTasks} tasks were automatically assigned.`
        if (assignmentSummary.unassigned > 0) {
          successMessage += ` ${assignmentSummary.unassigned} tasks need manual assignment.`
        }
        // Use celebration variant for team meetings with assignments
        toast.celebrate(successMessage, {
          title: 'Meeting Processed Successfully! 🎉',
          actionLabel: 'View Report',
          onAction: () => handleViewReport(meeting.id)
        })
      } else {
        toast.success(successMessage, {
          title: 'Processing Complete',
          actionLabel: 'View Report',
          onAction: () => handleViewReport(meeting.id)
        })
      }
      
    } catch (error) {
      setIsProcessing(false)
      setUploadProgress(0)
      
      // Handle different types of errors with appropriate user feedback
      console.error('File processing error:', error)
      let handledError;
      if (error instanceof FileProcessingError) {
        handledError = handleFileError(error)
      } else if (error instanceof Error && (error.message.includes('gemini') || error.message.includes('ai'))) {
        handledError = handleAIError(error)
      } else if (error instanceof Error && (error.message.includes('firestore') || error.message.includes('database') || error.message.includes('addDoc'))) {
        handledError = handleDatabaseError(error)
      } else {
        handledError = ErrorHandler.handleError(error, 'File Processing')
      }
      
      setProcessingError(handledError.userMessage || 'An error occurred while processing your file. Please try again.')
    }
  }, [user, selectedUploadTeam])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    multiple: false,
  })

  const handleViewReport = (meetingId: string) => {
    router.push(`/report/${meetingId}`)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      // Navigation will be handled by useEffect when user becomes null
    } catch (error) {
      console.error('Logout error:', error)
      // Force navigation on error
      setTimeout(() => router.push("/"), 0)
    }
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!user) return
    
    try {
      await retryOperation(
        () => databaseService.deleteMeeting(meetingId, user.uid),
        { maxRetries: 2, baseDelay: 1000 }
      )
      
      // Show enhanced success notification
      toast.success('Meeting deleted successfully', {
        title: 'Delete Complete'
      })
      
      // Meeting will be automatically removed from UI via real-time listener
    } catch (error) {
      const handledError = handleDatabaseError(error)
      setMeetingsError(handledError.userMessage)
    }
  }

  // Filter meetings based on selected team and tab
  const getFilteredMeetings = () => {
    let filteredMeetings = meetings

    if (activeTab === 'personal') {
      // Show only personal meetings (no teamId)
      filteredMeetings = meetings.filter(meeting => !meeting.teamId)
    } else if (activeTab === 'team') {
      // Show only team meetings
      filteredMeetings = meetings.filter(meeting => meeting.teamId)
      
      // Apply team filter if specific team is selected
      if (selectedTeamFilter !== 'all') {
        filteredMeetings = filteredMeetings.filter(meeting => meeting.teamId === selectedTeamFilter)
      }
    }

    return filteredMeetings
  }

  // Get team meeting analytics
  const getTeamMeetingAnalytics = () => {
    const teamMeetings = meetings.filter(meeting => meeting.teamId)
    const analytics = {
      totalTeamMeetings: teamMeetings.length,
      meetingsByTeam: new Map<string, number>(),
      tasksByTeam: new Map<string, number>(),
      recentTeamActivity: teamMeetings.slice(0, 5)
    }

    // Calculate meetings and tasks by team
    teamMeetings.forEach(meeting => {
      if (meeting.teamId) {
        const teamName = getTeamName(meeting.teamId)
        analytics.meetingsByTeam.set(teamName, (analytics.meetingsByTeam.get(teamName) || 0) + 1)
        analytics.tasksByTeam.set(teamName, (analytics.tasksByTeam.get(teamName) || 0) + meeting.actionItems.length)
      }
    })

    return analytics
  }

  // Get team name by ID
  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    return team?.name || 'Unknown Team'
  }

  // Check if user is admin of a team
  const isTeamAdmin = (teamId: string) => {
    if (!user) return false
    const team = teams.find(t => t.id === teamId)
    if (!team) return false
    
    // Team creator is always admin
    if (team.createdBy === user.uid) return true
    
    // Check if user has admin role
    const member = team.members.find(m => m.userId === user.uid)
    return member?.role === 'admin' && member.status === 'active'
  }

  // Load meetings manually (for refresh after task assignment)
  const loadMeetings = async () => {
    if (!user) return
    
    try {
      const userMeetings = await databaseService.getUserMeetings(user.uid)
      setMeetings(userMeetings)
    } catch (error) {
      console.error('Error loading meetings:', error)
    }
  }

  // Handle task assignment
  const handleTaskAssignment = async (meetingId: string, taskId: string, assigneeId: string) => {
    if (!user) return
    
    try {
      const teamService = getTeamService(databaseService)
      // Pass user.uid as both assignedBy and meetingOwnerId
      await databaseService.assignTask(meetingId, taskId, assigneeId, user.uid, user.uid)
      
      toast.success('Task assigned successfully', {
        title: 'Assignment Complete'
      })
      
      // Refresh meetings to show updated task assignments
      await loadMeetings()
    } catch (error) {
      const handledError = handleDatabaseError(error)
      setMeetingsError(handledError.userMessage)
    }
  }

  // Handle refresh for pull-to-refresh
  const handleRefresh = async () => {
    if (!user) return
    
    try {
      // Refresh meetings and teams data
      setMeetingsLoading(true)
      setTeamsLoading(true)
      
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Data refreshed successfully', {
        title: 'Refresh Complete',
        duration: 3000
      })
    } catch (error) {
      toast.error('Failed to refresh data', {
        title: 'Refresh Failed',
        actionLabel: 'Try Again',
        onAction: handleRefresh
      })
    }
  }

  // Show loading screen while authentication is loading or client hydration
  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{!isClient ? "Loading..." : "Setting up your session..."}</p>
        </div>
      </div>
    )
  }

  // Show error screen if authentication failed
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

  // Redirect to home if not authenticated
  if (!user) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Toast Container */}
      <ToastContainer toasts={toast.toasts} position="top-right" />
      
      {/* Responsive Navigation */}
      <ResponsiveNavigation 
        currentPage="dashboard" 
        onLogout={handleLogout}
      />

      <ResponsiveContainer maxWidth="full" padding={{ mobile: 4, tablet: 6, desktop: 8 }}>
        <PullToRefresh onRefresh={handleRefresh}>
          <div className={`py-6 md:py-8 ${isMobile ? 'pb-24' : ''}`}>
          <div className="mb-6 md:mb-8">
            <h1 className={`font-bold text-gray-900 mb-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Dashboard
            </h1>
            <p className="text-gray-600">Upload meeting transcripts and manage your processed meetings</p>
          </div>

          <ResponsiveGrid 
            cols={{ mobile: 1, tablet: 1, desktop: 3 }}
            gap={{ mobile: 4, tablet: 6, desktop: 8 }}
          >
            {/* Upload Section */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Meeting Transcript
                </CardTitle>
                <CardDescription>
                  Upload your meeting transcript (.txt or .md files) to generate a summary and action items
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processingError && (
                  <Alert className="mb-4" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>{processingError}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setProcessingError(null)}
                        className="ml-2"
                      >
                        Dismiss
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Team Selection for Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Process meeting for:
                  </label>
                  <Select value={selectedUploadTeam} onValueChange={setSelectedUploadTeam}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select team or personal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Personal Meeting
                        </div>
                      </SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedUploadTeam !== 'personal' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Tasks will be automatically assigned to team members based on speaker names
                    </p>
                  )}
                </div>

                {!isProcessing ? (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    {isDragActive ? (
                      <p className="text-blue-600 font-medium">Drop the file here...</p>
                    ) : (
                      <>
                        <p className="text-gray-600 mb-2">
                          Drag and drop your meeting transcript here, or click to browse
                        </p>
                        <p className="text-sm text-gray-500">Supports .txt and .md files up to 10MB</p>
                        <Button className="mt-4">Browse Files</Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 animate-fade-in">
                    <div className="relative mb-6">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2 animate-pulse">Processing Meeting...</h3>
                    <p className="text-gray-600 mb-6">AI is analyzing your transcript and generating insights</p>
                    <div className="max-w-xs mx-auto space-y-3">
                      <Progress value={uploadProgress} className="h-3 transition-all duration-500" />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{uploadProgress}% complete</span>
                        <span className="text-blue-600 font-medium">
                          {uploadProgress < 30 ? 'Reading file...' :
                           uploadProgress < 60 ? 'Processing content...' :
                           uploadProgress < 90 ? 'Generating insights...' :
                           'Finalizing...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unified Meeting Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Meeting Management
                    </CardTitle>
                    <CardDescription>View and manage your personal and team meetings</CardDescription>
                  </div>
                  {teams.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/teams')}
                      className="flex items-center"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Teams
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {meetingsError && (
                  <Alert className="mb-4" variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>{meetingsError}</span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setMeetingsError(null)}
                        className="ml-2"
                      >
                        Dismiss
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'personal' | 'team')} className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                      <TabsTrigger value="personal" className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        Personal ({meetings.filter(m => !m.teamId).length})
                      </TabsTrigger>
                      <TabsTrigger value="team" className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Team ({meetings.filter(m => m.teamId).length})
                      </TabsTrigger>
                    </TabsList>

                    {/* Team Filter - Only show when on team tab and user has teams */}
                    {activeTab === 'team' && teams.length > 0 && (
                      <Select value={selectedTeamFilter} onValueChange={setSelectedTeamFilter}>
                        <SelectTrigger className="w-[200px]">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Filter by team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Teams</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <TabsContent value="personal" className="mt-0">
                    {meetingsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading personal meetings...</p>
                      </div>
                    ) : getFilteredMeetings().length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No personal meetings yet</p>
                        <p className="text-sm text-gray-500">Upload your first transcript to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {getFilteredMeetings().map((meeting) => (
                          <MeetingCard
                            key={meeting.id}
                            meeting={meeting}
                            onViewReport={handleViewReport}
                            onDelete={handleDeleteMeeting}
                          />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="team" className="mt-0">
                    {meetingsLoading || teamsLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading team meetings...</p>
                      </div>
                    ) : teams.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No teams yet</p>
                        <p className="text-sm text-gray-500 mb-4">Create or join a team to collaborate on meetings</p>
                        <Button onClick={() => router.push('/teams')}>
                          <Users className="h-4 w-4 mr-2" />
                          Manage Teams
                        </Button>
                      </div>
                    ) : getFilteredMeetings().length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">
                          {selectedTeamFilter === 'all' 
                            ? 'No team meetings yet' 
                            : `No meetings for ${getTeamName(selectedTeamFilter)}`
                          }
                        </p>
                        <p className="text-sm text-gray-500">
                          {selectedTeamFilter === 'all'
                            ? 'Upload a meeting and assign it to a team to get started'
                            : 'Upload a meeting and assign it to this team'
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Group meetings by team if showing all teams */}
                        {selectedTeamFilter === 'all' ? (
                          (() => {
                            const meetingsByTeam = new Map<string, Meeting[]>()
                            getFilteredMeetings().forEach(meeting => {
                              if (meeting.teamId) {
                                const teamName = getTeamName(meeting.teamId)
                                if (!meetingsByTeam.has(teamName)) {
                                  meetingsByTeam.set(teamName, [])
                                }
                                meetingsByTeam.get(teamName)!.push(meeting)
                              }
                            })

                            return Array.from(meetingsByTeam.entries()).map(([teamName, teamMeetings]) => (
                              <div key={teamName} className="space-y-3">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                                    {teamName}
                                  </h3>
                                  <Badge variant="outline" className="text-xs">
                                    {teamMeetings.length} meeting{teamMeetings.length !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                                <div className="space-y-3 pl-4">
                                  {teamMeetings.map((meeting) => (
                                    <div key={meeting.id} className="relative">
                                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                                      <div className="pl-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center space-x-2">
                                            <Badge variant="secondary" className="text-xs">
                                              <Calendar className="h-3 w-3 mr-1" />
                                              {formatShortDate(meeting.date)}
                                            </Badge>
                                            {meeting.teamId && isTeamAdmin(meeting.teamId) && (
                                              <Badge variant="outline" className="text-xs">
                                                Admin
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <MeetingCard
                                          meeting={meeting}
                                          onViewReport={handleViewReport}
                                          onDelete={handleDeleteMeeting}
                                          showTeamControls={meeting.teamId ? isTeamAdmin(meeting.teamId) : false}
                                          onTaskAssign={meeting.teamId ? handleTaskAssignment : undefined}
                                          teamMembers={meeting.teamId ? teams.find(t => t.id === meeting.teamId)?.members || [] : []}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))
                          })()
                        ) : (
                          /* Show meetings for specific team */
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                                <Users className="h-5 w-5 mr-2 text-blue-600" />
                                {getTeamName(selectedTeamFilter)} Meetings
                              </h3>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {getFilteredMeetings().length} meeting{getFilteredMeetings().length !== 1 ? 's' : ''}
                                </Badge>
                                {isTeamAdmin(selectedTeamFilter) && (
                                  <Badge variant="secondary" className="text-xs">
                                    Admin
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {getFilteredMeetings().map((meeting) => (
                              <div key={meeting.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge variant="secondary" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {formatShortDate(meeting.date)}
                                  </Badge>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs text-gray-500">
                                      {meeting.actionItems.length} task{meeting.actionItems.length !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                                <MeetingCard
                                  meeting={meeting}
                                  onViewReport={handleViewReport}
                                  onDelete={handleDeleteMeeting}
                                  showTeamControls={meeting.teamId ? isTeamAdmin(meeting.teamId) : false}
                                  onTaskAssign={meeting.teamId ? handleTaskAssignment : undefined}
                                  teamMembers={meeting.teamId ? teams.find(t => t.id === meeting.teamId)?.members || [] : []}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Meetings</span>
                    <span className="font-semibold">{meetings.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Personal</span>
                    <span className="font-semibold">
                      {meetings.filter(m => !m.teamId).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Team</span>
                    <span className="font-semibold">
                      {meetings.filter(m => m.teamId).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Action Items</span>
                    <span className="font-semibold">
                      {meetings.reduce((sum, meeting) => sum + meeting.actionItems.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">My Tasks</span>
                    <span className="font-semibold">
                      {meetings.reduce((sum, meeting) => 
                        sum + meeting.actionItems.filter(item => item.assigneeId === user?.uid).length, 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="font-semibold">
                      {meetings.filter((m) => isSameMonth(m.date, new Date())).length}
                    </span>
                  </div>
                  {user?.isAnonymous && (
                    <>
                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Daily Limit</span>
                          <span className="font-semibold text-orange-600">
                            {meetings.length}/5
                          </span>
                        </div>
                        <div className="mt-2">
                          <Progress 
                            value={(meetings.length / 5) * 100} 
                            className="h-2"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Anonymous users can process 5 meetings per day
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Team Meeting Analytics */}
              {teams.length > 0 && activeTab === 'team' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Team Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const analytics = getTeamMeetingAnalytics()
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Team Meetings</span>
                            <span className="font-semibold">{analytics.totalTeamMeetings}</span>
                          </div>
                          
                          {analytics.meetingsByTeam.size > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">Meetings by Team</h4>
                              {Array.from(analytics.meetingsByTeam.entries()).map(([teamName, count]) => (
                                <div key={teamName} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600 truncate">{teamName}</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {analytics.tasksByTeam.size > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">Tasks by Team</h4>
                              {Array.from(analytics.tasksByTeam.entries()).map(([teamName, count]) => (
                                <div key={teamName} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600 truncate">{teamName}</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {analytics.recentTeamActivity.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">Recent Activity</h4>
                              {analytics.recentTeamActivity.map((meeting) => (
                                <div key={meeting.id} className="text-xs text-gray-500">
                                  <div className="truncate">{meeting.title}</div>
                                  <div className="flex justify-between">
                                    <span>{getTeamName(meeting.teamId!)}</span>
                                    <span>{formatShortDate(meeting.date)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Team Overview */}
              {teams.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      My Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {teams.slice(0, 3).map((team) => (
                      <div key={team.id} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {team.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {team.members.filter(m => m.status === 'active').length} members
                          </p>
                        </div>
                        {isTeamAdmin(team.id) && (
                          <Badge variant="outline" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                    ))}
                    {teams.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{teams.length - 3} more teams
                      </p>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => router.push('/teams')}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Teams
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">Better Results</p>
                    <p className="text-gray-600">
                      Include speaker names and timestamps for more accurate action item assignment.
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900 mb-1">File Format</p>
                    <p className="text-gray-600">Plain text (.txt) and Markdown (.md) files work best.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ResponsiveGrid>
        </div>
        </PullToRefresh>
      </ResponsiveContainer>
    </div>
  )
}
// Team task overview functionality
const getTeamTaskOverview = (teams: any[], meetings: any[]) => {
  return teams.map(team => {
    const teamMeetings = meetings.filter(m => m.teamId === team.id);
    const teamTasks = teamMeetings.flatMap(m => m.actionItems || []);
    const assignedTasks = teamTasks.filter(task => task.assigneeId);
    const unassignedTasks = teamTasks.filter(task => !task.assigneeId);
    
    return {
      team,
      totalTasks: teamTasks.length,
      assignedTasks: assignedTasks.length,
      unassignedTasks: unassignedTasks.length,
      taskList: teamTasks,
      assignee: assignedTasks.map(t => t.assigneeName).filter(Boolean)
    };
  });
};