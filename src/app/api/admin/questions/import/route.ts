import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { getStorage } from "@/src/server/storage";
import { verifyAdminToken } from "@/src/server/auth";

export async function POST(req: NextRequest) {
  const cookieName = process.env.ADMIN_COOKIE_NAME || "bigbull_admin_token";
  const token =
    req.cookies.get(cookieName)?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const text = await req.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    if (parsed.errors && parsed.errors.length > 0) {
      console.warn("CSV parse warnings:", parsed.errors);
    }

    const storage = await getStorage();
    const importedCount = await storage.importQuestionsFromCsv(parsed.data);

    await storage.logAudit("QUESTIONS_IMPORTED_CSV", "ADMIN", { count: importedCount });

    return NextResponse.json({ success: true, count: importedCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to import CSV" }, { status: 400 });
  }
}
