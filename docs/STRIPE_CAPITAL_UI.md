# Stripe Capital UI Components

## Overview

This document describes the user interface components for the Stripe Capital integration in the NeedaTradesman Academy.

---

## Component Hierarchy

```
Academy Page (/academy)
├── Header Section
│   └── Title + Description
├── Capital Financing Card (conditional)
│   ├── Eligibility Status
│   ├── Benefits List
│   └── Dashboard Link Button
├── Setup Prompt Card (conditional)
│   ├── Setup Instructions
│   └── Setup Link Button
├── How It Works Section
│   ├── Step 1: Choose Course
│   ├── Step 2: Apply for Financing
│   └── Step 3: Earn & Repay
├── Available Courses Grid
│   └── Course Cards (6 sample courses)
│       ├── Title
│       ├── Description
│       ├── Certification Info
│       ├── Price
│       └── Coming Soon Button
└── Benefits Section
    └── Feature Grid (4 benefits)

Dashboard Widget (Tradesperson only)
└── Academy Quick Action Card
    ├── Icon (GraduationCap)
    ├── Title
    ├── Description
    └── View Courses Button
```

---

## Component Details

### 1. Academy Page Header

**Location:** Top of `/academy` page  
**Always Visible:** Yes

```tsx
<h1>NeedaTradesman Academy</h1>
<p>Professional training and certifications to advance your career</p>
```

**Design:**
- Large heading (text-4xl)
- Graduation cap icon
- Muted description text

---

### 2. Capital Financing Card

**Location:** Top of content area  
**Visibility:** Eligible tradespeople only  
**Condition:** `capitalOffer?.eligible && capitalOffer?.capitalEnabled`

```tsx
<Card className="border-primary bg-primary/5">
  <CardHeader>
    <CardTitle>Financing Available Through Stripe Capital</CardTitle>
    <CardDescription>Fund your training with flexible financing</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 3 benefit items with checkmarks */}
    - Eligible for financing
    - Automatic repayment from earnings
    - No fixed monthly payments
  </CardContent>
  <CardFooter>
    <Button href={dashboardUrl}>View Financing Offers</Button>
  </CardFooter>
</Card>
```

**Design Features:**
- Primary color border
- Light primary background
- TrendingUp icon
- Green checkmarks for benefits
- External link icon on button

**User Flow:**
1. See card confirming eligibility
2. Read benefits of Stripe Capital
3. Click "View Financing Offers"
4. Redirected to Stripe Dashboard (new tab)
5. View detailed offers in Stripe

---

### 3. Setup Prompt Card

**Location:** Top of content area  
**Visibility:** Tradespeople without Stripe account  
**Condition:** `!capitalOffer?.hasAccount`

```tsx
<Card className="border-yellow-500 bg-yellow-50">
  <CardHeader>
    <CardTitle>Set Up Payments to Access Financing</CardTitle>
    <CardDescription>Complete Stripe Connect setup...</CardDescription>
  </CardHeader>
  <CardContent>
    <p>To access financing options, set up your payment account first.</p>
  </CardContent>
  <CardFooter>
    <Button href="/dashboard/payouts">Set Up Payments</Button>
  </CardFooter>
</Card>
```

**Design Features:**
- Yellow border (warning style)
- Yellow background
- AlertCircle icon
- Outline button

**User Flow:**
1. See prompt to complete setup
2. Understand need for Stripe account
3. Click "Set Up Payments"
4. Redirected to payouts page
5. Complete Stripe onboarding

---

### 4. How It Works Section

**Location:** Below Capital cards, above courses  
**Always Visible:** Yes

```tsx
<Card>
  <CardHeader>
    <CardTitle>How It Works</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid md:grid-cols-3 gap-6">
      {/* 3 step cards */}
      1. Choose Your Course
      2. Apply for Financing
      3. Earn & Repay
    </div>
  </CardContent>
</Card>
```

**Design Features:**
- Numbered circles (1, 2, 3)
- 3-column grid (responsive)
- Simple explanations
- Consistent spacing

---

### 5. Course Cards Grid

**Location:** Main content area  
**Always Visible:** Yes  
**Count:** 6 sample courses

```tsx
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  {COURSES.map(course => (
    <Card>
      <CardHeader>
        <CardTitle>{course.title}</CardTitle>
        <CardDescription>{course.level} • {course.duration}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>{course.description}</p>
        <div>
          <GraduationCap /> {course.certification}
          <CreditCard /> {formatCurrency(course.price)}
        </div>
      </CardContent>
      <CardFooter>
        <Button disabled>Coming Soon</Button>
        {capitalEnabled && <p>Financing available</p>}
      </CardFooter>
    </Card>
  ))}
</div>
```

**Sample Courses:**
1. Gas Safe Registration Training - £1,500
2. Electrical Part P Certification - £1,200
3. CSCS Card Training & Test - £250
4. NVQ Level 2 Plumbing - £3,500
5. First Aid at Work - £150
6. Advanced Carpentry & Joinery - £2,000

**Design Features:**
- Responsive grid (3 → 2 → 1 columns)
- Price formatted as GBP currency
- Certification badge
- Duration display
- Coming Soon button (disabled)
- Optional financing note

---

### 6. Benefits Section

