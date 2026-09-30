import { NextResponse } from "next/server";
import { attemptPayload, getAttempt } from "@/lib/exam";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const attempt = await getAttempt(id);
    if (!attempt) return NextResponse.json({ error: "Exam attempt not found." }, { status: 404 });
    return NextResponse.json(attemptPayload(attempt));
  } catch (error) {
    console.error("Unable to load exam", error);
    return NextResponse.json({ error: "Unable to load the exam." }, { status: 503 });
  }
}
