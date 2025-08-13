# Architecture Review

This document summarizes the current structure of the `needatradesman` repository and provides recommendations for future improvements.

## Overview

- **Framework:** Next.js 15 with the App Router and React 19.
- **Languages & tooling:** TypeScript, Tailwind CSS, ESLint.
- **Key folders:**
  - `src/app` – route handlers, server and client pages.
  - `src/components` – UI and feature‑level components.
  - `src/lib` – utilities for authentication, Pusher, Redis, Stripe and shared helpers.
  - `prisma` – Prisma schema and migrations.

## Observations

- The high‑level separation between `app`, `components`, and `lib` is clear and aligns with typical Next.js conventions.
- Several files combine multiple concerns and have grown beyond a maintainable size:
  - `src/components/landing/LandingPageAnimated.tsx` (≈504 lines).
  - `src/components/onboarding/OnboardingFlow.tsx` (≈446 lines).
  - `src/app/customer/jobs/my-jobs/[jobId]/ManageResponsesClient.tsx` (≈432 lines).
  - `src/app/dashboard/page.tsx` (≈416 lines).
  - `src/components/messages/ChatInterface.tsx` (≈343 lines).
- Domain‑specific logic is spread between `app` routes and `components`; hooks or service modules are scarce.

## Suggestions

### Modular structure

- Consider adopting a feature‑based architecture (e.g. `src/features/jobs`, `src/features/messages`) that co‑locates pages, components, hooks, and server actions. This can reduce cross‑module coupling and clarify ownership.
- Use Next.js route groups (e.g. `app/(marketing)`, `app/(dashboard)`) to separate public pages from authenticated areas.

### Break down large components

- Split large UI components into smaller, focused pieces:
  - `LandingPageAnimated.tsx`: extract sections like hero, features, and CTA into separate components.
  - `OnboardingFlow.tsx`: define individual step components and a parent controller.
  - `ManageResponsesClient.tsx` and `dashboard/page.tsx`: move dashboard and response logic into dedicated components and hooks.
  - `ChatInterface.tsx`: separate message list, input form, and header into subcomponents.

### Shared logic

- Introduce custom hooks or service functions for reusable state and data fetching.
- Separate `lib` into clearly defined layers (e.g. `services`, `utils`, `api`) to distinguish business logic from helpers.

### Testing & linting

- Establish unit and integration tests to cover critical flows (jobs, messaging, onboarding).
- Maintain `pnpm lint` as part of CI to enforce consistent style.

## Conclusion

The current structure is workable for a prototype, but as the project grows it will benefit from feature‑based modularization and smaller, focused components. Applying the suggestions above will improve readability, reusability, and long‑term maintainability.

