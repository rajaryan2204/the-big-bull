import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/src/server/storage";
import { verifyTeamToken } from "@/src/server/auth";

export async function GET(req: NextRequest) {
  try {
    const cookieName = process.env.COOKIE_NAME || "bigbull_team_token";
    const token =
      req.cookies.get(cookieName)?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = verifyTeamToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false, error: "Invalid token" }, { status: 401 });
    }

    const storage = await getStorage();
    const sessionCheck = await storage.validateSession(token);
    if (!sessionCheck.valid) {
      return NextResponse.json({ authenticated: false, error: "Session expired or terminated" }, { status: 401 });
    }

    const team = await storage.getTeamById(payload.teamId);
    if (!team) {
      return NextResponse.json({ authenticated: false, error: "Team unavailable" }, { status: 404 });
    }

    return NextResponse.json({ authenticated: true, team });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
