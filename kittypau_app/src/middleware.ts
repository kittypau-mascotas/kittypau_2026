import { NextRequest, NextResponse } from "next/server";

// Minimal CORS support for `/api/*` so tools running from other origins (local dev,
// admin scripts, etc.) can call our API with Bearer tokens.
//
// We do NOT rely on cookies for API auth, so allowing cross-origin requests is safe
// as long as endpoints enforce Authorization / x-bridge-token.
function withCorsHeaders(res: NextResponse, origin: string | null) {
  // If there's no Origin header (same-origin navigation, curl, server-to-server),
  // we still attach permissive headers to keep behavior consistent.
  const allowedOrigin = origin ?? "*";

  res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  res.headers.set("Vary", "Origin");
  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization,Content-Type,x-bridge-token"
  );
  res.headers.set("Access-Control-Max-Age", "86400");
  return res;
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    // Preflight request.
    return withCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  return withCorsHeaders(NextResponse.next(), origin);
}

export const config = {
  matcher: ["/api/:path*"],
};

