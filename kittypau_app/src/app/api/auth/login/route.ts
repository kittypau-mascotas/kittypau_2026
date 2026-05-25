import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let email: string;
  let password: string;
  try {
    const body = await req.json();
    email = typeof body.email === "string" ? body.email.trim() : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos." }, { status: 400 });
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  // Eliminar cualquier carácter no-ASCII que pueda haberse colado en el env var (ej. em-dash invisible).
  const supabaseUrl = rawUrl.replace(/[^\x20-\x7E]/g, "").trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Configuración de servidor incompleta." }, { status: 500 });
  }

  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await authRes.json();

    if (!authRes.ok) {
      return NextResponse.json(
        {
          error:
            typeof data.error_description === "string"
              ? data.error_description
              : typeof data.msg === "string"
                ? data.msg
                : "Credenciales incorrectas.",
        },
        { status: authRes.status },
      );
    }

    return NextResponse.json(
      { access_token: data.access_token, refresh_token: data.refresh_token },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Error de red al contactar Supabase." }, { status: 502 });
  }
}
