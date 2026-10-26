import { ArrowLeft, ArrowRight, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { goalProgress, influenceReach, readiness } from "../lib/analysis";
import { useCategories } from "../lib/categories";
import { LINK_TYPES, linkTypeOf } from "../lib/constants";
import { fmtShortYM, fmtYM, humanizeUntil, nowYM, toIdx } from "../lib/date";
import { uid, type Action } from "../lib/store";
import type { Goal, LifeData, LinkType } from "../types";
import DatePicker from "./DatePicker";
import ProgressRing from "./ProgressRing";

interface Props {
  data: LifeData;
  goal: Goal;
  dispatch: (a: Action) => void;
  onClose: () => void;
  onEdit: () => void;
  onSelect: (id: string) => void;
  onToggleStep: (goalId: string, stepId: string) => void;
}

export default function GoalPanel({ data, goal, dispatch, onClose, onEdit, onSelect, onToggleStep }: Props) {
  const { categoryOf } = useCategories();
  const cat = categoryOf(goal.category);
  const p = goalProgress(goal);
  const ready = readiness(goal, data);
  const reach = influenceReach(goal.id, data.links).size;
  const [stepTitle, setStepTitle] = useState("");
  const [stepDue, setStepDue] = useState("");
  const [linkType, setLinkType] = useState<LinkType>("boosts");
  const [linkTarget, setLinkTarget] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingStep, setEditingStep] = useState<{ id: string; title: string; due: string } | null>(null);

  const steps = [...goal.steps].sort((a, b) => toIdx(a.due ?? "9999-12") - toIdx(b.due ?? "9999-12"));
  const outgoing = data.links.filter((l) => l.source === goal.id);
  const incoming = data.links.filter((l) => l.target === goal.id);
  const linked = new Set([...outgoing.map((l) => l.target), ...incoming.map((l) => l.source)]);
  const candidates = data.goals.filter((g) => g.id !== goal.id && !linked.has(g.id));
  const titleOf = (id: string) => data.goals.find((g) => g.id === id)?.title ?? "?";
  const colorOf = (id: string) => {
    const g = data.goals.find((x) => x.id === id);
    return g ? categoryOf(g.category).color : "#94a3b8";
  };

  const addStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepTitle.trim()) return;
    dispatch({ type: "addStep", goalId: goal.id, step: { id: uid(), title: stepTitle.trim(), done: false, due: stepDue || undefined } });
    setStepTitle("");
  };

  const saveStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStep || !editingStep.title.trim()) return;
    dispatch({
      type: "updateStep",
      goalId: goal.id,
      stepId: editingStep.id,
      patch: { title: editingStep.title.trim(), due: editingStep.due || undefined },
    });
    setEditingStep(null);
  };

  const addLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTarget) return;
    dispatch({ type: "addLink", link: { id: uid(), source: goal.id, target: linkTarget, type: linkType } });
    setLinkTarget("");
  };

  return (
    <aside className="glass-strong slide-in absolute inset-y-0 right-0 z-30 flex w-full max-w-[440px] flex-col border-l shadow-2xl shadow-black/60">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${cat.color}, transparent)` }} />
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="chip" style={{ borderColor: `${cat.color}66`, color: cat.color, background: `${cat.color}12` }}>
          <cat.icon size={12} />
          {cat.label}
          <span className="ml-1 opacity-70">{"★".repeat(goal.priority)}</span>
        </span>
        <div className="flex items-center gap-1">
          <button className="btn-ghost !px-2" onClick={onEdit} aria-label="編集">
            <Pencil size={15} />
          </button>
          <button className="btn-ghost !px-2" onClick={onClose} aria-label="閉じる">
            <X size={17} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-6 pt-3">
        <div>
          <h2 className="font-display text-2xl font-bold leading-tight text-white">{goal.title}</h2>
          {goal.description && <p className="mt-2 text-sm leading-relaxed text-slate-400">{goal.description}</p>}
        </div>

        <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <ProgressRing value={p} size={92} stroke={8} color={cat.color} color2={p >= 1 ? "#fde68a" : "#ffffff"} />
          <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
            <div>
              <dt className="text-xs text-slate-400">ゴール</dt>
              <dd className="font-display font-medium text-slate-100">{fmtYM(goal.targetDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">残り</dt>
              <dd className={`font-medium ${toIdx(goal.targetDate) < toIdx(nowYM()) && p < 1 ? "text-rose-300" : "text-slate-100"}`}>{humanizeUntil(goal.targetDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">前提の準備度</dt>
              <dd className="font-display font-medium text-slate-100">{ready == null ? "—" : `${Math.round(ready * 100)}%`}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">波及先</dt>
              <dd className="font-display font-medium text-slate-100">{reach}件</dd>
            </div>
          </dl>
        </div>

        {/* ステップ */}
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="eyebrow">Steps</h3>
            <span className="font-display text-xs text-slate-400">
              {goal.steps.filter((s) => s.done).length} / {goal.steps.length}
            </span>
          </div>
          <ol className="relative space-y-1">
            {steps.length > 1 && <div className="absolute bottom-4 left-[17px] top-4 w-px bg-white/10" />}
            {steps.map((s) => {
              const overdue = !s.done && s.due && toIdx(s.due) < toIdx(nowYM());
              if (editingStep?.id === s.id) {
                return (
                  <li key={s.id} className="relative rounded-xl bg-white/[0.04] px-2 py-2">
                    <form onSubmit={saveStep} onKeyDown={(e) => e.key === "Escape" && setEditingStep(null)} className="flex gap-2">
                      <input
                        className="input flex-1"
                        autoFocus
                        value={editingStep.title}
                        onChange={(e) => setEditingStep({ ...editingStep, title: e.target.value })}
                        aria-label="ステップ名"
                      />
                      <DatePicker
                        mode="month"
                        value={editingStep.due}
                        onChange={(due) => setEditingStep({ ...editingStep, due })}
                        allowClear
                        placeholder="期日"
                        ariaLabel="期日"
                        className="!w-[140px] shrink-0"
                      />
                    </form>
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" className="btn-ghost !px-2.5 !py-1 text-xs" onClick={() => setEditingStep(null)}>
                        キャンセル
                      </button>
                      <button type="button" className="btn-primary !px-2.5 !py-1 text-xs" disabled={!editingStep.title.trim()} onClick={saveStep}>
                        保存
                      </button>
                    </div>
                  </li>
                );
              }
              return (
                <li key={s.id} className="group relative flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.04]">
                  <button
                    onClick={() => onToggleStep(goal.id, s.id)}
                    className="relative z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all hover:scale-110"
                    style={{
                      borderColor: cat.color,
                      background: s.done ? cat.color : "#0a0f1f",
                      boxShadow: s.done ? `0 0 12px ${cat.color}` : undefined,
                    }}
                    aria-label={s.done ? "未完了に戻す" : "完了にする"}
                  >
                    {s.done && <Check size={12} strokeWidth={3} className="text-slate-950" />}
                  </button>
                  <span className={`flex-1 text-sm ${s.done ? "text-slate-400 line-through decoration-slate-600" : "text-slate-100"}`}>{s.title}</span>
                  {s.due && <span className={`font-display text-xs ${overdue ? "text-rose-300" : "text-slate-400"}`}>{fmtShortYM(s.due)}</span>}
                  <button
                    onClick={() => setEditingStep({ id: s.id, title: s.title, due: s.due ?? "" })}
                    className="text-slate-500 opacity-0 transition-opacity hover:text-slate-200 group-hover:opacity-100"
                    aria-label="ステップを編集"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => dispatch({ type: "deleteStep", goalId: goal.id, stepId: s.id })}
                    className="text-slate-500 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                    aria-label="ステップを削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ol>
          <form onSubmit={addStep} className="mt-2 flex gap-2">
            <input className="input flex-1" placeholder="新しいステップ" value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} />
            <DatePicker mode="month" value={stepDue} onChange={setStepDue} allowClear placeholder="期日" ariaLabel="期日" className="!w-[140px] shrink-0" />
            <button className="btn-primary !px-2.5" disabled={!stepTitle.trim()} aria-label="ステップを追加">
              <Plus size={16} />
            </button>
          </form>
        </section>

        {/* 影響 */}
        <section>
          <h3 className="eyebrow mb-2">Influence</h3>
          <div className="space-y-3">
            <LinkList
              title="この目標が影響を与える"
              icon={<ArrowRight size={12} />}
              items={outgoing.map((l) => ({ id: l.id, other: l.target, type: l.type }))}
              titleOf={titleOf}
              colorOf={colorOf}
              onSelect={onSelect}
              onDelete={(id) => dispatch({ type: "deleteLink", id })}
            />
            <LinkList
              title="この目標に影響を与える"
              icon={<ArrowLeft size={12} />}
              items={incoming.map((l) => ({ id: l.id, other: l.source, type: l.type }))}
              titleOf={titleOf}
              colorOf={colorOf}
              onSelect={onSelect}
              onDelete={(id) => dispatch({ type: "deleteLink", id })}
            />
          </div>
          {candidates.length > 0 && (
            <form onSubmit={addLink} className="mt-3 rounded-xl border border-dashed border-white/15 p-3">
              <div className="mb-2 text-xs text-slate-400">つながりを追加：この目標が…</div>
              <div className="flex gap-2">
                <select className="input !w-auto" value={linkType} onChange={(e) => setLinkType(e.target.value as LinkType)}>
                  {LINK_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <select className="input flex-1" value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)}>
                  <option value="">目標を選択</option>
                  {candidates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
                <button className="btn-primary !px-2.5" disabled={!linkTarget} aria-label="つながりを追加">
                  <Plus size={16} />
                </button>
              </div>
              <div className="mt-1.5 text-xs text-slate-400">
                「{goal.title}」が{linkTarget ? `「${titleOf(linkTarget)}」` : "選んだ目標"}
                {linkTypeOf(linkType).verb}
              </div>
            </form>
          )}
        </section>
      </div>

      <div className="border-t border-white/10 px-5 py-3">
        {confirmDelete ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-rose-300">この目標を削除しますか？</span>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>
                キャンセル
              </button>
              <button
                className="btn bg-rose-500/90 text-white hover:bg-rose-500"
                onClick={() => {
                  dispatch({ type: "deleteGoal", id: goal.id });
                  onClose();
                }}
              >
                削除する
              </button>
            </div>
          </div>
        ) : (
          <button className="btn-ghost text-slate-400 hover:!text-rose-300" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> 目標を削除
          </button>
        )}
      </div>
    </aside>
  );
}

function LinkList({
  title,
  icon,
  items,
  titleOf,
  colorOf,
  onSelect,
  onDelete,
}: {
  title: string;
  icon: React.ReactNode;
  items: { id: string; other: string; type: LinkType }[];
  titleOf: (id: string) => string;
  colorOf: (id: string) => string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 text-xs text-slate-400">
        {icon}
        {title}
      </div>
      {items.length === 0 ? (
        <p className="px-2 text-xs text-slate-500">なし</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => {
            const meta = linkTypeOf(it.type);
            return (
              <li key={it.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
                <span className="chip shrink-0 !px-2 !text-[11px]" style={{ borderColor: `${meta.color}55`, color: meta.color }}>
                  {meta.label}
                </span>
                <button onClick={() => onSelect(it.other)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm text-slate-200 hover:text-white">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(it.other) }} />
                  <span className="truncate">{titleOf(it.other)}</span>
                </button>
                <button onClick={() => onDelete(it.id)} className="text-slate-500 opacity-0 hover:text-rose-400 group-hover:opacity-100" aria-label="つながりを削除">
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
