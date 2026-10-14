// THE BIG BULL - Authentication & Session Security
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "big-bull-default-secret-key-32chars-2026";

export interface TeamTokenPayload {
  teamId: string;
  teamCode: string;
  role: "team";
}

export interface AdminTokenPayload {
  username: string;
  role: "admin";
}

export function signTeamToken(payload: TeamTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyTeamToken(token: string): TeamTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.role === "team" && decoded.teamId) {
      return decoded;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.role === "admin") {
      return decoded;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function hashSecret(secret: string): string {
  return bcrypt.hashSync(secret.trim(), 10);
}

export function compareSecret(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain.trim(), hash);
}
