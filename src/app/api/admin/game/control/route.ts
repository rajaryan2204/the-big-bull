import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/src/server/storage";
import { getGameEngine } from "@/src/server/gameEngine";
import { verifyAdminToken } from "@/src/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cookieName = process.env.ADMIN_COOKIE_NAME || "bigbull_admin_token";
  const token =
    req.cookies.get(cookieName)?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized admin access" }, { status: 401 });
  }

  try {
    const { action, options } = await req.json();
    const gameEngine = getGameEngine();
    const storage = await getStorage();

    let result: any = { success: true };

    switch (action) {
      case "start_game":
      case "admin:start_game":
        await gameEngine.startGame();
        break;

      case "pause_game":
      case "admin:pause_game":
        await gameEngine.pauseGame();
        break;

      case "resume_game":
      case "admin:resume_game":
        await gameEngine.resumeGame();
        break;

      case "close_question":
      case "admin:close_question":
        await gameEngine.closeCurrentQuestion("MANUAL_ADMIN_CLOSE");
        break;

      case "reveal_answer":
      case "admin:reveal_answer":
        result.data = await gameEngine.revealAnswer();
        break;

      case "show_leaderboard":
      case "admin:show_leaderboard":
        await gameEngine.showLeaderboard();
        break;

      case "next_question":
      case "admin:next_question":
        await gameEngine.nextQuestion();
        break;

      case "end_game":
      case "admin:end_game":
        await gameEngine.endGame();
        break;

      case "reset_game":
      case "admin:reset_game":
        await gameEngine.resetGame(options);
        break;

      default:
        return NextResponse.json({ error: `Unknown control action: ${action}` }, { status: 400 });
    }

    const updatedGame = await storage.getCurrentGame();
    return NextResponse.json({ success: true, game: updatedGame, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
