// Core data types and interfaces

export interface Meeting {
  id: string;
  title: string;
  date: Date;
  summary: string;
  actionItems: ActionItem[];
  rawTranscript: string;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  owner?: string;
  assigneeId?: string;
  assigneeName?: string;
  deadline?: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  assignedBy?: string;
  assignedAt?: Date;
}

export interface User {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
  customClaims?: any;
}

export interface MeetingMetadata {
  fileName?: string;
  fileSize?: number;
  uploadedAt: Date;
  processingTime?: number;
}

export interface ProcessedMeeting {
  summary: string;
  actionItems: ActionItem[];
  rawTranscript: string;
  metadata: MeetingMetadata;
}

// API Response types
export interface AIResponse {
  summary: string;
  actionItems: Omit<ActionItem, 'id' | 'status'>[];
  confidence?: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// File processing types
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  size?: number;
  type?: string;
}

// Authentication types
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Database operation types
export interface DatabaseOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Team collaboration types
export interface Team {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  userId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  status: 'active' | 'invited' | 'inactive';
}

export interface Notification {
  id: string;
  userId: string;
  type: 'team_invitation' | 'task_assignment' | 'task_completed' | 'task_overdue' | 'meeting_assignment' | 'meeting_update';
  title: string;
  message: string;
  data: NotificationData;
  read: boolean;
  createdAt: Date;
}

export interface NotificationData {
  teamId?: string;
  teamName?: string;
  taskId?: string;
  taskDescription?: string;
  inviterId?: string;
  inviterName?: string;
  meetingId?: string;
  meetingTitle?: string;
  inviteeEmail?: string;
  inviteeDisplayName?: string;
}

export interface CreateTeamData {
  name: string;
  description: string;
  createdBy: string;
}

export interface CreateNotificationData {
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  data: NotificationData;
}

export interface TeamInvitationData {
  teamId: string;
  teamName: string;
  inviterName: string;
  inviteeEmail: string;
  inviteeDisplayName: string;
}

export interface TaskAssignmentData {
  taskId: string;
  taskDescription: string;
  assigneeId: string;
  assigneeName: string;
  meetingTitle: string;
  assignedBy: string;
}

export interface MeetingAssignmentData {
  meetingId: string;
  meetingTitle: string;
  teamId: string;
  teamName: string;
  assignedBy: string;
  assignedByName: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  preferences: {
    notifications: {
      teamInvitations: boolean;
      meetingAssignments: boolean;
      taskAssignments: boolean;
    };
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: Date;
  updatedAt: Date;
}

// Mobile-responsive UI type definitions
export interface ResponsiveBreakpoints {
  mobile: '320px - 767px';
  tablet: '768px - 1023px';
  desktop: '1024px+';
}

export interface TouchTargetSpecs {
  minimum: '44px x 44px';
  recommended: '48px x 48px';
  spacing: '8px minimum between targets';
}

export interface MobileNavigationSpecs {
  hamburgerMenu: boolean;
  bottomNavigation: boolean;
  swipeGestures: boolean;
  collapsibleSections: boolean;
}

export interface ResponsiveNavigation {
  isMobile: boolean;
  isTablet: boolean;
  showMobileMenu: boolean;
  toggleMobileMenu(): void;
}

export interface TouchOptimizedControls {
  minTouchTarget: '44px';
  swipeGestures: boolean;
  hapticFeedback: boolean;
}

export interface ResponsiveComponents {
  // Navigation
  MobileNavigation: {
    hamburgerMenu: boolean;
    slideOutDrawer: boolean;
    bottomNavigation: boolean;
  };
  
  // Dashboard Layout
  DashboardGrid: {
    mobile: '1 column';
    tablet: '2 columns';
    desktop: '3 columns';
  };
  
  // Meeting Cards
  MeetingCard: {
    mobile: 'full width, stacked content';
    tablet: 'half width, side-by-side content';
    desktop: 'third width, compact layout';
  };
  
  // Task Assignment
  TaskAssignment: {
    mobile: 'modal overlay';
    tablet: 'inline dropdown';
    desktop: 'hover dropdown';
  };
}

export interface TaskAssignmentFlow {
  automaticAssignment: {
    speakerMatching: boolean;
    previousAssignments: boolean;
    workloadBalancing: boolean;
  };
  
  manualAssignment: {
    teamMemberDropdown: boolean;
    bulkAssignment: boolean;
    reassignmentHistory: boolean;
  };
  
  notifications: {
    newAssignment: boolean;
    statusChange: boolean;
    overdueReminder: boolean;
  };
}