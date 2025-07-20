# Requirements Document

## Introduction

Enhance the existing MeetingAI Next.js application with mobile-first responsive design and comprehensive team collaboration features. The application will support team member management, task assignment, notifications, and a fully responsive interface that works seamlessly across all device sizes. This builds upon the existing MVP functionality to create a complete team-oriented meeting management platform.

## Requirements

### Requirement 1

**User Story:** As a user, I want to authenticate anonymously or with a custom token so that I can access the application securely

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL check for __initial_auth_token global variable
2. IF __initial_auth_token is available THEN the system SHALL authenticate using signInWithCustomToken
3. IF __initial_auth_token is not available THEN the system SHALL authenticate using signInAnonymously
4. WHEN authentication state changes THEN the system SHALL update userId and database instances
5. WHEN authentication fails THEN the system SHALL display appropriate error messages

### Requirement 2

**User Story:** As a user, I want to upload meeting transcript files so that they can be processed by AI

#### Acceptance Criteria

1. WHEN a user drops or selects a .txt or .md file THEN the system SHALL read the file content
2. WHEN file content is read THEN the system SHALL validate the file size is under 10MB
3. WHEN file validation passes THEN the system SHALL extract text content for processing
4. WHEN file processing fails THEN the system SHALL display clear error messages
5. WHEN file is successfully processed THEN the system SHALL trigger AI analysis

### Requirement 3

**User Story:** As a user, I want AI to analyze my meeting transcripts so that I get automated summaries and action items

#### Acceptance Criteria

1. WHEN transcript text is available THEN the system SHALL construct a Gemini API prompt
2. WHEN API call is made THEN the system SHALL include proper authentication headers
3. WHEN AI processing starts THEN the system SHALL display loading states with progress
4. WHEN AI responds THEN the system SHALL parse JSON response for summary and action items
5. WHEN AI processing fails THEN the system SHALL handle errors gracefully and retry if appropriate

### Requirement 4

**User Story:** As a user, I want my processed meetings saved so that I can access them later

#### Acceptance Criteria

1. WHEN AI processing completes successfully THEN the system SHALL save results to Firestore
2. WHEN saving to Firestore THEN the system SHALL use path /artifacts/{appId}/users/{userId}/meetings
3. WHEN saving data THEN the system SHALL include raw transcript, summary, and action items
4. WHEN data is saved THEN the system SHALL update the dashboard with the new meeting
5. WHEN Firestore operations fail THEN the system SHALL handle errors and inform the user

### Requirement 5

**User Story:** As a user, I want to view my past meetings so that I can track my meeting history

#### Acceptance Criteria

1. WHEN dashboard loads THEN the system SHALL fetch user's meetings from Firestore
2. WHEN meetings are fetched THEN the system SHALL display them in chronological order
3. WHEN meeting list updates THEN the system SHALL use real-time listeners (onSnapshot)
4. WHEN no meetings exist THEN the system SHALL display appropriate empty state
5. WHEN meeting data loads THEN the system SHALL show meeting titles, dates, and action item counts

### Requirement 6

**User Story:** As a user, I want to view detailed meeting reports so that I can see summaries and action items

#### Acceptance Criteria

1. WHEN a user clicks "View Report" THEN the system SHALL navigate to the report page
2. WHEN report page loads THEN the system SHALL fetch meeting data by ID from Firestore
3. WHEN meeting data is loaded THEN the system SHALL display formatted summary and action items
4. WHEN action items are displayed THEN the system SHALL show owners, deadlines, and priorities
5. WHEN report fails to load THEN the system SHALL display error state with retry option

### Requirement 7

**User Story:** As a user, I want to export meeting reports so that I can share them with others

#### Acceptance Criteria

1. WHEN user clicks export THEN the system SHALL generate markdown format report
2. WHEN export is generated THEN the system SHALL include meeting summary and all action items
3. WHEN export is ready THEN the system SHALL trigger file download
4. WHEN export includes action items THEN the system SHALL format with owners and deadlines
5. WHEN export fails THEN the system SHALL display error message

### Requirement 8

**User Story:** As a developer, I want proper environment configuration so that the application can be deployed

#### Acceptance Criteria

