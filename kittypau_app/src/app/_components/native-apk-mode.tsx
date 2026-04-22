"use client";

import { useEffect } from "react";

function isNativeCapacitorApp(): boolean {
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
    const platform = cap.getPlatform();
    return platform === "android" || platform === "ios";
  }
  return false;
}

export default function NativeApkMode() {
  useEffect(() => {
    const isNative = isNativeCapacitorApp();
    if (!isNative) return;

    const root = document.documentElement;
    const body = document.body;

    root.classList.add("kp-native-apk");
    root.classList.add("kp-flavor-native");
    root.setAttribute("data-app-flavor", "native");
    body.classList.add("kp-native-apk");
    body.classList.add("app-flavor-native");
  }, []);

  return null;
}
