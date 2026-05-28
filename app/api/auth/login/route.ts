import { NextResponse } from "next/server";
import { signJWT } from "@/lib/auth";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "vibepanel";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing username or password" }, { status: 400 });
    }

    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      const token = await signJWT({ user: username });
      const response = NextResponse.json({ success: true });

      // Write session cookie: HttpOnly, Secure, SameSite=Lax, and MaxAge 7 days
      response.cookies.set("vibepanel-session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
