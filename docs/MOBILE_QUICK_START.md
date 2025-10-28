# Mobile App Quick Start

This guide provides a quick reference for common mobile development tasks with Capacitor.

## Prerequisites Checklist

### For iOS Development
- [ ] macOS computer
- [ ] Xcode 14 or later installed
- [ ] Xcode Command Line Tools: `xcode-select --install`
- [ ] CocoaPods: `sudo gem install cocoapods`
- [ ] Apple Developer Account (for device testing)

### For Android Development
- [ ] Android Studio Arctic Fox or later
- [ ] Android SDK Platform 33+
- [ ] JDK 17 (recommended) or JDK 11 minimum
- [ ] Android device/emulator configured

### For All Platforms
- [ ] Node.js 18+
- [ ] pnpm 10.18.3+
- [ ] Project dependencies installed: `pnpm install`

## Initial Setup (One-Time)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Initialize Native Projects

**iOS** (macOS only):
```bash
pnpm cap:add:ios
```

**Android**:
```bash
pnpm cap:add:android
```

This creates `ios/` and `android/` directories with native project files.

### 3. Configure Development Server

Edit `capacitor.config.ts`:

```typescript
server: {
  url: 'http://192.168.1.100:3000', // Your machine's local IP
  cleartext: true,
}
```

**Find your local IP:**
- macOS: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Linux: `hostname -I | awk '{print $1}'`
- Windows: `ipconfig` (look for IPv4 Address)

## Daily Development Workflow

### 1. Start Next.js Dev Server
```bash
pnpm dev
```
Keep this running in a terminal.

### 2. Sync Changes to Native Apps
```bash
pnpm cap:sync
```
Run this whenever you make significant changes.

### 3. Open Native IDE

**iOS:**
```bash
pnpm cap:open:ios
```

**Android:**
```bash
pnpm cap:open:android
```

### 4. Run on Device/Simulator

**From Command Line:**
```bash
pnpm cap:run:ios     # iOS
pnpm cap:run:android # Android
```

**From IDE:**
- Xcode: Select device/simulator → Click Play (⌘R)
- Android Studio: Select device/emulator → Click Run (⇧F10)

## Common Tasks

### Updating Native Dependencies
After adding new Capacitor plugins:
```bash
pnpm install
pnpm cap:sync
```

To update all Capacitor packages (recommended for compatibility):
```bash
pnpm update "@capacitor/core" "@capacitor/cli" "@capacitor/ios" "@capacitor/android" "@capacitor/app" "@capacitor/splash-screen" "@capacitor/status-bar" "@capacitor/keyboard"
```

### Debugging

**iOS Console:**
1. Safari → Develop → [Your Device] → [App Name]
2. Or: Xcode → Debug → Open Web Inspector

**Android Console:**
1. Chrome → `chrome://inspect`
2. Click "inspect" under your app

### Clean Build (If Issues Occur)

**iOS:**
```bash
cd ios/App
pod install
cd ../..
pnpm cap:sync
```

**Android:**
```bash
cd android
./gradlew clean
cd ..
pnpm cap:sync
```

### Switch Between Dev and Production

**Development (Local Server):**
```typescript
// capacitor.config.ts
server: {
  url: 'http://YOUR_LOCAL_IP:3000',
  cleartext: true,
}
```

**Production (Hosted Server):**
```typescript
// capacitor.config.ts
server: {
  url: 'https://needatradesman.com',
  cleartext: false,
}
```

Then sync:
```bash
pnpm cap:sync
```

## Troubleshooting Quick Fixes

### "Could not find Xcode"
```bash
sudo xcode-select --switch /Applications/Xcode.app
```

### "SDK location not found" (Android)
Create `android/local.properties`:
```
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

### Blank Screen in App
1. Check browser console for errors
2. Verify server URL is accessible from device
3. Ensure Next.js dev server is running
4. Check network connectivity

### App Not Updating
```bash
pnpm cap:sync
# Then rebuild in Xcode/Android Studio
```

### iOS Permission Errors
Add to `ios/App/App/Info.plist`:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```
⚠️ **Development only - remove before production**

## Platform Detection in Code

```typescript
import { isNative, isIOS, isAndroid } from '@/lib/capacitor';

// Check if running in native app
if (isNative()) {
  console.log('Running in mobile app');
}

// Platform-specific code
if (isIOS()) {
  // iOS-specific behavior
}

if (isAndroid()) {
  // Android-specific behavior
}
```

## Useful Commands

```bash
# List iOS simulators
xcrun simctl list devices

# List Android emulators
emulator -list-avds

# View Capacitor config
cat capacitor.config.ts

# Check Capacitor installation
npx cap doctor

# Update all Capacitor packages (keep in sync for compatibility)
pnpm update "@capacitor/core" "@capacitor/cli" "@capacitor/ios" "@capacitor/android" "@capacitor/app" "@capacitor/splash-screen" "@capacitor/status-bar" "@capacitor/keyboard"

# View native logs
# iOS: Xcode → Window → Devices and Simulators → Select device → Console
# Android: Android Studio → Logcat
```

## Production Build Checklist

- [ ] Update `capacitor.config.ts` with production server URL
- [ ] Remove development-only permissions
- [ ] Test on real devices
- [ ] Update version numbers
- [ ] Generate signed builds
- [ ] Test app store submission requirements

## Need More Help?

- **Full Guide**: [docs/MOBILE_DEVELOPMENT.md](./MOBILE_DEVELOPMENT.md)
- **Capacitor Docs**: https://capacitorjs.com/docs
- **Platform Utils**: [src/lib/capacitor/README.md](../src/lib/capacitor/README.md)

## Quick Reference

| Task | iOS Command | Android Command |
|------|-------------|-----------------|
| Add platform | `pnpm cap:add:ios` | `pnpm cap:add:android` |
| Sync changes | `pnpm cap:sync` | `pnpm cap:sync` |
| Open IDE | `pnpm cap:open:ios` | `pnpm cap:open:android` |
| Run app | `pnpm cap:run:ios` | `pnpm cap:run:android` |
| Clean build | `cd ios/App && pod install` | `cd android && ./gradlew clean` |

---

**Happy mobile development! 🚀**
