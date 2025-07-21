// Debug script to check task loading
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

async function debugTasks() {
  try {
    console.log('🔍 Debugging task loading issue...\n');
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Check if we can access the database
    console.log('📡 Connected to Firestore');
    
    // Get all users to find a test user
    const usersCollection = collection(db, 'artifacts/meeting-ai-mvp/users');
    const usersSnapshot = await getDocs(usersCollection);
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found in artifacts/meeting-ai-mvp/users');
      return;
    }
    
    const userId = usersSnapshot.docs[0].id;
    console.log('👤 Testing with user:', userId);
    
    // Check user meetings
    const userMeetingsCollection = collection(db, `artifacts/meeting-ai-mvp/users/${userId}/meetings`);
    const userMeetingsSnapshot = await getDocs(userMeetingsCollection);
    
    console.log(`📅 User meetings found: ${userMeetingsSnapshot.size}`);
    
    let totalActionItems = 0;
    let assignedActionItems = 0;
    
    userMeetingsSnapshot.forEach(doc => {
      const meeting = doc.data();
      console.log(`  Meeting ${doc.id}:`);
      console.log(`    Title: ${meeting.title || 'No title'}`);
      console.log(`    Action items: ${meeting.actionItems?.length || 0}`);
      
      if (meeting.actionItems && meeting.actionItems.length > 0) {
        totalActionItems += meeting.actionItems.length;
        
        meeting.actionItems.forEach((item, index) => {
          console.log(`    [${index}] "${item.description}" - assigneeId: ${item.assigneeId || 'NONE'}`);
          if (item.assigneeId === userId) {
            assignedActionItems++;
            console.log(`      ✅ This task is assigned to the user!`);
          }
        });
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total action items: ${totalActionItems}`);
    console.log(`  Assigned to user: ${assignedActionItems}`);
    
    if (assignedActionItems === 0) {
      console.log('\n❌ NO TASKS ASSIGNED TO USER - This is why tasks page is empty!');
      console.log('💡 Tasks need to have assigneeId set to the user ID to appear on tasks page');
    } else {
      console.log('\n✅ Tasks are assigned - issue might be in task service or UI');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugTasks();