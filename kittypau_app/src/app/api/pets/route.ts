import { NextRequest, NextResponse } from "next/server";
import { getUserClient } from "../_utils";

export async function GET(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getUserClient(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { supabase, user } = auth;
  const body = await req.json();

  const payload = {
    owner_id: user.id,
    name: body?.name,
    species: body?.species,
    birth_date: body?.birth_date ?? null,
    notes: body?.notes ?? null,
  };

  if (!payload.name || !payload.species) {
    return NextResponse.json(
      { error: "name and species are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("pets")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
