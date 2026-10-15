import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/src/server/storage";
import { verifyTeamToken } from "@/src/server/auth";

export const dynamic = "force-dynamic";

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

    // Update connection status / heartbeat
    try {
      await storage.setTeamConnectionStatus(team.id, "CONNECTED");
    } catch (e) {}

    const game = await storage.getCurrentGame();
    let currentAnswer = null;
    let lifelines: any = {
      BULLS_HINT: { type: "BULLS_HINT", purchased: false, cost: 500 },
      VISION_BOOST: { type: "VISION_BOOST", purchased: false, cost: 1500 },
      "50_50_BLAST": { type: "50_50_BLAST", purchased: false, cost: 2000 },
      BULLS_PASS: { type: "BULLS_PASS", purchased: false, cost: 2500 },
    };
    let hasPassed = false;

    if (game.currentQuestion) {
      currentAnswer = await storage.getTeamAnswer(game.currentQuestion.id, team.id);
      lifelines = await storage.getLifelinesForTeam(game.currentQuestion.id, team.id);
      hasPassed = !!lifelines.BULLS_PASS?.purchased;
    }

    const privateState = {
      team,
      currentAnswer,
      lifelines,
      hasPassed,
      suspiciousFlagCount: 0,
    };

    return NextResponse.json(
      { authenticated: true, team, privateState },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 500 });
  }
}
