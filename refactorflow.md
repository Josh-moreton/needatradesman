# Refactor Plan: Customer & Tradesperson Separation

## 1. Restructure the App Directory

- Create two new folders under `src/app/`:
  - `/customer`
  - `/tradesperson`
- Move all customer-specific pages (job posting, my jobs, messages, etc.) into `/customer`.
- Move all tradesperson-specific pages (dashboard, job feed, my responses, messages, etc.) into `/tradesperson`.

## 2. Dashboard Router

- Change `/dashboard/page.tsx` to a simple server component that:
  - Checks the user’s role.
  - Redirects to `/customer` if `UserRole.CUSTOMER`.
  - Redirects to `/tradesperson` if `UserRole.TRADESPERSON`.
  - Redirects to `/onboarding` if onboarding is incomplete.
  - Redirects to `/sign-in` if not authenticated.
- No UI should be rendered in `/dashboard/page.tsx`.

## 3. Root Layouts for Each Experience

- Add a `layout.tsx` in both `/customer` and `/tradesperson` folders.
  - Each layout should wrap its children with the appropriate sidebar/navigation for that user type.
  - Move sidebar components into `/components/layout/SidebarCustomer.tsx` and `/components/layout/SidebarTradesperson.tsx` for clarity.

## 4. Move and Rename Pages

- **Customer:**
  - `/customer/jobs/new` (post a job)
  - `/customer/jobs/my-jobs` (manage jobs)
  - `/customer/messages`
  - Any other customer-specific pages
- **Tradesperson:**
  - `/tradesperson/dashboard` (stats-heavy dashboard)
  - `/tradesperson/jobs` (job feed)
  - `/tradesperson/my-responses` (jobs responded to)
  - `/tradesperson/messages`
  - Any other tradesperson-specific pages

## 5. Update Navigation

- Update sidebar links and navigation logic in each layout to point to the new routes.
- Ensure all links and redirects in the app use the new `/customer/...` and `/tradesperson/...` paths.

## 6. Middleware & Auth Logic

- Update middleware to recognize the new routes.
- Ensure onboarding and authentication checks are still enforced, but role-based routing is handled by the `/dashboard` router and page-level logic.

## 7. Clean Up Old Code

- Remove any now-unused role checks and redirects from page components.
- Delete or refactor any shared dashboard code that is no longer needed.

---

## Example Directory Structure

```
src/app/
  dashboard/
    page.tsx         # Simple router, no UI
  customer/
    layout.tsx       # Customer sidebar/layout
    jobs/
      new/
        page.tsx
      my-jobs/
        page.tsx
    messages/
      page.tsx
    ...
  tradesperson/
    layout.tsx       # Tradesperson sidebar/layout
    dashboard/
      page.tsx
    jobs/
      page.tsx
    my-responses/
      page.tsx
    messages/
      page.tsx
    ...
components/
  layout/
    SidebarCustomer.tsx
    SidebarTradesperson.tsx
```

---

## 8. Test All Flows

- Test as both customer and tradesperson:
  - Sign in, onboarding, dashboard redirect, navigation, and access to all relevant pages.
- Ensure no infinite redirects or access leaks between roles.

---

**Follow this plan step-by-step to achieve a clean, maintainable, and role-separated Next.js app!**
