"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, GraduationCap, HeartPulse, Image as ImageIcon, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EventNotice } from "@/components/event-notice";

type PublicQuestion = { id: string; section: 1|2|3; question: string; options?: string[]; image?: string[] };
type Section = { id: 1|2|3; title: string; shortTitle: string; count: number; durationSeconds: number };
type ExamPayload = { status: "active"; currentSection: 1|2|3; activeQuestionId: string | null; section: Section; secondsLeft: number; questionSecondsLeft: Record<string,number>; canSubmitSection: boolean; questions: PublicQuestion[]; answers: Record<string,string> } | { status: "completed" };

function formatTime(seconds: number) { const mm = Math.floor(seconds / 60).toString().padStart(2,"0"); const ss = (seconds % 60).toString().padStart(2,"0"); return `${mm}:${ss}`; }

export default function Home() {
  const [candidateName, setCandidateName] = useState("");
  const [registration, setRegistration] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamPayload | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [navigationNotice, setNavigationNotice] = useState(false);
  const pending = useRef<Promise<void>[]>([]);
  const sectionRef = useRef<number | null>(null);
  const activeExam = exam?.status === "active" ? exam : null;
  const currentQuestion = activeExam?.questions[questionIndex];
  const questionSecondsLeft = currentQuestion && activeExam ? activeExam.questionSecondsLeft[currentQuestion.id] ?? 60 : 0;
  const answeredCount = useMemo(() => activeExam?.questions.filter(q => Boolean(activeExam.answers[q.id])).length ?? 0, [activeExam]);

  const applyExam = useCallback((data: ExamPayload) => {
    if (data.status === "completed") {
      window.sessionStorage.removeItem("ogsos-exam-session");
      setExam(data);
      return;
    }
    setExam(data);
    const activeIndex = data.activeQuestionId ? data.questions.findIndex(q => q.id === data.activeQuestionId) : -1;
    if (sectionRef.current !== null && sectionRef.current !== data.currentSection) setQuestionIndex(activeIndex >= 0 ? activeIndex : 0);
    else if (activeIndex >= 0) setQuestionIndex(activeIndex);
    else setQuestionIndex(index => Math.min(index, data.questions.length - 1));
    sectionRef.current = data.currentSection;
  }, []);

  const loadAttempt = useCallback(async (id: string) => {
    const response = await fetch(`/api/attempt/${id}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load the exam.");
    applyExam(data);
  }, [applyExam]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("ogsos-exam-session");
    if (!saved) return;
    try {
      const session = JSON.parse(saved) as { attemptId?: string; name?: string; registrationNumber?: string };
      if (!session.attemptId || !session.name || !session.registrationNumber) throw new Error("Invalid exam session");
      setCandidateName(session.name);
      setRegistration(session.registrationNumber);
      setAttemptId(session.attemptId);
      loadAttempt(session.attemptId).catch(e => setError(e.message));
    } catch {
      window.sessionStorage.removeItem("ogsos-exam-session");
    }
  }, [loadAttempt]);

  useEffect(() => {
    if (!attemptId || exam?.status === "completed") return;
    window.history.pushState({ examGuard: true }, "", window.location.href);
    const blockBackNavigation = () => {
      setNavigationNotice(true);
      window.history.forward();
    };
    window.addEventListener("popstate", blockBackNavigation);
    return () => window.removeEventListener("popstate", blockBackNavigation);
  }, [attemptId, exam?.status === "completed"]);

  useEffect(() => {
    if (!attemptId || !activeExam) return;
    const timer = window.setInterval(() => {
      setExam(previous => {
        if (previous?.status !== "active") return previous;
        return { ...previous, secondsLeft: Math.max(0, previous.secondsLeft - 1), questionSecondsLeft: { ...previous.questionSecondsLeft, [currentQuestion?.id ?? ""]: Math.max(0, (previous.questionSecondsLeft[currentQuestion?.id ?? ""] ?? 60) - 1) } };
      });
    }, 1000);
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") loadAttempt(attemptId).catch(e => setError(e.message));
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [attemptId, activeExam?.status, currentQuestion?.id, loadAttempt]);

  useEffect(() => {
    if (!attemptId || !activeExam || activeExam.secondsLeft > 0) return;
    loadAttempt(attemptId).catch(e => setError(e.message));
  }, [activeExam?.secondsLeft, activeExam?.status, attemptId, loadAttempt]);

  const startExam = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/attempt/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: candidateName, registrationNumber: registration }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start the exam.");
      window.sessionStorage.setItem("ogsos-exam-session", JSON.stringify({ attemptId: data.attemptId, name: candidateName.trim(), registrationNumber: registration.trim() }));
      setAttemptId(data.attemptId); await loadAttempt(data.attemptId);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to start the exam."); }
    finally { setBusy(false); }
  };

  const saveAnswer = (questionId: string, value: string) => {
    if (!attemptId || !activeExam || (activeExam.questionSecondsLeft[questionId] ?? 0) <= 0) return;
    setExam({ ...activeExam, answers: { ...activeExam.answers, [questionId]: value } });
    const task = (async () => {
      const response = await fetch(`/api/attempt/${attemptId}/answers`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId, value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save this answer.");
      applyExam(data);
    })().catch(e => setError(e instanceof Error ? e.message : "Unable to save this answer."));
    pending.current.push(task);
    void task.finally(() => { pending.current = pending.current.filter(item => item !== task); });
  };

  const goToQuestion = async (index: number) => {
    await Promise.all(pending.current);
    if (!attemptId || !activeExam) return;
    const target = Math.max(0, Math.min(index, activeExam.questions.length - 1));
    if (target === questionIndex) return;
    try {
      const response = await fetch(`/api/attempt/${attemptId}/visit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: activeExam.questions[target].id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to open this question.");
      applyExam(data);
      setQuestionIndex(target);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to open this question."); }
  };

  const submitSection = async () => {
    if (!attemptId || !activeExam?.canSubmitSection) return;
    await Promise.all(pending.current);
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/attempt/${attemptId}/submit`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit this section.");
      applyExam(data);
      if (data.status === "active") setQuestionIndex(0);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to submit this section."); }
    finally { setSubmitting(false); }
  };

  if (exam?.status === "completed") return <main className="medical-grid flex min-h-screen items-center justify-center px-4 py-10"><section className="w-full max-w-2xl rounded-[28px] bg-white px-7 py-12 text-center shadow-card sm:px-14 sm:py-16"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal/10 text-teal"><CheckCircle2 className="h-9 w-9"/></div><p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-teal">OGSOS Postgraduate Gold Medal Examination 2026</p><h1 className="mt-3 text-3xl font-bold text-ink sm:text-4xl">Congratulations{candidateName ? `, ${candidateName}` : ""}!</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-600">Your examination has been submitted successfully. Your responses have been saved. Thank you for participating.</p><Button className="mt-8" onClick={()=>window.location.replace("/")}>Go to home page <ArrowRight className="h-4 w-4"/></Button></section></main>;

  if (!activeExam) return <main className="medical-grid min-h-screen px-4 py-8 sm:py-14"><div className="mx-auto max-w-5xl">
    <header className="mb-8 flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal text-white shadow-lg shadow-teal/20"><Stethoscope className="h-6 w-6"/></div><div><p className="text-sm font-bold tracking-wide text-ink">OGSOS</p><p className="text-xs text-slate-500">Examination Portal</p></div></div><div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-medium text-slate-600 sm:flex"><ShieldCheck className="h-4 w-4 text-teal"/> Secure examination session</div><Button variant="outline" size="sm" asChild><a href="/admin">Admin login <ArrowRight className="h-4 w-4"/></a></Button></div></header>
    <EventNotice />
    <div className="grid overflow-hidden rounded-[28px] bg-white shadow-card lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative overflow-hidden bg-ink px-7 py-10 text-white sm:px-11 sm:py-14"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10"/><div className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-white/10"/><div className="relative"><div className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-teal-200"><GraduationCap className="h-4 w-4"/> Gold Medal Examination · 2026</div><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/20 text-teal-200"><HeartPulse className="h-7 w-7"/></div><h1 className="mt-6 max-w-md text-3xl font-bold leading-tight sm:text-[38px]">OGSOS Postgraduate Gold Medal Examination</h1><p className="mt-4 max-w-md text-sm leading-6 text-slate-300">Welcome to your online examination. Please enter your candidate details to begin.</p><div className="mt-10 grid grid-cols-3 gap-3">{[{n:"50",label:"Questions"},{n:"50",label:"Marks"},{n:"50 min",label:"Duration"}].map(x=><div key={x.label} className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xl font-bold">{x.n}</p><p className="mt-1 text-[11px] text-slate-300">{x.label}</p></div>)}</div><div className="mt-9 space-y-3">{["Three timed sections","Answers save as you go","Sections lock when time ends"].map(t=><div key={t} className="flex items-center gap-2.5 text-xs text-slate-300"><Check className="h-4 w-4 text-teal-200"/>{t}</div>)}</div></div></section>
      <section className="px-7 py-10 sm:px-11 sm:py-14"><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-teal">Candidate details</p><h2 className="mt-2 text-2xl font-bold text-ink">Before you begin</h2><p className="mt-2 text-sm leading-6 text-slate-500">Enter the details used for this examination attempt.</p></div><form onSubmit={startExam} className="space-y-5"><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Full name</span><Input autoComplete="name" required maxLength={120} placeholder="Enter your full name" value={candidateName} onChange={e=>setCandidateName(e.target.value)}/></label><label className="block"><span className="mb-2 block text-sm font-semibold text-ink">Registration number</span><Input required maxLength={80} placeholder="Enter your registration number" value={registration} onChange={e=>setRegistration(e.target.value)}/></label>{error&&<p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<div className="rounded-2xl bg-mist p-4 text-xs leading-5 text-slate-600"><div className="flex gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-teal"/><p>Section timers are 20, 20 and 10 minutes. Each question has 60 seconds; its timer pauses when you leave it and resumes when you return. Submit a section after answering all its questions, or it will advance when its section timer ends.</p></div></div><Button type="submit" disabled={busy} className="mt-2 w-full">{busy?"Preparing exam…":<>Start examination <ArrowRight className="h-4 w-4"/></>}</Button></form><p className="mt-6 text-center text-[11px] text-slate-400">No login or password is required.</p></section>
    </div><p className="mt-6 text-center text-xs text-slate-400">OGSOS · Postgraduate Gold Medal Examination 2026</p>
  </div></main>;

  const timerTone = activeExam.secondsLeft <= 60 ? "text-red-600 bg-red-50 border-red-100" : "text-ink bg-white border-slate-200";
  const questionTimerTone = questionSecondsLeft <= 10 ? "text-red-600 bg-red-50 border-red-100" : "text-ink bg-white border-slate-200";
  return <main className="min-h-screen bg-[#f3f7f8] px-3 py-4 sm:px-6 sm:py-7"><div className="mx-auto max-w-7xl">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm sm:px-6"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-white"><Stethoscope className="h-5 w-5"/></div><div><p className="text-sm font-bold text-ink">OGSOS Postgraduate Gold Medal Examination 2026</p><p className="text-xs text-slate-500">{candidateName} <span className="px-1">·</span> Reg. {registration}</p></div></div><div className="flex gap-2"><div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${timerTone}`}><Clock3 className="h-4 w-4"/><span className="font-mono text-lg font-bold tabular-nums">{formatTime(activeExam.secondsLeft)}</span><span className="hidden text-xs font-medium sm:inline">section</span></div><div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${questionTimerTone}`}><Clock3 className="h-4 w-4"/><span className="font-mono text-lg font-bold tabular-nums">{formatTime(questionSecondsLeft)}</span><span className="hidden text-xs font-medium sm:inline">question</span></div></div></header>
    <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">{[{n:1,label:"MCQs",mins:"20 min"},{n:2,label:"One Word",mins:"20 min"},{n:3,label:"Image Based",mins:"10 min"}].map(s=><div key={s.n} className={`flex items-center gap-2 rounded-xl border px-3 py-3 sm:gap-3 sm:px-4 ${activeExam.currentSection===s.n?"border-teal bg-teal/5":"border-slate-200 bg-white"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${activeExam.currentSection===s.n?"bg-teal text-white":"bg-slate-100 text-slate-500"}`}>{s.n}</span><div className="min-w-0"><p className={`truncate text-xs font-semibold sm:text-sm ${activeExam.currentSection===s.n?"text-teal":"text-ink"}`}>Section {s.n} <span className="hidden sm:inline">· {s.label}</span></p><p className="text-[10px] text-slate-500 sm:text-xs">{s.mins}</p></div></div>)}</div>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"><section className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-8"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-teal">{activeExam.section.shortTitle}</p><p className="mt-1 text-sm font-semibold text-ink">{activeExam.section.title}</p></div><span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Question {questionIndex+1} of {activeExam.questions.length}</span></div>
      {currentQuestion&&<div className="px-5 py-6 sm:px-8 sm:py-8"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal/10 text-sm font-bold text-teal">{questionIndex+1}</span><h2 className="pt-1 text-base font-semibold leading-7 text-ink sm:text-lg">{currentQuestion.question}</h2></div>
        {currentQuestion.image?.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{currentQuestion.image.map(src=><div key={src} className="relative min-h-36 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><Image src={src} alt={`Question ${questionIndex+1} reference image`} width={900} height={620} className="h-auto max-h-[420px] w-full object-contain" unoptimized/></div>)}</div>:null}
        {currentQuestion.options?.length ? <div className="mt-6 space-y-3">{currentQuestion.options.map((option,index)=>{const selected=activeExam.answers[currentQuestion.id]===option;return <button key={option} disabled={questionSecondsLeft===0} onClick={()=>saveAnswer(currentQuestion.id,option)} className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 sm:p-4 ${selected?"border-teal bg-teal/5 ring-1 ring-teal/20":"border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${selected?"border-teal bg-teal text-white":"border-slate-300 text-slate-500"}`}>{String.fromCharCode(65+index)}</span><span className="pt-0.5 leading-5 text-ink">{option}</span></button>})}</div>:<div className="mt-6"><label className="mb-2 block text-sm font-medium text-slate-600">Your answer</label><textarea rows={3} disabled={questionSecondsLeft===0} value={activeExam.answers[currentQuestion.id]??""} onChange={e=>setExam(previous=>previous?.status==="active"?{...previous,answers:{...previous.answers,[currentQuestion.id]:e.target.value}}:previous)} onBlur={e=>saveAnswer(currentQuestion.id,e.currentTarget.value)} placeholder="Type your answer here" className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm text-ink outline-none placeholder:text-slate-400 focus:border-teal focus:ring-2 focus:ring-teal/15 disabled:bg-slate-100"/></div>}
        {questionSecondsLeft===0&&<p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Time for this question has ended. It is locked. Use Next or the question palette to continue.</p>}
      </div>}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 sm:px-8"><Button variant="outline" onClick={()=>goToQuestion(questionIndex-1)} disabled={questionIndex===0}><ChevronLeft className="h-4 w-4"/>Previous</Button>{activeExam.canSubmitSection?<Button onClick={submitSection} disabled={submitting}>{activeExam.currentSection===3?"Submit exam":"Submit section & continue"}<ChevronRight className="h-4 w-4"/></Button>:<div className="flex gap-2"><Button variant="ghost" onClick={()=>goToQuestion(questionIndex+1)} disabled={questionIndex===activeExam.questions.length-1}>Skip <ArrowRight className="h-4 w-4"/></Button><Button onClick={()=>goToQuestion(questionIndex+1)} disabled={questionIndex===activeExam.questions.length-1}>Next <ChevronRight className="h-4 w-4"/></Button></div>}</div>
    </section>
    <aside className="rounded-2xl bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-ink">Question palette</p><p className="mt-1 text-xs text-slate-500">Select a question to navigate</p></div>{activeExam.currentSection===3&&<ImageIcon className="h-4 w-4 text-teal"/>}</div><div className="mt-5 grid grid-cols-5 gap-2">{activeExam.questions.map((q,index)=>{const answered=Boolean(activeExam.answers[q.id]);const current=index===questionIndex;return <button key={q.id} onClick={()=>goToQuestion(index)} aria-label={`Go to question ${index+1}`} className={`h-10 rounded-lg border text-xs font-semibold transition ${current?"border-teal bg-teal text-white":answered?"border-teal/20 bg-teal/10 text-teal":"border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{index+1}</button>})}</div><div className="mt-5 flex items-center gap-4 border-t border-slate-100 pt-4 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-teal"/>Answered</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border border-slate-300"/>Unanswered</span></div><div className="mt-5 rounded-xl bg-mist p-3.5"><p className="text-xs font-semibold text-ink">Section progress</p><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{answeredCount} of {activeExam.questions.length} answered</span><span>{Math.round(answeredCount/activeExam.questions.length*100)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal transition-all" style={{width:`${answeredCount/activeExam.questions.length*100}%`}}/></div></div>{activeExam.canSubmitSection?<p className="mt-5 rounded-xl bg-teal/5 p-3.5 text-center text-xs font-medium text-teal">All questions answered. Submit this section below.</p>:<><Button className="mt-5 w-full" variant="outline" disabled>Submit section &amp; continue</Button><p className="mt-2 text-center text-[11px] text-slate-500">Answer every question to enable section submit.</p></>}<p className="mt-4 text-[11px] leading-5 text-slate-500">Each question receives 60 seconds. Skipping pauses its timer; returning resumes the remaining time. Expired questions lock.</p></aside></div>
    {navigationNotice&&<p role="status" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Browser back is disabled during the examination. Use the exam navigation buttons instead.</p>}
    {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <footer className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400"><ShieldCheck className="h-3.5 w-3.5"/> Your answers are saved during the examination session.</footer>
  </div></main>;
}
