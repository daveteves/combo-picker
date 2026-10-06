"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const uid = () => Math.random().toString(36).slice(2, 9);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STORAGE_KEY = "combo-picker:v1";

function randInt(n) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

const mk = (name, options) => ({ id: uid(), name, locked: false, options });

const preset = () => [
  mk("Genre", ["Heist", "Ghost story", "Space opera", "Romance", "Western", "Mystery", "Dystopia", "Fairy tale", "Road trip", "Courtroom"]),
  mk("Hero", ["Retired chef", "Teenage hacker", "Night-shift nurse", "Lost sailor", "Street magician", "Rookie pilot", "Disgraced judge", "Village baker", "Twin sisters", "Android janitor"]),
  mk("Place", ["Floating market", "Abandoned mall", "Island lighthouse", "Underground library", "Night train", "Mountain monastery", "Desert motel", "Orbital station", "Flooded city", "Carnival"]),
  mk("Obstacle", ["A rival crew", "No electricity", "A broken promise", "A storm", "A forged map", "A curse", "A deadline", "A stolen name", "Language barrier", "A traitor"]),
  mk("Twist", ["It was a dream", "The mentor lied", "Time loops", "Two timelines", "The villain is kin", "The map is alive", "Nobody is human", "It is a game", "A second ending", "The town vanishes"]),
  mk("Ending", ["Bittersweet", "Triumphant", "Open-ended", "Tragic", "Funny", "Quiet", "Explosive", "Circular", "Hopeful", "Haunting"]),
];

