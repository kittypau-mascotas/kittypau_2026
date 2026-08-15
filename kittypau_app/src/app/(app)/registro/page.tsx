import { redirect } from "next/navigation";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();
  params.set("register", "1");
  if (resolvedSearchParams) {
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
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
