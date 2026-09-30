import { requestIsAdmin } from "@/lib/admin-auth";
import { readAdminAttempts } from "@/lib/admin-api";
import { toCsv } from "@/lib/admin-results";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!requestIsAdmin(request)) return Response.json({ error: "Admin sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await readAdminAttempts(new URL(request.url));
    if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
    return new Response(toCsv(result.rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=ogsos-exam-results.csv", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin CSV export failed", error);
    return Response.json({ error: "Unable to export the results right now." }, { status: 503 });
  }
}
