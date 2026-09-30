import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "ogsos_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;

function secret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function credentialsAreValid(email: unknown, password: unknown) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || typeof email !== "string" || typeof password !== "string") return false;
  const equal = (left: string, right: string) => {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  return equal(email.trim().toLowerCase(), adminEmail.trim().toLowerCase()) && equal(password, adminPassword);
}

export function createAdminToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function isAdminTokenValid(token: string | undefined) {
  if (!token || !secret()) return false;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return false;
  const expected = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof data.exp === "number" && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function requestIsAdmin(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const pair = cookieHeader.split(";").map(value => value.trim()).find(value => value.startsWith(`${ADMIN_COOKIE}=`));
  return isAdminTokenValid(pair?.slice(ADMIN_COOKIE.length + 1));
}

export function adminCookie(token: string, maxAge = SESSION_SECONDS) {
  return `${ADMIN_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
