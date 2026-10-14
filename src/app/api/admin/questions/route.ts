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
  const questions = await storage.getAllQuestions();
  return NextResponse.json({ questions });
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
    const data = await req.json();
    const storage = await getStorage();
    const created = await storage.createQuestion(data);
    await storage.logAudit("QUESTION_CREATED", "ADMIN", { questionId: created.id });
    return NextResponse.json({ success: true, question: created });
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
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Question ID required" }, { status: 400 });

    const storage = await getStorage();
    const updated = await storage.updateQuestion(id, updates);
    await storage.logAudit("QUESTION_UPDATED", "ADMIN", { questionId: id });
    return NextResponse.json({ success: true, question: updated });
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
    if (!id) return NextResponse.json({ error: "Question ID required" }, { status: 400 });

    const storage = await getStorage();
    const deleted = await storage.deleteQuestion(id);
    await storage.logAudit("QUESTION_DELETED", "ADMIN", { questionId: id });
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
