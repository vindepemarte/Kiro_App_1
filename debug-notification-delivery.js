// Debug script to check why notifications aren't being delivered to users
// Run this in the browser console of the invited user

console.log('🔍 Notification Delivery Debug Script');
console.log('====================================');

async function debugNotificationDelivery() {
  try {
    // Get current user info
    const currentUser = window.auth?.currentUser || null;
    if (!currentUser) {
      console.error('❌ No user signed in');
      return;
    }

    const userId = currentUser.uid;
    const userEmail = currentUser.email;
    
    console.log('👤 Current User:');
    console.log(`   ID: ${userId}`);
    console.log(`   Email: ${userEmail}`);
    console.log('');

    // Check if database service is available
    if (typeof databaseService === 'undefined') {
      console.error('❌ Database service not available');
      console.log('Make sure you\'re on the app page and try: window.databaseService');
      return;
    }

    console.log('📊 Checking notifications via database service...');
    
    try {
      const notifications = await databaseService.getUserNotifications(userId);
      console.log(`📬 Found ${notifications.length} notifications for user ${userId}`);
      
      if (notifications.length > 0) {
        console.log('📋 All notifications:');
        notifications.forEach((notification, index) => {
          console.log(`  ${index + 1}. [${notification.type}] ${notification.title}`);
          console.log(`     ID: ${notification.id}`);
          console.log(`     User ID: ${notification.userId}`);
          console.log(`     Created: ${notification.createdAt.toLocaleString()}`);
          console.log(`     Read: ${notification.read ? 'Yes' : 'No'}`);
          if (notification.type === 'team_invitation') {
            console.log(`     Team: ${notification.data?.teamName || 'Unknown'}`);
            console.log(`     Inviter: ${notification.data?.inviterName || 'Unknown'}`);
          }
          console.log('');
        });

        const teamInvitations = notifications.filter(n => n.type === 'team_invitation');
        console.log(`🎯 Team invitations: ${teamInvitations.length}`);
        
        if (teamInvitations.length > 0) {
          console.log('✅ Team invitations found in database!');
          console.log('   The issue is likely in the UI or real-time updates');
        }
      } else {
        console.log('❌ No notifications found for this user');
        console.log('   Let\'s check if notifications exist with different user IDs...');
      }
      
    } catch (queryError) {
      console.error('❌ Error querying notifications:', queryError);
      console.log('   This might be a Firestore rules or index issue');
    }

    // Check notification service
    console.log('🔧 Testing notification service...');
    
    try {
      if (typeof notificationService !== 'undefined') {
        const serviceNotifications = await notificationService.getUserNotifications(userId);
        console.log(`📬 Notification service returned ${serviceNotifications.length} notifications`);
        
        if (serviceNotifications.length !== notifications.length) {
          console.log('⚠️  Mismatch between database service and notification service results');
        }
      } else {
        console.log('⚠️  Notification service not available');
      }
    } catch (serviceError) {
      console.error('❌ Notification service error:', serviceError);
    }

    // Test real-time subscription
    console.log('📡 Testing real-time subscription...');
    
    try {
      let subscriptionCallCount = 0;
      const unsubscribe = databaseService.subscribeToUserNotifications(userId, (realtimeNotifications) => {
        subscriptionCallCount++;
        console.log(`📡 Real-time update #${subscriptionCallCount}: ${realtimeNotifications.length} notifications`);
        
        if (subscriptionCallCount === 1) {
          // First call - initial data
          if (realtimeNotifications.length > 0) {
            console.log('✅ Real-time subscription is working');
            const teamInvites = realtimeNotifications.filter(n => n.type === 'team_invitation');
            if (teamInvites.length > 0) {
              console.log(`✅ Real-time subscription includes ${teamInvites.length} team invitations`);
            }
          } else {
            console.log('❌ Real-time subscription returns no notifications');
          }
          
          // Clean up subscription after first call
          setTimeout(() => {
            unsubscribe();
            console.log('🧹 Real-time subscription cleaned up');
          }, 1000);
        }
      });
      
    } catch (subscriptionError) {
      console.error('❌ Real-time subscription error:', subscriptionError);
    }

    // Check Firestore directly (if possible)
    console.log('🔥 Checking Firestore collection directly...');
    
    try {
      // This requires Firebase to be available
      if (typeof firebase !== 'undefined' || typeof window.firebase !== 'undefined') {
        const db = firebase?.firestore?.() || window.firebase?.firestore?.();
        if (db) {
          const notificationsRef = db.collection('artifacts/meeting-ai-mvp/notifications');
          const query = notificationsRef.where('userId', '==', userId).orderBy('createdAt', 'desc');
          
          const snapshot = await query.get();
          console.log(`🔥 Firestore direct query: ${snapshot.size} documents`);
          
          if (snapshot.size > 0) {
            console.log('✅ Notifications exist in Firestore');
            snapshot.forEach((doc, index) => {
              const data = doc.data();
              console.log(`  ${index + 1}. ${data.type} - ${data.title} (ID: ${doc.id})`);
            });
          } else {
            console.log('❌ No notifications found in Firestore for this user');
          }
        }
      } else {
        console.log('⚠️  Firebase not available for direct query');
      }
    } catch (firestoreError) {
      console.error('❌ Firestore direct query error:', firestoreError);
      if (firestoreError.message?.includes('index')) {
        console.log('🚨 INDEX ISSUE DETECTED!');
        console.log('   You need to create the Firestore index for notifications');
        console.log('   Check the browser console for the index creation link');
      }
    }

    // Summary
    console.log('');
    console.log('📋 SUMMARY:');
    console.log(`• User ID: ${userId}`);
    console.log(`• Email: ${userEmail}`);
    console.log(`• Database query successful: ${notifications ? 'Yes' : 'No'}`);
    console.log(`• Notifications found: ${notifications?.length || 0}`);
    console.log(`• Team invitations: ${notifications?.filter(n => n.type === 'team_invitation').length || 0}`);

    if (notifications && notifications.length > 0) {
      console.log('');
      console.log('✅ NOTIFICATIONS EXIST IN DATABASE');
      console.log('   The issue is likely in the UI component or real-time updates');
      console.log('   Check the NotificationCenter component');
    } else {
      console.log('');
      console.log('❌ NO NOTIFICATIONS FOUND');
      console.log('   Possible causes:');
      console.log('   • User ID mismatch');
      console.log('   • Firestore index missing');
      console.log('   • Firestore rules blocking query');
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Make function available globally
if (typeof window !== 'undefined') {
  window.debugNotificationDelivery = debugNotificationDelivery;
}

console.log('📋 INSTRUCTIONS:');
console.log('1. Sign in as the user who should receive notifications');
console.log('2. Open browser console (F12)');
console.log('3. Paste this script');
console.log('4. Run: debugNotificationDelivery()');
console.log('');
console.log('This will tell us exactly why notifications aren\'t showing up!');