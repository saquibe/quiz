"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, ArrowDownWideNarrow, Award, Download, FileSearch, LogOut, RefreshCw, Search, ShieldCheck, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AttemptRow = {
  id: string; name: string; registrationNumber: string; status: "active" | "completed"; score: number | null;
  attemptedCount: number; skippedCount: number; startedAt: string; completedAt: string | null;
  attemptedQuestions: { number: number; section: number; answer: string }[];
  skippedQuestions: { number: number; section: number }[];
};
type DashboardData = { rows: AttemptRow[]; total: number; topThree: { id: string; name: string; registrationNumber: string; score: number | null; completedAt: string | null }[]; stats: { candidates: number; completed: number; active: number; averageScore: number | null; highestScore: number | null } };

const dateTime = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function AdminDashboard({ initiallyAuthenticated }: { initiallyAuthenticated: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signedIn, setSignedIn] = useState(initiallyAuthenticated);
  const [loading, setLoading] = useState(!initiallyAuthenticated);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadResults = useCallback(async (filters: { q?: string; status?: string; sort?: string } = {}) => {
    setLoading(true); setError("");
    const query = new URLSearchParams({ q: filters.q ?? appliedSearch, status: filters.status ?? status, sort: filters.sort ?? sort });
    try {
      const response = await fetch(`/api/admin/attempts?${query}`, { cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) { setSignedIn(false); setData(null); return; }
      if (!response.ok) throw new Error(result.error || "Unable to load results.");
      setData(result); setSignedIn(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load results."); }
    finally { setLoading(false); }
  }, [appliedSearch, sort, status]);

  useEffect(() => { void loadResults(); }, [loadResults]);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      setSignedIn(true); setPassword(""); await loadResults({ q: appliedSearch, status, sort });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign in."); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      window.location.replace("/");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to sign out."); }
    finally { setBusy(false); }
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setAppliedSearch(search.trim()); void loadResults({ q: search.trim(), status, sort }); };
  const exportResults = () => {
    const query = new URLSearchParams({ q: appliedSearch, status, sort });
    window.location.assign(`/api/admin/export?${query}`);
  };

  if (loading && !signedIn) return <main className="medical-grid flex min-h-screen items-center justify-center p-5"><div className="rounded-2xl bg-white px-8 py-7 text-sm text-slate-500 shadow-card">Checking administrator session…</div></main>;

  if (!signedIn) return <main className="medical-grid flex min-h-screen items-center justify-center p-5"><section className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-7 shadow-card sm:p-9"><div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal/10 text-teal"><ShieldCheck className="h-6 w-6"/></div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal">OGSOS · Admin</p><h1 className="mt-2 text-2xl font-bold text-ink">Administrator sign in</h1><p className="mt-2 text-sm leading-6 text-slate-500">Sign in to review candidates and examination results.</p><form onSubmit={signIn} className="mt-7 space-y-4"><label className="block text-sm font-medium text-ink">Admin email<Input type="email" autoComplete="username" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} placeholder="admin@example.com" className="mt-2"/></label><label className="block text-sm font-medium text-ink">Password<Input type="password" autoComplete="current-password" required maxLength={1024} value={password} onChange={event=>setPassword(event.target.value)} placeholder="Enter admin password" className="mt-2"/></label>{error&&<p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<Button className="w-full" disabled={busy}>{busy?"Signing in…":"Sign in securely"}</Button></form><p className="mt-6 text-center text-xs text-slate-400">Admin access only · Exam candidates do not need an account</p></section></main>;

  const stats = data?.stats;
  return <main className="min-h-screen bg-mist"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-white"><Activity className="h-5 w-5"/></div><div><p className="text-sm font-bold text-ink">OGSOS Examination</p><p className="text-xs text-slate-500">Administrator dashboard · 2026</p></div></div><Button variant="outline" size="sm" onClick={signOut} disabled={busy}><LogOut className="h-4 w-4"/> Sign out</Button></div></header>
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal">Salem OG Summit 2026</p><h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Exam results</h1><p className="mt-2 text-sm text-slate-500">Review candidate attempts, scores, and question activity.</p></div><div className="flex gap-2"><Button variant="outline" onClick={()=>void loadResults()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/> Refresh</Button><Button onClick={exportResults}><Download className="h-4 w-4"/> Export CSV</Button></div></div>
      <section className="mt-7 rounded-2xl border border-teal/15 bg-gradient-to-br from-white to-teal/5 p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal"><Trophy className="h-5 w-5"/></div><div><h2 className="font-semibold text-ink">Top 3 candidates · Part B qualifiers</h2><p className="mt-1 text-xs text-slate-500">Ranked by each registration number’s highest completed Part A score.</p></div></div>{data?.topThree.length?<ol className="mt-5 grid gap-3 md:grid-cols-3">{data.topThree.map((candidate,index)=><li key={candidate.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${index===0?"bg-amber-100 text-amber-700":index===1?"bg-slate-100 text-slate-600":"bg-orange-100 text-orange-700"}`}>{index+1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{candidate.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">Reg. {candidate.registrationNumber}</p></div><span className="shrink-0 rounded-lg bg-teal/10 px-2.5 py-1.5 text-sm font-bold tabular-nums text-teal">{candidate.score ?? 0}<span className="text-[10px] font-medium"> / 50</span></span></li>)}</ol>:<p className="mt-5 rounded-xl bg-white p-4 text-sm text-slate-500">Top three will appear after candidates complete Part A.</p>}</section>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[{label:"Candidates",value:stats?.candidates??0,icon:Users},{label:"Completed attempts",value:stats?.completed??0,icon:ShieldCheck},{label:"Average score",value:stats?.averageScore===null||stats?.averageScore===undefined?"—":`${stats.averageScore}/50`,icon:Activity},{label:"Highest score",value:stats?.highestScore===null||stats?.highestScore===undefined?"—":`${stats.highestScore}/50`,icon:Award}].map(card=><div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{card.label}</span><card.icon className="h-4 w-4 text-teal"/></div><p className="mt-3 text-2xl font-bold text-ink">{card.value}</p>{card.label==="Candidates"&&stats&&<p className="mt-1 text-xs text-slate-400">{stats.active} active attempts</p>}</div>)}</div>
      <section className="mt-7 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_170px_190px_auto]"><label className="relative block"><span className="sr-only">Search candidate name or registration number</span><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"/><Input className="pl-10" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search candidate or registration no."/></label><label><span className="sr-only">Filter by attempt status</span><select value={status} onChange={event=>setStatus(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-ink outline-none focus:border-teal"><option value="all">All attempts</option><option value="completed">Completed</option><option value="active">In progress</option></select></label><label className="relative"><ArrowDownWideNarrow className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400"/><select value={sort} onChange={event=>setSort(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-ink outline-none focus:border-teal"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="score-desc">Highest score</option><option value="score-asc">Lowest score</option></select></label><Button type="submit" disabled={loading}><FileSearch className="h-4 w-4"/> Apply</Button></form>{error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}</section>
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-ink">Candidate attempts</h2><p className="mt-1 text-xs text-slate-500">{data?.total??0} matching attempt{data?.total===1?"":"s"}</p></div>{loading&&<span className="text-xs text-slate-400">Updating…</span>}</div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Candidate</th><th className="px-4 py-3">Registration</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Attempted / skipped</th><th className="px-4 py-3">Started</th><th className="px-4 py-3">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{data?.rows.map(row=><><tr key={row.id} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-semibold text-ink">{row.name}</td><td className="px-4 py-4 text-slate-600">{row.registrationNumber}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.status==="completed"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{row.status==="completed"?"Completed":"In progress"}</span></td><td className="px-4 py-4 font-semibold tabular-nums text-ink">{row.score===null?"—":`${row.score} / 50`}</td><td className="px-4 py-4 text-slate-600"><span className="text-teal">{row.attemptedCount} attempted</span><span className="px-1 text-slate-300">·</span><span>{row.skippedCount} skipped</span></td><td className="px-4 py-4 text-xs text-slate-500">{dateTime(row.startedAt)}</td><td className="px-4 py-4"><Button variant="ghost" size="sm" onClick={()=>setExpanded(expanded===row.id?null:row.id)}>{expanded===row.id?"Hide":"View"}</Button></td></tr>{expanded===row.id&&<tr key={`${row.id}-details`}><td colSpan={7} className="bg-slate-50/70 px-5 py-5"><div className="grid gap-5 lg:grid-cols-2"><div><h3 className="text-xs font-bold uppercase tracking-wide text-teal">Attempted answers ({row.attemptedCount})</h3>{row.attemptedQuestions.length?<ol className="mt-3 grid gap-2 sm:grid-cols-2">{row.attemptedQuestions.map(item=><li key={item.number} className="rounded-lg border border-slate-100 bg-white p-3 text-xs"><span className="font-semibold text-ink">Q{item.number} · Section {item.section}</span><p className="mt-1 break-words text-slate-600">{item.answer}</p></li>)}</ol>:<p className="mt-2 text-sm text-slate-500">No answers recorded.</p>}</div><div><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Skipped or unanswered ({row.skippedCount})</h3>{row.skippedQuestions.length?<div className="mt-3 flex flex-wrap gap-2">{row.skippedQuestions.map(item=><span key={item.number} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">Q{item.number} · S{item.section}</span>)}</div>:<p className="mt-2 text-sm text-slate-500">No unanswered questions.</p>}<p className="mt-4 text-xs text-slate-400">Completed: {dateTime(row.completedAt)}</p></div></div></td></tr>}</>)}</tbody></table>{!loading&&data?.rows.length===0&&<div className="px-5 py-14 text-center"><Search className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 font-medium text-ink">No attempts found</p><p className="mt-1 text-sm text-slate-500">Try changing the candidate search or filters.</p></div>}</div></section><p className="mt-5 text-center text-xs text-slate-400">OGSOS Postgraduate Gold Medal Examination · 50 marks</p>
    </div></main>;
}
