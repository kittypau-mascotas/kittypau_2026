import type { CapacitorConfig } from "@capacitor/cli";

const appServerUrl = process.env.CAPACITOR_SERVER_URL || "http://10.0.2.2:3000";

const allowedHosts = [
  "kittypau-app.vercel.app",
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
    cleartext: true,
    androidScheme: "http",
    allowNavigation: [...allowedHosts, "localhost", "127.0.0.1", "10.0.2.2"],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
