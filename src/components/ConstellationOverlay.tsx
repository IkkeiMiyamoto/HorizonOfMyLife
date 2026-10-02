import { Tags } from "lucide-react";
import { useCategories } from "../lib/categories";
import { LINK_TYPES } from "../lib/constants";
import type { CategoryId } from "../types";

interface Props {
  filter: Set<CategoryId>;
  setFilter: (fn: (f: Set<CategoryId>) => Set<CategoryId>) => void;
  description: React.ReactNode;
  hint: string;
  onEditCategories: () => void;
}

/** 星座ビュー（2D/3D共通）の左上タイトル・カテゴリフィルタと左下の凡例 */
export default function ConstellationOverlay({ filter, setFilter, description, hint, onEditCategories }: Props) {
  const { categories } = useCategories();
  const toggle = (id: CategoryId) =>
    setFilter((f) => {
      const nf = new Set(f);
      if (nf.has(id)) nf.delete(id);
      else nf.add(id);
      return nf.size === categories.length ? new Set() : nf;
    });

  return (
    <>
      <div className="glass pointer-events-none absolute left-5 top-5 z-20 max-w-[360px] rounded-2xl px-5 py-4 fade-in">
        <p className="eyebrow">Life Constellation</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">人生の星座</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">
          {description}
          <br />
          <span className="text-slate-400">{hint}</span>
        </p>
        <div className="pointer-events-auto mt-3 flex flex-wrap gap-1.5">
          {categories.map((c) => {
            const active = filter.size === 0 || filter.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className="chip bg-slate-950/70 !py-1 !text-[13px] transition-all"
                style={{
                  borderColor: active ? `${c.color}99` : "rgba(148,163,184,0.25)",
                  color: active ? c.color : "#94a3b8",
                  background: active ? `${c.color}1f` : undefined,
                }}
              >
                <c.icon size={13} />
                {c.label}
              </button>
            );
          })}
          <button
            onClick={onEditCategories}
            className="chip border-dashed border-white/25 bg-slate-950/70 !py-1 !text-[13px] text-slate-300 transition-colors hover:border-cyan-300/60 hover:text-cyan-200"
            title="カテゴリの追加・編集・削除"
          >
            <Tags size={13} />
            編集
          </button>
        </div>
      </div>

      <div className="glass pointer-events-none absolute bottom-5 left-5 z-20 rounded-xl px-4 py-3 text-[13px]">
        <p className="eyebrow mb-2">Influence</p>
        <ul className="space-y-1.5">
          {LINK_TYPES.map((t) => (
            <li key={t.id} className="flex items-center gap-2.5 text-slate-200">
              <svg width="34" height="10">
                <line x1="1" y1="5" x2="33" y2="5" stroke={t.color} strokeWidth="2.5" strokeDasharray={t.id === "tradeoff" ? "6 4" : undefined} />
              </svg>
              <span className="w-24 font-medium">{t.label}</span>
              <span className="text-slate-400">{t.id === "enables" ? "A が B の前提" : t.id === "boosts" ? "A が B を後押し" : "時間・資源の競合"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400">目標にカーソルを合わせると、影響の流れが光ります</p>
      </div>
    </>
  );
}
