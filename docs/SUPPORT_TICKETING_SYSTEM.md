# Support Ticketing System

## Overview

The support ticketing system provides a comprehensive solution for customers and tradespeople to get help from administrators. It includes ticket creation, messaging, status management, and admin tools.

## Architecture

### Database Schema

**Ticket Model**
- `id`: Unique identifier (CUID)
- `createdAt`: Creation timestamp
- `lastUpdatedAt`: Auto-updated timestamp
- `createdById`: User ID who created the ticket
- `createdByEmail`: Email of the creator
- `role`: User role (CUSTOMER | TRADESPERSON)
- `category`: Ticket category (string)
- `priority`: Priority level (LOW | NORMAL | HIGH | URGENT)
- `subject`: Ticket subject/title
- `initialBody`: Initial description
- `status`: Current status (OPEN | PENDING | RESOLVED | CLOSED)
- `assigneeId`: Optional admin user ID

**TicketMessage Model**
- `id`: Unique identifier (CUID)
- `createdAt`: Creation timestamp
- `ticketId`: Reference to parent ticket
- `authorId`: Message author ID
- `authorRole`: "user" or "admin"
- `body`: Message content
- `attachments`: Related attachments

**TicketAttachment Model**
- `id`: Unique identifier (CUID)
- `createdAt`: Creation timestamp
- `messageId`: Reference to parent message
- `fileKey`: S3/storage key
- `fileName`: Original file name
- `bytes`: File size in bytes
- `contentType`: MIME type

### Rate Limiting

**Ticket Creation**: 3 tickets per 24 hours per user
- Prevents spam and abuse
- Uses sliding window algorithm via Upstash

**Ticket Messages**: Burst of 3, then 1 per 10 seconds per user per ticket
- Prevents message flooding
- Rate limit key includes both user and ticket ID

### API Routes

#### User Routes

**POST /api/support/tickets**
- Create a new support ticket
- Requires authentication
- Rate limited (3/24h)
- Validates: category, priority, subject, body

**GET /api/support/tickets**
- List user's tickets
- Query params: status, page, limit
- Includes message count and latest message

**GET /api/support/tickets/[id]**
- Get ticket details with all messages
- Authorization: Only creator can view
- Includes attachments

**POST /api/support/tickets/[id]/messages**
- Add message to ticket
- Rate limited (3 burst, 1/10s)
- Cannot reply to CLOSED or RESOLVED tickets

#### Admin Routes

**GET /api/admin/support**
- List all tickets (admin only)
- Query params: status, category, priority, assigneeId, page, limit
- Returns tickets with message counts

**GET /api/admin/support/[id]**
- Get ticket details (admin only)
- Same as user endpoint but no ownership check

**PATCH /api/admin/support/[id]**
- Update ticket status, priority, or assigneeId
- Admin only
- Validates updates with Zod schema

**POST /api/admin/support/[id]**
- Add admin response to ticket
- No rate limiting for admin responses
- Sets authorRole to "admin"

### Authorization

**Admin Check**
Currently uses environment variable `ADMIN_USER_IDS` (comma-separated Clerk user IDs).

```bash
ADMIN_USER_IDS=user_xxxxxxxxxxxxx,user_yyyyyyyyyyyyy
```

**Future Enhancement**: Use Clerk publicMetadata with role-based access control.

### UI Components

**TicketForm** (`/components/support/TicketForm.tsx`)
- Client component for creating tickets
- Form validation with react-hook-form + Zod
- Category and priority selection
- Subject and body inputs

**TicketCard** (`/components/support/TicketCard.tsx`)
- Display ticket in list view
- Shows status, priority badges
- Message count
- Last update time

**TicketThread** (`/components/support/TicketThread.tsx`)
- Display ticket with all messages
- Reply form for users
- Disabled when ticket is CLOSED/RESOLVED
- Color-coded admin vs user messages

**AdminTicketDetail** (`/components/support/AdminTicketDetail.tsx`)
- Admin view of ticket
- Status and priority controls
- Admin response form
- Update ticket metadata

