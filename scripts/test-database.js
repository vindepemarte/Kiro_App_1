#!/usr/bin/env node

// Test script to verify database functionality
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log('📁 Loaded environment variables from .env.local');
  } else {
    console.log('⚠️  No .env.local file found');
  }
}

// Load environment variables
loadEnvFile();

async function testDatabase() {
  console.log('🧪 Testing database functionality...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    // Test basic connection
    console.log('1. Testing connection...');
    const client = await pool.connect();
    console.log('✅ Connection successful');
    client.release();
    
    // Test table existence
    console.log('2. Checking tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('📊 Found tables:', tables.join(', '));
    
    const expectedTables = ['users', 'teams', 'team_members', 'meetings', 'tasks', 'notifications'];
    const missingTables = expectedTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables.join(', '));
      console.log('Run: npm run setup-db');
      process.exit(1);
    }
    
    // Test basic CRUD operations
    console.log('3. Testing CRUD operations...');
    
    // Insert test user
    const testUserId = 'test-user-' + Date.now();
    await pool.query(
      'INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3)',
      [testUserId, `${testUserId}@test.com`, 'Test User']
    );
    console.log('✅ User insert successful');
    
    // Read test user
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [testUserId]);
    if (userResult.rows.length === 0) {
      throw new Error('User not found after insert');
    }
    console.log('✅ User read successful');
    
    // Update test user
    await pool.query(
      'UPDATE users SET display_name = $1 WHERE id = $2',
      ['Updated Test User', testUserId]
    );
    console.log('✅ User update successful');
    
    // Test JSON operations (before deleting user)
    console.log('4. Testing JSON operations...');
    const testMeetingId = 'test-meeting-' + Date.now();
    await pool.query(
      `INSERT INTO meetings (id, title, date, action_items, user_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        testMeetingId,
        'Test Meeting',
        new Date(),
        JSON.stringify([{ id: '1', description: 'Test task', status: 'pending' }]),
        testUserId
      ]
    );
    
    const meetingResult = await pool.query('SELECT action_items FROM meetings WHERE id = $1', [testMeetingId]);
    const actionItems = meetingResult.rows[0]?.action_items;
    
    if (!actionItems || !Array.isArray(actionItems)) {
      throw new Error('JSON data not properly stored/retrieved');
    }
    console.log('✅ JSON operations successful');
    
    // Cleanup
    await pool.query('DELETE FROM meetings WHERE id = $1', [testMeetingId]);
    
    // Delete test user
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    console.log('✅ User delete successful');
    
    console.log('🎉 All database tests passed!');
    console.log('');
    console.log('Your PostgreSQL database is ready to use.');
    console.log('Start your application with: npm run dev');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testDatabase().catch(console.error);