1. WHEN application starts THEN the system SHALL load Firebase configuration from environment
2. WHEN API calls are made THEN the system SHALL use Gemini API key from environment
3. WHEN configuration is missing THEN the system SHALL display clear setup instructions
4. WHEN in development THEN the system SHALL use local environment variables
5. WHEN in production THEN the system SHALL use secure environment variable management

### Requirement 9

**User Story:** As a user, I want the application to be fully responsive and mobile-first so that I can use it seamlessly on any device

#### Acceptance Criteria

1. WHEN the application loads on mobile devices THEN the system SHALL display a mobile-optimized layout
2. WHEN the navbar is displayed on mobile THEN the system SHALL use a collapsible hamburger menu
3. WHEN content is displayed THEN the system SHALL adapt to screen sizes from 320px to 4K displays
4. WHEN touch interactions occur THEN the system SHALL provide appropriate touch targets (minimum 44px)
5. WHEN the application is used on tablets THEN the system SHALL optimize layout for tablet-specific interactions

### Requirement 10

**User Story:** As a user, I want to create and manage teams so that I can collaborate with colleagues on meeting management

#### Acceptance Criteria

1. WHEN a user creates a team THEN the system SHALL save team information to Firestore
2. WHEN team information is saved THEN the system SHALL include team name, description, and creator
3. WHEN a user views teams THEN the system SHALL display all teams they belong to
4. WHEN a user leaves a team THEN the system SHALL remove them from team membership
5. WHEN a team is deleted THEN the system SHALL remove all associated data and memberships

### Requirement 11

**User Story:** As a team admin, I want to search for team members by email and assign them names so that I can build my team roster

#### Acceptance Criteria

1. WHEN searching for team members THEN the system SHALL allow email-based search
2. WHEN a team member is found THEN the system SHALL allow assigning a display name
3. WHEN a display name is assigned THEN the system SHALL save the mapping in team member data
4. WHEN transcript processing occurs THEN the system SHALL match speaker names to team members
5. WHEN team member data is updated THEN the system SHALL reflect changes across all team interfaces

### Requirement 12

**User Story:** As a user, I want to receive notifications when someone adds me to their team so that I can accept or decline the invitation

#### Acceptance Criteria

1. WHEN a user is invited to a team THEN the system SHALL create a notification record
2. WHEN a notification is created THEN the system SHALL display it in the user's notification center
3. WHEN a user views a team invitation THEN the system SHALL show team details and inviter information
4. WHEN a user accepts an invitation THEN the system SHALL add them to the team and remove the notification
5. WHEN a user declines an invitation THEN the system SHALL remove the notification without adding to team

### Requirement 13

**User Story:** As a team member, I want to see meeting transcripts and tasks assigned to me so that I can track my responsibilities

#### Acceptance Criteria

1. WHEN a meeting is processed THEN the system SHALL automatically assign tasks based on speaker names
2. WHEN tasks are assigned THEN the system SHALL match speaker names to team member display names
3. WHEN a user views their dashboard THEN the system SHALL show meetings and tasks assigned to them
4. WHEN task assignment is incorrect THEN the system SHALL allow manual reassignment using team member list
5. WHEN tasks are reassigned THEN the system SHALL update the assignee and notify the new owner

### Requirement 14

**User Story:** As a user, I want an enhanced dashboard with team functionality so that I can manage both personal and team meetings

#### Acceptance Criteria

1. WHEN dashboard loads THEN the system SHALL display both personal and team meetings
2. WHEN team meetings are shown THEN the system SHALL indicate which team they belong to
3. WHEN viewing team meetings THEN the system SHALL show task assignments for all team members
4. WHEN managing tasks THEN the system SHALL provide assignment controls for team admins
5. WHEN team data updates THEN the system SHALL reflect changes in real-time across all team members

### Requirement 15

**User Story:** As a user, I want task management features with assignment capabilities so that I can track and delegate meeting action items

#### Acceptance Criteria

1. WHEN viewing action items THEN the system SHALL display current assignee and assignment controls
2. WHEN clicking assign button THEN the system SHALL show team member selection dropdown
3. WHEN reassigning a task THEN the system SHALL update the assignee and send notification
4. WHEN task status changes THEN the system SHALL update completion tracking
5. WHEN viewing task lists THEN the system SHALL filter by assignee, status, and due date