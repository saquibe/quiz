import { questions } from "@/lib/questions";

export type AdminFilters = { search: string; status: "all" | "active" | "completed"; sort: "newest" | "oldest" | "score-desc" | "score-asc" };
type AttemptedQuestion = { number: number; section: number; answer: string };
type SkippedQuestion = { number: number; section: number };
export type AdminAttemptRow = { id: string; name: string; registrationNumber: string; status: string; score: number | null; attemptedCount: number; skippedCount: number; attemptedQuestions: AttemptedQuestion[]; skippedQuestions: SkippedQuestion[]; startedAt: string; completedAt: string | null };

export function parseAdminFilters(url: URL): AdminFilters | null {
  const search = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "all";
  const sort = url.searchParams.get("sort") ?? "newest";
  if (search.length > 100 || !["all", "active", "completed"].includes(status) || !["newest", "oldest", "score-desc", "score-asc"].includes(sort)) return null;
  return { search: search.trim(), status: status as AdminFilters["status"], sort: sort as AdminFilters["sort"] };
}

export function serializeAttempts(attempts: any[]): AdminAttemptRow[] {
  const questionById = new Map(questions.map((question, index) => [question.id, { index: index + 1, section: question.section }]));
  return attempts.map(attempt => {
    const candidate = attempt.candidate;
    const answers = (attempt.answers ?? []).filter((answer: any) => typeof answer.value === "string" && answer.value.trim());
    const answeredIds = new Set(answers.map((answer: any) => answer.questionId));
    const attemptedQuestions = answers.map((answer: any): AttemptedQuestion | null => {
      const question = questionById.get(answer.questionId);
      return question ? { number: question.index, section: question.section, answer: answer.value } : null;
    }).filter((item: AttemptedQuestion | null): item is AttemptedQuestion => item !== null);
    const skippedQuestions = questions.map((question, index): SkippedQuestion | null => !answeredIds.has(question.id) ? { number: index + 1, section: question.section } : null).filter((item): item is SkippedQuestion => item !== null);
    return {
      id: String(attempt._id),
      name: candidate?.name ?? "Unknown candidate",
      registrationNumber: candidate?.registrationNumber ?? "—",
      status: attempt.status,
      score: attempt.status === "completed" ? Number(attempt.score ?? 0) : null,
      attemptedCount: attemptedQuestions.length,
      skippedCount: skippedQuestions.length,
      attemptedQuestions,
      skippedQuestions,
      startedAt: new Date(attempt.startedAt).toISOString(),
      completedAt: attempt.completedAt ? new Date(attempt.completedAt).toISOString() : null
    };
  });
}

export function toCsv(rows: ReturnType<typeof serializeAttempts>) {
  const quote = (value: unknown) => {
    const text = String(value ?? "");
    const safeText = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
    return `"${safeText.replaceAll('"', '""')}"`;
  };
  const lines = [["Candidate", "Registration Number", "Status", "Score", "Attempted", "Skipped", "Started At", "Completed At", "Attempted Questions", "Skipped Questions"].map(quote).join(",")];
  for (const row of rows) {
    lines.push([
      row.name, row.registrationNumber, row.status, row.score === null ? "" : `${row.score}/50`, row.attemptedCount, row.skippedCount,
      row.startedAt, row.completedAt ?? "",
      row.attemptedQuestions.map(item => `Q${item.number} (S${item.section}): ${item.answer}`).join(" | "),
      row.skippedQuestions.map(item => `Q${item.number} (S${item.section})`).join(" | ")
    ].map(quote).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}`;
}
