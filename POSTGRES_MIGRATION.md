# PostgreSQL Migration Guide

This guide explains how to migrate your MeetingAI application from Firebase to PostgreSQL.

## 1. Setup PostgreSQL Database in Coolify

1. Go to Coolify dashboard → Resources → New Resource
2. Select "PostgreSQL 17"
3. Configure the database:
   - Name: `meeting-ai-database`
   - Username: `vindepemarte`
   - Password: (your secure password)
   - Initial Database: `postgres`

## 2. Initialize Database Schema

1. Go to your PostgreSQL database in Coolify
2. Click on "Initialization scripts" → "Add"
3. Copy the contents of `db-init.sql` into the script
4. Save the script

## 3. Configure Environment Variables

Add these environment variables to your application deployment:

```
DATABASE_URL=postgresql://vindepemarte:your_password@meeting-ai-database:5432/postgres
USE_POSTGRES=false
```

Note: Initially set `USE_POSTGRES=false` to keep using Firebase while testing.

## 4. Deploy the Application

Deploy your application with the new environment variables.

## 5. Run Migration (Optional)

To migrate existing data from Firebase to PostgreSQL:

1. Edit `scripts/migrate-to-postgres.js` and set `PERFORM_MIGRATION = true`
2. Run the migration script:
   ```
   node scripts/migrate-to-postgres.js
   ```

## 6. Test PostgreSQL Integration

1. Set `USE_POSTGRES=true` for a test deployment
2. Test all functionality:
   - User authentication
   - Meeting creation and retrieval
   - Task assignment and management
   - Team management
   - Notifications

## 7. Switch to PostgreSQL

Once testing is complete:

1. Set `USE_POSTGRES=true` for all deployments
2. Monitor application performance and logs
3. Fix any issues that arise

## Files Added

- `lib/postgres-adapter.ts` - PostgreSQL implementation of DatabaseService
- `lib/database-factory.ts` - Factory to switch between Firebase and PostgreSQL
- `db-init.sql` - Database schema initialization script
- `scripts/migrate-to-postgres.js` - Data migration script
- `POSTGRES_MIGRATION.md` - This guide

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. Check that the database is running in Coolify
2. Verify the `DATABASE_URL` environment variable
3. Check network connectivity between your app and database

### Migration Issues

If data migration fails:

1. Run with `PERFORM_MIGRATION = false` to see what would be migrated
2. Check for errors in the migration script output
3. Fix any issues and retry

### Performance Issues

If you notice performance issues:

1. Check database indexes
2. Optimize queries in the PostgreSQL adapter
3. Consider adding connection pooling configuration

## Benefits of PostgreSQL

- No complex permission rules
- Better query capabilities
- Managed by Coolify
- Automatic backups
- Direct SQL access
- Better for structured data