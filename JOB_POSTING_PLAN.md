# 🏗️ Job Posting Flow Implementation Plan

## 📋 Overview

Build the complete job posting flow for customers, including form creation, validation, file uploads, and integration with the existing dashboard and database.

---

## 🎯 Current Status Assessment

### ✅ Foundation Ready

- **Database Schema**: Job model with title, description, category, location, budget, attachments
- **Validation**: `createJobSchema` in `/src/lib/schemas.ts`
- **Auth & Roles**: Role-based access control with Customer role validation
- **Tech Stack**: ShadCN UI, Zod validation, Prisma ORM, TypeScript

### 🔄 Needs Complete Rebuild (Pre-ShadCN)

- **Dashboard Pages**: Current dashboard needs ShadCN makeover
- **Onboarding Flow**: Rebuild with proper ShadCN form components
- **Landing Page**: Modernize with ShadCN design system
- **Layout & Navigation**: Build proper header/nav with ShadCN

### 🔍 Dependencies Available

- ShadCN components: Form, Input, Select, Textarea, Button, Card, Dialog, Badge, Tabs
- Prisma client and database connection
- Zod schemas for validation
- Auth helpers in `/src/lib/auth.ts`
- JobCategory enum: PLUMBING, ELECTRICAL, CARPENTRY, PAINTING, LANDSCAPING, CLEANING, HANDYMAN, OTHER

---

## 📝 Implementation Steps

### 1. **Core Job Creation Form** (`/app/jobs/new/page.tsx`)

- [ ] Create client component with React Hook Form + Zod resolver
- [ ] Form fields:
  - **Title**: Text input (required, max 100 chars)
  - **Description**: Textarea (required, 10-1000 chars)
  - **Category**: Select dropdown with JobCategory enum options
  - **Location**: Text input (required, postcode/area)
  - **Budget**: Number input (optional, positive numbers only)
  - **Attachments**: File upload (optional, images/documents)
- [ ] Real-time validation with error display
- [ ] Loading states and success/error handling
- [ ] Responsive design for mobile/desktop

### 2. **API Route for Job Creation** (`/app/api/jobs/route.ts`)

- [ ] POST endpoint for creating jobs
- [ ] Authentication check (Clerk userId)
- [ ] Role validation (Customer only)
- [ ] Request body validation with `createJobSchema`
- [ ] Create job record in database via Prisma
- [ ] Link job to authenticated user (customerId)
- [ ] Return success response with created job ID
- [ ] Error handling for validation failures and database errors

### 3. **File Upload Handling** (Optional for MVP)

- [ ] Choose upload strategy (local storage vs cloud)
- [ ] File validation (size, type restrictions)
- [ ] Store attachment URLs in job.attachments field
- [ ] Security considerations (virus scanning, access control)

### 4. **Job Listing Pages**

