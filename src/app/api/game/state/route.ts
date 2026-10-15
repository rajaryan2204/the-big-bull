import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/src/server/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const storage = await getStorage();
    const game = await storage.getCurrentGame();
    const leaderboard = await storage.getLeaderboard();
    const teams = await storage.getAllTeams();

    let answeredCount = 0;
    if (game.currentQuestion) {
      const answers = await storage.getAnswersForQuestion(game.currentQuestion.id);
      answeredCount = answers.length;
    }

    return NextResponse.json(
      {
        success: true,
        game,
        leaderboard,
        teamsCount: teams.length,
        connectedTeamsCount: teams.filter((t) => t.connectionStatus === "CONNECTED").length,
        answeredCount,
        totalTeamsCount: teams.filter((t) => !t.isDisabled).length,
        isDemoMode: game.isDemoMode,
        serverTime: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
