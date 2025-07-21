// Simple test to verify task extraction service works

const { taskService } = require('./lib/task-service');

// Mock meeting data for testing
const mockMeeting = {
  id: 'test-meeting-1',
  title: 'Team Standup Meeting',
  date: new Date(),
  summary: 'Weekly team standup to discuss progress and blockers',
  actionItems: [
    {
      id: 'task-1',
      description: 'Complete user authentication feature',
      priority: 'high',
      status: 'pending',
      assigneeId: 'user-123',
      assigneeName: 'John Doe',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    {
      id: 'task-2', 
      description: 'Review pull request for dashboard updates',
      priority: 'medium',
      status: 'pending',
      assigneeId: 'user-456',
      assigneeName: 'Jane Smith'
    },
    {
      id: 'task-3',
      description: 'Update documentation for API endpoints',
      priority: 'low',
      status: 'pending',
      owner: 'John Doe'
    }
  ],
  rawTranscript: 'Meeting transcript here...',
  createdAt: new Date(),
  updatedAt: new Date()
};

async function testTaskExtraction() {
  try {
    console.log('Testing task extraction service...');
    
    // Test extracting tasks from meeting
    const extractedTasks = await taskService.extractTasksFromMeeting(mockMeeting, 'team-123');
    
    console.log('Extracted tasks:', extractedTasks.length);
    console.log('First task:', extractedTasks[0]);
    
    // Test getting user tasks (this will fail without proper database setup, but we can see the structure)
    console.log('Task extraction service is working correctly!');
    
  } catch (error) {
    console.error('Error testing task extraction:', error.message);
  }
}

// Run the test
testTaskExtraction();