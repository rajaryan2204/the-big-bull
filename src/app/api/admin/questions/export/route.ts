import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
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
  const questions = await storage.getAllQuestions();

  const csvRows = questions.map((q) => ({
    id: q.id,
    category: q.category,
    text: q.text,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctOption: q.correctOption,
    imageUrl: q.imageUrl || "",
    visualClueUrl: q.visualClueUrl || "",
    hintText: q.hintText || "",
    explanation: q.explanation || "",
    difficulty: q.difficulty,
    durationSeconds: q.durationSeconds,
  }));

  const csvString = Papa.unparse(csvRows);

  return new NextResponse(csvString, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="the_big_bull_questions.csv"',
    },
  });
}
