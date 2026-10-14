import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const cookieName = process.env.ADMIN_COOKIE_NAME || "bigbull_admin_token";
  const response = NextResponse.json({ success: true });
  response.cookies.delete(cookieName);
  return response;
}
