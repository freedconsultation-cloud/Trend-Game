"use client";

import { useState, useEffect } from "react";

interface Trend {
  query: string;
  traffic: string;
  trafficNum: number;
  imageUrl: string;
}

type Phase = "loading" | "playing" | "revealing" | "gameover";

const GRADIENTS: [string, string][] = [
  ["#7c3aed", "#2563eb"],
  ["#ea580c", "#db2777"],
  ["#16a34a", "#0891b2"],
  ["#d97706", "#ea580c"],
  ["#db2777", "#7c3aed"],
  ["#0891b2", "#2563eb"],
  ["#4f46e5", "#db2777"],
  ["#16a34a", "#d97706"],
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function TrendCard({
  trend,
  showTraffic,
  result,
  gradientIdx,
  label,
}: {
  trend: Trend;
  showTraffic: boolean;
  result: "correct" | "wrong" | null;
  gradientIdx: number;
  label?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const g = GRADIENTS[gradientIdx % GRADIENTS.length];

  return (
    <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center">
      {/* Background */}
      {trend.imageUrl && !imgFailed ? (
        <img
          src={trend.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
        />
      )}

      {/* Overlay */}
      <div
        className="absolute inset-0 transition-colors duration-300"
        style={{
          background:
            result === "correct"
              ? "rgba(34,197,94,0.55)"
              : result === "wrong"
              ? "rgba(239,68,68,0.55)"
              : "rgba(0,0,0,0.58)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-4 py-4 sm:px-6 sm:py-8 space-y-1 sm:space-y-3 w-full">
        {label && (
          <p className="text-[10px] sm:text-xs uppercase tracking-widest font-bold text-white/60">{label}</p>
        )}
        <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow">
          {trend.query}
        </h2>
        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-white/60">wikipedia views</p>

        {showTraffic ? (
          <p className="text-4xl sm:text-5xl md:text-6xl font-black text-white drop-shadow-lg">
            {trend.traffic}
          </p>
        ) : (
          <p className="text-5xl sm:text-6xl md:text-7xl font-black text-white/70">?</p>
        )}

        {result && (
          <p className="text-base sm:text-lg font-black text-white drop-shadow">
            {result === "correct" ? "✓ Correct!" : "✗ Wrong!"}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TrendGame() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [cursor, setCursor] = useState(2);
  const [left, setLeft] = useState<Trend | null>(null);
  const [right, setRight] = useState<Trend | null>(null);
  const [leftGrad, setLeftGrad] = useState(0);
  const [rightGrad, setRightGrad] = useState(1);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trends")
      .then((r) => r.json())
      .then(({ trends: t, error: e }) => {
        if (e || !t?.length) { setError(e ?? "No trends found"); return; }
        const s = shuffle(t as Trend[]);
        setTrends(s);
        setLeft(s[0]);
        setRight(s[1]);
        setCursor(2);
        setPhase("playing");
      })
      .catch(() => setError("Failed to load trends"));
  }, []);

  function guess(higher: boolean) {
    if (phase !== "playing" || !left || !right) return;
    const rightIsHigher = right.trafficNum >= left.trafficNum;
    const correct = higher === rightIsHigher;

    setResult(correct ? "correct" : "wrong");
    setPhase("revealing");

    setTimeout(() => {
      if (correct) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setBest((b) => Math.max(b, newStreak));
        const nextIdx = cursor % trends.length;
        setLeft(right);
        setLeftGrad(rightGrad);
        setRight(trends[nextIdx]);
        setRightGrad((g) => (g + 1) % GRADIENTS.length);
        setCursor(nextIdx + 1);
        setResult(null);
        setPhase("playing");
      } else {
        setPhase("gameover");
      }
    }, 1300);
  }

  function restart() {
    const s = shuffle([...trends]);
    setTrends(s);
    setLeft(s[0]);
    setRight(s[1]);
    setLeftGrad(0);
    setRightGrad(1);
    setCursor(2);
    setStreak(0);
    setResult(null);
    setPhase("playing");
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4" style={{ background: "var(--background)" }}>
        {error ? (
          <p className="text-sm px-4 py-3 rounded-lg" style={{ background: "rgba(248,81,73,0.1)", color: "#f85149" }}>
            {error}
          </p>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading today&apos;s trends…</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh", background: "var(--background)" }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-4 sm:px-8 py-2 sm:py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="font-bold font-mono text-sm" style={{ color: "var(--accent)" }}>{"</>"}</span>
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Streak</p>
            <p className="text-xl sm:text-2xl font-black leading-none" style={{ color: "var(--accent)" }}>{streak}</p>
          </div>
          {best > 0 && (
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Best</p>
              <p className="text-xl sm:text-2xl font-black leading-none" style={{ color: "var(--foreground)" }}>{best}</p>
            </div>
          )}
        </div>
        <a href="https://freed-projects.vercel.app" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--text-muted)" }}>
          ← Portfolio
        </a>
      </nav>

      {/* Prompt */}
      <div className="text-center py-2 px-4 shrink-0">
        <p className="text-xs sm:text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
          Which topic had <span style={{ color: "var(--foreground)" }}>more Wikipedia views</span> yesterday?
        </p>
      </div>

      {/* Cards + Buttons */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2 sm:gap-3 px-3 pb-3 sm:px-4 sm:pb-4 md:px-6 md:pb-6 max-w-5xl w-full mx-auto">
        {left && (
          <TrendCard
            trend={left}
            showTraffic
            result={null}
            gradientIdx={leftGrad}
            label="currently"
          />
        )}

        {/* Divider */}
        <div className="flex md:flex-col items-center justify-center gap-2 sm:gap-3 shrink-0 md:py-4">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-xs shrink-0"
            style={{ background: "var(--surface-2)", color: "var(--foreground)", border: "2px solid var(--border)" }}
          >
            VS
          </div>
          <div className="flex md:flex-col gap-2">
            <button
              onClick={() => guess(true)}
              disabled={phase !== "playing"}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
              style={{ background: "#22c55e", color: "#fff" }}
            >
              ▲ Higher
            </button>
            <button
              onClick={() => guess(false)}
              disabled={phase !== "playing"}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              ▼ Lower
            </button>
          </div>
        </div>

        {right && (
          <TrendCard
            trend={right}
            showTraffic={phase === "revealing" || phase === "gameover"}
            result={phase === "revealing" || phase === "gameover" ? result : null}
            gradientIdx={rightGrad}
            label="vs."
          />
        )}
      </div>

      {/* Game Over Modal */}
      {phase === "gameover" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)" }}
        >
          <div
            className="rounded-2xl p-8 text-center space-y-5 w-full max-w-sm"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <p className="text-5xl">💀</p>
            <div>
              <h2 className="text-4xl font-black" style={{ color: "var(--foreground)" }}>Game Over</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                You scored{" "}
                <span className="font-black text-base" style={{ color: "var(--accent)" }}>
                  {streak}
                </span>{" "}
                in a row
              </p>
            </div>
            {streak > 0 && streak === best && (
              <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>🏆 New personal best!</p>
            )}
            <button
              onClick={restart}
              className="w-full py-3 rounded-xl font-black text-sm transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
