import { NextResponse } from "next/server";
import { attemptPayload, getAttempt, submitSection } from "@/lib/exam";

type Context = { params: Promise<{ id: string }> };
export async function POST(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const attempt = await getAttempt(id);
    if (!attempt) return NextResponse.json({ error: "Exam attempt not found." }, { status: 404 });
    if (attempt.status !== "active") return NextResponse.json({ error: "This exam has ended." }, { status: 409 });
    const result = await submitSection(attempt);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(attemptPayload(result.attempt));
  } catch (error) {
    console.error("Unable to submit section", error);
    return NextResponse.json({ error: "Unable to submit this section." }, { status: 503 });
  }
}