export default function Picker() {
  const [stages, setStages] = useState([]);
  const [shown, setShown] = useState([]); // text on each tile
  const [state, setState] = useState([]); // "idle" | "spinning" | "set"
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const runId = useRef(0);

  // load / save
  useEffect(() => {
    let s;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch {}
    const initial = s?.stages?.length ? s.stages : preset();
    setStages(initial);
    setShown(initial.map(() => ""));
    setState(initial.map(() => "idle"));
    setHistory(s?.history || []);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ stages, history })); } catch {}
  }, [stages, history, ready]);

  const total = useMemo(
    () => stages.reduce((acc, s) => acc * Math.max(s.options.filter(Boolean).length, 0), stages.length ? 1 : 0),
    [stages]
  );
  const canSpin = stages.length > 0 && stages.every((s) => s.options.filter(Boolean).length > 0);

  async function spin() {
    if (!canSpin || spinning) return;
    const id = ++runId.current;
    setSpinning(true);
    const result = shown.slice();
    const states = stages.map((s, i) => (s.locked && result[i] ? "set" : "idle"));
    setState(states.slice());
    for (let i = 0; i < stages.length; i++) {
      if (stages[i].locked && result[i]) continue;
      const pool = stages[i].options.filter(Boolean);
      states[i] = "spinning";
      setState(states.slice());
      const ticks = 10 + i * 2;
      for (let t = 0; t < ticks; t++) {
        result[i] = pool[randInt(pool.length)];
        setShown(result.slice());
        await sleep(55 + t * 6);
        if (id !== runId.current) return;
      }
      result[i] = pool[randInt(pool.length)];
      states[i] = "set";
      setShown(result.slice());
      setState(states.slice());
      await sleep(120);
    }
    setHistory((h) => [{ id: uid(), parts: result.slice(), names: stages.map((s) => s.name) }, ...h].slice(0, 25));
    setSpinning(false);
  }

  const update = (i, patch) => setStages((p) => p.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const addStage = () => {
    setStages((p) => [...p, mk(`Step ${p.length + 1}`, ["Option A", "Option B"])]);
    setShown((p) => [...p, ""]); setState((p) => [...p, "idle"]);
  };
  const removeStage = (i) => {
    setStages((p) => p.filter((_, k) => k !== i));
    setShown((p) => p.filter((_, k) => k !== i)); setState((p) => p.filter((_, k) => k !== i));
  };
  const reset = () => {
    runId.current++; setSpinning(false);
    const p = preset(); setStages(p); setShown(p.map(() => "")); setState(p.map(() => "idle"));
  };
  const copy = async () => {
    const text = shown.map((v, i) => `${stages[i].name}: ${v}`).join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  const hasResult = shown.length > 0 && shown.every(Boolean);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-flap text-5xl font-bold leading-none sm:text-6xl">Combo Picker</h1>
          <p className="mt-2 max-w-md text-base text-board/70">
            Build your lists, then spin. Each list picks one item, one after another, and the results combine into a single outcome.
          </p>
        </div>
        <div className="text-right">
          <div className="font-flap text-4xl font-bold tabular-nums" aria-live="polite">{total.toLocaleString()}</div>
          <div className="text-sm text-board/70">possible combinations</div>
        </div>
      </header>

      {/* Board */}
      <section aria-label="Result board" className="rounded-xl bg-board p-4 sm:p-6">
        <ol className="grid gap-2">
          {stages.map((s, i) => (
            <li key={s.id} className="flex items-stretch gap-3">
              <div className="flex w-20 shrink-0 items-center font-flap text-lg text-white/60 sm:w-28 sm:text-xl">{s.name}</div>
              <div
                className={`flex min-h-[3.5rem] flex-1 items-center rounded-md px-4 font-flap text-2xl font-medium sm:text-3xl ${
                  state[i] === "spinning" ? "bg-tile text-amber-flap/60" : "bg-tile text-amber-flap"
                } ${s.locked ? "ring-2 ring-amber-flap/60" : ""}`}
              >
                {shown[i] || <span className="text-white/20">• • •</span>}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={spin}
            disabled={!canSpin || spinning}
            className="rounded-md bg-amber-flap px-8 py-3 font-flap text-2xl font-bold text-board transition active:scale-95 disabled:opacity-40"
          >
            {spinning ? "Spinning…" : hasResult ? "Spin again" : "Spin"}
          </button>
          <button onClick={copy} disabled={!hasResult || spinning} className="rounded-md border border-white/25 px-4 py-3 text-sm text-white disabled:opacity-30">
            {copied ? "Copied" : "Copy result"}
          </button>
          {!canSpin && <span className="text-sm text-white/60">Every list needs at least one option.</span>}
        </div>
      </section>

      {/* Editor */}
      <section aria-label="Lists" className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-flap text-3xl font-bold">Your lists</h2>
          <div className="flex gap-2">
            <button onClick={addStage} className="rounded-md bg-board px-4 py-2 text-sm font-medium text-white">Add list</button>
            <button onClick={reset} className="rounded-md border border-board/30 px-4 py-2 text-sm">Load example</button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {stages.map((s, i) => (
            <div key={s.id} className="rounded-lg border border-board/20 bg-white/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <input
                  aria-label={`Name of list ${i + 1}`}
                  value={s.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  className="min-w-0 flex-1 rounded bg-transparent font-flap text-2xl font-bold"
                />
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={s.locked} onChange={(e) => update(i, { locked: e.target.checked })} />
                  Keep
                </label>
                <button onClick={() => removeStage(i)} aria-label={`Remove ${s.name}`} className="rounded px-2 py-1 text-sm text-board/70 hover:bg-board/10">Remove</button>
              </div>
              <textarea
                aria-label={`Options for ${s.name}, one per line`}
                value={s.options.join("\n")}
                onChange={(e) => update(i, { options: e.target.value.split("\n") })}
                rows={6}
                className="w-full rounded border border-board/20 bg-white/70 p-2 text-sm"
              />
              <p className="mt-1 text-xs text-board/60">{s.options.filter(Boolean).length} options, one per line</p>
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      {history.length > 0 && (
        <section aria-label="History" className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-flap text-3xl font-bold">Past spins</h2>
            <button onClick={() => setHistory([])} className="text-sm underline">Clear</button>
          </div>
          <ul className="grid gap-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-md bg-white/50 px-3 py-2 text-sm">
                {h.parts.map((p, i) => (
                  <span key={i}>{i > 0 && <span className="px-1.5 text-board/40">/</span>}{p}</span>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
