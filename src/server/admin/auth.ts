import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";

export const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 12 * 3600_000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

// Basic brute-force protection per email (per process). Use a shared store
// (e.g. Postgres or Redis) if more than one instance runs.
let dummyHash: string | undefined;
const failures = new Map<string, { count: number; until: number }>();

export async function login(email: string, password: string): Promise<boolean> {
  const key = email.toLowerCase();
  const f = failures.get(key);
  if (f && f.count >= 5 && f.until > Date.now()) return false;

  const user = await db.adminUser.findUnique({ where: { email: key } });
  // Compare against a dummy hash when the user does not exist to keep timing similar.
  dummyHash ??= await bcrypt.hash("timing-equaliser", 12);
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !ok) {
    const count = (f?.count ?? 0) + 1;
    failures.set(key, { count, until: Date.now() + 15 * 60_000 });
    return false;
  }
  failures.delete(key);

  const token = randomBytes(32).toString("base64url");
  await db.adminSession.create({ data: { tokenHash: hash(token), userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return true;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.adminSession.deleteMany({ where: { tokenHash: hash(token) } });
  jar.delete(SESSION_COOKIE);
}

export async function getAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.adminSession.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function hashPassword(password: string) {
  if (password.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres");
  return bcrypt.hash(password, 12);
}
