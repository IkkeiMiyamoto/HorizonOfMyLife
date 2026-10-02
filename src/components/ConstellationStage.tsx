import { Component, Suspense, lazy, useState, type ReactNode } from "react";
import type { LifeData } from "../types";
import ConstellationView from "./ConstellationView";

// three.js 一式は重いので、3D表示を選んだときだけ読み込む
const Constellation3D = lazy(() => import("./Constellation3D"));

interface Props {
  data: LifeData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  pulse: { id: string; t: number } | null;
  onEditCategories: () => void;
}

type Mode = "2d" | "3d";
const MODE_KEY = "horizon-of-my-life:constellation-mode";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function loadMode(): Mode {
  if (!hasWebGL()) return "2d";
  try {
    return localStorage.getItem(MODE_KEY) === "2d" ? "2d" : "3d";
  } catch {
    return "3d";
  }
}

/** 3D描画で例外が起きた場合は2Dに切り替える */
class Fallback3D extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function ConstellationStage(props: Props) {
  const [mode, setModeState] = useState<Mode>(loadMode);
  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // 保存できなくても表示の切り替えは行う
    }
  };

  return (
    <div className="relative h-full w-full">
      {mode === "3d" ? (
        <Fallback3D onError={() => setModeState("2d")}>
          <Suspense fallback={<Loading />}>
            <Constellation3D {...props} />
          </Suspense>
        </Fallback3D>
      ) : (
        <ConstellationView {...props} />
      )}

      <div className="glass absolute right-5 top-5 z-20 flex rounded-xl p-1">
        {(["3d", "2d"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={m === "3d" && !hasWebGL()}
            className={`rounded-lg px-3.5 py-1.5 font-display text-sm font-bold tracking-wider transition-all ${
              mode === m ? "bg-gradient-to-r from-cyan-500/30 to-violet-500/30 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {m.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-3 text-sm text-slate-300">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-300" />
        宇宙を生成しています…
      </div>
    </div>
  );
}
