"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { User, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskAssignmentDropdownProps {
  taskId: string
  meetingId: string
  currentAssigneeId?: string
  teamMembers: Array<{
    userId: string
    displayName: string
    status: string
  }>
  onAssign: (meetingId: string, taskId: string, assigneeId: string) => void
  isMobile?: boolean
}

export function TaskAssignmentDropdown({
  taskId,
  meetingId,
  currentAssigneeId,
  teamMembers,
  onAssign,
  isMobile = false
}: TaskAssignmentDropdownProps) {
  const [isAssigning, setIsAssigning] = useState(false)

  const handleAssign = async (assigneeId: string) => {
    if (assigneeId === currentAssigneeId) return
    
    setIsAssigning(true)
    try {
      await onAssign(meetingId, taskId, assigneeId)
    } catch (error) {
      console.error('Assignment failed:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  const currentAssignee = teamMembers.find(member => member.userId === currentAssigneeId)

  return (
    <div className={cn(
      "flex items-center gap-3",
      // Responsive layout with breakpoints
      "w-full flex-col",
      "sm:w-full sm:flex-col",
      "md:flex-shrink-0 md:flex-row md:w-auto",
      "lg:flex-shrink-0 lg:flex-row lg:w-auto"
    )}>
      {/* Current Assignment Status */}
      <div className={cn(
        "flex items-center justify-center",
        isMobile ? "w-full" : "flex-shrink-0"
      )}>
        {currentAssignee ? (
          <Badge variant="secondary" className={cn(
            "flex items-center gap-1",
            isMobile ? "text-sm px-3 py-1" : "text-xs"
          )}>
            <User className={cn(isMobile ? "h-4 w-4" : "h-3 w-3")} />
            <span className="truncate max-w-[120px]">{currentAssignee.displayName}</span>
          </Badge>
        ) : (
          <Badge variant="outline" className={cn(
            "flex items-center gap-1",
            isMobile ? "text-sm px-3 py-1" : "text-xs"
          )}>
            <UserPlus className={cn(isMobile ? "h-4 w-4" : "h-3 w-3")} />
            Unassigned
          </Badge>
        )}
      </div>
      
      {/* Assignment Dropdown */}
      <Select
        value={currentAssigneeId || ""}
        onValueChange={handleAssign}
        disabled={isAssigning}
      >
        <SelectTrigger 
          className={cn(
            "border-2 transition-all duration-200",
            isMobile ? "h-12 w-full text-base min-h-[44px] min-w-[120px]" : "h-8 w-[140px] text-xs",
            isAssigning && "opacity-50 cursor-not-allowed",
            !isAssigning && isMobile && "hover:border-blue-300 focus:border-blue-500"
          )}
          aria-label={`Assign task to team member. Currently assigned to: ${currentAssignee?.displayName || 'Unassigned'}`}
          aria-haspopup="listbox"
          role="combobox"
        >
          <div className="flex items-center gap-2">
            <UserPlus className={cn(
              isMobile ? "h-4 w-4" : "h-3 w-3",
              "flex-shrink-0"
            )} />
            <SelectValue placeholder={isMobile ? "Assign to..." : "Assign"} />
          </div>
        </SelectTrigger>
        <SelectContent className={cn(
          isMobile && "min-w-[280px]"
        )}>
          <SelectItem value="" className={cn(
            isMobile ? "h-12 text-base" : "h-8 text-xs"
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                "rounded-full bg-gray-200",
                isMobile ? "h-6 w-6" : "h-4 w-4"
              )} />
              <span className="text-gray-500">Unassigned</span>
            </div>
          </SelectItem>
          {teamMembers.map((member) => (
            <SelectItem 
              key={member.userId} 
              value={member.userId}
              className={cn(
                isMobile ? "h-12 text-base" : "h-8 text-xs"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "rounded-full bg-blue-100 flex items-center justify-center",
                  isMobile ? "h-6 w-6" : "h-4 w-4"
                )}>
                  <User className={cn(
                    "text-blue-600",
                    isMobile ? "h-3 w-3" : "h-2 w-2"
                  )} />
                </div>
                <span className="truncate">{member.displayName}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Loading Indicator */}
      {isAssigning && (
        <div className={cn(
          "flex items-center gap-2 text-blue-600",
          isMobile ? "text-sm" : "text-xs"
        )}>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          <span>Assigning...</span>
        </div>
      )}
    </div>
  )
}