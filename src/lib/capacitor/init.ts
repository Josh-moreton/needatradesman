/**
 * Capacitor plugin initialization
 * 
 * Initializes and configures Capacitor plugins when the app starts.
 * This should be called once in the app lifecycle.
 */

import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { isNative } from './platform';

/**
 * Initialize Capacitor plugins
 * Call this function once when the app starts (e.g., in _app.tsx or layout.tsx)
 */
export async function initializeCapacitor(): Promise<void> {
  // Only initialize plugins in native environment
  if (!isNative()) {
    return;
  }

  try {
    // Configure Status Bar
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1C2E3A' });

    // Hide splash screen (will auto-hide, but we can control timing)
    await SplashScreen.hide();

    // Set up app state listeners
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Is active?', isActive);
    });

    // Set up URL open listener for deep links
    App.addListener('appUrlOpen', (data) => {
      console.log('App opened with URL:', data.url);
      // Handle deep links here if needed
    });

    // Set up back button listener (Android)
    App.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        App.exitApp();
      } else {
        window.history.back();
      }
    });

    console.log('Capacitor plugins initialized successfully');
  } catch (error) {
    console.error('Error initializing Capacitor plugins:', error);
  }
}

/**
 * Clean up Capacitor plugin listeners
 * Call this when the app is shutting down or unmounting
 */
export async function cleanupCapacitor(): Promise<void> {
  if (!isNative()) {
    return;
  }

  try {
    await App.removeAllListeners();
    console.log('Capacitor plugin listeners cleaned up');
  } catch (error) {
    console.error('Error cleaning up Capacitor plugins:', error);
  }
}
