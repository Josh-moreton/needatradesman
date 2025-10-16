# Error Boundaries Implementation

## Overview
Error boundaries have been implemented throughout the application to prevent UI crashes and provide a better user experience when JavaScript errors occur in client components.

## Implementation Details

### Core Component
- **Location**: `src/components/ErrorBoundary.tsx`
- **Type**: React Class Component (Error boundaries must be class components)
- **Features**:
  - Catches JavaScript errors in child component tree
  - Displays fallback UI with user-friendly error message
  - Logs errors to console (can be extended to integrate with Sentry or other error tracking services)
  - Provides "Try again" button to recover from errors

### Coverage

#### 1. Root Layout (`src/app/layout.tsx`)
- Wraps the entire application (RootProviders)
- Catches any unhandled errors in Header, Footer, or page content
- Provides top-level protection for the entire app

#### 2. Message Components
Error boundaries wrap ChatInterface in:
- `src/app/customer/messages/page.tsx`
- `src/app/tradesperson/messages/page.tsx`
- `src/app/dashboard/messages/page.tsx`

This prevents chat-related errors from crashing the entire page.

#### 3. Application/Response Forms
Error boundaries wrap ResponseForm in:
- `src/app/tradesperson/jobs/[jobId]/apply/page.tsx`

This isolates errors in job application submissions.

#### 4. Payment Management
Error boundaries wrap ManageResponsesClient in:
- `src/app/customer/jobs/my-jobs/[jobId]/page.tsx`

This protects payment and response management functionality.

#### 5. Quote Templates
Error boundaries wrap QuoteTemplatesClient in:
- `src/app/dashboard/quote-templates/page.tsx`
- `src/app/tradesperson/quote-templates/page.tsx`

This isolates errors in quote template management.

## Testing Error Boundaries

### Manual Testing Method

To test error boundaries manually, you can temporarily add a test component that throws an error:

1. Create a test component:

```tsx
// Temporarily add to any page for testing
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TestErrorComponent() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("Test error - Error boundary should catch this");
  }

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">Error Boundary Test</h3>
      <Button onClick={() => setShouldThrow(true)}>Trigger Error</Button>
    </div>
  );
}
```

2. Import and use in a page wrapped with ErrorBoundary
3. Click the "Trigger Error" button
4. Verify the error boundary fallback UI is displayed
5. Click "Try again" to reset the error state
6. Remove the test component before committing

### Areas to Test

1. **Message Interface**:
   - Navigate to any messages page
   - Add test error component inside the ErrorBoundary
   - Verify error is caught and displayed

2. **Application Forms**:
   - Navigate to a job application page
   - Trigger an error in the form
   - Verify error boundary catches it

3. **Payment Components**:
   - Navigate to manage responses page
   - Trigger an error in payment flow
   - Verify error boundary displays fallback

4. **Quote Templates**:
   - Navigate to quote templates page
   - Trigger an error in template management
   - Verify error boundary handles it

## Error Logging and Monitoring

### Current Implementation
- Errors are logged to the browser console via `console.error`
- Includes error details and React error info

### Future Enhancements
To integrate with Sentry or another error tracking service:

1. Install Sentry:
```bash
pnpm add @sentry/nextjs
```

2. Update ErrorBoundary component:
```tsx
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  // Log to Sentry
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  });
  
  // Also log to console for development
  console.error('Error caught by boundary:', error, errorInfo);
}
```

3. Initialize Sentry in your app with appropriate DSN and configuration

## Customization

### Custom Fallback UI
You can provide a custom fallback for specific sections:

```tsx
<ErrorBoundary 
  fallback={
    <div className="text-center p-8">
      <h3>Custom error message</h3>
      <p>Something went wrong in this specific section</p>
    </div>
  }
>
  <YourComponent />
</ErrorBoundary>
```

### Error-Specific Handling
For different error types, you could extend the ErrorBoundary:

```tsx
static getDerivedStateFromError(error: Error): State {
  // Check error type and return appropriate state
  if (error instanceof NetworkError) {
    return { hasError: true, errorType: 'network', error };
  }
  return { hasError: true, errorType: 'general', error };
}
```

## Best Practices

1. **Granular Boundaries**: Place error boundaries around specific features rather than just at the root level
2. **User-Friendly Messages**: Always provide clear, non-technical error messages to users
3. **Recovery Options**: Give users a way to recover (e.g., "Try again" button)
4. **Error Logging**: Always log errors for debugging and monitoring
5. **Testing**: Regularly test error boundaries to ensure they work as expected

## Known Limitations

1. Error boundaries do NOT catch errors in:
   - Event handlers (use try-catch instead)
   - Asynchronous code (use try-catch instead)
   - Server-side rendering
   - Errors thrown in the error boundary itself

2. For server component errors, use Next.js error.tsx files instead

## Related Files

- Error Boundary Component: `src/components/ErrorBoundary.tsx`
- Root Layout: `src/app/layout.tsx`
- Message Pages: `src/app/*/messages/page.tsx`
- Application Pages: `src/app/tradesperson/jobs/[jobId]/apply/page.tsx`
- Payment Pages: `src/app/customer/jobs/my-jobs/[jobId]/page.tsx`
- Quote Pages: `src/app/*/quote-templates/page.tsx`
