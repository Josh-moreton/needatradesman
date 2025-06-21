
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
