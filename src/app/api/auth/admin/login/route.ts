import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/src/server/storage";
import { compareSecret, signAdminToken } from "@/src/server/auth";
import { checkRateLimit } from "@/src/server/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limiter = checkRateLimit(`login:admin:${ip}`, 5, 60000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${limiter.resetInSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const storage = await getStorage();
    const admin = await storage.getAdminByUsername(username.trim());

    // Support user requested credentials
    const isAcceptedAdmin =
      (username.trim().toLowerCase() === "bigbulls" && password === "questions") ||
      (username.trim().toLowerCase() === "admin" && (password === "bull2026" || password === "bigbull2026"));
    const envUser = process.env.ADMIN_USERNAME || "admin";
    const envPass = process.env.ADMIN_PASSWORD || "bigbull2026";

    let isValid = false;
    if (isAcceptedAdmin) {
      isValid = true;
    } else if (admin && compareSecret(password, admin.passwordHash)) {
      isValid = true;
    } else if (username.trim() === envUser && password === envPass) {
      isValid = true;
    }

    if (!isValid) {
      await storage.logAudit("ADMIN_LOGIN_FAILED", "SYSTEM", { username, ipAddress: ip });
      return NextResponse.json({ error: "Invalid administrator credentials" }, { status: 401 });
    }

    const token = signAdminToken({ username: username.trim(), role: "admin" });
    await storage.logAudit("ADMIN_LOGIN_SUCCESS", "ADMIN", { username }, { ipAddress: ip });

    const cookieName = process.env.ADMIN_COOKIE_NAME || "bigbull_admin_token";
    const isSecure = process.env.COOKIE_SECURE === "true";

    const response = NextResponse.json({
      success: true,
      token,
      admin: { username: username.trim(), name: admin?.name || "Administrator" },
    });

    response.cookies.set({
      name: cookieName,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
