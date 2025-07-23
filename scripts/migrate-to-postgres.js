#!/usr/bin/env node

// Migration script to move data from Firebase to PostgreSQL
// This script should be run after setting up the PostgreSQL database

const { getDatabaseServices } = require('../lib/database-factory');
const { v4: uuidv4 } = require('uuid');

// Get both database services (async)
let firebase, postgres;

async function initDatabases() {
  const services = await getDatabaseServices();
  firebase = services.firebase;
  postgres = services.postgres;
}

// Initialize databases before running the migration
initDatabases().then(() => {
  console.log('Databases initialized');
});

// Set this to true to actually perform the migration
// Set to false for a dry run that just logs what would be migrated
const PERFORM_MIGRATION = false;

async function migrateUsers() {
  console.log('🧑‍💼 Migrating users...');

  try {
    // This is a simplified approach - in a real migration you'd need to get all users
    // For this example, we'll just migrate users from teams
    const teams = await firebase.getAllTeams();
    const processedUserIds = new Set();

    for (const team of teams) {
      for (const member of team.members) {
        if (processedUserIds.has(member.userId)) continue;
        processedUserIds.add(member.userId);

        const userProfile = await firebase.getUserProfile(member.userId);

        if (userProfile) {
          console.log(`  - User: ${userProfile.displayName} (${userProfile.email})`);

          if (PERFORM_MIGRATION) {
            await postgres.createUserProfile(member.userId, userProfile);
          }
        }
      }
    }

    console.log(`✅ Migrated ${processedUserIds.size} users`);
  } catch (error) {
    console.error('❌ Error migrating users:', error);
  }
}

async function migrateTeams() {
  console.log('👥 Migrating teams...');

  try {
    const teams = await firebase.getAllTeams();

    for (const team of teams) {
      console.log(`  - Team: ${team.name} (${team.id})`);

      if (PERFORM_MIGRATION) {
        // Create the team
        await postgres.createTeam({
          name: team.name,
          description: team.description,
          createdBy: team.createdBy
        });

        // Add team members
        for (const member of team.members) {
          await postgres.addTeamMember(team.id, {
            userId: member.userId,
            role: member.role,
            status: member.status
          });
        }
      }
    }

    console.log(`✅ Migrated ${teams.length} teams`);
  } catch (error) {
    console.error('❌ Error migrating teams:', error);
  }
}

async function migrateMeetings() {
  console.log('📅 Migrating meetings...');

  try {
    const teams = await firebase.getAllTeams();
    let totalMeetings = 0;

    // Migrate team meetings
    for (const team of teams) {
      const meetings = await firebase.getTeamMeetings(team.id);

      for (const meeting of meetings) {
        console.log(`  - Meeting: ${meeting.title} (${meeting.id})`);

        if (PERFORM_MIGRATION) {
          await postgres.saveMeeting(meeting.createdBy, meeting, team.id);
        }

        totalMeetings++;
      }
    }

    // Migrate personal meetings (simplified approach)
    const processedUserIds = new Set();

    for (const team of teams) {
      for (const member of team.members) {
        if (processedUserIds.has(member.userId)) continue;
        processedUserIds.add(member.userId);

        const meetings = await firebase.getUserMeetings(member.userId);

        for (const meeting of meetings) {
          // Skip team meetings (already processed)
          if (meeting.teamId) continue;

          console.log(`  - Personal Meeting: ${meeting.title} (${meeting.id})`);

          if (PERFORM_MIGRATION) {
            await postgres.saveMeeting(member.userId, meeting);
          }

          totalMeetings++;
        }
      }
    }

    console.log(`✅ Migrated ${totalMeetings} meetings`);
  } catch (error) {
    console.error('❌ Error migrating meetings:', error);
  }
}

