# Capacitor CI/CD Integration

This document outlines how to integrate Capacitor mobile app builds into your CI/CD pipeline.

## Overview

While the native iOS and Android projects are not currently auto-built in CI, this guide provides templates and recommendations for future automation.

## Considerations

### Why Not Auto-Build in CI (Yet)?

1. **Platform Requirements**:
   - iOS builds require macOS runners (expensive)
   - Android builds work on any runner but increase build time
   - Code signing requires secure credential management

2. **Development Stage**:
   - Initial setup focuses on manual development workflow
   - CI builds add complexity best addressed after basic functionality is stable
   - Developers typically build and test locally during active development

3. **Best Practice**:
   - Start with web app CI/CD
   - Add mobile builds when ready for beta/production releases
   - Use platform-specific CI services (Fastlane, App Center, etc.)

## Future CI/CD Integration

### Option 1: GitHub Actions (Recommended for Future)

Create `.github/workflows/mobile-ios.yml`:

```yaml
name: iOS Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-ios:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        # Version will be read from package.json packageManager field
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Build Next.js
        run: pnpm build
        env:
          # Add all required environment variables
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          # ... other env vars
        
      - name: Sync Capacitor
        run: pnpm cap:sync
        
      - name: Install CocoaPods
        run: |
          cd ios/App
          pod install
          
      - name: Build iOS
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -destination 'generic/platform=iOS' \
            build
            
      # Optional: Upload to TestFlight
      # Requires additional setup with App Store Connect API keys
```

Create `.github/workflows/mobile-android.yml`:

```yaml
name: Android Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-android:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        # Version will be read from package.json packageManager field
          
      - name: Setup JDK
        uses: actions/setup-java@v4
        with:
          distribution: 'zulu'
          java-version: '17'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Build Next.js
        run: pnpm build
        env:
          # Add all required environment variables
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          # ... other env vars
        
      - name: Sync Capacitor
        run: pnpm cap:sync
        
      - name: Build Android
        run: |
          cd android
          ./gradlew assembleRelease
          
      # Optional: Sign APK
      # Requires keystore and signing configuration
      
      # Optional: Upload to Google Play
      # Requires Google Play service account credentials
```

### Option 2: Fastlane (Production-Grade)

Fastlane provides robust mobile CI/CD automation:

**Install Fastlane:**
```bash
# iOS
cd ios
bundle init
bundle add fastlane

# Android
cd android
bundle init
bundle add fastlane
```

**Example iOS Fastfile** (`ios/fastlane/Fastfile`):
```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    # Sync Capacitor
    Dir.chdir("../..") do
      sh("pnpm", "cap:sync")
    end
    
    # Update provisioning profiles
    match(type: "appstore")
    
    # Build
    gym(
      scheme: "App",
      workspace: "App/App.xcworkspace",
      export_method: "app-store"
    )
    
    # Upload to TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end
end
```

**Example Android Fastfile** (`android/fastlane/Fastfile`):
```ruby
default_platform(:android)

platform :android do
  desc "Build and upload to Play Store Beta"
  lane :beta do
    # Sync Capacitor
    Dir.chdir("..") do
      sh("pnpm", "cap:sync")
    end
    
    # Build
    gradle(
      task: "bundle",
      build_type: "Release"
    )
    
    # Upload to Play Store
    upload_to_play_store(
      track: "beta",
      skip_upload_apk: true
    )
  end
end
```

### Option 3: App Center (Microsoft)

App Center provides mobile-specific CI/CD:

1. Connect repository to App Center
2. Configure build settings via UI
3. Automatic builds on push
4. Distribution to testers
5. Crash reporting and analytics

**Benefits:**
- Easy setup, no YAML configuration
- Built-in device testing
- Integrated distribution
- Free tier available

**Drawbacks:**
- Less flexible than GitHub Actions
- Vendor lock-in
- May require migration if switching services

### Option 4: Bitrise

Bitrise specializes in mobile CI/CD:

1. Connect repository
2. Auto-generated workflows
3. Visual workflow editor
4. Pre-built integrations

## Code Signing Setup

### iOS Code Signing

**Options:**
1. **Manual**: Store certificates and provisioning profiles as GitHub secrets
2. **Fastlane Match**: Sync signing assets via Git repository
3. **App Store Connect API**: Automated certificate management

