/**
 * Platform Detection & Device Capabilities Service
 * Supports macOS, Windows, iOS, Android, and Web Fallback.
 */

export type PlatformType =
  "macos" | "windows" | "linux" | "ios" | "android" | "web";

export interface PlatformInfo {
  isTauri: boolean;
  isDesktop: boolean;
  isMobile: boolean;
  isMac: boolean;
  isWindows: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  platform: PlatformType;
}

export function detectPlatform(): PlatformInfo {
  // Check if running inside Tauri
  const isTauri =
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMac = /macintosh|mac os x/.test(userAgent) && !isIOS;
  const isWindows = /windows/.test(userAgent);
  const isLinux = /linux/.test(userAgent) && !isAndroid;

  const isMobile = isIOS || isAndroid;
  const isDesktop = !isMobile;

  let platform: PlatformType = "web";
  if (isMac) platform = "macos";
  else if (isWindows) platform = "windows";
  else if (isIOS) platform = "ios";
  else if (isAndroid) platform = "android";
  else if (isLinux) platform = "linux";

  return {
    isTauri,
    isDesktop,
    isMobile,
    isMac,
    isWindows,
    isIOS,
    isAndroid,
    platform,
  };
}

export const currentPlatform = detectPlatform();

/**
 * Trigger subtle haptic feedback on supported mobile devices
 */
export function triggerHaptic(
  type: "light" | "medium" | "heavy" | "success" = "light",
) {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      switch (type) {
        case "light":
          navigator.vibrate(10);
          break;
        case "medium":
          navigator.vibrate(25);
          break;
        case "heavy":
          navigator.vibrate(45);
          break;
        case "success":
          navigator.vibrate([15, 50, 20]);
          break;
      }
    } catch {
      // Ignored if device doesn't support vibration
    }
  }
}
