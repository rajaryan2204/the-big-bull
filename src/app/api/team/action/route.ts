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

  const tokenPayload = verifyTeamToken(token);
  if (!tokenPayload || !tokenPayload.teamId) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  try {
    const rawBody = await req.json();
    const action = rawBody.action;
    const bodyPayload = rawBody.payload || {};
    const selectedOption = rawBody.selectedOption || bodyPayload.selectedOption;
    const lifelineType = rawBody.lifelineType || bodyPayload.lifelineType;
    const timeTakenSeconds = rawBody.timeTakenSeconds ?? bodyPayload.timeTakenSeconds;
    const idempotencyKey = rawBody.idempotencyKey || bodyPayload.idempotencyKey;

    const storage = await getStorage();
    const game = await storage.getCurrentGame();
    const team = await storage.getTeamById(tokenPayload.teamId);

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
      if (!selectedOption) {
        return NextResponse.json({ error: "Please select an option before locking." }, { status: 400 });
      }
      const res = await storage.submitAnswer(
        game.id,
        game.currentQuestion.id,
        team.id,
        selectedOption,
        timeTakenSeconds
      );
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      try {
        await getGameEngine().broadcastAll();
      } catch (e) {}
      return NextResponse.json(res);
    }

    if (action === "buy_lifeline") {
      if (!game.currentQuestion) {
        return NextResponse.json({ error: "No active question" }, { status: 400 });
      }
      if (!lifelineType) {
        return NextResponse.json({ error: "Missing lifeline type" }, { status: 400 });
      }
      const res = await storage.purchaseLifeline(
        game.id,
        game.currentQuestion.id,
        team.id,
        lifelineType,
        idempotencyKey || `idem-${Date.now()}`
      );
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      try {
        await getGameEngine().broadcastAll();
      } catch (e) {}
      const updatedTeam = await storage.getTeamById(team.id);
      const allLifelines = await storage.getLifelinesForTeam(game.currentQuestion.id, team.id);
      return NextResponse.json({
        success: true,
        lifeline: res.lifeline,
        lifelines: allLifelines,
        newBalance: updatedTeam?.currentBalance ?? team.currentBalance,
        hasPassed: lifelineType === "BULLS_PASS",
      });
    }

    if (action === "record_strike" || action === "team:security_incident") {
      const strikeReason = rawBody.reason || bodyPayload.reason || "Minimized window / exited fullscreen";
      const strikeRes = await storage.recordTeamStrike(team.id, strikeReason);
      try {
        await getGameEngine().broadcastAll();
      } catch (e) {}
      return NextResponse.json({
        success: true,
        strikesCount: strikeRes.strikesCount,
        isDisqualified: strikeRes.isDisqualified,
        strikeUpdate: strikeRes,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
