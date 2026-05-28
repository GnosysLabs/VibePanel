import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth");
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".");

  // Bypass checks for auth routes, login screen, and static resources
  if (isLoginPage || isAuthApi || isStatic) {
    return NextResponse.next();
  }

  const token = request.cookies.get("vibepanel-session")?.value;
  const payload = token ? await verifyJWT(token) : null;

  if (!payload) {
    // If request is to an API route, return JSON unauthorized response
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }
    // Otherwise redirect to the login page
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect all routes except static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
