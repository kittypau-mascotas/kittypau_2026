import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kittypau.app",
  appName: "KittyPau",
  webDir: "capacitor_www",
  server: {
    url: "https://kittypau-app.vercel.app",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "kittypau-app.vercel.app",
      "zgwqtzazvkjkfocxnxsh.supabase.co",
      "musical-arachnid-50372.upstash.io",
    ],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
