'use client';

import React, { useState, useEffect } from 'react';
import { ActionItem, TeamMember, Meeting } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Play, 
  UserPlus,
  Users,
  Calendar
} from 'lucide-react';

interface TaskAssignmentProps {
  meeting: Meeting;
  teamMembers: TeamMember[];
  currentUserId: string;
  onTaskAssigned: (taskId: string, assigneeId: string) => Promise<void>;
  onTaskStatusChanged: (taskId: string, status: ActionItem['status']) => Promise<void>;
  onBulkAssign: (assignments: Array<{ taskId: string; assigneeId: string }>) => Promise<void>;
  isTeamAdmin?: boolean;
}

export function TaskAssignment({
  meeting,
  teamMembers,
  currentUserId,
  onTaskAssigned,
  onTaskStatusChanged,
  onBulkAssign,
  isTeamAdmin = false
}: TaskAssignmentProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bulkAssignee, setBulkAssignee] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: ActionItem['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: ActionItem['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isOverdue = (deadline?: Date) => {
    if (!deadline) return false;
    return new Date() > deadline;
  };

  const canAssignTask = (task: ActionItem) => {
    return isTeamAdmin || task.assigneeId === currentUserId || !task.assigneeId;
  };

  const canUpdateStatus = (task: ActionItem) => {
    return task.assigneeId === currentUserId || isTeamAdmin;
  };

  const handleTaskAssignment = async (taskId: string, assigneeId: string) => {
    if (!assigneeId) return;
    
    setIsAssigning(taskId);
    try {
      await onTaskAssigned(taskId, assigneeId);
      toast({
        title: 'Task Assigned',
        description: 'Task has been successfully assigned.',
      });
    } catch (error) {
      toast({
        title: 'Assignment Failed',
        description: error instanceof Error ? error.message : 'Failed to assign task',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(null);
    }
  };

  const handleStatusChange = async (taskId: string, status: ActionItem['status']) => {
    setIsUpdatingStatus(taskId);
    try {
      await onTaskStatusChanged(taskId, status);
      toast({
        title: 'Status Updated',
        description: `Task status changed to ${status.replace('_', ' ')}.`,
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update task status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleBulkAssignment = async () => {
    if (!bulkAssignee || selectedTasks.size === 0) return;

    try {
      const assignments = Array.from(selectedTasks).map(taskId => ({
        taskId,
        assigneeId: bulkAssignee
      }));

      await onBulkAssign(assignments);
      setSelectedTasks(new Set());
      setBulkAssignee('');
      
      toast({
        title: 'Bulk Assignment Complete',
        description: `${assignments.length} tasks have been assigned.`,
      });
    } catch (error) {
      toast({
        title: 'Bulk Assignment Failed',
        description: error instanceof Error ? error.message : 'Failed to assign tasks',
        variant: 'destructive',
      });
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  };

  const getAssigneeName = (task: ActionItem) => {
    if (!task.assigneeId) return 'Unassigned';
    const member = teamMembers.find(m => m.userId === task.assigneeId);
    return member?.displayName || task.assigneeName || 'Unknown User';
  };

  const unassignedTasks = meeting.actionItems.filter(task => !task.assigneeId);
  const assignedTasks = meeting.actionItems.filter(task => task.assigneeId);

  return (
    <div className="space-y-6">
      {/* Bulk Assignment Controls */}
      {isTeamAdmin && meeting.actionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bulk Task Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Select tasks to assign in bulk:
                </label>
                <div className="text-sm text-gray-600">
                  {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="flex-1">
                  <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                    <SelectTrigger className="w-full h-12 text-base min-h-[44px]">
                      <SelectValue placeholder="Select assignee for bulk assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers
                        .filter(member => member.status === 'active')
                        .map(member => (
                          <SelectItem key={member.userId} value={member.userId} className="h-12 text-base">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-3 w-3 text-blue-600" />
                              </div>
                              <span>{member.displayName}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleBulkAssignment}
                  disabled={selectedTasks.size === 0 || !bulkAssignee}
                  className="w-full sm:w-auto h-12 min-h-[44px] text-base px-6"
                  size="lg"
                >
                  Assign {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unassigned Tasks */}
      {unassignedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Unassigned Tasks ({unassignedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unassignedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  teamMembers={teamMembers}
                  currentUserId={currentUserId}
                  isTeamAdmin={isTeamAdmin}
                  isAssigning={isAssigning === task.id}
                  isUpdatingStatus={isUpdatingStatus === task.id}
                  isSelected={selectedTasks.has(task.id)}
                  onAssign={handleTaskAssignment}
                  onStatusChange={handleStatusChange}
                  onToggleSelection={toggleTaskSelection}
                  canAssign={canAssignTask(task)}
                  canUpdateStatus={canUpdateStatus(task)}
                  showBulkSelect={isTeamAdmin}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assigned Tasks */}
      {assignedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Assigned Tasks ({assignedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  teamMembers={teamMembers}
                  currentUserId={currentUserId}
                  isTeamAdmin={isTeamAdmin}
                  isAssigning={isAssigning === task.id}
                  isUpdatingStatus={isUpdatingStatus === task.id}
                  isSelected={selectedTasks.has(task.id)}
                  onAssign={handleTaskAssignment}
                  onStatusChange={handleStatusChange}
                  onToggleSelection={toggleTaskSelection}
                  canAssign={canAssignTask(task)}
                  canUpdateStatus={canUpdateStatus(task)}
                  showBulkSelect={isTeamAdmin}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {meeting.actionItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No action items found in this meeting.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface TaskCardProps {
  task: ActionItem;
  teamMembers: TeamMember[];
  currentUserId: string;
  isTeamAdmin: boolean;
  isAssigning: boolean;
  isUpdatingStatus: boolean;
  isSelected: boolean;
  onAssign: (taskId: string, assigneeId: string) => Promise<void>;
  onStatusChange: (taskId: string, status: ActionItem['status']) => Promise<void>;
  onToggleSelection: (taskId: string) => void;
  canAssign: boolean;
  canUpdateStatus: boolean;
  showBulkSelect: boolean;
}

function TaskCard({
  task,
  teamMembers,
  currentUserId,
  isTeamAdmin,
  isAssigning,
  isUpdatingStatus,
  isSelected,
  onAssign,
  onStatusChange,
  onToggleSelection,
  canAssign,
  canUpdateStatus,
  showBulkSelect
}: TaskCardProps) {
  const [selectedAssignee, setSelectedAssignee] = useState<string>(task.assigneeId || '');

  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: ActionItem['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: ActionItem['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isOverdue = (deadline?: Date) => {
    if (!deadline) return false;
    return new Date() > deadline;
  };

  const getAssigneeName = (task: ActionItem) => {
    if (!task.assigneeId) return 'Unassigned';
    const member = teamMembers.find(m => m.userId === task.assigneeId);
    return member?.displayName || task.assigneeName || 'Unknown User';
  };

  return (
    <div className={`border rounded-lg p-4 transition-all duration-200 ${
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:shadow-sm'
    }`}>
      <div className="flex items-start gap-3">
        {/* Bulk Selection Checkbox */}
        {showBulkSelect && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(task.id)}
            className="mt-1 h-5 w-5 min-h-[44px] min-w-[44px] flex items-center justify-center"
          />
        )}

        <div className="flex-1 space-y-4">
          {/* Task Description */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <p className="text-base font-medium text-gray-900 flex-1 leading-relaxed">
              {task.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <Badge className={`${getPriorityColor(task.priority)} text-xs px-2 py-1`}>
                {task.priority}
              </Badge>
              <Badge className={`${getStatusColor(task.status)} text-xs px-2 py-1`}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(task.status)}
                  {task.status.replace('_', ' ')}
                </div>
              </Badge>
            </div>
          </div>

          {/* Task Metadata */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{getAssigneeName(task)}</span>
            </div>
            
            {task.deadline && (
              <div className={`flex items-center gap-2 ${isOverdue(task.deadline) ? 'text-red-600' : ''}`}>
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>
                  Due: {task.deadline.toLocaleDateString()}
                  {isOverdue(task.deadline) && ' (Overdue)'}
                </span>
              </div>
            )}

            {task.assignedAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>Assigned: {task.assignedAt.toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Assignment and Status Controls */}
          <div className="flex flex-col gap-4">
            {/* Assignment Control */}
            {canAssign && (
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <div className="flex-1 w-full sm:max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to:
                  </label>
                  <Select 
                    value={selectedAssignee} 
                    onValueChange={setSelectedAssignee}
                    disabled={isAssigning}
                  >
                    <SelectTrigger className="w-full h-12 text-base min-h-[44px]">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned" className="h-12 text-base">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gray-200" />
                          <span>Unassigned</span>
                        </div>
                      </SelectItem>
                      {teamMembers
                        .filter(member => member.status === 'active')
                        .map(member => (
                          <SelectItem key={member.userId} value={member.userId} className="h-12 text-base">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-3 w-3 text-blue-600" />
                              </div>
                              <span>{member.displayName}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedAssignee !== (task.assigneeId || '') && (
                  <Button
                    size="lg"
                    onClick={() => onAssign(task.id, selectedAssignee)}
                    disabled={isAssigning}
                    className="w-full sm:w-auto h-12 min-h-[44px] text-base px-6"
                  >
                    {isAssigning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Assigning...
                      </>
                    ) : task.assigneeId ? (
                      'Reassign Task'
                    ) : (
                      'Assign Task'
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Status Control */}
            {canUpdateStatus && (
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <div className="flex-1 w-full sm:max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status:
                  </label>
                  <Select 
                    value={task.status} 
                    onValueChange={(status: ActionItem['status']) => onStatusChange(task.id, status)}
                    disabled={isUpdatingStatus}
                  >
                    <SelectTrigger className="w-full h-12 text-base min-h-[44px]">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending" className="h-12 text-base">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-600" />
                          <span>Pending</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="in_progress" className="h-12 text-base">
                        <div className="flex items-center gap-2">
                          <Play className="h-4 w-4 text-blue-600" />
                          <span>In Progress</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed" className="h-12 text-base">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Completed</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isUpdatingStatus && (
                  <div className="flex items-center gap-2 text-blue-600 text-sm mt-8">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                    <span>Updating...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskAssignment;