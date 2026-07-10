import { NextResponse } from "next/server";

export const runtime = "edge";

// GET /api/devices/[id]/events — sin categorías activas, devuelve siempre vacío
export async function GET() {
  return NextResponse.json({ data: [] });
}
