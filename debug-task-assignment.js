// Debug script to test task assignment
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function debugTaskAssignment() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔍 Debugging task assignment...\n');
    
    // Find a user with meetings
    const usersSnapshot = await getDocs(collection(db, 'artifacts/meeting-ai-mvp/users'));
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found');
      return;
    }
    
    let foundMeetingWithTasks = false;
    let testUserId = null;
    let testMeetingId = null;
    let testTaskId = null;
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`👤 Checking user: ${userId}`);
      
      try {
        const meetingsSnapshot = await getDocs(collection(db, `artifacts/meeting-ai-mvp/users/${userId}/meetings`));
        
        for (const meetingDoc of meetingsSnapshot.docs) {
          const meeting = meetingDoc.data();
          
          if (meeting.actionItems && meeting.actionItems.length > 0) {
            console.log(`  📅 Meeting: ${meeting.title || 'No title'}`);
            console.log(`    Action items: ${meeting.actionItems.length}`);
            
            meeting.actionItems.forEach((item, index) => {
              console.log(`      [${index}] ${item.description}`);
              console.log(`          ID: ${item.id}`);
              console.log(`          assigneeId: ${item.assigneeId || 'NONE'}`);
              console.log(`          status: ${item.status || 'NONE'}`);
              
              if (!foundMeetingWithTasks) {
                foundMeetingWithTasks = true;
                testUserId = userId;
                testMeetingId = meetingDoc.id;
                testTaskId = item.id;
              }
            });
          }
        }
      } catch (error) {
        console.log(`    Error: ${error.message}`);
      }
    }
    
    if (!foundMeetingWithTasks) {
      console.log('❌ No meetings with action items found');
      return;
    }
    
    console.log(`\n🧪 Testing task assignment...`);
    console.log(`  User: ${testUserId}`);
    console.log(`  Meeting: ${testMeetingId}`);
    console.log(`  Task: ${testTaskId}`);
    
    // Try to assign the task to the same user (for testing)
    const meetingRef = doc(db, `artifacts/meeting-ai-mvp/users/${testUserId}/meetings/${testMeetingId}`);
    const meetingDoc = await getDocs(collection(db, `artifacts/meeting-ai-mvp/users/${testUserId}/meetings`));
    
    // Find the meeting and update the task
    for (const mDoc of meetingDoc.docs) {
      if (mDoc.id === testMeetingId) {
        const meeting = mDoc.data();
        const updatedActionItems = meeting.actionItems.map(item => {
          if (item.id === testTaskId) {
            return {
              ...item,
              assigneeId: testUserId,
              assigneeName: 'Test User',
              assignedBy: testUserId,
              assignedAt: new Date()
            };
          }
          return item;
        });
        
        await updateDoc(meetingRef, {
          actionItems: updatedActionItems,
          updatedAt: new Date()
        });
        
        console.log('✅ Task assignment test completed');
        console.log('   Task should now have assigneeId set');
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugTaskAssignment();