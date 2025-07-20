// Test script to validate Firestore security rules
// This script tests the key security rule scenarios

const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

// Test configuration
const testConfig = {
  apiKey: "test-key",
  authDomain: "test-project.firebaseapp.com",
  projectId: "test-project",
  storageBucket: "test-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "test-app-id"
};

async function testFirestoreRules() {
  console.log('🔥 Testing Firestore Security Rules...\n');
  
  try {
    // Initialize Firebase
    const app = initializeApp(testConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    
    // Connect to emulator if available
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('📡 Connected to Firestore emulator');
    } catch (error) {
      console.log('⚠️  Firestore emulator not available, using production rules validation');
    }
    
    // Sign in anonymously for testing
    await signInAnonymously(auth);
    const user = auth.currentUser;
    console.log(`👤 Signed in as: ${user.uid}\n`);
    
    // Test 1: User can access their own meetings
    console.log('Test 1: User meeting access');
    try {
      const meetingRef = doc(db, `artifacts/test-app/users/${user.uid}/meetings/test-meeting`);
      await setDoc(meetingRef, {
        title: 'Test Meeting',
        date: new Date(),
        summary: 'Test summary',
        createdAt: new Date()
      });
      
      const meetingDoc = await getDoc(meetingRef);
      console.log('✅ User can read/write their own meetings');
    } catch (error) {
      console.log('❌ User meeting access failed:', error.message);
    }
    
    // Test 2: User can create teams
    console.log('\nTest 2: Team creation');
    try {
      const teamRef = doc(db, `artifacts/test-app/teams/test-team`);
      await setDoc(teamRef, {
        name: 'Test Team',
        description: 'Test team description',
        createdBy: user.uid,
        members: [{
          userId: user.uid,
          email: 'test@example.com',
          displayName: 'Test User',
          role: 'admin',
          joinedAt: new Date(),
          status: 'active'
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const teamDoc = await getDoc(teamRef);
      console.log('✅ User can create teams');
    } catch (error) {
      console.log('❌ Team creation failed:', error.message);
    }
    
    // Test 3: User can access their notifications
    console.log('\nTest 3: Notification access');
    try {
      const notificationRef = doc(db, `artifacts/test-app/notifications/test-notification`);
      await setDoc(notificationRef, {
        userId: user.uid,
        type: 'team_invitation',
        title: 'Test Notification',
        message: 'Test notification message',
        data: {
          teamId: 'test-team',
          teamName: 'Test Team'
        },
        read: false,
        actionable: true,
        createdAt: new Date()
      });
      
      // Test querying notifications
      const notificationsQuery = query(
        collection(db, `artifacts/test-app/notifications`),
        where('userId', '==', user.uid)
      );
      const notificationsSnapshot = await getDocs(notificationsQuery);
      console.log('✅ User can access their notifications');
    } catch (error) {
      console.log('❌ Notification access failed:', error.message);
    }
    
    // Test 4: User profile access
    console.log('\nTest 4: User profile access');
    try {
      const profileRef = doc(db, `artifacts/test-app/userProfiles/${user.uid}`);
      await setDoc(profileRef, {
        userId: user.uid,
        email: 'test@example.com',
        displayName: 'Test User',
        preferences: {
          notifications: {
            teamInvitations: true,
            meetingAssignments: true,
            taskAssignments: true
          },
          theme: 'light'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const profileDoc = await getDoc(profileRef);
      console.log('✅ User can access their profile');
    } catch (error) {
      console.log('❌ User profile access failed:', error.message);
    }
    
    console.log('\n🎉 Firestore rules validation completed!');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testFirestoreRules().catch(console.error);
}

module.exports = { testFirestoreRules };