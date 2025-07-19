# Requirements Document

## Introduction

Transform the existing MeetingAI Next.js application into a fully functional production-ready MVP that processes meeting transcripts using AI and provides actionable summaries with task extraction. The application currently has a complete UI foundation but lacks the core backend integrations needed for actual functionality.

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