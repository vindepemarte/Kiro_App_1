"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, Upload, FileText, Calendar, User, LogOut, Eye, Download, Trash2, AlertCircle } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { FileProcessor, FileProcessingError } from "@/lib/file-processor"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { databaseService } from "@/lib/database"
import { getGeminiService } from "@/lib/gemini"
import { Meeting, ProcessedMeeting as ProcessedMeetingType } from "@/lib/types"
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

export default function Dashboard() {
  const { user, loading, error, signOut } = useAuth()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(true)
  const [meetingsError, setMeetingsError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

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
      
      // Step 2: Extract title and sanitize content (40% progress)
      setUploadProgress(40)
      const sanitizedContent = FileProcessor.sanitizeContent(content)
      
      // Step 3: Process with Gemini AI (70% progress)
      setUploadProgress(70)
      const geminiService = getGeminiService()
      const aiResponse = await retryOperation(
        () => geminiService.processTranscript(sanitizedContent),
        { maxRetries: 3, baseDelay: 2000 }
      )
      
      // Step 4: Save to Firestore (90% progress)
      setUploadProgress(90)
      const processedMeeting: ProcessedMeetingType = {
        summary: aiResponse.summary,
        actionItems: aiResponse.actionItems.map((item, index) => ({
          ...item,
          id: `action-${Date.now()}-${index}`,
          status: 'pending' as const
        })),
        rawTranscript: content,
        metadata: {
          ...metadata,
          uploadedAt: new Date(),
          processingTime: Date.now() - performance.now()
        }
      }
      
      await retryOperation(
        () => databaseService.saveMeeting(user.uid, processedMeeting),
        { maxRetries: 3, baseDelay: 1000 }
      )
      
      // Step 5: Complete processing (100% progress)
      setUploadProgress(100)
      setIsProcessing(false)
      
      // Show success notification
      showSuccess(
        `Meeting "${FileProcessor.extractTitle(content, file.name)}" has been processed successfully!`,
        'Processing Complete'
      )
      
    } catch (error) {
      setIsProcessing(false)
      setUploadProgress(0)
      
      // Handle different types of errors with appropriate user feedback
      console.error('File processing error:', error)
      let handledError;
      if (error instanceof FileProcessingError) {
        handledError = handleFileError(error)
      } else if (error?.message?.includes('gemini') || error?.message?.includes('ai')) {
        handledError = handleAIError(error)
      } else if (error?.message?.includes('firestore') || error?.message?.includes('database') || error?.message?.includes('addDoc')) {
        handledError = handleDatabaseError(error)
      } else {
        handledError = ErrorHandler.handleError(error, 'File Processing')
      }
      
      setProcessingError(handledError.userMessage || 'An error occurred while processing your file. Please try again.')
    }
  }, [user])

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
      
      // Show success notification
      showSuccess('Meeting deleted successfully', 'Delete Complete')
      
      // Meeting will be automatically removed from UI via real-time listener
    } catch (error) {
      const handledError = handleDatabaseError(error)
      setMeetingsError(handledError.userMessage)
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
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">MeetingAI</span>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
              Preview
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">
                {user?.isAnonymous 
                  ? 'Anonymous User' 
                  : user?.displayName || user?.email || `User ${user?.uid.slice(0, 8)}`
                }
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Upload meeting transcripts and manage your processed meetings</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <Card className="mb-8">
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
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Meeting...</h3>
                    <p className="text-gray-600 mb-4">AI is analyzing your transcript and generating insights</p>
                    <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">{uploadProgress}% complete</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processed Meetings */}
            <Card>
              <CardHeader>
                <CardTitle>My Processed Meetings</CardTitle>
                <CardDescription>View and manage your meeting summaries and action items</CardDescription>
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
                {meetingsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading meetings...</p>
                  </div>
                ) : meetings.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No meetings processed yet</p>
                    <p className="text-sm text-gray-500">Upload your first transcript to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {meetings.map((meeting) => (
                      <div key={meeting.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                              <Badge variant="default">completed</Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {formatShortDate(meeting.date)}
                              </div>
                              <div>{meeting.actionItems.length} action items</div>
                              <div>
                                {meeting.actionItems.filter(item => item.status === 'completed').length} completed
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{meeting.summary}</p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => handleViewReport(meeting.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Report
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteMeeting(meeting.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <span className="text-sm text-gray-600">Action Items</span>
                  <span className="font-semibold">
                    {meetings.reduce((sum, meeting) => sum + meeting.actionItems.length, 0)}
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
        </div>
      </div>
    </div>
  )
}
