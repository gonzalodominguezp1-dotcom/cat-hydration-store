import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap first gate for /admin. The session is fully verified against the
 * database in each admin page and server action (requireAdmin).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !req.cookies.has("admin_session")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
