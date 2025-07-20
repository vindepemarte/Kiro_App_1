// Debug script to test database service initialization
console.log('Starting database debug...');

try {
  // Test if we can import the database service
  console.log('Importing database service...');
  const { databaseService } = require('./lib/database.ts');
  console.log('Database service imported:', typeof databaseService);
  
  // Test if the service has the expected methods
  console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(databaseService)));
  
  // Test if we can access the private methods (should fail)
  console.log('Testing getTeamsPath access...');
  try {
    const path = databaseService.getTeamsPath();
    console.log('getTeamsPath result:', path);
  } catch (error) {
    console.log('Expected error accessing private method:', error.message);
  }
  
  // Test createTeam method exists
  console.log('createTeam method exists:', typeof databaseService.createTeam);
  
} catch (error) {
  console.error('Import error:', error);
}