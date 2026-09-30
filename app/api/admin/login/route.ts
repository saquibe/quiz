import { adminCookie, createAdminToken, credentialsAreValid } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Invalid request body." }, { status: 400 });
  const { email, password } = body as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string" || email.length > 254 || password.length > 1024) return Response.json({ error: "Enter a valid email and password." }, { status: 400 });
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) return Response.json({ error: "Admin credentials are not configured on the server." }, { status: 503 });
  if (!credentialsAreValid(email, password)) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", adminCookie(createAdminToken()));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
