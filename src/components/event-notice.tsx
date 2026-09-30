export function EventNotice() {
  return (
    <section className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-xs text-slate-600 sm:grid-cols-3">
      <div>
        <p className="font-bold text-ink">Friday, 2 October 2026</p>
        <p className="mt-1">Part A · Online written exam · 10:30–11:30 AM</p>
      </div>
      <div>
        <p className="font-bold text-ink">Registration is mandatory</p>
        <p className="mt-1">Enter your registered name and registration number above.</p>
      </div>
      <div>
        <p className="font-bold text-ink">Part B · 1:30–3:00 PM on Zoom</p>
        <p className="mt-1">Top 3 Part A candidates qualify for OSCE and structured discussion.</p>
      </div>
    </section>
  );
}