async function migrateTasks() {
  console.log('✅ Migrating tasks...');

  try {
    const teams = await firebase.getAllTeams();
    let totalTasks = 0;

    // Process all meetings to find tasks
    for (const team of teams) {
      const meetings = await firebase.getTeamMeetings(team.id);

      for (const meeting of meetings) {
        const actionItems = meeting.actionItems || [];

        for (const task of actionItems) {
          if (task.assigneeId) {
            console.log(`  - Task: ${task.description.substring(0, 30)}... (${task.id})`);

            if (PERFORM_MIGRATION) {
              await postgres.createTask({
                id: task.id,
                description: task.description,
                assigneeId: task.assigneeId,
                assigneeName: task.assigneeName,
                assignedBy: task.assignedBy || meeting.createdBy,
                assignedAt: task.assignedAt || new Date(),
                status: task.status || 'pending',
                priority: task.priority || 'medium',
                deadline: task.deadline,
                meetingId: meeting.id,
                meetingTitle: meeting.title,
                meetingDate: meeting.date,
                teamId: team.id,
                teamName: team.name,
                owner: meeting.createdBy
              });
            }

            totalTasks++;
          }
        }
      }
    }

    // Also process personal meetings
    const processedUserIds = new Set();

    for (const team of teams) {
      for (const member of team.members) {
        if (processedUserIds.has(member.userId)) continue;
        processedUserIds.add(member.userId);

        const meetings = await firebase.getUserMeetings(member.userId);

        for (const meeting of meetings) {
          // Skip team meetings (already processed)
          if (meeting.teamId) continue;

          const actionItems = meeting.actionItems || [];

          for (const task of actionItems) {
            if (task.assigneeId) {
              console.log(`  - Personal Task: ${task.description.substring(0, 30)}... (${task.id})`);

              if (PERFORM_MIGRATION) {
                await postgres.createTask({
                  id: task.id,
                  description: task.description,
                  assigneeId: task.assigneeId,
                  assigneeName: task.assigneeName,
                  assignedBy: task.assignedBy || meeting.createdBy,
                  assignedAt: task.assignedAt || new Date(),
                  status: task.status || 'pending',
                  priority: task.priority || 'medium',
                  deadline: task.deadline,
                  meetingId: meeting.id,
                  meetingTitle: meeting.title,
                  meetingDate: meeting.date,
                  owner: meeting.createdBy
                });
              }

              totalTasks++;
            }
          }
        }
      }
    }

    console.log(`✅ Migrated ${totalTasks} tasks`);
  } catch (error) {
    console.error('❌ Error migrating tasks:', error);
  }
}

async function migrateNotifications() {
  console.log('🔔 Migrating notifications...');

  try {
    const teams = await firebase.getAllTeams();
    let totalNotifications = 0;

    // Process notifications for all team members
    const processedUserIds = new Set();

    for (const team of teams) {
      for (const member of team.members) {
        if (processedUserIds.has(member.userId)) continue;
        processedUserIds.add(member.userId);

        const notifications = await firebase.getUserNotifications(member.userId);

        for (const notification of notifications) {
          console.log(`  - Notification: ${notification.title} (${notification.id})`);

          if (PERFORM_MIGRATION) {
            await postgres.createNotification({
              userId: notification.userId,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              data: notification.data
            });

            if (notification.read) {
              await postgres.markNotificationAsRead(notification.id);
            }
          }

          totalNotifications++;
        }
      }
    }

    console.log(`✅ Migrated ${totalNotifications} notifications`);
  } catch (error) {
    console.error('❌ Error migrating notifications:', error);
  }
}

async function runMigration() {
  console.log('🚀 Starting migration from Firebase to PostgreSQL...');
  console.log(`⚠️  Mode: ${PERFORM_MIGRATION ? 'LIVE MIGRATION' : 'DRY RUN (no changes will be made)'}`);

  if (!PERFORM_MIGRATION) {
    console.log('\n⚠️  This is a DRY RUN. Set PERFORM_MIGRATION = true to actually migrate data.\n');
  }

  // Migration order is important due to foreign key constraints
  await migrateUsers();
  await migrateTeams();
  await migrateMeetings();
  await migrateTasks();
  await migrateNotifications();

  console.log('\n🎉 Migration complete!');

  if (!PERFORM_MIGRATION) {
    console.log('\n⚠️  This was a DRY RUN. Set PERFORM_MIGRATION = true to actually migrate data.');
  }
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});