**Location:** Bottom of page  
**Always Visible:** Yes

```tsx
<Card>
  <CardHeader>
    <CardTitle>Why Choose NeedaTradesman Academy?</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid md:grid-cols-2 gap-6">
      {/* 4 benefit items */}
      - Industry-Recognized Qualifications
      - Flexible Learning
      - Financing Available
      - Boost Your Profile
    </div>
  </CardContent>
</Card>
```

**Design Features:**
- 2-column grid
- Green checkmarks
- Clear benefit statements
- Supporting descriptions

---

### 7. Dashboard Academy Card

**Location:** Tradesperson dashboard `/dashboard`  
**Visibility:** Tradespeople only  
**Position:** Quick Actions grid

```tsx
<Card className="hover:shadow-lg border-primary/50">
  <CardHeader>
    <div className="p-2 bg-primary/10">
      <GraduationCap className="h-6 w-6 text-primary" />
    </div>
    <CardTitle>Academy</CardTitle>
    <CardDescription>Training & qualifications</CardDescription>
  </CardHeader>
  <CardContent>
    <Button href="/academy">
      <GraduationCap /> View Courses
    </Button>
  </CardContent>
</Card>
```

**Design Features:**
- Slight primary border
- Hover shadow effect
- Primary colored icon
- Outline button
- Compact layout

**User Flow:**
1. Login to dashboard
2. See Academy card in Quick Actions
3. Click "View Courses"
4. Navigate to `/academy`

---

## Conditional Rendering Logic

### For Tradespeople WITH Stripe Account (Eligible)
```
✅ Capital Financing Card
❌ Setup Prompt Card
✅ How It Works
✅ Courses (with "Financing available" notes)
✅ Benefits Section
```

### For Tradespeople WITHOUT Stripe Account
```
❌ Capital Financing Card
✅ Setup Prompt Card
✅ How It Works
✅ Courses (without financing notes)
✅ Benefits Section
```

### For Customers
```
❌ Capital Financing Card
❌ Setup Prompt Card
✅ How It Works
✅ Courses (without financing notes)
✅ Benefits Section
```

---

## Color Scheme

| Element | Color | Purpose |
|---------|-------|---------|
| Capital Card Border | Primary | Highlight eligibility |
| Capital Card Background | Primary/5 | Subtle emphasis |
| Setup Card Border | Yellow-500 | Warning/Action needed |
| Setup Card Background | Yellow-50 | Attention grabbing |
| Success Checkmarks | Green-600 | Positive indicators |
| Primary Actions | Primary | Main CTAs |
| Secondary Actions | Outline | Supporting actions |

---

## Responsive Breakpoints

| Breakpoint | Layout Changes |
|------------|----------------|
| Mobile (<768px) | Single column grid, stacked cards |
| Tablet (768px-1024px) | 2 column course grid |
| Desktop (>1024px) | 3 column course grid |

---

## Icons Used

| Icon | Component | Purpose |
|------|-----------|---------|
| GraduationCap | Header, Dashboard | Academy branding |
| TrendingUp | Capital Card | Growth/Financing |
| CheckCircle2 | Benefits Lists | Positive features |
| AlertCircle | Setup Card | Warning/Notice |
| ExternalLink | Dashboard Button | External navigation |
| BookOpen | How It Works | Learning |
| CreditCard | Course Cards | Pricing |

---

## Button States

| Button | State | Behavior |
|--------|-------|----------|
| View Financing Offers | Active | Opens Stripe Dashboard |
| Set Up Payments | Active | Navigates to /dashboard/payouts |
| View Courses | Active | Navigates to /academy |
| Coming Soon | Disabled | No action (course enrollment pending) |

---

## Loading States

```tsx
{loading && (
  <div>Loading financing options...</div>
)}

{!loading && capitalOffer && (
  // Show content
)}
```

**Loading Behavior:**
- Fetch Capital offers on page load
- Show loading indicator (optional)
- Render cards when data ready
- Gracefully handle errors

---

## Error Handling

| Error Type | UI Response |
|------------|-------------|
| Not authenticated | Redirect to login |
| Not a tradesperson | Hide Capital card, show courses |
| No Stripe account | Show setup prompt |
| Stripe API error | Hide Capital card, show courses |
| Network error | Hide Capital card, show courses |

**Philosophy:** Never break the Academy page. Capital is supplementary.

---

## Accessibility

- ✅ Semantic HTML (Card, Header, Content, Footer)
- ✅ Proper heading hierarchy (h1 → h2 → h3)
- ✅ Alt text for icons (via lucide-react)
- ✅ Keyboard navigable buttons and links
- ✅ Sufficient color contrast
- ✅ Focus indicators on interactive elements

---

## Future Enhancements

### Phase 2: Course Enrollment
- Active "Enroll Now" buttons
- Direct Capital-funded purchases
- Payment integration

### Phase 3: Progress Tracking
- Course completion status
- Certificates display
- Financing repayment tracking

### Phase 4: Recommendations
- Personalized course suggestions
- Based on trade category
- Skill gap analysis

---

**Last Updated:** 2025-10-20  
**Design System:** shadcn/ui + Tailwind CSS  
**Framework:** Next.js 15 + React 19
