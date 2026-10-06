"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const uid = () => Math.random().toString(36).slice(2, 9);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STORAGE_KEY = "sequence-picker:v5";

function randInt(n) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const presetNames = [
  "Alice", "Bob", "Charlie", "Diana", "Evan", 
  "Fiona", "George", "Hannah", "Ian", "Julia"
];

export default function Picker() {
  // Core State
  const [names, setNames] = useState([]);
  const [pickCount, setPickCount] = useState(3);
  
  // Customization State
  const [labels, setLabels] = useState("");
  const [spinSpeed, setSpinSpeed] = useState("cinematic");
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  // Runtime State
  const [shown, setShown] = useState([]); 
  const [state, setState] = useState([]); 
  const [spinning, setSpinning] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const runId = useRef(0);

  // Load from local storage
  useEffect(() => {
    let s;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch {}
    setNames(s?.names?.length ? s.names : presetNames);
    setPickCount(s?.pickCount || 3);
    setLabels(s?.labels || "");
    setSpinSpeed(s?.spinSpeed || "cinematic");
    setAllowDuplicates(s?.allowDuplicates || false);
    
    setShown(Array(s?.pickCount || 3).fill(""));
    setState(Array(s?.pickCount || 3).fill("idle"));
    setHistory(s?.history || []);
    setReady(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (!ready) return;
    try { 
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        names, pickCount, labels, spinSpeed, allowDuplicates, history 
      })); 
    } catch {}
  }, [names, pickCount, labels, spinSpeed, allowDuplicates, history, ready]);

  const validNames = names.filter((n) => n.trim().length > 0);
  const customLabelsList = labels.split("\n").filter((l) => l.trim().length > 0);
  
  const actualPickCount = allowDuplicates 
    ? pickCount 
    : Math.min(pickCount, Math.max(1, validNames.length));
    
  const slots = Array.from({ length: actualPickCount }, (_, i) => i);

  const getSlotName = (index) => {
    if (customLabelsList[index]) return customLabelsList[index].trim();
    return getOrdinal(index + 1);
  };

  const totalCombinations = useMemo(() => {
    let n = validNames.length;
    let k = actualPickCount;
    if (k === 0 || n === 0) return 0;
    
    if (allowDuplicates) {
      return Math.pow(n, k);
    } else {
      let res = 1;
      for (let i = 0; i < k; i++) res *= (n - i);
      return res;
    }
  }, [validNames.length, actualPickCount, allowDuplicates]);

  const canSpin = validNames.length > 0 && actualPickCount > 0;

  async function spin() {
    if (!canSpin || spinning) return;
    const id = ++runId.current;
    setSpinning(true);
    
    const result = Array(actualPickCount).fill("");
    const states = Array(actualPickCount).fill("idle");
    setState(states.slice());
    setShown(result.slice());

    let available = [...validNames];

    const settings = {
      quick: { ticks: 20, base: 20, maxOut: 150, pause: 100 },
      normal: { ticks: 30, base: 30, maxOut: 400, pause: 300 },
      cinematic: { ticks: 45, base: 40, maxOut: 800, pause: 600 }
    }[spinSpeed];

    for (let i = 0; i < actualPickCount; i++) {
      states[i] = "spinning";
      setState(states.slice());
      
      for (let t = 0; t < settings.ticks; t++) {
        const progress = t / (settings.ticks - 1);
        const easeOut = Math.pow(progress, 3);
        const delay = settings.base + (easeOut * settings.maxOut);

        result[i] = available[randInt(available.length)];
        setShown(result.slice());
        
        await sleep(delay);
        if (id !== runId.current) return;
      }
      
      const pickIndex = randInt(available.length);
      result[i] = available[pickIndex];
      
      if (!allowDuplicates) {
        available.splice(pickIndex, 1); 
      }
      
      states[i] = "set";
      setShown(result.slice());
      setState(states.slice());
      
      if (i < actualPickCount - 1) {
        await sleep(settings.pause); 
      }
    }
    
    setHistory((h) => [{ 
      id: uid(), 
      parts: result.slice(),
      labels: slots.map(getSlotName)
    }, ...h].slice(0, 25));
    setSpinning(false);
  }

  const reset = () => {
    runId.current++; 
    setSpinning(false);
    setNames(presetNames);
    setPickCount(3);
    setLabels("Gold Medal\nSilver Medal\nBronze Medal");
    setSpinSpeed("cinematic");
    setAllowDuplicates(false);
    setShown(Array(3).fill(""));
    setState(Array(3).fill("idle"));
  };

  const copy = async () => {
    const text = shown.map((v, i) => `${getSlotName(i)}: ${v}`).join("\n");
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  
  // Names Pool Management Actions
  const sortNames = () => setNames([...validNames].sort((a, b) => a.localeCompare(b)));
  const shuffleNames = () => {
    const arr = [...validNames];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setNames(arr);
  };
  const dedupeNames = () => setNames([...new Set(validNames)]);
  const clearNames = () => setNames([]);

  const hasResult = shown.length === actualPickCount && shown.every(Boolean);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-flap text-5xl font-bold leading-none sm:text-6xl">Sequence Picker</h1>
          <p className="mt-2 max-w-md text-base text-board/70">
            Build your pool, customize your slots, and draw your results.
          </p>
        </div>
        <div className="text-right">
          <div className="font-flap text-4xl font-bold tabular-nums" aria-live="polite">
            {totalCombinations >= 1000000 ? "1M+" : totalCombinations.toLocaleString()}
          </div>
          <div className="text-sm text-board/70">possible outcomes</div>
        </div>
      </header>

      {/* Board View */}
      <section aria-label="Result board" className="rounded-xl bg-board p-4 sm:p-6">
        <ol className="grid gap-2">
          {slots.map((num, i) => (
            <li key={num} className="flex flex-col sm:flex-row sm:items-stretch gap-1 sm:gap-3">
              <div 
                className="flex w-full sm:w-36 shrink-0 items-center font-flap text-sm sm:text-lg text-white/60 pt-1 sm:pt-0"
              >
                {getSlotName(i)}
              </div>
              <div
                className={`flex min-h-[3.5rem] flex-1 items-center rounded-md px-4 font-flap text-2xl font-medium sm:text-3xl transition-all duration-300 ${
                  state[i] === "spinning" 
                    ? "bg-tile text-amber-flap/60 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] ring-1 ring-white/10" 
                    : state[i] === "set"
                    ? "bg-tile text-amber-flap shadow-lg scale-[1.01]"
                    : "bg-tile text-amber-flap opacity-50"
                }`}
              >
                 {shown[i] || <span className="text-white/20 tracking-[0.2em]">• • •</span>}
              </div>
            </li>
          ))}
          {slots.length === 0 && (
             <li className="py-4 text-center text-white/40">Add names to begin</li>
          )}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={spin}
            disabled={!canSpin || spinning}
            className="rounded-md bg-amber-flap px-8 py-3 font-flap text-2xl font-bold text-board transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:hover:brightness-100"
          >
            {spinning ? "Spinning…" : hasResult ? "Spin again" : "Spin"}
          </button>
          <button 
            onClick={copy} 
            disabled={!hasResult || spinning} 
            className="rounded-md border border-white/25 px-4 py-3 text-sm text-white transition hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            {copied ? "Copied" : "Copy result"}
          </button>
          {!canSpin && <span className="text-sm text-white/60">Ensure you have names and at least 1 slot.</span>}
        </div>
      </section>

      {/* Configuration Area */}
      <section aria-label="Configuration" className="mt-10 grid gap-6 md:grid-cols-2">
        
        {/* Left Col: Names Pool */}
        <div className="flex flex-col rounded-lg border border-board/20 bg-white/50 p-4">
          <div className="mb-4 flex items-center justify-between border-b border-board/10 pb-4">
            <h2 className="font-flap text-2xl font-bold">Names Pool</h2>
            <button onClick={reset} className="rounded-md border border-board/30 px-3 py-1.5 text-xs transition hover:bg-board/10">
              Load example
            </button>
          </div>
          
          <div className="mb-2 flex flex-wrap gap-2">
            <button onClick={sortNames} className="rounded bg-board/5 px-2 py-1 text-xs font-medium text-board hover:bg-board/15 transition">Sort A-Z</button>
            <button onClick={shuffleNames} className="rounded bg-board/5 px-2 py-1 text-xs font-medium text-board hover:bg-board/15 transition">Shuffle</button>
            <button onClick={dedupeNames} className="rounded bg-board/5 px-2 py-1 text-xs font-medium text-board hover:bg-board/15 transition">Remove Duplicates</button>
            <button onClick={clearNames} className="ml-auto rounded bg-red-500/10 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-500/20 transition">Clear</button>
          </div>

          <textarea
            aria-label="Names, one per line"
            value={names.join("\n")}
            onChange={(e) => setNames(e.target.value.split("\n"))}
            rows={8}
            placeholder="Paste your list of names here..."
            className="w-full flex-1 rounded border border-board/20 bg-white/70 p-3 text-sm leading-relaxed placeholder-board/40 focus:outline-none focus:ring-2 focus:ring-amber-flap/50"
          />
          
          <div className="mt-2 flex items-center justify-between text-sm text-board/80">
            <span className="font-medium">{validNames.length} names available</span>
          </div>
        </div>

        {/* Right Col: Customize */}
        <div className="rounded-lg border border-board/20 bg-white/50 p-4">
          <div className="mb-4 border-b border-board/10 pb-4">
            <h2 className="font-flap text-2xl font-bold">Customize</h2>
          </div>
          
          <div className="grid gap-5">
            {/* Pick Count & Duplicates */}
            <div className="flex flex-wrap gap-6">
              <label className="flex flex-col gap-1 text-sm font-medium">
                How many to draw?
                <input
                  type="number"
                  min="1"
                  max={allowDuplicates ? 100 : Math.max(1, validNames.length)}
                  value={pickCount}
                  onChange={(e) => setPickCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 rounded border border-board/20 bg-white p-2 shadow-sm"
                />
              </label>
              
              <div className="flex flex-col gap-1 text-sm font-medium">
                Spin Speed
                <select 
                  value={spinSpeed} 
                  onChange={(e) => setSpinSpeed(e.target.value)}
                  className="w-32 rounded border border-board/20 bg-white p-2 shadow-sm"
                >
                  <option value="quick">Quick</option>
                  <option value="normal">Normal</option>
                  <option value="cinematic">Cinematic</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input 
                type="checkbox" 
                checked={allowDuplicates}
                onChange={(e) => setAllowDuplicates(e.target.checked)}
                className="h-4 w-4 rounded border-board/30 text-amber-flap focus:ring-amber-flap"
              />
              Allow same name to be picked multiple times
            </label>

            {/* Custom Labels */}
            <div className="flex flex-col gap-1 text-sm font-medium">
              Custom Slot Labels <span className="text-xs font-normal text-board/60">(Optional, one per line)</span>
              <textarea
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                placeholder="e.g. Winner&#10;Runner Up&#10;Third Place"
                rows={4}
                className="w-full rounded border border-board/20 bg-white/70 p-3 text-sm leading-relaxed placeholder-board/40 focus:outline-none focus:ring-2 focus:ring-amber-flap/50"
              />
            </div>
          </div>
        </div>
      </section>

      {/* History */}
      {history.length > 0 && (
        <section aria-label="History" className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-flap text-3xl font-bold">Past spins</h2>
            <button 
              onClick={() => setHistory([])} 
              className="text-sm underline transition hover:text-board/70"
            >
              Clear
            </button>
          </div>
          <ul className="grid gap-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-md bg-white/50 px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {h.parts.map((p, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <span className="hidden sm:inline-block px-1 text-board/30">/</span>}
                      <span className="text-board/60 text-xs uppercase tracking-wider">{h.labels[i]}:</span>
                      <span className="font-medium">{p}</span>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}