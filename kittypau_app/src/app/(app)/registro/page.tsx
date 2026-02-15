import { redirect } from "next/navigation";

export default function RegistroPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  params.set("register", "1");
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (!value) continue;
      if (Array.isArray(value)) {
        if (value[0]) params.set(key, value[0]);
      } else {
        params.set(key, value);
      }
    }
  }
  redirect(`/login?${params.toString()}`);
}
