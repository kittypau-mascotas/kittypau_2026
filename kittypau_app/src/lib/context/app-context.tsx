"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getValidAccessToken } from "@/lib/auth/token";
import KittypauErrorScreen from "@/app/_components/kittypau-error-screen";
import {
  parseKittypauErrorType,
  type KittypauErrorType,
} from "@/lib/errors/kittypau-error";

type Profile = {
  user_name?: string | null;
  owner_name?: string | null;
  photo_url?: string | null;
  email?: string | null;
};

type Device = {
  id: string;
  device_id: string;
  pet_id?: string | null;
};

type AppData = {
  profile: Profile | null;
  petName: string | null;
  devices: Device[];
  accountType: "admin" | "tester" | "client";
  isAdmin: boolean;
  ready: boolean;
};

const AppDataContext = createContext<AppData>({
  profile: null,
  petName: null,
  devices: [],
  accountType: "client",
  isAdmin: false,
  ready: false,
});

export function useAppData() {
  return useContext(AppDataContext);
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({
    profile: null,
    petName: null,
    devices: [],
    accountType: "client",
    isAdmin: false,
    ready: false,
  });
  const [criticalErrorType, setCriticalErrorType] =
    useState<KittypauErrorType | null>(null);

  useEffect(() => {
    let isMounted = true;
    getValidAccessToken().then((token) => {
      if (!token || !isMounted) return;
      Promise.all([
        fetch("/api/profiles", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/pets?limit=20", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/devices?limit=20", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/account/type", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
        .then(async ([profileRes, petsRes, devicesRes, accountRes]) => {
          const criticalHeaderType = devicesRes.headers.get("x-kp-error-type");
          if (criticalHeaderType) {
            const parsed = parseKittypauErrorType(criticalHeaderType);
            if (parsed !== "unknown") {
              setCriticalErrorType(parsed);
              return;
            }
          }

          const profilePayload = profileRes.ok
            ? await profileRes.json().catch(() => null)
            : null;
          const petsPayload = petsRes.ok
            ? await petsRes.json().catch(() => null)
            : null;
          const devicesPayload = devicesRes.ok
            ? await devicesRes.json().catch(() => null)
            : null;
          const accountPayload = accountRes.ok
            ? await accountRes.json().catch(() => null)
            : null;
          if (!isMounted) return;

          const profileData = profilePayload?.data ?? profilePayload;
          const profile: Profile | null = profileData?.id
            ? {
                user_name: profileData.user_name,
                owner_name: profileData.owner_name,
                photo_url: profileData.photo_url,
                email: profileData.email,
              }
            : null;

          const pets = Array.isArray(petsPayload?.data)
            ? petsPayload.data
            : Array.isArray(petsPayload)
              ? petsPayload
              : [];

          const devices: Device[] = Array.isArray(devicesPayload?.data)
            ? devicesPayload.data
            : Array.isArray(devicesPayload)
              ? devicesPayload
              : [];

          const accountType: "admin" | "tester" | "client" =
            accountPayload?.account_type === "admin" ||
            accountPayload?.account_type === "tester"
              ? accountPayload.account_type
              : "client";
          const storedPetName =
            typeof window !== "undefined"
              ? window.localStorage.getItem("kittypau_pet_name")
              : null;

          setData({
            profile,
            petName: pets[0]?.name ?? storedPetName ?? null,
            devices,
            accountType,
            isAdmin: Boolean(accountPayload?.is_admin),
            ready: true,
          });
        })
        .catch(() => {
          if (isMounted) setData((prev) => ({ ...prev, ready: true }));
        });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (criticalErrorType) return;

    let isMounted = true;
    let interval: number | null = null;
    getValidAccessToken().then((token) => {
      if (!token || !isMounted) return;

      const check = () => {
        void fetch("/api/devices?limit=1", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
          .then((res) => {
            const t = res.headers.get("x-kp-error-type");
            if (!t) return;
            const parsed = parseKittypauErrorType(t);
            if (parsed !== "unknown") setCriticalErrorType(parsed);
          })
          .catch(() => undefined);
      };

      check();
      interval = window.setInterval(check, 45_000);
    });

    return () => {
      isMounted = false;
      if (interval) window.clearInterval(interval);
    };
  }, [criticalErrorType]);

  if (criticalErrorType) {
    return (
      <KittypauErrorScreen
        type={criticalErrorType}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <AppDataContext.Provider value={data}>{children}</AppDataContext.Provider>
  );
}
