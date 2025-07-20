"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import { TaskAssignmentDropdown } from "@/components/task-assignment-dropdown"
import { 
  Eye, 
  Download, 
  Trash2, 
  Calendar, 
  FileText, 
  CheckCircle, 
  Users, 
  User, 
  ArrowRight 
} from "lucide-react"

interface MobileCardProps {
  title: string
  description?: string
  children: ReactNode
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: "default" | "outline" | "ghost"
    icon?: ReactNode
  }>
  className?: string
  touchOptimized?: boolean
}

export function MobileCard({ 
  title, 
  description, 
  children, 
  actions = [],
  className = "",
  touchOptimized = true
}: MobileCardProps) {
  const isMobile = useMobile()

  return (
    <Card className={cn(
      "w-full",
      // Responsive styling with breakpoints
      "rounded-lg shadow-sm border-gray-200",
      "sm:rounded-xl sm:shadow-md",
      "md:rounded-lg md:shadow-sm",
      "lg:rounded-xl lg:shadow-md",
      className
    )}>
      <CardHeader className={cn(
        // Responsive padding adjustments
        "p-4 pb-2",
        "sm:p-5 sm:pb-3",
        "md:p-4 md:pb-2",
        "lg:p-6 lg:pb-3"
      )}>
        <CardTitle className={cn(
          // Responsive font size adjustments
          "text-lg",
          "sm:text-xl",
          "md:text-lg",
          "lg:text-xl"
        )}>
          {title}
        </CardTitle>
        {description && (
          <CardDescription className={cn(
            // Responsive font size adjustments
            "text-sm",
            "sm:text-base",
            "md:text-sm",
            "lg:text-base"
          )}>
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn(
        // Responsive padding adjustments
        "p-4 pt-0",
        "sm:p-5 sm:pt-0",
        "md:p-4 md:pt-0",
        "lg:p-6 lg:pt-0"
      )}>
        {children}
        
        {/* Actions */}
        {actions.length > 0 && (
          <div className={cn(
            "flex gap-2 mt-4",
            // Responsive layout: stack on mobile, row on larger screens
            "flex-col",
            "sm:flex-col",
            "md:flex-row md:flex-wrap",
            "lg:flex-row lg:flex-wrap"
          )}>
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "default"}
                onClick={action.onClick}
                className={cn(
                  // Touch-optimized sizing with responsive adjustments
                  // Minimum 44px touch target for accessibility and mobile usability
                  "h-12 min-h-[44px] min-w-[44px] text-base",
                  // Ensure proper touch target size on all devices
                  "sm:h-12 sm:min-h-[44px] sm:text-base",
                  "md:h-10 md:min-h-[44px] md:text-sm", // Keep 44px minimum even on desktop
                  "lg:h-10 lg:min-h-[44px] lg:text-sm", // Keep 44px minimum even on desktop
                  // Full width on mobile, auto on larger screens
                  "w-full justify-center",
                  "md:w-auto md:justify-start",
                  "lg:w-auto lg:justify-start",
                  // Touch target spacing
                  "touch-manipulation",
                  // Ensure proper spacing between touch targets
                  "mb-2 last:mb-0 md:mb-0 md:mr-2 md:last:mr-0"
                )}
                aria-label={`${action.label} for ${title}`}
              >
                {action.icon && (
                  <span className="mr-2 flex-shrink-0">
                    {action.icon}
                  </span>
                )}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface MeetingCardProps {
  meeting: {
    id: string
    title: string
    date: Date
    summary: string
    actionItems: Array<{ 
      id: string
      status: string
      description: string
      assigneeId?: string
      assigneeName?: string
    }>
    teamId?: string
  }
  onViewReport: (id: string) => void
  onDelete?: (id: string) => void
  onExport?: (id: string) => void
  showTeamControls?: boolean
  onTaskAssign?: (meetingId: string, taskId: string, assigneeId: string) => void
  teamMembers?: Array<{
    userId: string
    displayName: string
    status: string
  }>
  className?: string
}

export function MeetingCard({ 
  meeting, 
  onViewReport, 
  onDelete, 
  onExport,
  showTeamControls = false,
  onTaskAssign,
  teamMembers = [],
  className = ""
}: MeetingCardProps) {
  const isMobile = useMobile()
  const completedItems = meeting.actionItems.filter(item => item.status === 'completed').length

  const actions = [
    {
      label: "View Report",
      onClick: () => onViewReport(meeting.id),
      variant: "default" as const,
      icon: <Eye className="h-4 w-4" />
    },
    ...(onExport ? [{
      label: "Export",
      onClick: () => onExport(meeting.id),
      variant: "outline" as const,
      icon: <Download className="h-4 w-4" />
    }] : []),
    ...(onDelete ? [{
      label: "Delete",
      onClick: () => onDelete(meeting.id),
      variant: "outline" as const,
      icon: <Trash2 className="h-4 w-4" />
    }] : []),
  ]

  return (
    <MobileCard
      title={meeting.title}
      actions={actions}
      className={cn(
        "transition-all duration-200",
        isMobile && "hover:shadow-md active:scale-[0.98]",
        className
      )}
    >
      <div className="space-y-4">
        {/* Date and Stats */}
        <div className={cn(
          "flex gap-4 text-sm text-gray-500",
          // Mobile: stack vertically for better readability
          isMobile ? "flex-col gap-3" : "flex-row items-center"
        )}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{meeting.date.toLocaleDateString()}</span>
          </div>
          <div className={cn(
            "flex items-center gap-4",
            isMobile ? "justify-between" : ""
          )}>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{meeting.actionItems.length} tasks</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>{completedItems} done</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <p className={cn(
          "text-gray-600",
          // Mobile: allow more lines and larger text for better readability
          isMobile ? "line-clamp-4 text-base leading-relaxed" : "line-clamp-2 text-sm"
        )}>
          {meeting.summary}
        </p>

        {/* Progress Bar with Labels */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Progress</span>
            <span>{meeting.actionItems.length > 0 ? Math.round((completedItems / meeting.actionItems.length) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${meeting.actionItems.length > 0 ? (completedItems / meeting.actionItems.length) * 100 : 0}%` 
              }}
            />
          </div>
        </div>

        {/* Team Controls - Task Assignment */}
        {showTeamControls && onTaskAssign && teamMembers.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Task Assignments
              </h4>
              <Badge variant="secondary" className="text-xs">
                {meeting.actionItems.filter(t => t.assigneeId).length}/{meeting.actionItems.length} assigned
              </Badge>
            </div>
            <div className="space-y-3">
              {meeting.actionItems.slice(0, isMobile ? 2 : 3).map((task) => (
                <div key={task.id} className={cn(
                  "p-3 bg-gray-50 rounded-lg border border-gray-100",
                  isMobile ? "space-y-3" : "flex items-center justify-between"
                )}>
                  <div className={cn(
                    "flex-1 min-w-0",
                    isMobile ? "space-y-2" : ""
                  )}>
                    <p className={cn(
                      "text-gray-900 font-medium",
                      isMobile ? "text-sm leading-relaxed" : "text-sm truncate"
                    )} title={task.description}>
                      {isMobile && task.description.length > 60 
                        ? `${task.description.substring(0, 60)}...` 
                        : task.description.length > 50 
                        ? `${task.description.substring(0, 50)}...` 
                        : task.description}
                    </p>
                    {task.assigneeName && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="h-3 w-3" />
                        <span>Assigned to: {task.assigneeName}</span>
                      </div>
                    )}
                    {task.priority && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          task.priority === 'high' && "border-red-200 text-red-700 bg-red-50",
                          task.priority === 'medium' && "border-yellow-200 text-yellow-700 bg-yellow-50",
                          task.priority === 'low' && "border-green-200 text-green-700 bg-green-50"
                        )}
                      >
                        {task.priority} priority
                      </Badge>
                    )}
                  </div>
                  <div className={cn(
                    isMobile ? "w-full" : "flex-shrink-0 ml-3"
                  )}>
                    <TaskAssignmentDropdown
                      taskId={task.id}
                      meetingId={meeting.id}
                      currentAssigneeId={task.assigneeId}
                      teamMembers={teamMembers.filter(m => m.status === 'active')}
                      onAssign={onTaskAssign}
                      isMobile={isMobile}
                    />
                  </div>
                </div>
              ))}
              {meeting.actionItems.length > (isMobile ? 2 : 3) && (
                <div className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewReport(meeting.id)}
                    className={cn(
                      "text-blue-600 hover:text-blue-700",
                      isMobile && "h-12 w-full text-base"
                    )}
                  >
                    View {meeting.actionItems.length - (isMobile ? 2 : 3)} more tasks in report
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MobileCard>
  )
}