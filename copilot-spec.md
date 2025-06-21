
# needatradesman.co.uk – Copilot Project Specification

## 🧠 Project Overview

**Domain**: [needatradesman.co.uk](https://needatradesman.co.uk)  
**Goal**: Connect private individuals who need work done (e.g. plumbing, kitchen renovation, electrical jobs) with trusted tradespeople who can respond and win the job.

This platform requires authentication, job posting, messaging, and payments.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, ESM only)
- **Authentication**: [Clerk.dev](https://clerk.dev/)
- **Type Safety & Validation**: [Zod](https://zod.dev/)
- **ORM**: [Prisma](https://www.prisma.io/) + PostgreSQL (hosted on Render.com)
- **Caching & Rate Limiting**: [Upstash Redis](https://upstash.com/)
- **UI Kit**: [ShadCN](https://ui.shadcn.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Payments**: [Stripe](https://stripe.com/)
- **Live Chat**: TBD – possibly WebSocket-based (e.g. Pusher, Ably, or custom solution with Redis pub/sub)

---

## 📦 Primary Features & Logic

### 1. 👤 User Roles

- **Customer**: Can create a job post describing the work they need.
- **Tradesperson**: Can browse jobs and submit interest/applications.

Users select their role during sign-up or onboarding. Role-based UI will be used.

---

### 2. 🏗️ Job Posting Flow

1. **Customer logs in**
2. **Creates a job post** via form with:
   - Title
   - Description
   - Budget (optional)
   - Category (plumbing, carpentry, etc)
   - Location (postcode preferred)
   - Optional attachments (images/plans)

3. **Job stored** in Postgres via Prisma
4. **Job cached/indexed** in Redis for fast discovery

---

### 3. 🛠️ Tradesperson Response Flow

1. Tradesperson logs in
2. Can **browse available jobs** (basic feed + filters)
3. Can **respond to jobs** by:
   - Messaging the customer
   - Expressing interest
   - Submitting a quote (optional)

4. Tradesperson response is saved and triggers **notification to the customer**

---

### 4. 💬 Live Chat (MVP)

- Private 1:1 chat between customer and tradesperson
- Initiated when a tradesperson responds to a job
- Preferably use WebSockets + Redis pub/sub
- Deliver new messages in real-time (and fall back to polling if needed)
- Chats should persist (store in Postgres or Redis streams depending on design)

---

### 5. 💳 Payments

- Use Stripe
- Payment flow:
  - Customer selects winning tradesperson
  - Customer pays full amount (or deposit) to platform
  - Funds held in escrow or marked for release (Stripe Connect/Custom accounts TBD)
  - Tradesperson is paid once job is marked complete
- Admin dashboard to manage disputes, status, and payouts

---

## 🔐 Authentication & Permissions

- Clerk handles login/registration
- Role-based access:
  - Customers can only post jobs and select winners
  - Tradespeople can only apply to existing jobs
- Admin user support (for moderation, payment control, etc.)

---

## 📚 Models Overview (Prisma)

Initial suggested models:

```prisma
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  name           String?
  role           Role     // "customer" or "tradesperson"
  jobs           Job[]    @relation("PostedJobs")
  applications   Application[]
  messages       Message[]
  createdAt      DateTime @default(now())
}

model Job {
  id             String         @id @default(cuid())
  title          String
  description    String
  category       String
  location       String
  user           User           @relation("PostedJobs", fields: [userId], references: [id])
  userId         String
  applications   Application[]
  messages       Message[]
  createdAt      DateTime       @default(now())
}

model Application {
  id             String     @id @default(cuid())
  job            Job        @relation(fields: [jobId], references: [id])
  jobId          String
  user           User       @relation(fields: [userId], references: [id])
  userId         String
  message        String
  createdAt      DateTime   @default(now())
}

model Message {
  id             String     @id @default(cuid())
  senderId       String
  receiverId     String
  jobId          String
  content        String
  createdAt      DateTime   @default(now())
}
```

---

## 🔮 Future Enhancements (Non-MVP)

- Ratings & Reviews for tradespeople
- Profile photos & portfolios
- Admin dashboard with moderation controls
- In-app notifications
- Mobile-friendly PWA
- Location-based search with distance filters
- Verified badges for tradespeople

---

## ✅ Prioritised MVP Checklist

- [ ] User auth with Clerk (customer/tradesperson roles)
- [ ] Job creation flow (customer)
- [ ] Job feed & application flow (tradesperson)
- [ ] Live chat MVP (private chat on job application)
- [ ] Stripe integration (pay to accept quote / hold funds)
- [ ] Basic dashboard: "My Jobs", "My Applications"
- [ ] UI polish with ShadCN & Tailwind
- [ ] Redis caching for job listings

---

## 📁 File & Folder Suggestions

```
/app
  /dashboard
  /jobs
  /messages
  /auth
/prisma
/lib
/components
/hooks
/styles
```

---

## 📌 Notes for Agents

- Use **ESModules** only, no CommonJS
- Strict type safety throughout with **Zod**
- All models defined in **Prisma**, validated with Zod
- Respect separation of roles (enforced at API + UI levels)
- Plan for horizontal scalability (e.g. Redis for pub/sub, Upstash limits)

---

## 🏗️ Step-by-Step Build Guide (MVP)

### 1. **Project Setup**

- [x] Scaffolded with Next.js (App Router, ESM only)
- [x] Clerk authentication installed and configured

### 2. **Prisma & Database**

- [ ] Install Prisma and set up PostgreSQL connection (`/prisma/schema.prisma`)
- [ ] Define models as per spec (User, Job, Application, Message)
- [ ] Run `npx prisma migrate dev` to create tables

### 3. **Role Selection & Onboarding**

- [ ] On sign-up, prompt user to select "customer" or "tradesperson"
- [ ] Store role in User model (extend Clerk user with custom DB record if needed)
- [ ] Enforce role-based UI and permissions

### 4. **Job Posting (Customer)**

- [ ] Create `/app/jobs/new` page with form (title, description, category, location, budget, attachments)
- [ ] Validate with Zod
- [ ] On submit, create Job in DB (Prisma)
- [ ] Index/caches job in Redis for fast feed (optional for MVP)

### 5. **Job Feed & Application (Tradesperson)**

- [ ] Create `/app/jobs` feed page, visible to tradespeople
- [ ] Add filters (category, location, etc.)
- [ ] Each job card: "Express Interest" or "Apply" button
- [ ] Application form: message + (optional) quote
- [ ] On submit, create Application in DB, notify customer

### 6. **Live Chat MVP**

- [ ] When tradesperson applies, create chat thread (Message model)
- [ ] Build `/app/messages/[chatId]` page for 1:1 chat
- [ ] Use WebSockets (e.g. Pusher, Ably, or custom with Upstash Redis pub/sub)
- [ ] Fallback to polling if needed
- [ ] Persist messages in DB

### 7. **Payments (Stripe)**

- [ ] Integrate Stripe (test mode)
- [ ] Customer can pay to accept a quote (escrow/hold funds)
- [ ] Funds released to tradesperson when job marked complete
- [ ] Admin dashboard for payouts/disputes (basic for MVP)

### 8. **Dashboards**

- [ ] `/app/dashboard` for both roles:
  - Customers: "My Jobs", "Applications Received"
  - Tradespeople: "My Applications", "Jobs Won"
- [ ] List jobs, applications, and chat links

### 9. **UI & Styling**

- [ ] Use ShadCN UI kit for forms, modals, lists
- [ ] Tailwind CSS for layout and custom styles
- [ ] Mobile responsiveness

### 10. **Caching & Performance**

- [ ] Use Upstash Redis to cache job listings (optional for MVP)
- [ ] Rate limit job posting/applications as needed

### 11. **Validation & Type Safety**

- [ ] Use Zod for all API/form validation
- [ ] Enforce strict types in API routes and components

### 12. **Deployment**

- [ ] Deploy to Vercel
- [ ] Set up environment variables for Clerk, DB, Stripe, Redis

---

**Tip:**  
Build incrementally—start with core flows (auth, job posting, job feed, applications), then add chat and payments. Use feature flags or MVP toggles for unfinished features.

---