### Pages

#### User Pages (Protected)

- `/support` - Support landing page with FAQ
- `/support/new` - Create new ticket
- `/support/tickets` - List user's tickets
- `/support/tickets/[id]` - View ticket and messages

#### Admin Pages (Protected + Admin)

- `/admin/support` - List all tickets with stats
- `/admin/support/[id]` - Manage ticket

All pages are under `(protected)` route group and require authentication.

## Usage

### Creating a Ticket

1. Navigate to `/support/new`
2. Select category (Account, Technical, Job-related, Payment, Safety, Other)
3. Set priority (Low, Normal, High, Urgent)
4. Enter subject and description (min 10 chars)
5. Submit (rate limited: 3/24h)

### Viewing Tickets

Users see only their own tickets at `/support/tickets`. Each ticket shows:
- Status badge (Open, Pending, Resolved, Closed)
- Priority badge
- Message count
- Time since creation/last update

### Messaging

Click a ticket to view the thread. Users can:
- Read all messages
- Reply (if ticket is not CLOSED/RESOLVED)
- See admin responses (highlighted)

### Admin Management

Admins can:
- View all tickets at `/admin/support`
- Filter by status, category, priority, assignee
- Update ticket status and priority
- Respond without rate limits
- See statistics (open, pending, resolved counts)

## Rate Limit Handling

When rate limits are exceeded, the API returns:
```
HTTP 429 Too Many Requests
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890
Retry-After: 3600
```

UI shows user-friendly toast message.

## Future Enhancements

### V1 Non-Goals (Deferred)
- Live chat
- Phone support integration
- Public knowledge base
- Inbound email → ticket parsing
- File attachments (schema ready, implementation deferred)

### Recommended V2 Features
1. **Email Notifications**
   - Ticket created
   - Admin reply
   - Status change
   - Use Resend or similar

2. **In-app Notifications**
   - Toast on new admin message
   - Bell icon with unread count
   - Pusher for real-time updates

3. **Attachments**
   - S3/R2 upload
   - Signed URLs
   - Virus scanning
   - 10MB limit per file

4. **Admin Role in Database**
   - Add ADMIN to UserRole enum
   - Migration to set admin users
   - Remove env var check

5. **Search and Filtering**
   - Full-text search on subject/body
   - Date range filters
   - Assignee management UI

6. **Analytics**
   - First response time
   - Resolution time
   - Ticket volume trends
   - Admin performance metrics

7. **Internal Notes**
   - Admin-only notes
   - Not visible to users
   - Coordination between admins

8. **SLA Tracking**
   - Response time SLAs by priority
   - Escalation rules
   - Breach notifications

## Security Considerations

1. **Authentication**: All routes require Clerk auth
2. **Authorization**: Users can only see their tickets; admins see all
3. **Rate Limiting**: Prevents spam and abuse
4. **Input Validation**: Zod schemas on all inputs
5. **XSS Protection**: React escapes content automatically
6. **SQL Injection**: Prisma parameterizes queries

## Testing

To test locally:

1. Set `ADMIN_USER_IDS` in `.env.local`:
   ```bash
   ADMIN_USER_IDS=your_clerk_user_id
   ```

2. Create a ticket:
   ```bash
   curl -X POST http://localhost:3000/api/support/tickets \
     -H "Content-Type: application/json" \
     -d '{"category":"technical","priority":"NORMAL","subject":"Test","body":"Test ticket body"}'
   ```

3. Visit `/support` to see user interface
4. Visit `/admin/support` (if you're an admin) to see admin interface

## Migration

To deploy this feature:

1. Run Prisma migration:
   ```bash
   pnpm prisma migrate deploy
   ```

2. Set `ADMIN_USER_IDS` in production environment

3. No code changes needed in existing features

## Monitoring

Key metrics to track:
- Ticket creation rate
- Average response time
- Resolution time by priority
- Rate limit hits
- API error rates

Use existing logger with correlation IDs for troubleshooting.
