import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });

    // Expire the session cookie immediately to log out the user
    response.cookies.set("vibepanel-session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0, // Immediately expire
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
