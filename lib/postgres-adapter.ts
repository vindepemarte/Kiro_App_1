import { Pool } from 'pg';
import { 
  DatabaseService, 
  Meeting, 
  ProcessedMeeting, 
  Team, 
  TeamMember, 
  User, 
  UserProfile, 
  ActionItem, 
  CreateTeamData, 
  Notification, 
  CreateNotificationData 
} from './database';
import { v4 as uuidv4 } from 'uuid';

// Type for unsubscribe function
type Unsubscribe = () => void;

// Connection pool will be created in the constructor

// Helper to convert database rows to application objects
const rowToMeeting = (row: any): Meeting => {
  return {
    id: row.id,
    title: row.title,
    date: new Date(row.date),
    summary: row.summary,
    transcript: row.transcript,
    rawTranscript: row.raw_transcript,
    actionItems: JSON.parse(row.action_items || '[]'),
    keyPoints: JSON.parse(row.key_points || '[]'),
    teamId: row.team_id,
    createdBy: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at),
  };
};

const rowToTeam = (row: any): Team => {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at),
    members: [],
  };
};

const rowToUser = (row: any): User => {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
  };
};

const rowToUserProfile = (row: any): UserProfile => {
  return {
    userId: row.id,
    displayName: row.display_name,
    email: row.email,
    photoURL: row.photo_url,
    createdAt: new Date(row.created_at),
  };
};

const rowToNotification = (row: any): Notification => {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    data: row.data,
    createdAt: new Date(row.created_at),
  };
};

// This adapter implements the same interface as your Firebase service
// but uses PostgreSQL under the hood
export class PostgresAdapter implements DatabaseService {
  private pool: Pool;
  
