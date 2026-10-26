import { useState } from "react";
import { Tags } from "lucide-react";
import { useCategories } from "../lib/categories";
import { fromIdx, nowYM, toIdx } from "../lib/date";
import { uid } from "../lib/store";
import type { CategoryId, Goal } from "../types";
import DatePicker from "./DatePicker";
import Modal from "./Modal";

interface Props {
  goal?: Goal;
  onSave: (goal: Goal) => void;
  onClose: () => void;
  onManageCategories: () => void;
}

export default function GoalEditor({ goal, onSave, onClose, onManageCategories }: Props) {
  const { categories: CATEGORIES } = useCategories();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [pickedCategory, setCategory] = useState<CategoryId>(goal?.category ?? CATEGORIES[0]?.id ?? "");
  // 編集中にカテゴリが削除された場合は先頭のカテゴリにする
  const category = CATEGORIES.some((c) => c.id === pickedCategory) ? pickedCategory : (CATEGORIES[0]?.id ?? "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? fromIdx(toIdx(nowYM()) + 24));
  const [startDate, setStartDate] = useState(goal?.startDate ?? "");
  const [priority, setPriority] = useState<Goal["priority"]>(goal?.priority ?? 2);
  const [stepsText, setStepsText] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetDate) return;
    const newSteps = stepsText
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => ({ id: uid(), title: t, done: false }));
    onSave({
      id: goal?.id ?? `g-${uid()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      targetDate,
      startDate: startDate || undefined,
      priority,
      createdAt: goal?.createdAt ?? nowYM(),
      steps: [...(goal?.steps ?? []), ...newSteps],
    });
  };

  return (
    <Modal title={goal ? "目標を編集" : "新しい目標"} eyebrow={goal ? "Edit Goal" : "New Goal"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">目標</label>
          <input className="input" autoFocus placeholder="例：フルマラソンを完走する" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">なぜ達成したいか / どんな状態か</label>
          <textarea className="input min-h-[64px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">カテゴリ</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all"
                style={{
                  borderColor: category === c.id ? c.color : "rgba(255,255,255,0.1)",
                  background: category === c.id ? `${c.color}1a` : "transparent",
                  color: category === c.id ? c.color : "#94a3b8",
                }}
              >
                <c.icon size={14} className="shrink-0" />
                <span className="truncate">{c.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={onManageCategories}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-2.5 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-cyan-300/60 hover:text-cyan-200"
            >
              <Tags size={14} className="shrink-0" />
              追加・編集
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">始める時期</label>
            <DatePicker mode="month" value={startDate} onChange={setStartDate} max={targetDate} allowClear placeholder="自動" ariaLabel="始める時期" />
          </div>
          <div>
            <label className="label">達成したい時期</label>
            <DatePicker mode="month" value={targetDate} onChange={setTargetDate} ariaLabel="達成したい時期" />
          </div>
        </div>
        <div>
          <label className="label">重要度</label>
          <div className="flex gap-1.5">
            {([1, 2, 3] as const).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPriority(p)}
                className={`flex-1 rounded-lg border py-2 text-sm transition-all ${priority === p ? "border-amber-300/60 bg-amber-300/10 text-amber-200" : "border-white/10 text-slate-400"}`}
              >
                {"★".repeat(p)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">{goal ? "ステップを追加（1行に1つ）" : "最初のステップ（1行に1つ・後から期日を設定できます）"}</label>
          <textarea className="input min-h-[80px] resize-y" placeholder={"情報を集める\n小さく始める\n習慣にする"} value={stepsText} onChange={(e) => setStepsText(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn-primary" disabled={!title.trim()}>
            {goal ? "保存" : "目標を追加"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
