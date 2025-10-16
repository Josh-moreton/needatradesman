# Database Performance Indexes

## Overview
This document describes the database indexes added to improve query performance as the application scales.

## Indexes Added

### Job Table
1. **jobs_customerId_idx** - Index on `customerId`
   - **Purpose**: Fast retrieval of jobs posted by a specific customer
   - **Query Pattern**: `SELECT * FROM jobs WHERE customerId = ?`
   - **Use Case**: "My Jobs" page for customers

2. **jobs_status_category_idx** - Composite index on `(status, category)`
   - **Purpose**: Efficient filtering of job listings by status and category
   - **Query Pattern**: `SELECT * FROM jobs WHERE status = ? AND category = ?`
   - **Use Case**: Job feed with filters

3. **jobs_createdAt_idx** - Index on `createdAt`
   - **Purpose**: Fast sorting of jobs by creation date
   - **Query Pattern**: `SELECT * FROM jobs ORDER BY createdAt DESC`
   - **Use Case**: Recent jobs listing

### Application Table
1. **applications_tradespersonId_idx** - Index on `tradespersonId`
   - **Purpose**: Quick retrieval of applications submitted by a tradesperson
   - **Query Pattern**: `SELECT * FROM applications WHERE tradespersonId = ?`
   - **Use Case**: "My Applications" page for tradespeople

2. **applications_jobId_status_idx** - Composite index on `(jobId, status)`
   - **Purpose**: Efficient filtering of applications by job and status
   - **Query Pattern**: `SELECT * FROM applications WHERE jobId = ? AND status = ?`
   - **Use Case**: Finding pending/accepted applications for a job

### Message Table
1. **messages_jobId_senderId_receiverId_idx** - Composite index on `(jobId, senderId, receiverId)`
   - **Purpose**: Fast retrieval of conversation messages
   - **Query Pattern**: `SELECT * FROM messages WHERE jobId = ? AND senderId = ? AND receiverId = ?`
   - **Use Case**: Loading job-related conversations

2. **messages_senderId_createdAt_idx** - Composite index on `(senderId, createdAt)`
   - **Purpose**: Efficient retrieval of sent messages with chronological ordering
   - **Query Pattern**: `SELECT * FROM messages WHERE senderId = ? ORDER BY createdAt DESC`
   - **Use Case**: User's sent messages history

3. **messages_receiverId_createdAt_idx** - Composite index on `(receiverId, createdAt)`
   - **Purpose**: Efficient retrieval of received messages with chronological ordering
   - **Query Pattern**: `SELECT * FROM messages WHERE receiverId = ? ORDER BY createdAt DESC`
   - **Use Case**: User's inbox/received messages

## Performance Impact

### Before Indexes
- Full table scans on filtered queries
- O(n) complexity for searches
- Performance degradation with data growth
- Potential timeout errors under load

### After Indexes
- Index scans instead of table scans
- O(log n) complexity for indexed searches
- Consistent performance as data grows
- Lower database CPU usage
- Reduced query latency

## Verification

All indexes have been verified using PostgreSQL's EXPLAIN ANALYZE:
- ✅ `jobs_customerId_idx` - Confirmed Index Scan
- ✅ `jobs_status_category_idx` - Confirmed Index Scan
- ✅ `jobs_createdAt_idx` - Confirmed Index Scan
- ✅ `applications_tradespersonId_idx` - Confirmed Index Scan
- ✅ `applications_jobId_status_idx` - Confirmed Index Scan
- ✅ `messages_jobId_senderId_receiverId_idx` - Confirmed Index Scan
- ✅ `messages_senderId_createdAt_idx` - Confirmed Index Scan
- ✅ `messages_receiverId_createdAt_idx` - Confirmed Index Scan

## Deployment Instructions

### Development
```bash
pnpm prisma migrate dev
```

### Staging/Production
```bash
pnpm prisma migrate deploy
```

### Recommendations
1. **Deploy during low-traffic periods** - Index creation can be resource-intensive
2. **Monitor database CPU** - Watch for any spikes during migration
3. **Verify index usage** - Run EXPLAIN on critical queries post-deployment
4. **Consider index maintenance** - PostgreSQL will auto-maintain these indexes

## Migration File
- **Location**: `prisma/migrations/20251016141455_add_performance_indexes/migration.sql`
- **Size**: 8 CREATE INDEX statements
- **Rollback**: Indexes can be dropped if needed (unlikely to cause issues)

## Expected Benefits
1. **Faster page loads** - Job listings, applications, and messages load quicker
2. **Better scalability** - Performance maintained as data grows
3. **Reduced costs** - Lower database CPU and memory usage
4. **Improved UX** - Faster response times for users
5. **Higher capacity** - Can handle more concurrent users

## Maintenance
PostgreSQL automatically maintains these B-tree indexes:
- Auto-updates on INSERT/UPDATE/DELETE
- Auto-vacuums to optimize storage
- No manual maintenance required

## Notes
- All indexes are B-tree (PostgreSQL default)
- Composite indexes support left-to-right prefix matching
- Indexes add minimal storage overhead
- Write operations slightly slower (negligible impact)
- Read operations significantly faster (major benefit)
