import { requestIsAdmin } from "@/lib/admin-auth";
import { readAdminAttempts } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!requestIsAdmin(request)) return Response.json({ error: "Admin sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const result = await readAdminAttempts(new URL(request.url));
    if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
    const completed = result.rows.filter(row => row.status === "completed");
    const rankingUrl = new URL(request.url);
    rankingUrl.search = "?status=completed&sort=score-desc";
    const rankingResult = await readAdminAttempts(rankingUrl);
    if ("error" in rankingResult) return Response.json({ error: rankingResult.error }, { status: 400 });
    const bestAttemptByRegistration = new Map<string, (typeof rankingResult.rows)[number]>();
    for (const row of rankingResult.rows) {
      const key = row.registrationNumber.trim().toLocaleLowerCase();
      const previous = bestAttemptByRegistration.get(key);
      if (!previous || (row.score ?? -1) > (previous.score ?? -1)) bestAttemptByRegistration.set(key, row);
    }
    const topThree = [...bestAttemptByRegistration.values()]
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (a.completedAt ?? "").localeCompare(b.completedAt ?? ""))
      .slice(0, 3)
      .map(({ id, name, registrationNumber, score, completedAt }) => ({ id, name, registrationNumber, score, completedAt }));
    return Response.json({ ...result, topThree, stats: { candidates: result.rows.length, completed: completed.length, active: result.rows.length - completed.length, averageScore: completed.length ? Math.round(completed.reduce((total, row) => total + (row.score ?? 0), 0) / completed.length * 10) / 10 : null, highestScore: completed.length ? Math.max(...completed.map(row => row.score ?? 0)) : null } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin dashboard query failed", error);
    return Response.json({ error: "Unable to load the results right now." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
