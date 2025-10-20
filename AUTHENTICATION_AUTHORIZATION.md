# Authentication and Authorization Architecture

## Overview

This project follows a clear separation between **Authentication (AuthN)** and **Authorization (AuthZ)**:

- **Authentication**: Handled by Clerk - verifies *who* the user is
- **Authorization**: Handled by our Prisma database - determines *what* the user can do

## Architecture Layers

### 1. Middleware Layer (Authentication Only)
**File**: `src/middleware.ts`

**Responsibility**: Check if a valid Clerk session exists

**What it does**:
- ✅ Checks if auth cookie exists
- ✅ Routes between public and protected areas
- ✅ Redirects to sign-in if no session

**What it does NOT do**:
- ❌ Query the database
- ❌ Check user roles
- ❌ Make authorization decisions
- ❌ Read JWT claims for authorization

```typescript
export default clerkMiddleware(
    async (auth, req) => {
        if (isPublicRoute(req)) {
            return
        }
        // Only checks if auth cookie exists
        await auth.protect()
    }
)
```

### 2. Auth Gate Layer (Authorization)
**File**: `src/lib/auth-gate.ts`

**Responsibility**: Single source of truth for authorization decisions

**Key Functions**:

#### `getAuthGate(): Promise<AuthGate | null>`
- Used in Server Components and pages
- Returns user data including role from database
- Cached for 60 seconds for performance
- Returns `null` if not authenticated

#### `requireAuthGate(): Promise<AuthGate>`
- Used in API routes that require any authenticated user
- Throws error if not authenticated
- Returns user data from database

#### `requireRole(role: UserRole): Promise<AuthGate>`
- Used in API routes that require specific role
- Throws error if user doesn't have required role
- Returns user data from database

**AuthGate Type**:
```typescript
type AuthGate = {
    userId: string      // Internal database ID
    clerkId: string     // Clerk user ID
    email: string       // User's email
    role: UserRole      // PENDING | CUSTOMER | TRADESPERSON (from DB)
    firstName: string | null
    lastName: string | null
}
```

### 3. Application Layer

#### API Routes
All API routes use auth-gate functions:

```typescript
// For any authenticated user
export async function GET() {
    const gate = await requireAuthGate()
    // Use gate.userId, gate.role, etc.
}

// For specific role only
export async function POST() {
    const gate = await requireRole(UserRole.CUSTOMER)
    // Guaranteed to be a CUSTOMER
}
```

#### Server Components/Pages
Dashboard pages use getAuthGate:

```typescript
export default async function DashboardPage() {
    const gate = await getAuthGate()
    
    if (!gate) {
        redirect('/sign-in')
    }
    
    // Use gate.role for conditional rendering
    if (gate.role === UserRole.CUSTOMER) {
        return <CustomerView />
    }
}
```

## Data Flow

1. **User signs in** → Clerk creates session and sets auth cookie
2. **Middleware** checks auth cookie exists → allows access to protected routes
3. **Server Component/API Route** calls `getAuthGate()` or `requireAuthGate()`
4. **Auth Gate** queries Prisma database for user role (cached)
5. **Application** makes decisions based on database role

## Role Definitions

Roles are stored in the Prisma database:

```prisma
enum UserRole {
  PENDING      // User has not completed onboarding
  CUSTOMER     // Can post jobs, accept applications
  TRADESPERSON // Can apply to jobs, receive payments
}
```

## Key Benefits

### 1. **Security**
- Authorization cannot be bypassed by manipulating Clerk metadata
- Database is single source of truth for roles
- Separation of concerns reduces attack surface

### 2. **Consistency**
- All authorization logic uses same pattern
- Easy to audit and maintain
- No confusion about where to check roles

### 3. **Performance**
- Auth gate results are cached (60 seconds)
- Reduces database queries
- Fast authorization checks

### 4. **Maintainability**
- Clear separation between AuthN and AuthZ
- Easy to understand and modify
- Well-documented pattern

## Migration Guide

### Before (❌ Incorrect)
```typescript
// API Route - BAD
import { auth } from '@clerk/nextjs/server'

export async function POST() {
    const { userId } = await auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    
    const user = await prisma.user.findUnique({
        where: { clerkId: userId }
    })
    
    if (user.role !== UserRole.CUSTOMER) {
        return new NextResponse("Forbidden", { status: 403 })
    }
    
    // ... rest of handler
}
```

### After (✅ Correct)
```typescript
// API Route - GOOD
import { requireRole } from '@/lib/auth-gate'

export async function POST() {
    const gate = await requireRole(UserRole.CUSTOMER)
    
    // gate.userId, gate.role, gate.email are available
    // ... rest of handler
}
```

## Special Cases

### 1. Onboarding Route (`/api/user/role`)
This route is special because it SETS the user's role in the database. It correctly uses Clerk's `auth()` directly since there's no role in the database yet.

### 2. Onboarding Status Route (`/api/user/onboarding-status`)
This route checks Clerk metadata to determine onboarding completion status. It uses `requireAuthGate()` but also accesses Clerk directly for metadata.

### 3. Webhook Routes
Webhook routes (`/api/webhooks/clerk`, `/api/stripe/webhook`) are public and don't use auth-gate since they're called by external services with their own authentication mechanisms.

## Testing Authorization

To test that authorization is working correctly:

1. **Sign in** as a user
2. **Set role** in database to CUSTOMER
3. **Try to access** a TRADESPERSON-only endpoint
4. **Verify** you get a 403 Forbidden error
5. **Change role** to TRADESPERSON in database
6. **Verify** you can now access the endpoint

This proves authorization is based on database role, not Clerk metadata.

## References

- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Clerk Next.js Documentation](https://clerk.com/docs/references/nextjs/clerk-middleware)
- [OWASP JWT Security](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens)
