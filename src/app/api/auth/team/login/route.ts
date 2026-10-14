import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/src/server/storage";
import { signTeamToken } from "@/src/server/auth";
import { checkRateLimit } from "@/src/server/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limiter = checkRateLimit(`login:team:${ip}`, 5, 60000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${limiter.resetInSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { teamCode, accessCode } = body;

    if (!teamCode || !accessCode) {
      return NextResponse.json(
        { error: "Team code and access code are required." },
        { status: 400 }
      );
    }

    const storage = await getStorage();
    const authResult = await storage.authenticateTeam(teamCode, accessCode);

    if (!authResult.success || !authResult.team) {
      await storage.logAudit("TEAM_LOGIN_FAILED", "TEAM", { teamCode, ipAddress: ip });
      return NextResponse.json(
        { error: authResult.error || "Authentication failed." },
        { status: 401 }
      );
    }

    const team = authResult.team;
    const token = signTeamToken({
      teamId: team.id,
      teamCode: team.teamCode,
      role: "team",
    });

    // Create session in storage
    const userAgent = req.headers.get("user-agent") || "Browser";
    await storage.createSession(team.id, token, userAgent, ip);

    // If oneActiveSessionPerTeam is on, invalidate others
    const game = await storage.getCurrentGame();
    if (game.oneActiveSessionPerTeam) {
      await storage.invalidateOtherSessions(team.id, token);
    }

    await storage.logAudit("TEAM_LOGIN_SUCCESS", "TEAM", { teamCode: team.teamCode }, { teamId: team.id, ipAddress: ip });

    const cookieName = process.env.COOKIE_NAME || "bigbull_team_token";
    const isSecure = process.env.COOKIE_SECURE === "true";

    const response = NextResponse.json({
      success: true,
      token,
      team,
    });

    response.cookies.set({
      name: cookieName,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
