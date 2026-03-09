import type { CapacitorConfig } from "@capacitor/cli";

const appServerUrl =
  process.env.CAPACITOR_SERVER_URL || "https://app.kittypau-app.vercel.app";

const allowedHosts = [
  "kittypau-app.vercel.app",
  "app.kittypau-app.vercel.app",
  "zgwqtzazvkjkfocxnxsh.supabase.co",
  "musical-arachnid-50372.upstash.io",
];

try {
  allowedHosts.push(new URL(appServerUrl).hostname);
} catch {
  // Keep defaults if CAPACITOR_SERVER_URL is malformed.
}

const allowNavigation = Array.from(new Set(allowedHosts));

const config: CapacitorConfig = {
  appId: "com.kittypau.app",
  appName: "Kittypau",
  webDir: "capacitor_www",
  server: {
    url: appServerUrl,
    cleartext: false,
    androidScheme: "https",
    allowNavigation,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
