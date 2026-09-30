import { connectDB } from "@/lib/mongodb";
import { Candidate, ExamAttempt, Question } from "@/lib/models";
import { publicQuestion, questions, sectionInfo } from "@/lib/questions";

export function questionSeconds(section: number) {
  const info = sectionInfo[section - 1];
  return info ? Math.floor(info.durationSeconds / info.count) : 60;
}

function calculateScore(attempt: any) {
  const keyById = new Map(questions.map(q => [q.id, q.correctAnswer]));
  const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
  return (attempt.answers ?? []).reduce((n: number, a: { questionId: string; value: string }) => {
    const key = keyById.get(a.questionId);
    return n + (key && normalize(key) === normalize(a.value) ? 1 : 0);
  }, 0);
}

function timerElapsed(timer: any, now = Date.now()) {
  return (timer?.elapsedSeconds ?? 0) + (timer?.activeSince ? Math.max(0, (now - new Date(timer.activeSince).getTime()) / 1000) : 0);
}

function pauseActiveQuestion(attempt: any, at = new Date()) {
  const timer = attempt.questionTimers?.find((item: any) => item.questionId === attempt.activeQuestionId);
  if (timer?.activeSince) {
    timer.elapsedSeconds = timerElapsed(timer, at.getTime());
    timer.activeSince = undefined;
  }
  attempt.activeQuestionId = undefined;
}

function activateQuestionTimer(attempt: any, questionId: string, at = new Date()) {
  let timer = attempt.questionTimers?.find((item: any) => item.questionId === questionId);
  if (!timer) {
    timer = { questionId, elapsedSeconds: 0 };
    attempt.questionTimers.push(timer);
  }
  if (timerElapsed(timer, at.getTime()) < questionSeconds(questions.find(q => q.id === questionId)?.section ?? 1)) {
    timer.activeSince = at;
  }
  attempt.activeQuestionId = questionId;
}

export function remainingQuestionSeconds(attempt: any, questionId: string) {
  const question = questions.find(q => q.id === questionId);
  const timer = attempt.questionTimers?.find((item: any) => item.questionId === questionId);
  return Math.max(0, Math.ceil(questionSeconds(question?.section ?? attempt.currentSection) - timerElapsed(timer)));
}

export async function prepareQuestions() {
  await connectDB();
  await Question.bulkWrite(questions.map(q => ({
    updateOne: { filter: { questionId: q.id }, update: { $set: { questionId: q.id, question: q.question, options: q.options ?? [], correctAnswer: q.correctAnswer, section: q.section, image: q.image ?? [] } }, upsert: true }
  })));
}

export async function syncAttempt(attempt: any) {
  if (attempt.status !== "active") return attempt;
  while (attempt.currentSection <= 3) {
    const info = sectionInfo[attempt.currentSection - 1];
    const endAt = new Date(attempt.sectionStartedAt).getTime() + info.durationSeconds * 1000;
    if (Date.now() < endAt) break;
    pauseActiveQuestion(attempt, new Date(endAt));
    if (attempt.currentSection === 3) {
      attempt.score = calculateScore(attempt);
      attempt.completedAt = new Date(endAt);
      attempt.status = "completed";
      break;
    }
    attempt.currentSection += 1;
    attempt.sectionStartedAt = new Date(endAt);
    const firstQuestion = questions.find(q => q.section === attempt.currentSection);
    if (firstQuestion) activateQuestionTimer(attempt, firstQuestion.id, new Date(endAt));
  }
  await attempt.save();
  return attempt;
}

export function attemptPayload(attempt: any) {
  if (attempt.status === "completed") return { status: "completed", score: attempt.score, completedAt: attempt.completedAt };
  const section = attempt.currentSection;
  const info = sectionInfo[section - 1];
  const secondsLeft = Math.max(0, Math.ceil((new Date(attempt.sectionStartedAt).getTime() + info.durationSeconds * 1000 - Date.now()) / 1000));
  const questionSecondsLeft = Object.fromEntries(questions.filter(q => q.section === section).map(q => {
    return [q.id, remainingQuestionSeconds(attempt, q.id)];
  }));
  return {
    status: "active", currentSection: section, section: info, secondsLeft,
    activeQuestionId: attempt.activeQuestionId ?? null,
    questions: questions.filter(q => q.section === section).map(publicQuestion),
    questionSecondsLeft,
    canSubmitSection: questions.filter(q => q.section === section).every(q => (attempt.answers ?? []).some((a: any) => a.questionId === q.id && a.value)),
    answers: Object.fromEntries((attempt.answers ?? []).map((a: { questionId: string; value: string }) => [a.questionId, a.value]))
  };
}

export async function startAttempt(name: string, registrationNumber: string) {
  await prepareQuestions();
  const candidate = await Candidate.create({ name: name.trim(), registrationNumber: registrationNumber.trim() });
  const now = new Date();
  const attempt = await ExamAttempt.create({ candidate: candidate._id, startedAt: now, sectionStartedAt: now, questionTimers: [{ questionId: questions[0].id, elapsedSeconds: 0, activeSince: now }], activeQuestionId: questions[0].id });
  return attempt;
}

export async function startQuestion(attempt: any, questionId: string) {
  const question = questions.find(q => q.id === questionId && q.section === attempt.currentSection);
  if (!question) return { error: "This section is locked.", status: 409 } as const;
  if (attempt.activeQuestionId !== questionId) {
    const now = new Date();
    pauseActiveQuestion(attempt, now);
    activateQuestionTimer(attempt, questionId, now);
    await attempt.save();
  }
  const secondsLeft = remainingQuestionSeconds(attempt, questionId);
  return { secondsLeft } as const;
}

export async function submitSection(attempt: any) {
  const currentQuestions = questions.filter(q => q.section === attempt.currentSection);
  const allAnswered = currentQuestions.every(q => (attempt.answers ?? []).some((a: any) => a.questionId === q.id && a.value));
  if (!allAnswered) return { error: "Answer every question in this section before submitting.", status: 400 } as const;
  pauseActiveQuestion(attempt);
  if (attempt.currentSection === 3) {
    attempt.score = calculateScore(attempt);
    attempt.completedAt = new Date();
    attempt.status = "completed";
  } else {
    attempt.currentSection += 1;
    attempt.sectionStartedAt = new Date();
    const firstQuestion = questions.find(q => q.section === attempt.currentSection);
    if (firstQuestion) activateQuestionTimer(attempt, firstQuestion.id, attempt.sectionStartedAt);
  }
  await attempt.save();
  return { attempt } as const;
}

export async function getAttempt(id: string) {
  await connectDB();
  if (!/^[a-f\d]{24}$/i.test(id)) return null;
  const attempt = await ExamAttempt.findById(id);
  if (!attempt) return null;
  return syncAttempt(attempt);
}
