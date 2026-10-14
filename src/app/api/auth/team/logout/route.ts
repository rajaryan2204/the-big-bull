import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/src/server/storage";

export async function POST(req: NextRequest) {
  const cookieName = process.env.COOKIE_NAME || "bigbull_team_token";
  const token = req.cookies.get(cookieName)?.value;

  if (token) {
    const storage = await getStorage();
    await storage.invalidateSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(cookieName);
  return response;
}
