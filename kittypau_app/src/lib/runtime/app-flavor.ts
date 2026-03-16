export type AppFlavor = "web" | "native";

export function resolveAppFlavorFromEnv(): AppFlavor {
  return process.env.NEXT_PUBLIC_APP_FLAVOR === "native" ? "native" : "web";
}

export function isNativeFlavorEnabled(): boolean {
  return resolveAppFlavorFromEnv() === "native";
}