  constructor() {
    // Check if we're on the server
    if (typeof window !== 'undefined') {
      throw new Error('PostgreSQL adapter can only be used on the server');
    }
    
    console.log('Initializing PostgreSQL adapter');
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable not set');
      throw new Error('DATABASE_URL environment variable not set');
    }
    
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    // Test the connection
    this.pool.query('SELECT NOW()')
      .then(() => console.log('PostgreSQL connection successful'))
      .catch(err => console.error('PostgreSQL connection error:', err));
  }
  // Meeting operations
  async saveMeeting(userId: string, meeting: ProcessedMeeting, teamId?: string): Promise<string> {
    const meetingId = meeting.id || uuidv4();
    
    await this.pool.query(
      `INSERT INTO meetings (
        id, title, date, summary, transcript, raw_transcript, 
        action_items, key_points, team_id, user_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        title = $2,
        date = $3,
        summary = $4,
        transcript = $5,
        raw_transcript = $6,
        action_items = $7,
        key_points = $8,
        team_id = $9,
        updated_at = NOW()`,
      [
        meetingId,
        meeting.title,
        meeting.date,
        meeting.summary,
        meeting.transcript,
        meeting.rawTranscript,
        JSON.stringify(meeting.actionItems || []),
        JSON.stringify(meeting.keyPoints || []),
        teamId || null,
        userId,
        new Date()
      ]
    );
    
    return meetingId;
  }

  async getUserMeetings(userId: string): Promise<Meeting[]> {
    const result = await this.pool.query(
      'SELECT * FROM meetings WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    );
    
    return result.rows.map(rowToMeeting);
  }

  async getMeetingById(meetingId: string, userId: string): Promise<Meeting | null> {
    const result = await this.pool.query(
      'SELECT * FROM meetings WHERE id = $1 AND (user_id = $2 OR team_id IN (SELECT team_id FROM team_members WHERE user_id = $2))',
      [meetingId, userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return rowToMeeting(result.rows[0]);
  }

  async updateMeeting(meetingId: string, userId: string, updates: Partial<Meeting>): Promise<boolean> {
    // Build dynamic update query based on provided fields
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    
    if (updates.date !== undefined) {
      updateFields.push(`date = $${paramIndex++}`);
      values.push(updates.date);
    }
    
    if (updates.summary !== undefined) {
      updateFields.push(`summary = $${paramIndex++}`);
      values.push(updates.summary);
    }
    
    if (updates.transcript !== undefined) {
      updateFields.push(`transcript = $${paramIndex++}`);
      values.push(updates.transcript);
    }
    
    if (updates.rawTranscript !== undefined) {
      updateFields.push(`raw_transcript = $${paramIndex++}`);
      values.push(updates.rawTranscript);
    }
    
    if (updates.actionItems !== undefined) {
      updateFields.push(`action_items = $${paramIndex++}`);
      values.push(JSON.stringify(updates.actionItems));
    }
    
    if (updates.keyPoints !== undefined) {
      updateFields.push(`key_points = $${paramIndex++}`);
      values.push(JSON.stringify(updates.keyPoints));
    }
    
    if (updates.teamId !== undefined) {
      updateFields.push(`team_id = $${paramIndex++}`);
      values.push(updates.teamId);
    }
    
    updateFields.push(`updated_at = NOW()`);
    
    if (updateFields.length === 0) {
      return true; // Nothing to update
    }
    
    // Add meeting ID and user ID to values
    values.push(meetingId);
    values.push(userId);
    
    const result = await this.pool.query(
      `UPDATE meetings SET ${updateFields.join(', ')} 
       WHERE id = $${paramIndex++} AND (user_id = $${paramIndex} OR team_id IN (SELECT team_id FROM team_members WHERE user_id = $${paramIndex}))`,
      values
    );
    
    return result.rowCount > 0;
  }

  async deleteMeeting(meetingId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM meetings WHERE id = $1 AND user_id = $2',
      [meetingId, userId]
    );
    
    return result.rowCount > 0;
  }

  // Team operations
  async getTeamMeetings(teamId: string): Promise<Meeting[]> {
    const result = await this.pool.query(
      'SELECT * FROM meetings WHERE team_id = $1 ORDER BY date DESC',
      [teamId]
    );
    
    return result.rows.map(rowToMeeting);
  }

  async createTeam(teamData: CreateTeamData): Promise<string> {
    const teamId = uuidv4();
    
    await this.pool.query(
      `INSERT INTO teams (id, name, description, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [teamId, teamData.name, teamData.description || null, teamData.createdBy, new Date()]
    );
    
    // Add creator as team member
    await this.pool.query(
      `INSERT INTO team_members (team_id, user_id, role, status, joined_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [teamId, teamData.createdBy, 'admin', 'active', new Date()]
    );
    
    return teamId;
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const result = await this.pool.query(
      `SELECT t.* FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1 AND tm.status = 'active'
       ORDER BY t.name`,
      [userId]
    );
    
    const teams = result.rows.map(rowToTeam);
    
    // Get members for each team
    for (const team of teams) {
      const membersResult = await this.pool.query(
        `SELECT tm.*, u.display_name, u.email
         FROM team_members tm
         JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = $1`,
        [team.id]
      );
      
      team.members = membersResult.rows.map(row => ({
        userId: row.user_id,
        role: row.role,
        status: row.status,
        displayName: row.display_name,
        email: row.email,
        joinedAt: new Date(row.joined_at)
      }));
    }
    
    return teams;
  }

  async getAllTeams(): Promise<Team[]> {
    const result = await this.pool.query('SELECT * FROM teams ORDER BY name');
    return result.rows.map(rowToTeam);
  }

  async getTeamById(teamId: string): Promise<Team | null> {
    const result = await this.pool.query('SELECT * FROM teams WHERE id = $1', [teamId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const team = rowToTeam(result.rows[0]);
    
    // Get team members
    const membersResult = await this.pool.query(
      `SELECT tm.*, u.display_name, u.email
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1`,
      [teamId]
    );
    
    team.members = membersResult.rows.map(row => ({
      userId: row.user_id,
      role: row.role,
      status: row.status,
      displayName: row.display_name,
      email: row.email,
      joinedAt: new Date(row.joined_at)
    }));
    
    return team;
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<boolean> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    
    updateFields.push(`updated_at = NOW()`);
    
    if (updateFields.length === 0) {
      return true; // Nothing to update
    }
    
    values.push(teamId);
    
    const result = await this.pool.query(
      `UPDATE teams SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    
    return result.rowCount > 0;
  }

  async deleteTeam(teamId: string, userId: string): Promise<boolean> {
    // Check if user is team admin
    const adminCheck = await this.pool.query(
      `SELECT * FROM team_members 
       WHERE team_id = $1 AND user_id = $2 AND role = 'admin'`,
      [teamId, userId]
    );
    
    if (adminCheck.rows.length === 0) {
      return false;
    }
    
    // Delete team members first (foreign key constraint)
    await this.pool.query('DELETE FROM team_members WHERE team_id = $1', [teamId]);
    
    // Delete team
    const result = await this.pool.query('DELETE FROM teams WHERE id = $1', [teamId]);
    
    return result.rowCount > 0;
  }

  // Team member operations
  async addTeamMember(teamId: string, member: Omit<TeamMember, 'joinedAt'>): Promise<boolean> {
    try {
      await this.pool.query(
        `INSERT INTO team_members (team_id, user_id, role, status, joined_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (team_id, user_id) DO UPDATE SET
         role = $3,
         status = $4`,
        [teamId, member.userId, member.role || 'member', member.status || 'active', new Date()]
      );
      
      return true;
    } catch (error) {
      console.error('Error adding team member:', error);
      return false;
    }
  }

  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );
    
    return result.rowCount > 0;
  }

  async updateTeamMember(teamId: string, userId: string, updates: Partial<TeamMember>): Promise<boolean> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.role !== undefined) {
      updateFields.push(`role = $${paramIndex++}`);
      values.push(updates.role);
    }
    
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    
    if (updateFields.length === 0) {
      return true; // Nothing to update
    }
    
    values.push(teamId);
    values.push(userId);
    
    const result = await this.pool.query(
      `UPDATE team_members SET ${updateFields.join(', ')} 
       WHERE team_id = $${paramIndex++} AND user_id = $${paramIndex}`,
      values
    );
    
    return result.rowCount > 0;
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const result = await this.pool.query(
      `SELECT tm.*, u.display_name, u.email
       FROM team_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = $1`,
      [teamId]
    );
    
    return result.rows.map(row => ({
      userId: row.user_id,
      role: row.role,
      status: row.status,
      displayName: row.display_name,
      email: row.email,
      joinedAt: new Date(row.joined_at)
    }));
  }

  // User operations
  async searchUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return rowToUser(result.rows[0]);
  }

  async createUserProfile(userId: string, profile: UserProfile): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, email, display_name, photo_url, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
       email = $2,
       display_name = $3,
       photo_url = $4`,
      [userId, profile.email, profile.displayName, profile.photoURL, new Date()]
    );
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.displayName !== undefined) {
      updateFields.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }
    
    if (updates.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    
    if (updates.photoURL !== undefined) {
      updateFields.push(`photo_url = $${paramIndex++}`);
      values.push(updates.photoURL);
    }
    
    if (updateFields.length === 0) {
      return; // Nothing to update
    }
    
    values.push(userId);
    
    await this.pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return rowToUserProfile(result.rows[0]);
  }

  // Task operations
  async assignTask(meetingId: string, taskId: string, assigneeId: string, assignedBy: string, meetingOwnerId: string): Promise<boolean> {
    try {
      // Get the meeting first
      const meetingResult = await this.pool.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
      
      if (meetingResult.rows.length === 0) {
        return false;
      }
      
      const meeting = rowToMeeting(meetingResult.rows[0]);
      
      // Find the task in action items
      const actionItems = meeting.actionItems || [];
      const taskIndex = actionItems.findIndex(item => item.id === taskId);
      
      if (taskIndex === -1) {
        return false;
      }
      
      // Get assignee info
      const assigneeResult = await this.pool.query('SELECT * FROM users WHERE id = $1', [assigneeId]);
      const assigneeName = assigneeResult.rows.length > 0 ? assigneeResult.rows[0].display_name : 'Unknown User';
      
      // Update the task
      actionItems[taskIndex] = {
        ...actionItems[taskIndex],
        assigneeId,
        assigneeName,
        assignedBy,
        assignedAt: new Date()
      };
      
      // Update the meeting
      await this.pool.query(
        'UPDATE meetings SET action_items = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(actionItems), meetingId]
      );
      
      // Also create a task in the tasks table
      await this.createTask({
        id: taskId,
        description: actionItems[taskIndex].description,
        assigneeId,
        assigneeName,
        assignedBy,
        assignedAt: new Date(),
        status: actionItems[taskIndex].status || 'pending',
        priority: actionItems[taskIndex].priority || 'medium',
        deadline: actionItems[taskIndex].deadline,
        meetingId,
        meetingTitle: meeting.title,
        meetingDate: meeting.date,
        teamId: meeting.teamId,
        owner: meeting.createdBy
      });
      
      return true;
    } catch (error) {
      console.error('Error assigning task:', error);
      return false;
    }
  }

  async updateTaskStatus(meetingId: string, taskId: string, status: ActionItem['status']): Promise<boolean> {
    try {
      // Get the meeting first
      const meetingResult = await this.pool.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
      
      if (meetingResult.rows.length === 0) {
        return false;
      }
      
      const meeting = rowToMeeting(meetingResult.rows[0]);
      
      // Find the task in action items
      const actionItems = meeting.actionItems || [];
      const taskIndex = actionItems.findIndex(item => item.id === taskId);
      
      if (taskIndex === -1) {
        return false;
      }
      
      // Update the task
      actionItems[taskIndex] = {
        ...actionItems[taskIndex],
        status
      };
      
      // Update the meeting
      await this.pool.query(
        'UPDATE meetings SET action_items = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(actionItems), meetingId]
      );
      
      // Also update the task in the tasks table
      await this.updateTaskInCollection(taskId, { status });
      
      return true;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
    }
  }

  async getTeamTasks(teamId: string): Promise<ActionItem[]> {
    try {
      // Get all meetings for the team
      const meetingsResult = await this.pool.query(
        'SELECT * FROM meetings WHERE team_id = $1',
        [teamId]
      );
      
      const tasks: ActionItem[] = [];
      
      // Extract tasks from each meeting
      for (const row of meetingsResult.rows) {
        const meeting = rowToMeeting(row);
        const meetingTasks = meeting.actionItems || [];
        
        // Add meeting context to each task
        meetingTasks.forEach(task => {
          tasks.push({
            ...task,
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            meetingDate: meeting.date
          });
        });
      }
      
      return tasks;
    } catch (error) {
      console.error('Error getting team tasks:', error);
      return [];
    }
  }

  // Task collection operations
  async createTask(task: {
    id: string;
    description: string;
    assigneeId: string;
    assigneeName: string;
    assignedBy: string;
    assignedAt: Date;
    status: ActionItem['status'];
    priority: ActionItem['priority'];
    deadline?: Date;
    meetingId: string;
    meetingTitle: string;
    meetingDate: Date;
    teamId?: string;
    teamName?: string;
    owner?: string;
  }): Promise<string> {
    const taskId = task.id || uuidv4();
    
    await this.pool.query(
      `INSERT INTO tasks (
        id, description, assignee_id, assignee_name, assigned_by, assigned_at,
        status, priority, deadline, meeting_id, meeting_title, meeting_date,
        team_id, team_name, owner, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        description = $2,
        assignee_id = $3,
        assignee_name = $4,
        assigned_by = $5,
        assigned_at = $6,
        status = $7,
        priority = $8,
        deadline = $9,
        meeting_id = $10,
        meeting_title = $11,
        meeting_date = $12,
        team_id = $13,
        team_name = $14,
        owner = $15,
        updated_at = NOW()`,
      [
        taskId,
        task.description,
        task.assigneeId,
        task.assigneeName,
        task.assignedBy,
        task.assignedAt,
        task.status,
        task.priority,
        task.deadline,
        task.meetingId,
        task.meetingTitle,
        task.meetingDate,
        task.teamId,
        task.teamName,
        task.owner,
        new Date()
      ]
    );
    
    return taskId;
  }

  async getUserTasksFromCollection(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM tasks WHERE assignee_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      description: row.description,
      assigneeId: row.assignee_id,
      assigneeName: row.assignee_name,
      assignedBy: row.assigned_by,
      assignedAt: new Date(row.assigned_at),
      status: row.status,
      priority: row.priority,
      deadline: row.deadline ? new Date(row.deadline) : undefined,
      meetingId: row.meeting_id,
      meetingTitle: row.meeting_title,
      meetingDate: new Date(row.meeting_date),
      teamId: row.team_id,
      teamName: row.team_name,
      owner: row.owner,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at)
    }));
  }

  async updateTaskInCollection(taskId: string, updates: Partial<any>): Promise<boolean> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    
    if (updates.assigneeId !== undefined) {
      updateFields.push(`assignee_id = $${paramIndex++}`);
      values.push(updates.assigneeId);
    }
    
    if (updates.assigneeName !== undefined) {
      updateFields.push(`assignee_name = $${paramIndex++}`);
      values.push(updates.assigneeName);
    }
    
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    
    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }
    
    if (updates.deadline !== undefined) {
      updateFields.push(`deadline = $${paramIndex++}`);
      values.push(updates.deadline);
    }
    
    updateFields.push(`updated_at = NOW()`);
    
    if (updateFields.length === 0) {
      return true; // Nothing to update
    }
    
    values.push(taskId);
    
    const result = await this.pool.query(
      `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    
    return result.rowCount > 0;
  }

  // Notification operations
  async createNotification(notification: CreateNotificationData): Promise<string> {
    const notificationId = uuidv4();
    
    await this.pool.query(
      `INSERT INTO notifications (
        id, user_id, type, title, message, data, read, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        notificationId,
        notification.userId,
        notification.type,
        notification.title,
        notification.message,
        JSON.stringify(notification.data || {}),
        false,
        new Date()
      ]
    );
    
    return notificationId;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const result = await this.pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      read: row.read,
      data: row.data,
      createdAt: new Date(row.created_at)
    }));
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE notifications SET read = true WHERE id = $1',
      [notificationId]
    );
    
    return result.rowCount > 0;
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM notifications WHERE id = $1',
      [notificationId]
    );
    
    return result.rowCount > 0;
  }

  // Subscription methods - these are more complex in PostgreSQL
  // We'll implement basic polling for now, but in a real app you'd use
  // something like WebSockets or Server-Sent Events
  
  subscribeToUserMeetings(userId: string, callback: (meetings: Meeting[]) => void): Unsubscribe {
    let isSubscribed = true;
    
    const poll = async () => {
      if (!isSubscribed) return;
      
      try {
        const meetings = await this.getUserMeetings(userId);
        callback(meetings);
      } catch (error) {
        console.error('Error polling user meetings:', error);
      }
      
      if (isSubscribed) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };
    
    poll();
    
    return () => {
      isSubscribed = false;
    };
  }
  
  subscribeToTeamMeetings(teamId: string, callback: (meetings: Meeting[]) => void): Unsubscribe {
    let isSubscribed = true;
    
    const poll = async () => {
      if (!isSubscribed) return;
      
      try {
        const meetings = await this.getTeamMeetings(teamId);
        callback(meetings);
      } catch (error) {
        console.error('Error polling team meetings:', error);
      }
      
      if (isSubscribed) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };
    
    poll();
    
    return () => {
      isSubscribed = false;
    };
  }
  
  subscribeToTeam(teamId: string, callback: (team: Team | null) => void): Unsubscribe {
    let isSubscribed = true;
    
    const poll = async () => {
      if (!isSubscribed) return;
      
      try {
        const team = await this.getTeamById(teamId);
        callback(team);
      } catch (error) {
        console.error('Error polling team:', error);
      }
      
      if (isSubscribed) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };
    
    poll();
    
    return () => {
      isSubscribed = false;
    };
  }
  
  subscribeToUserTeams(userId: string, callback: (teams: Team[]) => void): Unsubscribe {
    let isSubscribed = true;
    
    const poll = async () => {
      if (!isSubscribed) return;
      
      try {
        const teams = await this.getUserTeams(userId);
        callback(teams);
      } catch (error) {
        console.error('Error polling user teams:', error);
      }
      
      if (isSubscribed) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };
    
    poll();
    
    return () => {
      isSubscribed = false;
    };
  }
  
  subscribeToUserProfile(userId: string, callback: (profile: UserProfile | null) => void): Unsubscribe {
    let isSubscribed = true;
    
    const poll = async () => {
      if (!isSubscribed) return;
      
      try {
        const profile = await this.getUserProfile(userId);
        callback(profile);
      } catch (error) {
        console.error('Error polling user profile:', error);
      }
      
      if (isSubscribed) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };
    
    poll();
    
    return () => {
      isSubscribed = false;
    };
  }
  
  subscribeToUserNotifications(userId: string, callback: (notifications: Notification[]) => void): Unsubscribe {
    let isSubscribed = true;
    
    const poll = async () => {
      if (!isSubscribed) return;
      
      try {
        const notifications = await this.getUserNotifications(userId);
        callback(notifications);
      } catch (error) {
        console.error('Error polling user notifications:', error);
      }
      
      if (isSubscribed) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };
    
    poll();
    
    return () => {
      isSubscribed = false;
    };
  }
  
  subscribeToUserTasksFromCollection(userId: string, callback: (tasks: any[]) => void): Unsubscribe {
    let isSubscribed = true;
    
    const poll = async () => {
      if (!isSubscribed) return;
      
      try {
        const tasks = await this.getUserTasksFromCollection(userId);
        callback(tasks);
      } catch (error) {
        console.error('Error polling user tasks:', error);
      }
      
      if (isSubscribed) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };
    
    poll();
    
    return () => {
      isSubscribed = false;
    };
  }

  // Offline support - not applicable for PostgreSQL
  async enableOfflineSupport(): Promise<void> {
    // Not applicable for PostgreSQL
    console.log('Offline support not available with PostgreSQL adapter');
  }

  async disableOfflineSupport(): Promise<void> {
    // Not applicable for PostgreSQL
    console.log('Offline support not available with PostgreSQL adapter');
  }
}

// We'll create the instance in database.ts