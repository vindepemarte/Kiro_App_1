"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Brain,
  ArrowLeft,
  Download,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Clock,
  CheckCircle2,
  User,
  AlertCircle,
  RefreshCw,
  FileText,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { databaseService } from "@/lib/database"
import { Meeting } from "@/lib/types"
import { ErrorBoundary } from "@/components/error-boundary"
import { 
  ErrorHandler, 
  handleDatabaseError, 
  showSuccess,
  showWarning,
  retryOperation 
} from "@/lib/error-handler"

function ReportPageContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(null)
  const [exporting, setExporting] = useState(false)
  const [meetingId, setMeetingId] = useState<string | null>(null)

  // Extract params on component mount
  useEffect(() => {
    const extractParams = async () => {
      const resolvedParams = await params
      setMeetingId(resolvedParams.id)
    }
    extractParams()
  }, [params])

  // Fetch meeting data when meetingId is available
  useEffect(() => {
    const fetchMeeting = async () => {
      if (!user || !meetingId) return

      try {
        setLoading(true)
        setError(null)
        
        const meetingData = await retryOperation(
          () => databaseService.getMeetingById(meetingId, user.uid),
          { maxRetries: 3, baseDelay: 1000 }
        )
        
        if (!meetingData) {
          setError("Meeting not found. It may have been deleted or you don't have permission to view it.")
          showWarning("Meeting not found", "Report Access")
          return
        }
        
        setMeeting(meetingData)
      } catch (err) {
        const handledError = handleDatabaseError(err)
        setError(handledError.userMessage)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && meetingId) {
      fetchMeeting()
    }
  }, [meetingId, user, authLoading])

  // Retry function for error recovery
  const handleRetry = async () => {
    if (!user || !meetingId) return
    
    try {
      setError(null)
      setLoading(true)
      
      const meetingData = await retryOperation(
        () => databaseService.getMeetingById(meetingId, user.uid),
        { maxRetries: 3, baseDelay: 1000 }
      )
      
      if (!meetingData) {
        setError("Meeting not found. It may have been deleted or you don't have permission to view it.")
        showWarning("Meeting not found", "Report Access")
        return
      }
      
      setMeeting(meetingData)
      showSuccess("Meeting data loaded successfully", "Retry Successful")
    } catch (err) {
      const handledError = handleDatabaseError(err)
      setError(handledError.userMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = (type: "helpful" | "not-helpful") => {
    setFeedback(type)
  }

  const handleShareReport = async () => {
    if (!meeting) return

    try {
      // Create a shareable link
      const shareUrl = `${window.location.origin}/report/${meetingId}`
      
      // Try to use the Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Meeting Report: ${meeting.title}`,
          text: `Check out this meeting report with ${meeting.actionItems.length} action items`,
          url: shareUrl,
        })
        showSuccess('Report shared successfully!', 'Share Complete')
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(shareUrl)
        showSuccess('Report link copied to clipboard!', 'Link Copied')
      }
    } catch (error) {
      // If sharing fails, try copying to clipboard as fallback
      try {
        const shareUrl = `${window.location.origin}/report/${meetingId}`
        await navigator.clipboard.writeText(shareUrl)
        showSuccess('Report link copied to clipboard!', 'Link Copied')
      } catch (clipboardError) {
        console.error('Share error:', error)
        showWarning('Unable to share report. Please copy the URL manually.', 'Share Failed')
      }
    }
  }

  const handleScheduleFollowup = () => {
    if (!meeting) return

    try {
      // Create calendar event details
      const eventTitle = `Follow-up: ${meeting.title}`
      const eventDetails = `Follow-up meeting for: ${meeting.title}

Action Items to Review:
${meeting.actionItems.map((item, index) => 
  `${index + 1}. ${item.description} ${item.owner ? `(${item.owner})` : ''}`
).join('\n')}

Original Meeting Summary:
${meeting.summary.substring(0, 500)}${meeting.summary.length > 500 ? '...' : ''}

Report Link: ${window.location.href}`

      // Calculate suggested follow-up date (1 week from now)
      const followupDate = new Date()
      followupDate.setDate(followupDate.getDate() + 7)
      
      // Format dates for calendar URL
      const startDate = followupDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const endDate = new Date(followupDate.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

      // Create Google Calendar URL
      const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(eventDetails)}&location=&sf=true&output=xml`

      // Open calendar in new tab
      window.open(calendarUrl, '_blank')
      showSuccess('Calendar event created! Check your new tab.', 'Follow-up Scheduled')
    } catch (error) {
      console.error('Schedule follow-up error:', error)
      showWarning('Unable to schedule follow-up. Please create the calendar event manually.', 'Schedule Failed')
    }
  }

  const handleTaskToggle = async (actionItemId: string) => {
    if (!meeting || !user || !meetingId) return

    try {
      // Update local state immediately for better UX
      const updatedMeeting = {
        ...meeting,
        actionItems: meeting.actionItems.map(item =>
          item.id === actionItemId
            ? { ...item, status: item.status === 'completed' ? 'pending' as const : 'completed' as const }
            : item
        )
      }
      setMeeting(updatedMeeting)

      // Update in database
      await retryOperation(
        () => databaseService.updateMeeting(meetingId, user.uid, {
          actionItems: updatedMeeting.actionItems,
          updatedAt: new Date()
        }),
        { maxRetries: 2, baseDelay: 1000 }
      )

      showSuccess('Task status updated successfully', 'Task Updated')
    } catch (error) {
      // Revert local state on error
      setMeeting(meeting)
      const handledError = handleDatabaseError(error)
      console.error('Task toggle error:', handledError)
    }
  }

  const handleExport = async () => {
    if (!meeting) return

    try {
      setExporting(true)
      
      // Format action items with proper date formatting
      const formattedActionItems = meeting.actionItems
        .map((item, index) => {
          let itemText = `${index + 1}. ${item.description}`
          if (item.owner) itemText += ` (Owner: ${item.owner})`
          if (item.deadline) {
            const deadlineDate = item.deadline instanceof Date ? item.deadline : new Date(item.deadline)
            itemText += ` (Due: ${deadlineDate.toLocaleDateString()})`
          }
          itemText += ` [Priority: ${item.priority}]`
          return itemText
        })
        .join("\n")

      const content = `# ${meeting.title}

**Date:** ${formatDate(meeting.date)}

**Created:** ${formatShortDate(meeting.createdAt)}

## Meeting Summary

${meeting.summary}

## Action Items

${formattedActionItems}

---

*Report generated on ${formatShortDate(new Date())} from MeetingAI*
`

      const blob = new Blob([content], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${meeting.title.replace(/\s+/g, "-").toLowerCase()}-report.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // Show success notification
      showSuccess(`Report "${meeting.title}" exported successfully`, 'Export Complete')
      
    } catch (err) {
      const handledError = ErrorHandler.handleError(err, 'Export Report')
      console.error('Export error:', handledError)
    } finally {
      setExporting(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Safe date formatting to prevent hydration issues
  const formatDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date)
      return dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return "Invalid date"
    }
  }

  const formatShortDate = (date: Date | string) => {
    try {
      const dateObj = date instanceof Date ? date : new Date(date)
      return dateObj.toLocaleDateString()
    } catch {
      return "Invalid date"
    }
  }

  // Show loading state while authentication or data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2">
                <Brain className="h-6 w-6 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Meeting Report</span>
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Card className="mb-8">
            <CardHeader>
              <Skeleton className="h-8 w-64 mb-4" />
              <div className="flex items-center space-x-6">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2">
                <Brain className="h-6 w-6 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">Meeting Report</span>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <Alert className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Show main content when meeting data is loaded
  if (!meeting) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Meeting Report</span>
            </div>
          </div>
          <Button onClick={handleExport} disabled={!meeting || exporting}>
            {exporting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {exporting ? 'Exporting...' : 'Export Report'}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Meeting Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{meeting.title}</CardTitle>
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(meeting.date)}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Created {formatShortDate(meeting.createdAt)}
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    {meeting.actionItems.length} action items
                  </div>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Processed
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Meeting Details</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Created: {formatShortDate(meeting.createdAt)}</div>
                  {meeting.updatedAt.getTime() !== meeting.createdAt.getTime() && (
                    <div>Updated: {formatShortDate(meeting.updatedAt)}</div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Action Items:</span>
                    <span className="font-medium ml-2">{meeting.actionItems.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">High Priority:</span>
                    <span className="font-medium ml-2">
                      {meeting.actionItems.filter((item) => item.priority === "high").length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Meeting Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-blue-600" />
                  Meeting Summary
                </CardTitle>
                <CardDescription>AI-generated summary of key discussion points and decisions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {meeting.summary.split("\n\n").map((paragraph, index) => (
                    <p key={index} className="text-gray-700 leading-relaxed mb-4 last:mb-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                  Action Items
                </CardTitle>
                <CardDescription>Identified tasks with suggested owners and deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                {meeting.actionItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No action items identified in this meeting.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {meeting.actionItems.map((item, index) => (
                      <div key={item.id} className={`border rounded-lg p-4 transition-colors ${item.status === 'completed' ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3 flex-1">
                            <input
                              type="checkbox"
                              checked={item.status === 'completed'}
                              onChange={() => handleTaskToggle(item.id)}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                                <Badge className={getPriorityColor(item.priority)}>{item.priority} priority</Badge>
                                {item.status === 'completed' && (
                                  <Badge className="bg-green-100 text-green-800">completed</Badge>
                                )}
                              </div>
                              <p className={`font-medium mb-2 ${item.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                {item.description}
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                {item.owner && (
                                  <div className="flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    <span>Owner: {item.owner}</span>
                                  </div>
                                )}
                                {item.deadline && (
                                  <div className="flex items-center">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    <span>Due: {formatShortDate(item.deadline)}</span>
                                  </div>
                                )}
                                {!item.owner && (
                                  <div className="flex items-center text-amber-600">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    <span>Owner not specified</span>
                                  </div>
                                )}
                              </div>
                            </div>
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
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={handleExport} disabled={exporting}>
                  {exporting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {exporting ? 'Exporting...' : 'Export as Markdown'}
                </Button>
                <Button variant="outline" className="w-full bg-transparent" onClick={handleShareReport}>
                  Share Report
                </Button>
                <Button variant="outline" className="w-full bg-transparent" onClick={handleScheduleFollowup}>
                  Schedule Follow-up
                </Button>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Report Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Action Items</span>
                  <span className="font-semibold">{meeting.actionItems.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">High Priority</span>
                  <span className="font-semibold text-red-600">
                    {meeting.actionItems.filter((item) => item.priority === "high").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Assigned Items</span>
                  <span className="font-semibold">{meeting.actionItems.filter((item) => item.owner).length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">With Deadlines</span>
                  <span className="font-semibold">
                    {meeting.actionItems.filter((item) => item.deadline).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Was this helpful?</CardTitle>
                <CardDescription>Your feedback helps us improve our AI analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {feedback === null ? (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleFeedback("helpful")} className="flex-1">
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFeedback("not-helpful")}
                      className="flex-1"
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      No
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-green-600 mb-2">
                      {feedback === "helpful" ? (
                        <ThumbsUp className="h-6 w-6 mx-auto" />
                      ) : (
                        <ThumbsDown className="h-6 w-6 mx-auto" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600">Thank you for your feedback!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ErrorBoundary>
      <ReportPageContent params={params} />
    </ErrorBoundary>
  )
}