**Required Secrets:**
- `IOS_CERTIFICATE_P12` - Signing certificate
- `IOS_CERTIFICATE_PASSWORD` - Certificate password
- `IOS_PROVISIONING_PROFILE` - Provisioning profile
- `APPLE_ID` - Apple Developer ID
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password

### Android Code Signing

**Required Files:**
- Keystore file (`.jks` or `.keystore`)
- Keystore properties

**Required Secrets:**
- `ANDROID_KEYSTORE_BASE64` - Base64 encoded keystore
- `KEYSTORE_PASSWORD` - Keystore password
- `KEY_ALIAS` - Key alias
- `KEY_PASSWORD` - Key password

**Setup:**
```bash
# Encode keystore
base64 -i release.keystore -o keystore.txt

# Add to GitHub secrets as ANDROID_KEYSTORE_BASE64
```

## Environment Variables

All environment variables must be provided to CI builds:

```yaml
env:
  # Database
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  
  # Clerk Auth
  CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
  
  # Redis
  REDIS_URL: ${{ secrets.REDIS_URL }}
  
  # Pusher
  PUSHER_APP_ID: ${{ secrets.PUSHER_APP_ID }}
  PUSHER_KEY: ${{ secrets.PUSHER_KEY }}
  PUSHER_SECRET: ${{ secrets.PUSHER_SECRET }}
  PUSHER_CLUSTER: ${{ secrets.PUSHER_CLUSTER }}
  NEXT_PUBLIC_PUSHER_KEY: ${{ secrets.NEXT_PUBLIC_PUSHER_KEY }}
  NEXT_PUBLIC_PUSHER_CLUSTER: ${{ secrets.NEXT_PUBLIC_PUSHER_CLUSTER }}
  
  # Stripe
  STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY }}
  
  # Optional
  LOG_LEVEL: info
```

## Testing in CI

### Automated Testing

**Unit/Integration Tests:**
```yaml
- name: Run tests
  run: pnpm test
```

**E2E Tests (if configured):**
```yaml
- name: E2E tests
  run: pnpm test:e2e
```

### Device Testing

**Option 1: Cloud Device Testing**
- Firebase Test Lab (Android)
- AWS Device Farm (iOS/Android)
- BrowserStack (iOS/Android)

**Option 2: Simulator/Emulator Testing**
```yaml
# iOS Simulator
- name: Run iOS tests
  run: |
    cd ios/App
    xcodebuild test \
      -workspace App.xcworkspace \
      -scheme App \
      -destination 'platform=iOS Simulator,name=iPhone 15'

# Android Emulator
- name: Run Android tests
  run: |
    cd android
    ./gradlew connectedAndroidTest
```

## Deployment Strategy

### Recommended Approach

1. **Development**: Manual builds, local testing
2. **Staging**: Automated builds to TestFlight/Internal Testing
3. **Production**: Manual promotion from staging to production

### Versioning

**Automated Version Bumping:**
```bash
# Update version in package.json
npm version patch

# Sync to native projects
pnpm cap:sync

# Commit version bump
git add .
git commit -m "chore: bump version to $(node -p "require('./package.json').version")"
```

## Cost Considerations

### GitHub Actions

- **Linux runners**: Free (public repos)
- **macOS runners**: $0.08/min (2,000 free minutes/month for private repos)
- **Typical iOS build**: 10-15 minutes = $0.80-$1.20 per build

### Recommendations

1. **Start**: Manual local builds
2. **Scale**: Add CI for release branches only
3. **Optimize**: Cache dependencies, use matrix builds
4. **Monitor**: Track runner usage and costs

## Security Best Practices

1. **Never commit credentials**
2. **Use GitHub Secrets** for sensitive data
3. **Rotate secrets** regularly
4. **Limit repository access**
5. **Review logs** for exposed secrets
6. **Use environment protection rules**

## Next Steps

When ready to implement mobile CI/CD:

1. Choose a CI/CD platform
2. Set up code signing
3. Configure environment variables
4. Test builds locally first
5. Start with manual triggers
6. Gradually automate
7. Monitor costs and build times

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Capacitor CI/CD Guide](https://capacitorjs.com/docs/guides/ci-cd)
- [iOS Code Signing Guide](https://docs.fastlane.tools/codesigning/getting-started/)
- [Android Signing Guide](https://developer.android.com/studio/publish/app-signing)

---

**Note**: This document provides templates and guidance. Actual implementation should be done when the team is ready to move from manual to automated builds.
