# Capacitor Utilities

This directory contains utilities and helpers for working with Capacitor in the Need A Tradesman application.

## Platform Detection

The `platform.ts` module provides utilities for detecting the current platform and executing platform-specific code.

### Usage

```typescript
import { isNative, isIOS, isAndroid, platformSwitch, platformValue } from '@/lib/capacitor';

// Check if running in native environment
if (isNative()) {
  console.log('Running in native app');
}

// Check specific platform
if (isIOS()) {
  console.log('Running on iOS');
}

// Execute platform-specific code
platformSwitch({
  ios: () => {
    // iOS-specific code
    console.log('iOS behavior');
  },
  android: () => {
    // Android-specific code
    console.log('Android behavior');
  },
  web: () => {
    // Web-specific code
    console.log('Web behavior');
  },
});

// Get platform-specific values
const headerHeight = platformValue({
  ios: 44,
  android: 56,
  web: 64,
  default: 60,
});
```

## Available Functions

### `isNative(): boolean`
Returns `true` if the app is running in a native Capacitor environment (iOS or Android).

### `isWeb(): boolean`
Returns `true` if the app is running in a web browser.

### `isIOS(): boolean`
Returns `true` if the app is running on iOS.

### `isAndroid(): boolean`
Returns `true` if the app is running on Android.

### `isMobile(): boolean`
Returns `true` if the app is running on iOS or Android.

### `getPlatform(): 'web' | 'ios' | 'android'`
Returns the current platform name.

### `platformSwitch<T>(handlers): T | undefined`
Executes platform-specific code based on the current platform.

**Parameters:**
- `handlers.ios?: () => T` - Function to execute on iOS
- `handlers.android?: () => T` - Function to execute on Android
- `handlers.web?: () => T` - Function to execute on web
- `handlers.default?: () => T` - Default function if no platform-specific handler

**Returns:** The result of the executed handler, or `undefined` if no handler matches.

### `platformValue<T>(values): T | undefined`
Returns a platform-specific value.

**Parameters:**
- `values.ios?: T` - Value for iOS
- `values.android?: T` - Value for Android
- `values.web?: T` - Value for web
- `values.default?: T` - Default value if no platform-specific value

**Returns:** The platform-specific value, or the default value, or `undefined`.

## Examples

### Conditional Rendering

```tsx
import { isNative } from '@/lib/capacitor';

export function MyComponent() {
  return (
    <div>
      {isNative() ? (
        <NativeMobileHeader />
      ) : (
        <WebHeader />
      )}
    </div>
  );
}
```

### Platform-Specific Styles

```tsx
import { platformValue } from '@/lib/capacitor';

export function MyComponent() {
  const paddingTop = platformValue({
    ios: 44, // iOS safe area
    android: 24, // Android status bar
    web: 0, // No extra padding on web
  });

  return (
    <div style={{ paddingTop }}>
      Content
    </div>
  );
}
```

### Platform-Specific API Calls

```typescript
import { platformSwitch } from '@/lib/capacitor';

async function shareContent(content: string) {
  return platformSwitch({
    ios: async () => {
      // Use native iOS share
      const { Share } = await import('@capacitor/share');
      return Share.share({ text: content });
    },
    android: async () => {
      // Use native Android share
      const { Share } = await import('@capacitor/share');
      return Share.share({ text: content });
    },
    web: () => {
      // Use Web Share API or fallback
      if (navigator.share) {
        return navigator.share({ text: content });
      }
      // Fallback for browsers without Web Share API
      navigator.clipboard.writeText(content);
      alert('Content copied to clipboard!');
    },
  });
}
```

## Future Additions

This directory will be expanded with additional utilities as mobile features are implemented:

- **Storage utilities** - Helpers for native secure storage
- **Camera utilities** - Simplified camera access and image handling
- **Geolocation utilities** - Location services with proper error handling
- **Push notification utilities** - Notification registration and handling
- **Network utilities** - Connection status and offline detection
- **Deep linking utilities** - App deep link handling

## Testing

These utilities can be tested in different environments:

1. **Web**: Run `pnpm dev` and test in browser (all functions should work)
2. **iOS Simulator**: Run `pnpm cap:run:ios` to test iOS-specific behavior
3. **Android Emulator**: Run `pnpm cap:run:android` to test Android-specific behavior
4. **Real Devices**: Deploy to actual devices for complete testing

## Notes

- These utilities use the Capacitor core API which is available in all environments (web, iOS, Android)
- Platform detection works correctly even in web browsers (returns 'web')
- Functions are tree-shakeable - only imported functions are included in the bundle
- All functions are type-safe with TypeScript
