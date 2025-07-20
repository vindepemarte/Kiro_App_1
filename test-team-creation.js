// Simple test script to verify team creation functionality
const { databaseService } = require('./lib/database');

async function testTeamCreation() {
  try {
    console.log('Testing team creation...');
    
    // Test data
    const teamData = {
      name: 'Test Team',
      description: 'A test team for debugging',
      createdBy: 'test-user-123'
    };
    
    console.log('Team data:', teamData);
    
    // Try to create team
    const teamId = await databaseService.createTeam(teamData);
    console.log('Team created successfully with ID:', teamId);
    
  } catch (error) {
    console.error('Team creation failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

// Run the test
testTeamCreation();