import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/src/server/storage";
import { getGameEngine } from "@/src/server/gameEngine";
import { verifyTeamToken } from "@/src/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookieName = process.env.COOKIE_NAME || "bigbull_team_token";
  const token =
    req.cookies.get(cookieName)?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing session token" }, { status: 401 });
  }

  const payload = verifyTeamToken(token);
  if (!payload || !payload.teamId) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  try {
    const { action, ...data } = await req.json();
    const storage = await getStorage();
    const game = await storage.getCurrentGame();
    const team = await storage.getTeamById(payload.teamId);

    if (!team) {
      return NextResponse.json({ error: "Team record not found" }, { status: 404 });
    }

    if (team.isDisabled || team.isDisqualified) {
      return NextResponse.json({ error: "Team is disqualified or disabled." }, { status: 403 });
    }

    if (action === "submit_answer") {
      if (!game.currentQuestion) {
        return NextResponse.json({ error: "No active question" }, { status: 400 });
      }
      const res = await storage.submitAnswer(
        game.id,
        game.currentQuestion.id,
        team.id,
        data.selectedOption,
        data.timeTakenSeconds
      );
      try {
        await getGameEngine().broadcastAll();
      } catch (e) {}
      return NextResponse.json(res);
    }

    if (action === "buy_lifeline") {
      if (!game.currentQuestion) {
        return NextResponse.json({ error: "No active question" }, { status: 400 });
      }
      const res = await storage.purchaseLifeline(
        game.id,
        game.currentQuestion.id,
        team.id,
        data.lifelineType,
        data.idempotencyKey || `idem-${Date.now()}`
      );
      try {
        await getGameEngine().broadcastAll();
      } catch (e) {}
      return NextResponse.json(res);
    }

    if (action === "record_strike") {
      const strikeRes = await storage.recordTeamStrike(
        team.id,
        data.reason || "Minimized window / exited fullscreen"
      );
      try {
        await getGameEngine().broadcastAll();
      } catch (e) {}
      return NextResponse.json(strikeRes);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
