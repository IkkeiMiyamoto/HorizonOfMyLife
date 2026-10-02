import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { CATEGORY_COLORS, CATEGORY_ICONS, useCategories, type CategoryMeta } from "../lib/categories";
import { uid, type Action } from "../lib/store";
import type { LifeData } from "../types";
import Modal from "./Modal";

interface Props {
  data: LifeData;
  dispatch: (a: Action) => void;
  onClose: () => void;
  notify: (msg: string) => void;
}

type Draft = { label: string; color: string; icon: string };

/** カテゴリの追加・編集・削除 */
export default function CategoryManager({ data, dispatch, onClose, notify }: Props) {
  const { categories } = useCategories();
  const unusedColor = CATEGORY_COLORS.find((c) => !categories.some((x) => x.color === c)) ?? CATEGORY_COLORS[0];
  const blank = (): Draft => ({ label: "", color: unusedColor, icon: "star" });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState("");

  const goalCount = (id: string) => data.goals.filter((g) => g.category === id).length;

  const startEdit = (c: CategoryMeta) => {
    setEditingId(c.id);
    setDeletingId(null);
    setDraft({ label: c.label, color: c.color, icon: c.iconKey });
  };
  const resetForm = () => {
    setEditingId(null);
    setDraft(blank());
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const label = draft.label.trim();
    if (!label) return;
    if (editingId) {
      dispatch({ type: "updateCategory", id: editingId, patch: { label, color: draft.color, icon: draft.icon } });
      notify(`カテゴリ「${label}」を更新しました`);
    } else {
      dispatch({ type: "addCategory", category: { id: `c-${uid()}`, label, color: draft.color, icon: draft.icon } });
      notify(`✦ 新しいカテゴリ「${label}」が宇宙に加わりました`);
    }
    setEditingId(null);
    setDraft({ label: "", color: CATEGORY_COLORS.find((c) => c !== draft.color && !categories.some((x) => x.color === c)) ?? draft.color, icon: "star" });
  };

  const startDelete = (c: CategoryMeta) => {
    setDeletingId(c.id);
    if (editingId === c.id) resetForm();
    setMoveTo(categories.find((x) => x.id !== c.id)?.id ?? "");
  };

  const confirmDelete = (c: CategoryMeta) => {
    dispatch({ type: "deleteCategory", id: c.id, moveTo });
    const n = goalCount(c.id);
    const dest = categories.find((x) => x.id === moveTo)?.label;
    notify(n ? `「${c.label}」を削除し、${n}件の目標を「${dest}」へ移しました` : `「${c.label}」を削除しました`);
    setDeletingId(null);
  };

  const PreviewIcon = CATEGORY_ICONS[draft.icon] ?? CATEGORY_ICONS.star;

  return (
    <Modal title="カテゴリ" eyebrow="Categories" onClose={onClose}>
      <p className="-mt-2 mb-4 text-[13px] leading-relaxed text-slate-400">カテゴリは星座の「方角」になります。並び順に沿って、宇宙を等分して配置されます。</p>

      <ul className="max-h-[30vh] space-y-1.5 overflow-y-auto pr-1">
        {categories.map((c) => {
          const n = goalCount(c.id);
          const deleting = deletingId === c.id;
          return (
            <li
              key={c.id}
              className={`rounded-xl border px-3 py-2 transition-colors ${editingId === c.id ? "border-cyan-400/40 bg-cyan-400/5" : "border-white/5 bg-white/[0.02]"}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border"
                  style={{ color: c.color, borderColor: `${c.color}55`, background: `${c.color}1a`, boxShadow: `0 0 12px ${c.color}33` }}
                >
                  <c.icon size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{c.label}</span>
                <span className="shrink-0 text-xs text-slate-400">目標 {n}件</span>
                <button type="button" className="btn-ghost !px-2" onClick={() => startEdit(c)} aria-label={`${c.label}を編集`}>
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="btn-ghost !px-2 hover:!text-rose-300"
                  onClick={() => startDelete(c)}
                  disabled={categories.length <= 1}
                  title={categories.length <= 1 ? "カテゴリは最低1つ必要です" : undefined}
                  aria-label={`${c.label}を削除`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {deleting && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2 text-xs">
                  {n > 0 ? (
                    <>
                      <span className="text-rose-200">所属する目標 {n}件の移動先：</span>
                      <select className="input !w-auto !py-1 !text-xs" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                        {categories
                          .filter((x) => x.id !== c.id)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.label}
                            </option>
                          ))}
                      </select>
                    </>
                  ) : (
                    <span className="text-rose-200">このカテゴリを削除しますか？</span>
                  )}
                  <span className="flex-1" />
                  <button type="button" className="btn-ghost !py-1 !text-xs" onClick={() => setDeletingId(null)}>
                    やめる
                  </button>
                  <button type="button" className="btn bg-rose-500/90 !py-1 !text-xs text-white hover:bg-rose-500" onClick={() => confirmDelete(c)}>
                    削除する
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-slate-200">{editingId ? "カテゴリを編集" : "新しいカテゴリ"}</p>
          <span
            className="chip !py-1 !text-[13px]"
            style={{ borderColor: `${draft.color}99`, color: draft.color, background: `${draft.color}1f`, boxShadow: `0 0 14px ${draft.color}33` }}
          >
            <PreviewIcon size={13} />
            {draft.label.trim() || "プレビュー"}
          </span>
        </div>

        <div>
          <label className="label">名前</label>
          <input
            className="input"
            maxLength={16}
            placeholder="例：旅、家族、地域活動"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
        </div>

        <div>
          <label className="label">色</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((col) => (
              <button
                type="button"
                key={col}
                onClick={() => setDraft({ ...draft, color: col })}
                className="grid h-7 w-7 place-items-center rounded-full transition-transform hover:scale-110"
                style={{
                  background: col,
                  boxShadow: draft.color === col ? `0 0 0 2px #070a17, 0 0 0 4px ${col}, 0 0 14px ${col}` : `0 0 8px ${col}55`,
                }}
                aria-label={`色 ${col}`}
              >
                {draft.color === col && <Check size={14} strokeWidth={3} className="text-slate-950" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">アイコン</label>
          <div className="grid grid-cols-9 gap-1.5">
            {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => {
              const active = draft.icon === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setDraft({ ...draft, icon: key })}
                  className="grid aspect-square place-items-center rounded-lg border transition-all hover:bg-white/10"
                  style={
                    active
                      ? { color: draft.color, borderColor: draft.color, background: `${draft.color}1f`, boxShadow: `0 0 12px ${draft.color}44` }
                      : { color: "#94a3b8", borderColor: "rgba(255,255,255,0.06)" }
                  }
                  aria-label={`アイコン ${key}`}
                  aria-pressed={active}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {editingId && (
            <button type="button" className="btn-ghost" onClick={resetForm}>
              キャンセル
            </button>
          )}
          <button className="btn-primary" disabled={!draft.label.trim()}>
            {editingId ? (
              "保存"
            ) : (
              <>
                <Plus size={15} /> 追加
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
