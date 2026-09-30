import { NextResponse } from "next/server";
import { attemptPayload, getAttempt, startQuestion } from "@/lib/exam";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const { questionId } = await request.json();
    const attempt = await getAttempt(id);
    if (!attempt) return NextResponse.json({ error: "Exam attempt not found." }, { status: 404 });
    if (attempt.status !== "active") return NextResponse.json({ error: "This exam has ended." }, { status: 409 });
    const result = await startQuestion(attempt, questionId);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(attemptPayload(attempt));
  } catch (error) {
    console.error("Unable to start question timer", error);
    return NextResponse.json({ error: "Unable to open this question." }, { status: 503 });
  }
}
