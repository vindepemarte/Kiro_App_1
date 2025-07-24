# Database Setup Guide

This application supports both Firebase and PostgreSQL databases. Here's how to configure and use PostgreSQL.

## Prerequisites

1. **PostgreSQL Database**: You need access to a PostgreSQL database (local or remote)
2. **Node.js**: Make sure you have Node.js installed
3. **Environment Variables**: Properly configured environment variables

## Quick Setup

### 1. Configure Environment Variables

Create or update your `.env.local` file with the following variables:

```bash
# Database Configuration
USE_POSTGRES=true
DATABASE_URL=postgresql://username:password@localhost:5432/meeting_ai

# Firebase Configuration (for authentication only)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Other Configuration
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_APP_ID=meeting-ai-mvp
```

### 2. Setup Database Schema

Run the database setup script to create all necessary tables:

```bash
npm run setup-db
```

This script will:
- Test the database connection
- Create all required tables (users, teams, meetings, tasks, notifications)
- Set up indexes for optimal performance
- Create triggers for automatic timestamp updates

### 3. Start the Application

```bash
npm run dev
```

### 4. Verify Setup

Visit these endpoints to verify everything is working:

- **Database Mode Check**: `http://localhost:3000/api/db-mode`
- **PostgreSQL Direct Test**: `http://localhost:3000/api/pg-direct`
- **Database Status**: `http://localhost:3000/api/db-check`

## Database Architecture

### How It Works

1. **Server-Side**: Uses PostgreSQL adapter directly for all database operations
2. **Client-Side**: Uses API adapter that routes all calls through Next.js API routes
3. **Authentication**: Still uses Firebase for user authentication
4. **Data Storage**: All application data (meetings, teams, tasks) stored in PostgreSQL

### Database Schema

The PostgreSQL schema includes:

- **users**: User profiles and authentication data
- **teams**: Team information and metadata
- **team_members**: Team membership with roles and status
- **meetings**: Meeting records with transcripts and summaries
- **tasks**: Task assignments and tracking
- **notifications**: User notifications and alerts

### Key Features

- **ACID Compliance**: Full transaction support
- **Referential Integrity**: Foreign key constraints ensure data consistency
- **Indexing**: Optimized queries with proper indexes
- **Triggers**: Automatic timestamp updates
- **JSON Support**: JSONB fields for flexible data storage

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL format
   - Ensure database exists and user has permissions

2. **Tables Not Created**
   - Run `npm run setup-db` again
   - Check PostgreSQL logs for errors
   - Verify user has CREATE TABLE permissions

3. **Client-Side Errors**
   - Make sure `USE_POSTGRES=true` is set
   - Check browser console for API errors
   - Verify API routes are accessible

### Environment Variable Format

The `DATABASE_URL` should follow this format:
```
postgresql://[username]:[password]@[host]:[port]/[database]
```

Examples:
- Local: `postgresql://postgres:password@localhost:5432/meeting_ai`
- Remote: `postgresql://user:pass@db.example.com:5432/meeting_ai`
- With SSL: `postgresql://user:pass@host:5432/db?sslmode=require`

### Testing Database Connection

You can test your database connection using the PostgreSQL command line:

```bash
psql "postgresql://username:password@localhost:5432/meeting_ai"
```

Or use the built-in API endpoint:
```bash
curl http://localhost:3000/api/pg-direct
```

## Migration from Firebase

If you're migrating from Firebase, you'll need to:

1. Export your Firebase data
2. Transform it to match the PostgreSQL schema
3. Import it using the database migration utilities

The application maintains the same API interface, so your frontend code doesn't need changes.

## Performance Considerations

- **Indexes**: The schema includes optimized indexes for common queries
- **Connection Pooling**: Uses pg Pool for efficient connection management
- **Query Optimization**: Structured queries for optimal performance
- **JSON Fields**: Uses JSONB for flexible data with indexing support

## Security

- **Parameterized Queries**: All queries use parameterized statements
- **Connection Security**: Supports SSL connections
- **Access Control**: Database-level user permissions
- **Input Validation**: Server-side validation for all inputs

## Backup and Maintenance

Regular maintenance tasks:

1. **Backup**: Use `pg_dump` for regular backups
2. **Vacuum**: Run VACUUM ANALYZE periodically
3. **Monitoring**: Monitor connection counts and query performance
4. **Updates**: Keep PostgreSQL updated for security patches