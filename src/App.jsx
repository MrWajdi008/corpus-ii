import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Stethoscope, CheckCircle2, Flag, BookOpen, ListChecks,
  Layers, ClipboardCheck, ChevronLeft, ChevronRight, X,
  Search, BarChart2, RotateCcw, AlertCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Supabase client — keys injected by Vercel environment variables    */
/* ------------------------------------------------------------------ */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/* ------------------------------------------------------------------ */
/*  DB row (snake_case) → app object (camelCase)                       */
/* ------------------------------------------------------------------ */
function transformRow(row) {
  const base = {
    id: row.id, type: row.type, module: row.module,
    difficulty: row.difficulty, flags: row.flags || [],
  };
  if (row.type === "SBA") {
    return {
      ...base,
      stem: row.stem, lead: row.lead, options: row.options,
      correct: row.correct, explanation: row.explanation,
      whyWrong: row.why_wrong, teaching: row.teaching, ref: row.ref,
    };
  }
  return {
    ...base,
    theme: row.theme, instruction: row.instruction,
    optionList: row.option_list, stems: row.stems,
  };
}

/* ------------------------------------------------------------------ */
/*  Progress — localStorage (personal, per-device, no login needed)   */
/* ------------------------------------------------------------------ */
const PROG_KEY = "corpus2:progress:v1";
function loadProg() {
  try { return JSON.parse(localStorage.getItem(PROG_KEY) || "{}"); }
  catch { return {}; }
}
function saveProg(p) {
  try { localStorage.setItem(PROG_KEY, JSON.stringify(p)); }
  catch {}
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const MODULES = [
  "Teaching, appraisal & assessment",
  "Core surgical skills",
  "Antenatal care",
  "Maternal medicine",
  "Management of labour",
  "Management of delivery",
  "Postpartum problems (mother)",
  "Neonatal problems",
  "Gynaecological problems",
  "Subfertility",
  "Sexual & reproductive health",
  "Early pregnancy care",
  "Gynaecological oncology",
  "Urogynaecology & pelvic floor problems",
];

const G = {
  green: "#0f6e56", greenSoft: "#e1f5ee",
  paper: "#f7f5ef", ink: "#1b2620", muted: "#6b6b63",
  line: "#dcd9cf", amber: "#854f0b", amberSoft: "#faeeda",
  red: "#a32d2d", redSoft: "#fceaea", white: "#ffffff",
};

/* ------------------------------------------------------------------ */
/*  Shared tiny components                                             */
/* ------------------------------------------------------------------ */
function Pill({ children, tone = "neutral" }) {
  const t = {
    neutral: { bg: "#efece3", c: G.ink },
    hard:    { bg: "#faece7", c: "#712b13" },
    mod:     { bg: G.amberSoft, c: G.amber },
    type:    { bg: "#eeedfe", c: "#3c3489" },
  };
  const s = t[tone] || t.neutral;
  return (
    <span style={{ background: s.bg, color: s.c, padding: "2px 10px",
      borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
      {children}
    </span>
  );
}

function Ref({ r }) {
  if (!r) return null;
  return (
    <p style={{ fontSize: 11, fontStyle: "italic", color: G.green,
      marginTop: 5, display: "flex", alignItems: "center", gap: 4, margin: "5px 0 0" }}>
      <BookOpen size={10} />{r}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  FLAG BUTTON                                                        */
/* ------------------------------------------------------------------ */
function FlagBtn({ onFlag, already }) {
  const [open, setOpen] = useState(false);
  const reasons = [
    "Answer key looks wrong",
    "Guideline may be out of date",
    "Ambiguous — two correct answers",
    "Typo or unclear stem",
  ];
  if (already)
    return (
      <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99,
        background: G.redSoft, color: G.red, display: "flex", alignItems: "center", gap: 4 }}>
        <Flag size={11} />Flagged
      </span>
    );
  if (!open)
    return (
      <button onClick={() => setOpen(true)} style={{ fontSize: 12, padding: "4px 12px",
        borderRadius: 99, border: `1px solid ${G.line}`, background: G.white,
        color: G.amber, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
        <Flag size={12} />Flag
      </button>
    );
  return (
    <div style={{ background: G.white, border: `1px solid ${G.line}`, borderRadius: 10,
      padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
      {reasons.map(r => (
        <button key={r} onClick={() => { onFlag(r); setOpen(false); }}
          style={{ fontSize: 12, textAlign: "left", padding: "5px 10px", borderRadius: 6,
            background: "none", border: "none", cursor: "pointer", color: G.ink }}>
          {r}
        </button>
      ))}
      <button onClick={() => setOpen(false)}
        style={{ fontSize: 11, color: G.muted, background: "none", border: "none",
          cursor: "pointer", padding: "3px 10px", textAlign: "left" }}>
        Cancel
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SBA BODY                                                           */
/* ------------------------------------------------------------------ */
function SBABody({ q, pick, onPick }) {
  return (
    <>
      <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 12 }}>{q.stem}</p>
      <p style={{ fontSize: 14, fontStyle: "italic", color: G.muted, marginBottom: 14 }}>{q.lead}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {(q.options || []).map(o => {
          let bg = G.white, bdr = G.line, lc = G.muted;
          if (pick) {
            if (o.l === q.correct)   { bg = G.greenSoft; bdr = G.green; lc = G.green; }
            else if (pick === o.l)   { bg = G.redSoft;   bdr = G.red;   lc = G.red;   }
          }
          return (
            <button key={o.l} disabled={!!pick} onClick={() => onPick(o.l)}
              style={{ textAlign: "left", fontSize: 14, padding: "10px 14px", borderRadius: 9,
                border: `1px solid ${bdr}`, background: bg,
                cursor: pick ? "default" : "pointer",
                display: "flex", gap: 10, lineHeight: 1.55 }}>
              <span style={{ fontWeight: 600, color: lc, minWidth: 20 }}>{o.l}.</span>
              <span>{o.t}</span>
            </button>
          );
        })}
      </div>
      {pick && (
        <div style={{ background: G.paper, borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.7 }}>
          <p style={{ fontWeight: 600, color: G.green, marginBottom: 6,
            display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={14} />
            Answer: {q.correct} — {(q.options || []).find(o => o.l === q.correct)?.t}
          </p>
          <p style={{ marginBottom: 8 }}>{q.explanation}</p>
          <p style={{ color: G.muted, marginBottom: 8 }}>
            <strong>Why the distractors fail:</strong> {q.whyWrong}
          </p>
          <p style={{ borderLeft: `2px solid ${G.green}`, paddingLeft: 10,
            color: G.muted, marginBottom: 6 }}>
            <strong>What it&apos;s really testing:</strong> {q.teaching}
          </p>
          <Ref r={q.ref} />
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  EMQ BODY                                                           */
/* ------------------------------------------------------------------ */
function EMQBody({ q, picks, setPicks, done, onSubmit }) {
  return (
    <>
      <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{q.theme}</p>
      <p style={{ fontSize: 13, fontStyle: "italic", color: G.muted, marginBottom: 12 }}>
        {q.instruction}
      </p>
      <div style={{ background: G.paper, borderRadius: 8, padding: 10, marginBottom: 14,
        fontSize: 12, color: G.muted, lineHeight: 1.9 }}>
        {(q.optionList || []).join("   ·   ")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(q.stems || []).map(st => {
          const ua  = picks[st.id];
          const ok  = done && ua === st.answer;
          return (
            <div key={st.id} style={{ background: G.paper, borderRadius: 9, padding: 12,
              borderLeft: `3px solid ${done ? (ok ? G.green : G.red) : G.line}` }}>
              <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 8 }}>{st.text}</p>
              <select disabled={done} value={ua || ""}
                onChange={e => setPicks({ ...picks, [st.id]: e.target.value })}
                style={{ fontSize: 13, padding: "5px 10px", borderRadius: 7,
                  border: `1px solid ${G.line}`, background: G.white, width: "100%" }}>
                <option value="">— Select answer —</option>
                {(q.optionList || []).map(o => {
                  const v = o.split(".")[0].trim();
                  return <option key={v} value={v}>{o}</option>;
                })}
              </select>
              {done && (
                <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.6 }}>
                  <p style={{ color: ok ? G.green : G.red, margin: 0 }}>
                    {ok ? "✓ Correct" : `✗ Correct: ${st.answer}`} — {st.explanation}
                  </p>
                  <Ref r={st.ref} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!done && (
        <button onClick={onSubmit}
          style={{ marginTop: 14, padding: "9px 20px", fontSize: 13, fontWeight: 500,
            borderRadius: 8, background: G.green, color: "#fff", border: "none", cursor: "pointer" }}>
          Submit answers
        </button>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  PRACTICE                                                           */
/* ------------------------------------------------------------------ */
function Practice({ bank, flagQuestion, prog, persistProg }) {
  const [mod,      setMod]      = useState("all");
  const [type,     setType]     = useState("all");
  const [idx,      setIdx]      = useState(0);
  const [sbaAns,   setSbaAns]   = useState({});
  const [emqAns,   setEmqAns]   = useState({});
  const [emqDone,  setEmqDone]  = useState({});

  const pool = bank.filter(q =>
    (mod  === "all" || q.module === mod) &&
    (type === "all" || q.type   === type)
  );

  useEffect(() => setIdx(0), [mod, type]);

  const q = pool[idx];
  if (!q) return <p style={{ color: G.muted, fontSize: 14 }}>No questions match this filter.</p>;

  function pickSBA(l) {
    if (sbaAns[q.id]) return;
    setSbaAns({ ...sbaAns, [q.id]: l });
    persistProg({ ...prog, [q.id]: l === q.correct ? "correct" : "wrong" });
  }

  function submitEMQ() {
    const picks = emqAns[q.id] || {};
    const next  = { ...prog };
    (q.stems || []).forEach(st => {
      next[`${q.id}-${st.id}`] = picks[st.id] === st.answer ? "correct" : "wrong";
    });
    persistProg(next);
    setEmqDone({ ...emqDone, [q.id]: true });
  }

  const c = Object.values(prog).filter(v => v === "correct").length;
  const w = Object.values(prog).filter(v => v === "wrong").length;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <select value={mod} onChange={e => setMod(e.target.value)}
          style={{ fontSize: 13, padding: "6px 10px", borderRadius: 7,
            border: `1px solid ${G.line}`, background: G.white }}>
          <option value="all">All modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)}
          style={{ fontSize: 13, padding: "6px 10px", borderRadius: 7,
            border: `1px solid ${G.line}`, background: G.white }}>
          <option value="all">SBA + EMQ</option>
          <option value="SBA">SBA only</option>
          <option value="EMQ">EMQ only</option>
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: G.green, display: "flex", alignItems: "center", gap: 4 }}>
            <CheckCircle2 size={14} />{c}
          </span>
          <span style={{ fontSize: 13, color: G.red, display: "flex", alignItems: "center", gap: 4 }}>
            <X size={14} />{w}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 5, borderRadius: 99, background: "#e7e4da", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, background: G.green,
            width: `${((idx + 1) / pool.length) * 100}%`, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontSize: 12, color: G.muted, whiteSpace: "nowrap" }}>
          {idx + 1} / {pool.length}
        </span>
      </div>

      {/* Card */}
      <div style={{ background: G.white, border: `1px solid ${G.line}`,
        borderRadius: 14, padding: 22 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <Pill tone="type">{q.type}</Pill>
          <Pill tone={q.difficulty === "Hard" ? "hard" : "mod"}>{q.difficulty}</Pill>
          <Pill>{q.module}</Pill>
          <div style={{ marginLeft: "auto" }}>
            <FlagBtn onFlag={reason => flagQuestion(q.id, reason)} already={q.flags?.length > 0} />
          </div>
        </div>

        {q.type === "SBA"
          ? <SBABody q={q} pick={sbaAns[q.id]} onPick={pickSBA} />
          : <EMQBody q={q}
              picks={emqAns[q.id] || {}}
              setPicks={p => setEmqAns({ ...emqAns, [q.id]: p })}
              done={emqDone[q.id]}
              onSubmit={submitEMQ} />
        }
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <button disabled={idx === 0} onClick={() => setIdx(idx - 1)}
          style={{ padding: "8px 16px", fontSize: 13, borderRadius: 8,
            border: `1px solid ${G.line}`, background: G.white,
            cursor: idx === 0 ? "not-allowed" : "pointer",
            opacity: idx === 0 ? 0.4 : 1, display: "flex", alignItems: "center", gap: 6 }}>
          <ChevronLeft size={15} />Previous
        </button>
        <button disabled={idx === pool.length - 1} onClick={() => setIdx(idx + 1)}
          style={{ padding: "8px 16px", fontSize: 13, borderRadius: 8,
            border: `1px solid ${G.line}`, background: G.white,
            cursor: idx === pool.length - 1 ? "not-allowed" : "pointer",
            opacity: idx === pool.length - 1 ? 0.4 : 1,
            display: "flex", alignItems: "center", gap: 6 }}>
          Next<ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BANK VIEW                                                          */
/* ------------------------------------------------------------------ */
function BankView({ bank }) {
  const [search, setSearch] = useState("");
  const [mod,    setMod]    = useState("all");

  const f = bank.filter(q => {
    const h = `${q.module} ${q.type} ${q.stem || q.theme || ""}`.toLowerCase();
    return h.includes(search.toLowerCase()) && (mod === "all" || q.module === mod);
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
        gap: 8, marginBottom: 18 }}>
        {[["Total", bank.length, G.ink],
          ["SBA",   bank.filter(q => q.type === "SBA").length, "#3c3489"],
          ["EMQ",   bank.filter(q => q.type === "EMQ").length, G.green],
          ["Flagged", bank.filter(q => q.flags?.length > 0).length, G.red],
        ].map(([l, n, c]) => (
          <div key={l} style={{ background: G.white, border: `1px solid ${G.line}`,
            borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ fontSize: 11, color: G.muted, margin: 0 }}>{l}</p>
            <p style={{ fontSize: 22, fontWeight: 600, color: c, margin: 0 }}>{n}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8,
          padding: "7px 12px", borderRadius: 8, border: `1px solid ${G.line}`,
          background: G.white, minWidth: 160 }}>
          <Search size={14} style={{ color: G.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search stem, module…"
            style={{ flex: 1, fontSize: 13, border: "none", outline: "none", background: "transparent" }} />
        </div>
        <select value={mod} onChange={e => setMod(e.target.value)}
          style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8,
            border: `1px solid ${G.line}`, background: G.white }}>
          <option value="all">All modules</option>
          {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {f.map(q => (
          <div key={q.id} style={{ background: G.white,
            border: `1px solid ${q.flags?.length > 0 ? G.red : G.line}`,
            borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", gap: 7, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Pill tone="type">{q.type}</Pill>
              <Pill tone={q.difficulty === "Hard" ? "hard" : "mod"}>{q.difficulty}</Pill>
              <Pill>{q.module}</Pill>
              {q.flags?.length > 0 && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99,
                  background: G.redSoft, color: G.red }}>Flagged</span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "#4a4942", lineHeight: 1.55, margin: 0 }}>
              {(q.stem || q.theme || "").slice(0, 140)}…
            </p>
            {q.ref && (
              <p style={{ fontSize: 11, fontStyle: "italic", color: G.green, marginTop: 4,
                display: "flex", alignItems: "center", gap: 3 }}>
                <BookOpen size={10} />{q.ref}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STATS                                                              */
/* ------------------------------------------------------------------ */
function Stats({ bank, prog, persistProg }) {
  const total   = Object.keys(prog).length;
  const correct = Object.values(prog).filter(v => v === "correct").length;
  const pct     = total ? Math.round((correct / total) * 100) : 0;

  const byMod = MODULES.map(m => {
    const mQs = bank.filter(q => q.module === m);
    const att  = mQs.filter(q => prog[q.id] ||
      (q.stems || []).some(s => prog[`${q.id}-${s.id}`]));
    const cor  = Object.entries(prog)
      .filter(([k, v]) => v === "correct" && mQs.some(q => k.startsWith(String(q.id))))
      .length;
    return { module: m, total: mQs.length, attempted: att.length, correct: cor };
  }).filter(x => x.total > 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
        gap: 10, marginBottom: 22 }}>
        {[["Attempted", total, G.ink],
          ["Correct",   correct, G.green],
          ["Wrong",     total - correct, G.red],
          ["Score",     total ? `${pct}%` : "—", pct >= 60 ? G.green : G.amber],
        ].map(([l, n, c]) => (
          <div key={l} style={{ background: G.white, border: `1px solid ${G.line}`,
            borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ fontSize: 11, color: G.muted, margin: 0 }}>{l}</p>
            <p style={{ fontSize: 22, fontWeight: 600, color: c, margin: 0 }}>{n}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Performance by module</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {byMod.map(({ module, total, attempted, correct }) => {
          const p = attempted ? Math.round((correct / attempted) * 100) : 0;
          return (
            <div key={module} style={{ background: G.white, border: `1px solid ${G.line}`,
              borderRadius: 9, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13 }}>{module}</span>
                <span style={{ fontSize: 12, color: G.muted }}>
                  {attempted}/{total} · {attempted ? `${p}%` : "—"}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: "#e7e4da", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99,
                  background: p >= 60 ? G.green : G.amber,
                  width: `${(attempted / total) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => {
        if (window.confirm("Reset all progress? This cannot be undone.")) persistProg({});
      }} style={{ marginTop: 18, fontSize: 12, padding: "7px 14px", borderRadius: 8,
        border: `1px solid ${G.line}`, background: G.white, color: G.red,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
        <RotateCcw size={13} />Reset my progress
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FLAGGED VIEW                                                       */
/* ------------------------------------------------------------------ */
function FlaggedView({ bank, clearFlag }) {
  const flagged = bank.filter(q => q.flags?.length > 0);

  if (!flagged.length)
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <ClipboardCheck size={32} style={{ color: G.green, margin: "0 auto 10px" }} />
        <p style={{ fontSize: 14, color: G.muted }}>No flagged questions. All clear.</p>
      </div>
    );

  return (
    <div>
      <p style={{ fontSize: 13, color: G.muted, marginBottom: 14 }}>
        Flagged by trainees. Questions are reviewed periodically by Dr. Wajdi Zainuddin
        and updated or removed based on these reports.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {flagged.map(q => (
          <div key={q.id} style={{ background: G.white,
            border: `1px solid ${G.red}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
              <Pill tone="type">{q.type}</Pill>
              <Pill>{q.module}</Pill>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
              {(q.stem || q.theme || "").slice(0, 160)}…
            </p>
            <div style={{ background: G.redSoft, borderRadius: 7, padding: 8,
              marginBottom: 10, fontSize: 12, color: G.red }}>
              {(q.flags || []).map((f, i) => (
                <p key={i} style={{ margin: 0 }}>
                  • {f.reason}{" "}
                  <span style={{ color: G.muted }}>({f.date})</span>
                </p>
              ))}
            </div>
            <button onClick={() => clearFlag(q.id)}
              style={{ fontSize: 12, padding: "5px 12px", borderRadius: 7,
                border: `1px solid ${G.line}`, background: G.white,
                cursor: "pointer", color: G.muted }}>
              Clear flag
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN APP                                                           */
/* ------------------------------------------------------------------ */
export default function App() {
  const [bank,    setBank]    = useState([]);
  const [prog,    setProg]    = useState(loadProg());
  const [view,    setView]    = useState("practice");
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("id");
      if (error) { setErr(error.message); setLoading(false); return; }
      setBank((data || []).map(transformRow));
      setLoading(false);
    })();
  }, []);

  async function flagQuestion(qid, reason) {
    const q        = bank.find(x => x.id === qid);
    const newFlags = [...(q.flags || []),
      { reason, date: new Date().toISOString().slice(0, 10) }];
    const { error } = await supabase
      .from("questions")
      .update({ flags: newFlags })
      .eq("id", qid);
    if (!error) setBank(bank.map(x => x.id === qid ? { ...x, flags: newFlags } : x));
  }

  async function clearFlag(qid) {
    const { error } = await supabase
      .from("questions")
      .update({ flags: [] })
      .eq("id", qid);
    if (!error) setBank(bank.map(x => x.id === qid ? { ...x, flags: [] } : x));
  }

  const persistProg = useCallback((next) => {
    setProg(next);
    saveProg(next);
  }, []);

  const flagged = bank.filter(q => q.flags?.length > 0);
  const total   = Object.keys(prog).length;
  const correct = Object.values(prog).filter(v => v === "correct").length;
  const pct     = total ? Math.round((correct / total) * 100) : null;

  const tabs = [
    { k: "practice", label: "Practice",       icon: ListChecks },
    { k: "bank",     label: "Question Bank",  icon: Layers     },
    { k: "stats",    label: "My Stats",       icon: BarChart2  },
    { k: "flagged",  label: `Flagged${flagged.length ? ` (${flagged.length})` : ""}`, icon: Flag },
  ];

  return (
    <div style={{ background: G.paper, minHeight: "100vh",
      fontFamily: "ui-sans-serif,system-ui,sans-serif", color: G.ink }}>

      {/* HEADER */}
      <header style={{ background: G.white, borderBottom: `1px solid ${G.line}`, padding: "12px 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex",
          alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: G.green,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Stethoscope size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 21, fontWeight: 700, fontFamily: "Georgia,serif",
                margin: 0, lineHeight: 1.1, letterSpacing: 0.3 }}>
                Corpus<span style={{ color: G.green }}> II</span>
              </h1>
              <p style={{ fontSize: 12, color: G.muted, margin: 0 }}>
                MRCOG Part 2 · tuned for Malaysian trainees
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: G.muted, margin: 0 }}>Questions</p>
              <p style={{ fontSize: 22, fontWeight: 600, color: G.green, margin: 0 }}>{bank.length}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 11, color: G.muted, margin: 0 }}>Score</p>
              <p style={{ fontSize: 22, fontWeight: 600, margin: 0,
                color: pct === null ? G.muted : pct >= 60 ? G.green : G.amber }}>
                {pct === null ? "—" : `${pct}%`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* TABS */}
      <nav style={{ background: G.white, borderBottom: `1px solid ${G.line}`, padding: "0 20px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 2, flexWrap: "wrap" }}>
          {tabs.map(({ k, label, icon: Icon }) => (
            <button key={k} onClick={() => setView(k)} style={{
              padding: "10px 14px", fontSize: 13, fontWeight: 500,
              color: view === k ? G.green : G.muted,
              background: "none", border: "none",
              borderBottom: `2px solid ${view === k ? G.green : "transparent"}`,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: G.muted, fontSize: 14 }}>Loading questions…</p>
          </div>
        )}
        {err && (
          <div style={{ padding: 16, borderRadius: 10, background: G.redSoft,
            color: G.red, fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <strong>Could not load questions.</strong> Check your Supabase environment variables in Vercel.
              <br /><code style={{ fontSize: 11 }}>{err}</code>
            </div>
          </div>
        )}
        {!loading && !err && view === "practice" && (
          <Practice bank={bank} flagQuestion={flagQuestion}
            prog={prog} persistProg={persistProg} />
        )}
        {!loading && !err && view === "bank"     && <BankView bank={bank} />}
        {!loading && !err && view === "stats"    && (
          <Stats bank={bank} prog={prog} persistProg={persistProg} />
        )}
        {!loading && !err && view === "flagged"  && (
          <FlaggedView bank={bank} clearFlag={clearFlag} />
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ maxWidth: 860, margin: "16px auto 0",
        padding: "14px 20px", borderTop: `1px solid ${G.line}` }}>
        <p style={{ fontSize: 11, color: "#9a988f", textAlign: "center",
          margin: 0, lineHeight: 1.7 }}>
          Curated by{" "}
          <strong style={{ color: G.muted }}>Dr. Wajdi Zainuddin</strong>,
          {" "}O&G Specialist, Hospital Putrajaya
          <br />
          Tuned for Malaysian O&G trainees · Aligned to RCOG GTG · NICE · ESHRE
        </p>
      </footer>
    </div>
  );
}
