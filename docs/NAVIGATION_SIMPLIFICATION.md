# Navigation Simplification - PR #207

## Problem
After removing the sidebar, navigation was broken:
- Dashboard link pointed to defunct `/customer` and `/tradesperson` routes
- Missing navigation links: Support, Quote Templates, Payouts
- No mobile menu/burger icon for mobile users

## Solution: Simple Role-Based Navigation

Instead of creating a complex RBAC permission system, we simplified to use **existing Prisma UserRole enum** as the source of truth.

### Architecture

1. **Server-Side Role Resolution** (`src/app/layout.tsx`)
   - Fetches user via `getCurrentUser()` in root layout
   - Passes `userRole` down to client components
   - Single source of truth: Prisma database

2. **Client Component Props** (`src/components/providers/RootProviders.tsx`)
   - Accepts `userRole?: UserRole | null` prop
   - Passes to Header component

3. **Simple Role-Based Nav** (`src/components/layout/Header.tsx`)
   - Accepts `userRole` prop
   - Defines simple nav arrays:
     - `customerLinks`: Browse Jobs, My Jobs, Applications, Messages, Support (5 items)
     - `tradespersonLinks`: Browse Jobs, My Jobs, Applications, Messages, Quote Templates, Payouts, Support (7 items)
   - Mobile: Sheet drawer with burger icon
   - Desktop: NavigationMenu with role-specific links

### Navigation Structure

**Customer Links:**
- Browse Jobs → `/dashboard`
- My Jobs → `/dashboard/my-jobs`
- Applications → `/dashboard/applications`
- Messages → `/dashboard/messages`
- Support → `/dashboard/support`

**Tradesperson Links (adds):**
- Quote Templates → `/dashboard/quote-templates`
- Payouts → `/dashboard/payouts`

**Desktop Navigation:**
- Jobs dropdown (Browse Jobs, My Jobs, Applications)
- Dashboard → `/dashboard` (unified route)
- Messages → `/dashboard/messages`
- Quote Templates (tradesperson only)
- Payouts (tradesperson only)
- Support → `/dashboard/support`

**Mobile Navigation:**
- Burger menu icon (Menu)
- Sheet drawer with all applicable links based on role

### What We Deleted (Overcomplicated)
- ❌ `src/lib/permissions.ts` - permission system not needed
- ❌ `src/lib/nav.ts` - nav config not needed
- ❌ `src/app/api/user/me/route.ts` - redundant API
- ❌ `src/components/layout/Sidebar.tsx` - unused
- ❌ `src/components/dashboard/DashboardLayout.tsx` - unused
- ❌ `docs/NAVIGATION_RBAC_REFACTOR.md` - wrong approach

### Key Decisions

1. **Use Prisma UserRole, Not Clerk publicMetadata**
   - Clerk publicMetadata doesn't work reliably
   - Database is source of truth for roles
   - Server Components resolve role once in layout

2. **No Permission System Needed**
   - We already have Clerk for authentication
   - Simple role enum (PENDING, CUSTOMER, TRADESPERSON) is sufficient
   - Don't duplicate effort

3. **Keep It Simple**
   - Direct role checks: `userRole === UserRole.CUSTOMER`
   - Static nav arrays based on role
   - No complex permission layers

### Files Modified

1. **src/app/layout.tsx**
   - Added `getCurrentUser()` call
   - Extract and pass `user?.role`

2. **src/components/providers/RootProviders.tsx**
   - Accept `userRole` prop
   - Pass to Header

3. **src/components/layout/Header.tsx**
   - Accept `userRole` prop
   - Add mobile Sheet menu with burger icon
   - Define customerLinks/tradespersonLinks arrays
   - Fix Dashboard link to `/dashboard`
   - Add Support, Quote Templates, Payouts links
   - Add role-specific desktop nav items

4. **src/lib/auth.ts**
   - Reverted to original (no permission helpers)

### Testing Checklist

- [ ] Customer sees 5 links in mobile menu
- [ ] Tradesperson sees 7 links in mobile menu
- [ ] Dashboard link points to `/dashboard` for both roles
- [ ] Messages link works for both roles
- [ ] Quote Templates shows only for tradesperson (desktop + mobile)
- [ ] Payouts shows only for tradesperson (desktop + mobile)
- [ ] Support link visible for all roles
- [ ] Mobile burger menu opens Sheet drawer
- [ ] Desktop navigation shows role-specific items
- [ ] All links have correct active states

### Lint/Type Check

✅ `pnpm lint` - passes
✅ `pnpm type-check` - passes

## Why This Approach Works

- **Simple**: Uses existing Prisma UserRole enum
- **Maintainable**: No complex permission abstractions
- **Performant**: Role resolved once server-side
- **Correct**: Database is source of truth
- **Clear**: Direct role checks, no layers of indirection
