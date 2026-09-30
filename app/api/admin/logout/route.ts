import { adminCookie } from "@/lib/admin-auth";

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.set("Set-Cookie", adminCookie("", 0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
