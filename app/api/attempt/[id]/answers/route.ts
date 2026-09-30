import { NextResponse } from "next/server";
import { attemptPayload, getAttempt, remainingQuestionSeconds } from "@/lib/exam";
import { connectDB } from "@/lib/mongodb";
import { ExamAttempt } from "@/lib/models";
import { questions } from "@/lib/questions";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const { questionId, value } = await request.json();
    const attempt = await getAttempt(id);
    if (!attempt) return NextResponse.json({ error: "Exam attempt not found." }, { status: 404 });
    if (attempt.status !== "active") return NextResponse.json({ error: "This exam has ended." }, { status: 409 });
    const question = questions.find(q => q.id === questionId && q.section === attempt.currentSection);
    if (!question) return NextResponse.json({ error: "This section is locked." }, { status: 409 });
    const questionTimerStarted = attempt.questionTimers?.some((item: { questionId: string }) => item.questionId === questionId);
    if (!questionTimerStarted || attempt.activeQuestionId !== questionId || remainingQuestionSeconds(attempt, questionId) <= 0) {
      return NextResponse.json({ error: "This question is not active or its timer has expired." }, { status: 409 });
    }
    const answer = typeof value === "string" ? value.trim() : "";
    if (answer && answer.length > 500) return NextResponse.json({ error: "Answer is too long." }, { status: 400 });
    await connectDB();
    await ExamAttempt.updateOne({ _id: attempt._id, status: "active", currentSection: attempt.currentSection }, {
      $pull: { answers: { questionId } }
    });
    if (answer) await ExamAttempt.updateOne({ _id: attempt._id, status: "active", currentSection: attempt.currentSection }, { $push: { answers: { questionId, value: answer } } });
    const updated = await getAttempt(id);
    return NextResponse.json(attemptPayload(updated));
  } catch (error) {
    console.error("Unable to save answer", error);
    return NextResponse.json({ error: "Unable to save this answer." }, { status: 503 });
  }
}
