import { LayoutDashboard, Network, Plus, Settings, Waypoints } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CategoryManager from "./components/CategoryManager";
import ConstellationStage from "./components/ConstellationStage";
import DashboardView from "./components/DashboardView";
import GoalEditor from "./components/GoalEditor";
import GoalPanel from "./components/GoalPanel";
import RoadmapView from "./components/RoadmapView";
import SettingsModal from "./components/SettingsModal";
import Starfield from "./components/Starfield";
import { goalProgress, influenceReach } from "./lib/analysis";
import { CategoriesContext } from "./lib/categories";
import { sampleData } from "./data/sample";
import { useLifeData } from "./lib/store";
import type { Goal, ViewId } from "./types";

const VIEWS: { id: ViewId; label: string; icon: typeof Network }[] = [
  { id: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { id: "constellation", label: "星座", icon: Network },
  { id: "roadmap", label: "ロードマップ", icon: Waypoints },
];

export default function App() {
  const [data, dispatch] = useLifeData();
  const [view, setView] = useState<ViewId>("constellation");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ goal?: Goal } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [pulse, setPulse] = useState<{ id: string; t: number } | null>(null);
  const [toast, setToast] = useState<{ msg: string; t: number } | null>(null);
  const toastTimer = useRef<number>();

  const selected = data.goals.find((g) => g.id === selectedId) ?? null;

  const notify = useCallback((msg: string) => {
    setToast({ msg, t: Date.now() });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  // ステップ完了時は、その目標から影響が「波及」していく演出を出す
  const toggleStep = (goalId: string, stepId: string) => {
    const goal = data.goals.find((g) => g.id === goalId);
    const step = goal?.steps.find((s) => s.id === stepId);
    if (!goal || !step) return;
    dispatch({ type: "toggleStep", goalId, stepId });
    if (step.done) return;
    const t = Date.now();
    setPulse({ id: goalId, t });
    window.setTimeout(() => setPulse((p) => (p?.t === t ? null : p)), 2500);
    const after = (goal.steps.filter((s) => s.done).length + 1) / goal.steps.length;
    const reach = influenceReach(goalId, data.links).size;
    if (after >= 1) notify(`🌟 目標達成！「${goal.title}」`);
    else notify(`✓ ${step.title}　+${Math.round((after - goalProgress(goal)) * 100)}%${reach ? `　→ ${reach}つの目標に波及` : ""}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || editor || settingsOpen || categoriesOpen) return;
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, settingsOpen, categoriesOpen]);

  return (
    <CategoriesContext.Provider value={data.categories}>
      <Starfield />
      <div className="relative z-10 flex h-full flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] bg-slate-950/30 px-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="leading-none">
              <div className="font-display text-[15px] font-bold tracking-[0.3em] text-white">HORIZON</div>
              <div className="mt-1 text-[10px] tracking-[0.2em] text-slate-500">OF MY LIFE</div>
            </div>
          </div>

          <nav className="glass flex rounded-xl p-1">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                  view === v.id ? "bg-gradient-to-r from-cyan-500/25 to-violet-500/25 text-white shadow-inner shadow-white/5" : "text-slate-400 hover:text-white"
                }`}
              >
                <v.icon size={15} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button className="btn-ghost !px-2" onClick={() => setSettingsOpen(true)} aria-label="設定">
              <Settings size={18} />
            </button>
            <button className="btn-primary" onClick={() => setEditor({})}>
              <Plus size={16} />
              <span className="hidden sm:inline">目標を追加</span>
            </button>
          </div>
        </header>

        <main className="relative flex-1 overflow-hidden">
          {data.goals.length === 0 ? (
            <EmptyState onAdd={() => setEditor({})} onProfile={() => setSettingsOpen(true)} onSample={() => dispatch({ type: "replace", data: structuredClone(sampleData) })} />
          ) : view === "constellation" ? (
            <ConstellationStage data={data} selectedId={selectedId} onSelect={setSelectedId} pulse={pulse} onEditCategories={() => setCategoriesOpen(true)} />
          ) : view === "roadmap" ? (
            <RoadmapView data={data} selectedId={selectedId} onSelect={setSelectedId} />
          ) : (
            <div className="h-full overflow-y-auto">
              <DashboardView data={data} onSelect={setSelectedId} onToggleStep={toggleStep} />
            </div>
          )}

          {selected && (
            <GoalPanel
              key={selected.id}
              data={data}
              goal={selected}
              dispatch={dispatch}
              onClose={() => setSelectedId(null)}
              onEdit={() => setEditor({ goal: selected })}
              onSelect={setSelectedId}
              onToggleStep={toggleStep}
            />
          )}
        </main>
      </div>

      {editor && (
        <GoalEditor
          goal={editor.goal}
          onClose={() => setEditor(null)}
          onManageCategories={() => setCategoriesOpen(true)}
          onSave={(g) => {
            if (editor.goal) dispatch({ type: "updateGoal", id: g.id, patch: g });
            else {
              dispatch({ type: "addGoal", goal: g });
              notify(`✦ 新しい目標「${g.title}」が軌道に乗りました`);
            }
            setSelectedId(g.id);
            setEditor(null);
          }}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          data={data}
          dispatch={dispatch}
          onClose={() => setSettingsOpen(false)}
          notify={notify}
          onManageCategories={() => {
            setSettingsOpen(false);
            setCategoriesOpen(true);
          }}
        />
      )}
      {categoriesOpen && <CategoryManager data={data} dispatch={dispatch} onClose={() => setCategoriesOpen(false)} notify={notify} />}

      {toast && (
        <div key={toast.t} className="glass-strong fade-in fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm text-white shadow-xl shadow-cyan-500/10">
          {toast.msg}
        </div>
      )}
    </CategoriesContext.Provider>
  );
}

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <circle cx="17" cy="17" r="15" fill="none" stroke="url(#logo-g)" strokeOpacity="0.4" />
      <circle cx="17" cy="17" r="9" fill="none" stroke="url(#logo-g)" strokeOpacity="0.7" strokeDasharray="2 3" />
      <path d="M3 20 Q17 13 31 20" fill="none" stroke="url(#logo-g)" strokeWidth="1.6" />
      <circle cx="17" cy="16.5" r="3" fill="#fff" style={{ filter: "drop-shadow(0 0 4px #22d3ee)" }} />
    </svg>
  );
}

function EmptyState({ onAdd, onProfile, onSample }: { onAdd: () => void; onProfile: () => void; onSample: () => void }) {
  return (
    <div className="grid h-full place-items-center p-6 text-center fade-in">
      <div>
        <p className="eyebrow">Your horizon is open</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-white">最初の目標を描きましょう</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300">
          目標を追加し、ステップと目標同士のつながりを設定すると、あなたの人生の星座とロードマップが浮かび上がります。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button className="btn-primary !px-5 !py-2.5" onClick={onAdd}>
            <Plus size={16} /> 目標を追加
          </button>
          <button className="btn-ghost border border-white/10 !px-4 !py-2.5" onClick={onProfile}>
            <Settings size={15} /> 名前・誕生日・ビジョンを設定
          </button>
        </div>
        <button className="mt-4 text-xs text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline" onClick={onSample}>
          使い方の例としてサンプルを見る
        </button>
      </div>
    </div>
  );
}
