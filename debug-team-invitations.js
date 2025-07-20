#!/usr/bin/env node

// Debug script for team invitation issues
// Run this in your browser console to debug notification delivery

console.log('🔍 Team Invitation Debug Script');
console.log('================================');

// Function to debug team invitations
async function debugTeamInvitations() {
  try {
    // Check if we're in the right environment
    if (typeof window === 'undefined') {
      console.error('❌ This script must be run in the browser console');
      return;
    }

    // Get current user
    const authContext = window.React?.useContext || (() => null);
    console.log('👤 Checking current user...');
    
    // You'll need to manually get the current user ID
    const currentUserId = prompt('Enter the current user ID (from browser console or auth context):');
    if (!currentUserId) {
      console.error('❌ User ID is required');
      return;
    }

    console.log(`✅ Current User ID: ${currentUserId}`);

    // Check if database service is available
    if (typeof databaseService === 'undefined') {
      console.error('❌ Database service not available. Make sure you\'re on the app page.');
      return;
    }

    console.log('📊 Checking notifications...');

    // Get user notifications
    const notifications = await databaseService.getUserNotifications(currentUserId);
    console.log(`📬 Found ${notifications.length} total notifications`);

    if (notifications.length > 0) {
      console.log('📋 All notifications:');
      notifications.forEach((notification, index) => {
        console.log(`  ${index + 1}. ${notification.type} - ${notification.title}`);
        console.log(`     Created: ${notification.createdAt.toLocaleString()}`);
        console.log(`     Read: ${notification.read ? 'Yes' : 'No'}`);
        console.log(`     User ID: ${notification.userId}`);
        if (notification.type === 'team_invitation') {
          console.log(`     Team: ${notification.data?.teamName || 'Unknown'}`);
          console.log(`     Inviter: ${notification.data?.inviterName || 'Unknown'}`);
        }
        console.log('');
      });
    }

    // Check team invitations specifically
    const teamInvitations = notifications.filter(n => n.type === 'team_invitation');
    console.log(`🎯 Found ${teamInvitations.length} team invitations`);

    if (teamInvitations.length === 0) {
      console.log('🔍 No team invitations found. Let\'s check if notifications are being created...');
      
      // Check recent notifications in the database
      console.log('📊 Checking all notifications in the database...');
      
      // This requires admin access, so we'll provide instructions instead
      console.log('');
      console.log('🛠️  DEBUGGING STEPS:');
      console.log('1. Check Firebase Console > Firestore > artifacts/meeting-ai-mvp/notifications');
      console.log('2. Look for notifications with your user ID:', currentUserId);
      console.log('3. Check if notifications exist but with different user IDs');
      console.log('');
      console.log('🔍 COMMON ISSUES:');
      console.log('• User ID mismatch (notification created for different user)');
      console.log('• Notification creation failed silently');
      console.log('• Firestore rules blocking notification queries');
      console.log('• Index missing for notification queries');
    }

    // Check user teams
    console.log('👥 Checking user teams...');
    const teams = await databaseService.getUserTeams(currentUserId);
    console.log(`🏢 Found ${teams.length} teams`);

    teams.forEach((team, index) => {
      console.log(`  ${index + 1}. ${team.name}`);
      console.log(`     Members: ${team.members.length}`);
      
      const invitedMembers = team.members.filter(m => m.status === 'invited');
      if (invitedMembers.length > 0) {
        console.log(`     Invited members: ${invitedMembers.length}`);
        invitedMembers.forEach(member => {
          console.log(`       - ${member.email} (${member.displayName}) - User ID: ${member.userId}`);
        });
      }
      console.log('');
    });

    // Test notification creation
    console.log('🧪 Testing notification creation...');
    const testEmail = prompt('Enter email address to test invitation (or press Cancel to skip):');
    
    if (testEmail) {
      try {
        // Search for user
        const foundUser = await databaseService.searchUserByEmail(testEmail);
        
        if (foundUser) {
          console.log(`✅ User found: ${foundUser.email} (ID: ${foundUser.uid})`);
          
          // Test creating a notification
          const testNotification = {
            userId: foundUser.uid,
            type: 'team_invitation',
            title: 'Test Team Invitation',
            message: 'This is a test invitation to debug the system',
            data: {
              teamId: 'test-team',
              teamName: 'Test Team',
              inviterId: currentUserId,
              inviterName: 'Debug Script'
            }
          };
          
          const notificationId = await databaseService.createNotification(testNotification);
          console.log(`✅ Test notification created with ID: ${notificationId}`);
          
          // Check if the user can see it
          const updatedNotifications = await databaseService.getUserNotifications(foundUser.uid);
          const testNotificationExists = updatedNotifications.find(n => n.id === notificationId);
          
          if (testNotificationExists) {
            console.log('✅ Test notification is visible to the user');
            
            // Clean up test notification
            await databaseService.deleteNotification(notificationId);
            console.log('🧹 Test notification cleaned up');
          } else {
            console.log('❌ Test notification was created but is not visible to the user');
            console.log('   This indicates a query or permission issue');
          }
          
        } else {
          console.log(`❌ User not found: ${testEmail}`);
          console.log('   The user must sign up first before they can receive invitations');
        }
        
      } catch (error) {
        console.error('❌ Error testing notification creation:', error);
      }
    }

    console.log('');
    console.log('🎯 SUMMARY:');
    console.log(`• Current User ID: ${currentUserId}`);
    console.log(`• Total Notifications: ${notifications.length}`);
    console.log(`• Team Invitations: ${teamInvitations.length}`);
    console.log(`• User Teams: ${teams.length}`);
    
    if (teamInvitations.length === 0 && teams.some(t => t.members.some(m => m.status === 'invited'))) {
      console.log('');
      console.log('⚠️  ISSUE DETECTED:');
      console.log('   Teams have invited members but no invitation notifications found');
      console.log('   This suggests notifications are not being created or delivered properly');
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Instructions for running the script
console.log('📋 INSTRUCTIONS:');
console.log('1. Open your browser console on the Meeting AI app page');
console.log('2. Make sure you\'re signed in');
console.log('3. Copy and paste this entire script');
console.log('4. Call: debugTeamInvitations()');
console.log('');

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('🚀 Auto-running debug script...');
  // Don't auto-run, let user call it manually
  console.log('Call debugTeamInvitations() to start debugging');
} else {
  console.log('Run this script in your browser console on the Meeting AI app page');
}

// Export for manual execution
if (typeof window !== 'undefined') {
  window.debugTeamInvitations = debugTeamInvitations;
}