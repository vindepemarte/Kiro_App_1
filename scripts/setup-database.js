#!/usr/bin/env node

// Database setup script for PostgreSQL
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

async function setupDatabase() {
  console.log('🚀 Setting up PostgreSQL database...');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please set DATABASE_URL in your .env.local file');
    console.log('Example: DATABASE_URL=postgresql://username:password@localhost:5432/meeting_ai');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log(`📅 Server time: ${result.rows[0].now}`);
    client.release();
    
    // Read and execute schema
    console.log('📋 Reading database schema...');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🏗️  Creating tables and indexes...');
    await pool.query(schema);
    console.log('✅ Database schema created successfully');
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log('📊 Created tables:', tables.join(', '));
    
    // Check if we have the expected tables
    const expectedTables = ['users', 'teams', 'team_members', 'meetings', 'tasks', 'notifications'];
    const missingTables = expectedTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.warn('⚠️  Missing tables:', missingTables.join(', '));
    } else {
      console.log('✅ All expected tables created successfully');
    }
    
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Make sure USE_POSTGRES=true is set in your .env.local');
    console.log('2. Start your Next.js application: npm run dev');
    console.log('3. Test the database connection at: http://localhost:3000/api/pg-direct');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Check your DATABASE_URL format');
    console.error('3. Ensure the database exists and user has proper permissions');
    console.error('4. Check network connectivity to the database');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase().catch(console.error);