import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/src/server/storage";
import { verifyAdminToken } from "@/src/server/auth";

export async function GET(req: NextRequest) {
  const cookieName = process.env.ADMIN_COOKIE_NAME || "bigbull_admin_token";
  const token =
    req.cookies.get(cookieName)?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storage = await getStorage();
  const teams = await storage.getAllTeams();
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  const cookieName = process.env.ADMIN_COOKIE_NAME || "bigbull_admin_token";
  const token =
    req.cookies.get(cookieName)?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { teamCode, name, accessCode, startingBalance, members } = await req.json();
    if (!teamCode || !name || !accessCode) {
      return NextResponse.json({ error: "teamCode, name, and accessCode required" }, { status: 400 });
    }

    const storage = await getStorage();
    const created = await storage.createTeam(teamCode, name, accessCode, startingBalance || 5000, members || []);
    await storage.logAudit("TEAM_CREATED", "ADMIN", { teamCode, name, members: members || [] });

    try {
      const { getGameEngine } = await import("@/src/server/gameEngine");
      await getGameEngine().broadcastAll();
    } catch (e) {}

    return NextResponse.json({ success: true, team: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const cookieName = process.env.ADMIN_COOKIE_NAME || "bigbull_admin_token";
  const token =
    req.cookies.get(cookieName)?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, action, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: "Team ID required" }, { status: 400 });

    const storage = await getStorage();

    if (action === "reset_code") {
      if (!data.newAccessCode) return NextResponse.json({ error: "newAccessCode required" }, { status: 400 });
      await storage.resetTeamAccessCode(id, data.newAccessCode);
      await storage.logAudit("TEAM_CODE_RESET", "ADMIN", { teamId: id });
      return NextResponse.json({ success: true, message: "Access code reset successfully" });
    }

    if (action === "adjust_coins") {
      const amount = Number(data.amount);
      if (isNaN(amount) || amount === 0) return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
      const result = await storage.adjustCoins(id, amount, "ADMIN_ADJUSTMENT", {
        eventDetails: data.reason || "Manual Admin Adjustment",
      });
      await storage.logAudit("COINS_ADJUSTED", "ADMIN", { teamId: id, amount, reason: data.reason });
      try {
        const { getGameEngine } = await import("@/src/server/gameEngine");
        await getGameEngine().broadcastAll();
      } catch (e) {}
      return NextResponse.json(result);
    }

    if (action === "reset_strikes") {
      const updated = await storage.resetTeamStrikes(id);
      try {
        const { getGameEngine } = await import("@/src/server/gameEngine");
        await getGameEngine().broadcastAll();
      } catch (e) {}
      return NextResponse.json({ success: true, team: updated, message: "Strikes reset successfully" });
    }

    // Standard updates (name, isDisabled, isActive, members)
    const updated = await storage.updateTeam(id, data);
    await storage.logAudit("TEAM_UPDATED", "ADMIN", { teamId: id, updates: data });
    try {
      const { getGameEngine } = await import("@/src/server/gameEngine");
      await getGameEngine().broadcastAll();
    } catch (e) {}
    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const cookieName = process.env.ADMIN_COOKIE_NAME || "bigbull_admin_token";
  const token =
    req.cookies.get(cookieName)?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Team ID required" }, { status: 400 });

    const storage = await getStorage();
    await storage.deleteTeam(id);
    await storage.logAudit("TEAM_DELETED", "ADMIN", { teamId: id });

    try {
      const { getGameEngine } = await import("@/src/server/gameEngine");
      await getGameEngine().broadcastAll();
    } catch (e) {}

    return NextResponse.json({ success: true, message: "Team deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
