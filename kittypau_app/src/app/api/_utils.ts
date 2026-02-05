import { NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/user-server";

export async function getUserClient(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { error: "Missing Authorization header" as const };
  }

  const token = authHeader.slice("bearer ".length).trim();
  if (!token) {
    return { error: "Missing access token" as const };
  }

  const supabase = createUserClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { error: "Invalid or expired token" as const };
  }

  return { supabase, user: data.user };
}
