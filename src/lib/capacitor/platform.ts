/**
 * Platform detection utilities for Capacitor
 * 
 * Provides helpers to detect the current platform and adjust behavior
 * accordingly for web, iOS, and Android environments.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if the app is running in a native Capacitor environment
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if the app is running in a web browser
 */
export function isWeb(): boolean {
  return !Capacitor.isNativePlatform();
}

/**
 * Check if the app is running on iOS
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Check if the app is running on Android
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Get the current platform name
 * @returns 'web', 'ios', or 'android'
 */
export function getPlatform(): 'web' | 'ios' | 'android' {
  return Capacitor.getPlatform() as 'web' | 'ios' | 'android';
}

/**
 * Check if the device is in native mobile environment (iOS or Android)
 */
export function isMobile(): boolean {
  return isIOS() || isAndroid();
}

/**
 * Execute platform-specific code
 * 
 * @example
 * ```typescript
 * platformSwitch({
 *   ios: () => console.log('Running on iOS'),
 *   android: () => console.log('Running on Android'),
 *   web: () => console.log('Running in browser'),
 * });
 * ```
 */
export function platformSwitch<T>(handlers: {
  ios?: () => T;
  android?: () => T;
  web?: () => T;
  default?: () => T;
}): T | undefined {
  const platform = getPlatform();
  
  if (handlers[platform]) {
    return handlers[platform]!();
  }
  
  if (handlers.default) {
    return handlers.default();
  }
  
  return undefined;
}

/**
 * Get platform-specific value
 * 
 * @example
 * ```typescript
 * const statusBarHeight = platformValue({
 *   ios: 44,
 *   android: 24,
 *   web: 0,
 * });
 * ```
 */
export function platformValue<T>(values: {
  ios?: T;
  android?: T;
  web?: T;
  default?: T;
}): T | undefined {
  const platform = getPlatform();
  
  if (values[platform] !== undefined) {
    return values[platform];
  }
  
  return values.default;
}
