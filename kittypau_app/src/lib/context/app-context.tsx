"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getValidAccessToken } from "@/lib/auth/token";

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

          setData({
            profile,
            petName: pets[0]?.name ?? null,
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

  return (
    <AppDataContext.Provider value={data}>{children}</AppDataContext.Provider>
  );
}
