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

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const storage = await getStorage();

  if (type === "transactions") {
    const transactions = await storage.getCoinTransactions();
    return NextResponse.json({ transactions });
  }

  if (type === "suspicious") {
    const suspicious = await storage.getSuspiciousActivities();
    return NextResponse.json({ suspicious });
  }

  const logs = await storage.getAuditLogs(100);
  return NextResponse.json({ logs });
}
