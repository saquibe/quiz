import { NextResponse } from "next/server";
import { startAttempt } from "@/lib/exam";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const registrationNumber = typeof body.registrationNumber === "string" ? body.registrationNumber.trim() : "";
    if (!name || !registrationNumber) return NextResponse.json({ error: "Full name and registration number are required." }, { status: 400 });
    if (name.length > 120 || registrationNumber.length > 80) return NextResponse.json({ error: "Please check the details and try again." }, { status: 400 });
    const attempt = await startAttempt(name, registrationNumber);
    return NextResponse.json({ attemptId: attempt.id });
  } catch (error) {
    console.error("Unable to start exam", error);
    return NextResponse.json({ error: "Unable to connect to the exam database. Please try again." }, { status: 503 });
  }
}
