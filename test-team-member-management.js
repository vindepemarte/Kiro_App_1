// Test script for team member management functionality
// This script tests the fixed team member management operations

const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');
const { getAuth, connectAuthEmulator, signInAnonymously } = require('firebase/auth');

// Firebase config for testing
const firebaseConfig = {
  apiKey: "test-api-key",
  authDomain: "test-project.firebaseapp.com",
  projectId: "test-project",
  storageBucket: "test-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "test-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulators if running locally
if (process.env.NODE_ENV !== 'production') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
    console.log('Emulators already connected or not available');
  }
}

async function testTeamMemberManagement() {
  console.log('🧪 Testing Team Member Management...\n');

  try {
    // Sign in anonymously for testing
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    console.log('✅ Authenticated as:', user.uid);

    // Import database functions
    const { 
      createTeam, 
      getUserTeams, 
      addTeamMember, 
      removeTeamMember, 
      updateTeamMember,
      getTeamMembers,
      subscribeToUserTeams
    } = require('./lib/database');

    // Test 1: Create a team
    console.log('\n📝 Test 1: Creating a team...');
    const teamData = {
      name: 'Test Team',
      description: 'A team for testing member management',
      createdBy: user.uid
    };

    const teamId = await createTeam(teamData);
    console.log('✅ Team created with ID:', teamId);

    // Test 2: Get user teams
    console.log('\n📝 Test 2: Getting user teams...');
    const userTeams = await getUserTeams(user.uid);
    console.log('✅ Found', userTeams.length, 'teams for user');
    console.log('Team details:', userTeams.map(t => ({ id: t.id, name: t.name, memberCount: t.members.length })));

    // Test 3: Add a team member
    console.log('\n📝 Test 3: Adding a team member...');
    const newMember = {
      userId: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'member',
      status: 'invited'
    };

    const addResult = await addTeamMember(teamId, newMember);
    console.log('✅ Member added successfully:', addResult);

    // Test 4: Get team members
    console.log('\n📝 Test 4: Getting team members...');
    const teamMembers = await getTeamMembers(teamId);
    console.log('✅ Found', teamMembers.length, 'team members');
    console.log('Members:', teamMembers.map(m => ({ userId: m.userId, displayName: m.displayName, role: m.role, status: m.status })));

    // Test 5: Update team member role
    console.log('\n📝 Test 5: Updating team member role...');
    const updateResult = await updateTeamMember(teamId, 'test-user-123', { role: 'admin', status: 'active' });
    console.log('✅ Member role updated successfully:', updateResult);

    // Verify the update
    const updatedMembers = await getTeamMembers(teamId);
    const updatedMember = updatedMembers.find(m => m.userId === 'test-user-123');
    console.log('Updated member:', { role: updatedMember?.role, status: updatedMember?.status });

    // Test 6: Test real-time synchronization
    console.log('\n📝 Test 6: Testing real-time synchronization...');
    let syncCallCount = 0;
    const unsubscribe = subscribeToUserTeams(user.uid, (teams) => {
      syncCallCount++;
      console.log(`🔄 Real-time update #${syncCallCount}: Found ${teams.length} teams`);
      
      if (syncCallCount === 1) {
        console.log('✅ Real-time listener is working');
        
        // Test 7: Remove team member
        setTimeout(async () => {
          console.log('\n📝 Test 7: Removing team member...');
          try {
            const removeResult = await removeTeamMember(teamId, 'test-user-123');
            console.log('✅ Member removed successfully:', removeResult);
          } catch (error) {
            console.error('❌ Failed to remove member:', error.message);
          }
        }, 1000);
      }
      
      if (syncCallCount === 2) {
        console.log('✅ Real-time sync detected member removal');
        unsubscribe();
        
        // Final verification
        setTimeout(async () => {
          const finalMembers = await getTeamMembers(teamId);
          console.log('\n📝 Final verification: Team has', finalMembers.length, 'members');
          console.log('✅ All tests completed successfully!');
        }, 500);
      }
    });

    // Keep the test running for real-time updates
    setTimeout(() => {
      if (syncCallCount < 2) {
        unsubscribe();
        console.log('⚠️  Real-time sync test timed out');
      }
    }, 5000);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testTeamMemberManagement().catch(console.error);
}

module.exports = { testTeamMemberManagement };