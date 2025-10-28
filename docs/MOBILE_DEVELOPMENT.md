# Mobile App Development with Capacitor

This document provides a comprehensive guide for developing and building the Need A Tradesman mobile applications using Capacitor.

## Overview

The Need A Tradesman mobile apps use [Capacitor](https://capacitorjs.com/) to wrap the Next.js web application in native iOS and Android shells. This approach allows us to:

- Leverage the existing Next.js codebase with minimal modifications
- Access native device capabilities through Capacitor plugins
- Deploy to the App Store and Google Play Store
- Maintain a single codebase for web and mobile

## Architecture

### Hybrid Approach

The mobile app uses a **hybrid architecture** where:

1. **The Next.js app runs on a server** (hosted on Vercel or your infrastructure)
2. **The mobile app is a native WebView** that loads the hosted web app
3. **Capacitor plugins** provide access to native device features

This approach preserves:
- ✅ Server Components and Server Actions
- ✅ API routes and middleware
- ✅ Dynamic routing and data fetching
- ✅ Real-time features (Pusher, Redis)
- ✅ Authentication flows (Clerk)
- ✅ All existing functionality

### Why Not Static Export?

While Capacitor supports static site exports, this app relies heavily on:
- Server-side authentication and session management
- API routes for database operations
- Server Components for data fetching
- Middleware for route protection

Converting to a static export would require:
- Replacing all Server Components with Client Components
- Moving all API logic to external services
- Implementing client-side authentication
- Significant architectural changes

Therefore, we use the **hosted server approach** which is production-ready and requires minimal changes.

## Prerequisites

### For iOS Development

- macOS with Xcode 14 or later
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer Account (for device testing and App Store deployment)

### For Android Development

- Android Studio Arctic Fox or later
- Android SDK Platform 33 (Android 13) or later
- Java Development Kit (JDK) 11 or later
- Android device or emulator

### For All Platforms

- Node.js 18+ and pnpm 10+
- Capacitor CLI (installed as a dev dependency)

## Initial Setup

### 1. Install Dependencies

```bash
pnpm install
```

This installs all required Capacitor packages:
- `@capacitor/core` - Core Capacitor runtime
- `@capacitor/cli` - Capacitor CLI tools
- `@capacitor/ios` - iOS platform support
- `@capacitor/android` - Android platform support
- `@capacitor/app` - App state management
- `@capacitor/splash-screen` - Native splash screens
- `@capacitor/status-bar` - Status bar customization
- `@capacitor/keyboard` - Keyboard behavior management

### 2. Initialize Native Projects

**Important**: Before initializing platforms, ensure your Next.js app is deployed and accessible at a URL.

#### Initialize iOS:

```bash
pnpm cap:add:ios
```

This creates the `ios/` directory with the native Xcode project.

#### Initialize Android:

```bash
pnpm cap:add:android
```

This creates the `android/` directory with the native Android Studio project.

### 3. Configure Server URL

Edit `capacitor.config.ts` and set the `server.url` for development:

```typescript
server: {
  url: 'https://your-app.vercel.app', // Your deployed app URL
  cleartext: false, // Use true only for local development
}
```

For local development, you can use:

```typescript
server: {
  url: 'http://localhost:3000',
  cleartext: true,
}
```

⚠️ **Security Note**: Always use HTTPS in production and set `cleartext: false`.

## Development Workflow

### Web Development

Continue developing the web app as usual:

```bash
pnpm dev
```

The app runs at `http://localhost:3000` and can be tested in mobile browsers or simulators.

### Mobile Development

#### For iOS:

1. **Sync changes**:
   ```bash
   pnpm cap:sync
   ```

2. **Open in Xcode**:
   ```bash
   pnpm cap:open:ios
   ```

3. **Run on simulator/device**:
   - Select a simulator or connected device in Xcode
   - Click the "Play" button or press ⌘R

Or use the CLI:
```bash
pnpm cap:run:ios
```

#### For Android:

1. **Sync changes**:
   ```bash
   pnpm cap:sync
   ```

2. **Open in Android Studio**:
   ```bash
   pnpm cap:open:android
   ```

3. **Run on emulator/device**:
   - Select an emulator or connected device
   - Click the "Run" button or press ⇧F10

Or use the CLI:
```bash
pnpm cap:run:android
```

### Live Reload During Development

For the best development experience:

1. **Start your Next.js dev server**:
   ```bash
   pnpm dev
   ```

2. **Update `capacitor.config.ts`** to point to your local server:
   ```typescript
   server: {
     url: 'http://YOUR_LOCAL_IP:3000', // e.g., http://192.168.1.100:3000
     cleartext: true,
   }
   ```
   
   ⚠️ Use your machine's local network IP (not `localhost`) so mobile devices can access it.

3. **Sync and run**:
   ```bash
   pnpm cap:sync
   pnpm cap:run:ios  # or pnpm cap:run:android
   ```

Now changes to your Next.js app will be reflected immediately in the mobile app (with standard Next.js hot reload).

## Building for Production

### 1. Deploy Your Next.js App

First, ensure your Next.js app is deployed to a production URL:

```bash
# Deploy to Vercel or your hosting provider
vercel --prod
```

### 2. Update Capacitor Config

Update `capacitor.config.ts` with your production URL:

```typescript
server: {
  // Remove or comment out the url in production builds
  // The app will load the bundled assets
}
```

Or point directly to your hosted app:

```typescript
server: {
  url: 'https://needatradesman.com',
  cleartext: false,
}
```

### 3. Build Native Apps

#### iOS Production Build:

1. Open in Xcode:
   ```bash
   pnpm cap:open:ios
   ```

2. Select `Product` > `Archive`

3. Follow the App Store Connect workflow to upload your build

For detailed iOS deployment, see [iOS Deployment Guide](https://capacitorjs.com/docs/ios/deploying-to-app-store)

#### Android Production Build:

1. Open in Android Studio:
   ```bash
   pnpm cap:open:android
   ```

2. Select `Build` > `Generate Signed Bundle / APK`

3. Follow the prompts to create a release build

For detailed Android deployment, see [Android Deployment Guide](https://capacitorjs.com/docs/android/deploying-to-google-play)

## Configuration

### App Identity

Key configuration in `capacitor.config.ts`:

- **appId**: `com.needatradesman.app` - Unique identifier for app stores
- **appName**: `Need A Tradesman` - Display name on device
- **webDir**: `out` - Directory containing built assets (not used in hosted mode)

### Plugins Configuration

Current plugins and their settings:

#### Splash Screen
```typescript
SplashScreen: {
  launchShowDuration: 2000,        // Show for 2 seconds
  launchAutoHide: true,            // Auto-hide after duration
  backgroundColor: '#1C2E3A',      // Brand dark blue
  showSpinner: false,              // No loading spinner
  spinnerColor: '#E9A928',         // Brand gold (if enabled)
}
```

#### Status Bar
```typescript
StatusBar: {
  style: 'dark',                   // Dark text/icons
  backgroundColor: '#1C2E3A',      // Brand dark blue
}
```

#### Keyboard
```typescript
Keyboard: {
  resize: 'body',                  // Resize method
  style: 'dark',                   // Dark keyboard
  resizeOnFullScreen: true,        // Resize in fullscreen
}
```

## Environment Variables

Mobile apps require the same environment variables as the web app. Configure these in your hosting environment (Vercel, etc.):

- `DATABASE_URL`
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `REDIS_URL`
- `PUSHER_*` variables
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- etc.

The mobile app will use these variables through the server connection.

## Testing

### Testing on Real Devices

#### iOS:

1. Connect your iPhone/iPad via USB
2. Open Xcode
3. Select your device from the target dropdown
4. Click Run (⌘R)

You may need to:
- Enable "Developer Mode" on your iOS device
- Trust your Mac on the device
- Have an Apple Developer account for device testing

#### Android:

1. Enable "Developer Options" on your Android device
2. Enable "USB Debugging"
3. Connect via USB
4. Open Android Studio
5. Select your device and click Run

### Testing on Simulators/Emulators

#### iOS Simulator:

```bash
# List available simulators
xcrun simctl list devices

# Run on specific simulator
pnpm cap:run:ios --target="iPhone-15-Pro"
```

#### Android Emulator:

```bash
# List available emulators
emulator -list-avds

# Run on specific emulator
pnpm cap:run:android --target="Pixel_6_API_33"
```

## Troubleshooting

### Common Issues

#### Issue: "Could not find Xcode"
**Solution**: Install Xcode from the Mac App Store and run `sudo xcode-select --switch /Applications/Xcode.app`

#### Issue: "SDK location not found" (Android)
**Solution**: Create `android/local.properties` with:
```
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

#### Issue: "Module not found" errors in mobile app
**Solution**: The mobile app points to a server, not local files. Ensure your Next.js server is running and accessible.

#### Issue: App shows blank screen
**Solution**: 
1. Check browser console in the mobile app (Xcode > Debug > Open Web Inspector or Chrome DevTools for Android)
2. Verify the server URL in `capacitor.config.ts`
3. Ensure the server is accessible from the device/simulator
4. Check for CORS issues if using a different domain

#### Issue: "Unsafe URL" error on iOS
**Solution**: Add to `Info.plist` (iOS only, for development):
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

⚠️ **Remove this before production release**

### Debug Tools

#### iOS Safari Web Inspector:
1. Enable on device: Settings > Safari > Advanced > Web Inspector
2. Connect device to Mac
3. Open Safari > Develop > [Your Device] > [App Name]

#### Chrome DevTools for Android:
1. Open `chrome://inspect` in Chrome on your computer
2. Connect Android device via USB
3. Click "inspect" under your app

## Next Steps

### Current Implementation

This initial setup provides:
- ✅ Capacitor scaffolding and configuration
- ✅ iOS and Android native projects
- ✅ Basic plugin integration (App, Splash Screen, Status Bar, Keyboard)
- ✅ Build and development scripts
- ✅ Documentation

### Future Enhancements

The following features are planned for future iterations:

1. **Enhanced Authentication**
   - Native secure storage for tokens (using Capacitor Preferences or SecureStorage)
   - Deep link handling for OAuth callbacks
   - Biometric authentication

2. **Native Capabilities**
   - Camera plugin for photo capture
   - Geolocation plugin for GPS location
   - Filesystem plugin for local file management
   - Share plugin for sharing content

3. **Push Notifications**
   - Firebase Cloud Messaging (FCM) for Android
   - Apple Push Notification service (APNs) for iOS
   - Integration with Pusher for real-time updates

4. **Mobile-Optimized UI**
   - Touch-friendly navigation patterns
   - Responsive layouts for small screens
   - Native-feeling animations and transitions

5. **Offline Support**
   - Service worker for offline caching
   - Local data storage with sync
   - Offline-first architecture

6. **In-App Payments**
   - Stripe Payment Sheet integration
   - Apple Pay and Google Pay support
   - 3D Secure flow handling

7. **Performance Optimization**
   - Image optimization for mobile
   - Lazy loading strategies
   - Bundle size optimization

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- [Next.js Documentation](https://nextjs.org/docs)

## Support

For issues or questions:
1. Check this documentation
2. Review [Capacitor's troubleshooting guide](https://capacitorjs.com/docs/troubleshooting)
3. Check the [Capacitor Community Forum](https://forum.ionicframework.com/c/capacitor)
4. Open an issue in the repository
