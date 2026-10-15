import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/src/server/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId") || searchParams.get("teamCode");
    const gameId = searchParams.get("gameId") || undefined;

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: teamId or teamCode" },
        { status: 400 }
      );
    }

    const storage = await getStorage();
    const answerSheet = await storage.getTeamAnswerSheet(teamId, gameId);

    return NextResponse.json({
      success: true,
      answerSheet,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load answer sheet" },
      { status: 500 }
    );
  }
}
