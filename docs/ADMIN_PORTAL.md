# Admin Portal Documentation

## Overview

The admin portal provides comprehensive tools for platform administrators to monitor and manage the NeedATradesman marketplace.

## Access

The admin portal is restricted to users with the `ADMIN` role. Admin users are automatically redirected to `/dashboard/admin` when they access the dashboard.

### Setting a User as Admin

To grant admin access to a user, update their role in the database:

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

Or using Prisma Studio:
```bash
npx prisma studio
```

## Features

### 1. Admin Dashboard (`/dashboard/admin`)

The main landing page for administrators with quick access to:
- Jobs Management
- User Management

### 2. Jobs Management (`/dashboard/admin/jobs`)

View and monitor all jobs in the system with the following information:

- **Job ID**: Truncated unique identifier
- **Title**: Job title
- **Category**: Job category (e.g., Plumbing, Electrical)
- **Status**: Current job status with color-coded badges
  - 🟢 OPEN - Job is accepting applications
  - 🔵 IN_PROGRESS - Job is being worked on
  - ⚫ COMPLETED - Job is finished
  - 🔴 CANCELLED - Job was cancelled
- **Customer**: Customer name and email
- **Applications**: Number of applications received
- **Messages**: Number of messages exchanged
- **Created**: Job creation date
- **Actions**: Quick links to view job details and messages

#### Use Cases
- Monitor active jobs and their progress
- Identify jobs with many applications or messages
- Track customer engagement
- Access conversations between customers and tradespeople

### 3. User Management (`/dashboard/admin/users`)

Comprehensive view of all users with data from both Clerk (authentication) and local database:

#### Summary Dashboard
- **Total Users**: All users in the system
- **Synced Users**: Users present in both Clerk and database
- **Unsynced Users**: Users with sync issues

#### User Table
Each user entry shows:
- **Sync Status**: Visual indicator (✓ Synced / ✗ Not Synced)
- **Clerk ID**: Unique Clerk identifier
- **Email**: User's email address
- **Name**: First and last name
- **Role**: User role with color-coded badge
  - 🟣 ADMIN - Administrator
  - 🔵 CUSTOMER - Customer posting jobs
  - 🟢 TRADESPERSON - Service provider
  - 🟡 PENDING - User hasn't completed onboarding
- **In Clerk**: ✓/✗ indicator
- **In DB**: ✓/✗ indicator
- **Issues**: Detailed list of sync problems

#### Sync Issues Detected
The system automatically identifies:
- Users in Clerk but not in database
- Users in database but not in Clerk (orphaned)
- Email mismatches between Clerk and database
- First/last name mismatches
- Users with PENDING role (incomplete onboarding)

#### Use Cases
- Audit user account consistency
- Identify webhook sync failures
- Locate orphaned accounts
- Monitor onboarding completion
- Troubleshoot authentication issues

## API Endpoints

### GET `/api/admin/jobs`

Fetches all jobs with customer, application, and message data.

**Authentication**: Requires ADMIN role

**Response**:
```json
{
  "jobs": [
    {
      "id": "job123",
      "title": "Fix leaking tap",
      "category": "PLUMBING",
      "status": "OPEN",
      "customer": {
        "id": "user123",
        "email": "customer@example.com",
        "firstName": "John",
        "lastName": "Doe"
      },
      "applications": [...],
      "_count": {
        "messages": 5
      }
    }
  ]
}
```

### GET `/api/admin/users`

Fetches all users from Clerk and database, with sync status analysis.

**Authentication**: Requires ADMIN role

**Response**:
```json
{
  "users": [
    {
      "clerkId": "user_abc123",
      "clerkData": {
        "email": "user@example.com",
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "dbData": {
        "id": "db_user_123",
        "email": "user@example.com",
        "role": "CUSTOMER"
      },
      "synced": true,
      "syncIssues": []
    }
  ],
  "total": 100,
  "synced": 95,
  "unsynced": 5
}
```

## Navigation

Admin users have a simplified navigation menu:
- **Dashboard**: Admin portal home
- **All Jobs**: Jobs management
- **All Users**: User management

Regular customer/tradesperson navigation (jobs browsing, messages, etc.) is hidden for admin users to maintain focus on administrative tasks.

## Security

All admin routes and API endpoints are protected by:
1. Clerk authentication (middleware)
2. Role-based access control using `requireRole(UserRole.ADMIN)`
3. Automatic redirects for unauthorized access

Attempting to access admin routes without the ADMIN role will result in:
- Redirect to regular dashboard (for authenticated users)
- 403 Forbidden error (for API endpoints)

## Development

### Adding New Admin Features

1. Create page in `/src/app/(protected)/dashboard/admin/[feature]/page.tsx`
2. Create API endpoint in `/src/app/api/admin/[feature]/route.ts`
3. Protect with `requireRole(UserRole.ADMIN)` or `requireAuthGate()` with role check
4. Add navigation link in `/src/components/layout/Header.tsx`

### Testing Admin Features

Since admin routes are role-protected, you need to:
1. Create a test user in your database
2. Set their role to ADMIN
3. Sign in with that user's credentials
4. Access `/dashboard/admin`

## Troubleshooting

### "Unauthorized: Admin access required"
- Verify user role is set to ADMIN in database
- Check Clerk session is valid
- Clear browser cache and cookies

### User Sync Issues
Common causes:
- Clerk webhook not configured or failing
- Database connection issues during webhook processing
- Manual database changes bypassing Clerk
- User deleted from Clerk but not from database (or vice versa)

### Missing Jobs or Users
- Check API endpoint responses in browser DevTools
- Verify database connection
- Check Prisma schema is up to date (`npx prisma generate`)
- Review server logs for errors
