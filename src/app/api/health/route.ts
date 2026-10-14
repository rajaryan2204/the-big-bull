import { NextResponse } from "next/server";
import os from "os";
import { getStorage } from "@/src/server/storage";

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

export async function GET() {
  const storage = await getStorage();
  const game = await storage.getCurrentGame();
  const port = process.env.PORT || "3000";
  const localIp = getLocalIp();

  const customAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://the-big-bull.vercel.app";
  const joinUrl = customAppUrl.endsWith("/") ? customAppUrl : `${customAppUrl}/`;

  return NextResponse.json({
    status: "ok",
    app: "THE BIG BULL",
    tagline: "Think Smart. Play Strategic. Rule the Bull Market.",
    gameStatus: game.status,
    isDemoMode: game.isDemoMode,
    localIp,
    port,
    joinUrl,
  });
}
