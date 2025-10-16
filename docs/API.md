# API Documentation

## Pagination

### Jobs API (`/api/jobs`)

The jobs listing endpoint supports configurable pagination with the following query parameters:

#### Query Parameters

- `page` (optional, default: `1`) - Page number to retrieve
- `limit` (optional, default: `12`) - Number of jobs per page
  - Minimum: `6`
  - Maximum: `50`
  - If a value outside this range is provided, it will be clamped to the nearest valid value
- `category` (optional) - Filter by job category
- `location` (optional) - Filter by location (case-insensitive partial match)
- `search` (optional) - Search in job title and description (case-insensitive)

#### Example Requests

```bash
# Get first page with default limit (12 jobs)
GET /api/jobs

# Get second page with default limit
GET /api/jobs?page=2

# Get first page with custom limit of 24 jobs
GET /api/jobs?limit=24

# Get filtered results with pagination
GET /api/jobs?category=PLUMBING&location=London&limit=20&page=1

# Search with pagination
GET /api/jobs?search=bathroom&limit=15
```

#### Response Format

```json
{
  "jobs": [
    {
      "id": "...",
      "title": "...",
      "description": "...",
      "category": "...",
      "location": "...",
      "budget": "...",
      "status": "OPEN",
      "createdAt": "...",
      "customer": {
        "firstName": "...",
        "lastName": "..."
      },
      "_count": {
        "applications": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 45,
    "pages": 4,
    "hasMore": true
  }
}
```

#### Response Headers

The response includes pagination information in headers for easier client-side handling:

- `X-Pagination-Page` - Current page number
- `X-Pagination-Limit` - Items per page
- `X-Pagination-Total` - Total number of items
- `X-Pagination-Pages` - Total number of pages

### Applications API (`/api/applications`)

Currently returns all applications for the authenticated user without pagination. Pagination constants are defined in `src/lib/constants.ts` for future implementation:

- Default: `20` applications per page
- Range: `10` to `100`

### Messages API (`/api/messages`)

Currently returns all messages/conversations for the authenticated user without pagination. Pagination constants are defined in `src/lib/constants.ts` for future implementation:

- Default: `50` messages per page
- Range: `20` to `200`

## Configuration

Pagination limits are configured in `src/lib/constants.ts`:

```typescript
export const PAGINATION = {
  // Jobs pagination
  JOBS_PER_PAGE: 12,
  MAX_JOBS_PER_PAGE: 50,
  MIN_JOBS_PER_PAGE: 6,
  
  // Applications pagination (reserved for future use)
  APPLICATIONS_PER_PAGE: 20,
  MAX_APPLICATIONS_PER_PAGE: 100,
  MIN_APPLICATIONS_PER_PAGE: 10,
  
  // Messages pagination (reserved for future use)
  MESSAGES_PER_PAGE: 50,
  MAX_MESSAGES_PER_PAGE: 200,
  MIN_MESSAGES_PER_PAGE: 20,
} as const;
```

These values can be adjusted to meet different requirements without modifying individual API route files.
