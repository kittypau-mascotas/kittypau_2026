"use client";

import { useEffect } from "react";

function isNativeCapacitorApp() {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: unknown }).Capacitor as
    | {
        isNativePlatform?: () => boolean;
        getPlatform?: () => string;
      }
    | undefined;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === "function") {
    return cap.isNativePlatform();
  }
  if (typeof cap.getPlatform === "function") {
    return cap.getPlatform() !== "web";
  }
  return false;
}

export default function NativeApkMode() {
  useEffect(() => {
    if (!isNativeCapacitorApp()) return;
    document.documentElement.classList.add("kp-native-apk");
    document.body.classList.add("kp-native-apk");
  }, []);

  return null;
}
