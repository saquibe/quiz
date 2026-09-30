import { Candidate, ExamAttempt } from "@/lib/models";
import { connectDB } from "@/lib/mongodb";
import { parseAdminFilters, serializeAttempts } from "@/lib/admin-results";

export async function readAdminAttempts(url: URL) {
  const filters = parseAdminFilters(url);
  if (!filters) return { error: "Invalid dashboard filters." } as const;
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filters.status !== "all") query.status = filters.status;
  if (filters.search) {
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const candidates = await Candidate.find({ $or: [{ name: { $regex: escaped, $options: "i" } }, { registrationNumber: { $regex: escaped, $options: "i" } }] }).select("_id").limit(5000).lean();
    query.candidate = { $in: candidates.map(candidate => candidate._id) };
  }
  const attempts = await ExamAttempt.find(query).populate("candidate", "name registrationNumber").sort({ startedAt: -1 }).limit(5000).lean();
  const rows = serializeAttempts(attempts);
  if (filters.sort === "oldest") rows.reverse();
  if (filters.sort === "score-desc") rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.startedAt.localeCompare(a.startedAt));
  if (filters.sort === "score-asc") rows.sort((a, b) => (a.score ?? 51) - (b.score ?? 51) || b.startedAt.localeCompare(a.startedAt));
  return { rows, total: rows.length } as const;
}