- [ ] **Customer Job Management** (`/app/jobs/my-jobs/page.tsx`)
  - Display customer's posted jobs
  - Show job status (OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
  - Edit/delete job actions
  - View applications received
- [ ] **Public Job Feed** (`/app/jobs/page.tsx`)
  - List all OPEN jobs for tradespeople
  - Search and filter functionality
  - Category filters
  - Location-based filtering
  - Pagination for large job lists

### 5. **Job Detail Pages**

- [ ] **Customer Job Detail** (`/app/jobs/my-jobs/[jobId]/page.tsx`)
  - Full job details with edit capability
  - List of applications received
  - Accept/reject application actions
  - Communication thread with applicants
- [ ] **Public Job Detail** (`/app/jobs/[jobId]/page.tsx`)
  - Read-only job details for tradespeople
  - "Apply" button (leads to application form)
  - Show if already applied

### 6. **Enhanced Dashboard Integration**

- [ ] Update customer dashboard to show:
  - Number of active job posts
  - Recent applications received
  - Quick actions (post new job, view applications)
- [ ] Update tradesperson dashboard to show:
  - Number of new jobs in their categories
  - Recent jobs they can apply to

### 7. **Caching & Performance** (Optional for MVP)

- [ ] Cache job listings in Redis for fast loading
- [ ] Implement cache invalidation on job creation/updates
- [ ] Add search indexing for better job discovery

---

## 🗂️ File Structure Plan

```
src/
├── app/
│   ├── jobs/
│   │   ├── page.tsx                    # Public job feed (tradespeople)
│   │   ├── new/
│   │   │   └── page.tsx               # Job creation form (customers)
│   │   ├── my-jobs/
│   │   │   ├── page.tsx               # Customer's job list
│   │   │   └── [jobId]/
│   │   │       └── page.tsx           # Customer job detail/management
│   │   └── [jobId]/
│   │       └── page.tsx               # Public job detail view
│   └── api/
│       └── jobs/
│           ├── route.ts               # POST /api/jobs (create job)
│           ├── [jobId]/
│           │   └── route.ts           # GET/PUT/DELETE /api/jobs/:id
│           └── my-jobs/
│               └── route.ts           # GET /api/jobs/my-jobs (user's jobs)
├── components/
│   └── jobs/
│       ├── JobForm.tsx                # Reusable job creation/edit form
│       ├── JobCard.tsx                # Job display card component
│       ├── JobFilters.tsx             # Search/filter component
│       └── FileUploader.tsx           # File upload component
└── lib/
    ├── schemas.ts                     # Already has createJobSchema ✅
    └── uploads.ts                     # File upload utilities (if needed)
```

---

## 🎨 UI Components Needed

### ShadCN Components to Use

- **Form**: Main form wrapper with validation
- **Input**: Title, location, budget fields
- **Textarea**: Description field  
- **Select**: Category dropdown
- **Button**: Submit, cancel, action buttons
- **Card**: Job display cards
- **Badge**: Category, status indicators
- **Alert**: Success/error messages
- **Tabs**: Different job views/filters
- **Dialog**: Confirmation modals

### Custom Components to Build

- **JobForm**: Main job creation/editing form
- **JobCard**: Displays job summary in lists
- **JobFilters**: Search and filter controls
- **FileUploader**: Drag-and-drop file upload (if needed)

---

## 🔄 User Flow

### Customer Job Posting Flow

1. Customer clicks "Post a New Job" from dashboard
2. Redirected to `/jobs/new`
3. Fills out job form with validation
4. Submits form → API creates job → Success message
5. Redirected to job management page or dashboard
6. Can view applications as they come in

### Integration Points

- **Dashboard**: Links to job creation and management
- **Navigation**: Job-related menu items for customers
- **Notifications**: New application alerts (future enhancement)

---

## 🚀 Implementation Priority

### Phase 0 (Foundation Rebuild with ShadCN)

0. ✅ **Modern Layout & Navigation** - Rebuild header/nav with ShadCN
1. ✅ **Dashboard Rebuild** - Complete ShadCN makeover for both customer/tradesperson dashboards
2. ✅ **Onboarding Rebuild** - Modern form components and better UX
3. ✅ **Landing Page Rebuild** - Modern ShadCN landing page with features showcase

### Phase 1 (Essential MVP) - ✅ COMPLETED

3. ✅ Job creation form (`/jobs/new`) - Built with ShadCN Form components
4. ✅ Job creation API (`/api/jobs`) - Backend integration  
5. ✅ Customer job list (`/jobs/my-jobs`) - ShadCN Card components
6. ✅ Basic job display components - Reusable ShadCN-based JobCard component

### Phase 2 (Enhanced MVP)

7. Public job feed (`/jobs`) - Modern job browsing experience
8. Job detail pages - Rich detail views with ShadCN
9. Search and filtering - Advanced ShadCN Select/Input components
10. File upload support - Modern drag-drop interface

### Phase 3 (Polish)

11. Enhanced dashboard integration
12. Caching and performance
13. Advanced search features
14. Mobile-first responsive design

---

## 📊 Success Metrics

- [ ] Customer can successfully create a job post
- [ ] Form validation works correctly
- [ ] Jobs are properly stored in database
- [ ] Customer can view and manage their posted jobs
- [ ] Tradespeople can see and browse available jobs
- [ ] Responsive design works on mobile and desktop

---

## 🔗 Next Steps After Job Posting

Once job posting is complete, we'll move to:

1. **Job Application Flow** (Step 5) - Tradespeople can apply to jobs
2. **Live Chat System** (Step 6) - Communication between parties
3. **Payment Integration** (Step 7) - Stripe payment processing

---

**Ready to implement! Let's start with Phase 1 - the core job creation form and API.**
