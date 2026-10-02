import { Download, RotateCcw, Tags, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { sampleData } from "../data/sample";
import { isValidBirthDate } from "../lib/age";
import { isLifeData, type Action } from "../lib/store";
import type { LifeData } from "../types";
import DatePicker from "./DatePicker";
import Modal from "./Modal";

interface Props {
  data: LifeData;
  dispatch: (a: Action) => void;
  onClose: () => void;
  notify: (msg: string) => void;
  onManageCategories: () => void;
}

export default function SettingsModal({ data, dispatch, onClose, notify, onManageCategories }: Props) {
  const [name, setName] = useState(data.profile.name);
  const [birthDate, setBirthDate] = useState(data.profile.birthDate ?? "");
  const [vision, setVision] = useState(data.profile.vision);
  const [confirm, setConfirm] = useState<"sample" | "empty" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const t = new Date();
  const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    // 誕生日が入っていれば生まれ年もそこから決める（年齢の計算やロードマップの年齢表示に使う）
    const valid = isValidBirthDate(birthDate);
    dispatch({
      type: "setProfile",
      profile: {
        name: name.trim() || "あなた",
        birthYear: valid ? Number(birthDate.slice(0, 4)) : data.profile.birthYear,
        birthDate: valid ? birthDate : data.profile.birthDate,
        vision: vision.trim(),
      },
    });
    onClose();
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `horizon-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (!isLifeData(parsed)) throw new Error("invalid");
      dispatch({ type: "replace", data: parsed });
      notify("データを読み込みました");
      onClose();
    } catch {
      notify("読み込めないファイルです");
    }
  };

  const reset = (kind: "sample" | "empty") => {
    setConfirm(null);
    if (kind === "sample") {
      dispatch({ type: "replace", data: structuredClone(sampleData) });
      notify("サンプルデータに戻しました");
      onClose();
      return;
    }
    // 白紙から始める：目標・つながりに加えてサンプルのビジョンも消し、続けてプロフィールを入力できるようモーダルは開いたままにする
    const profile = { ...data.profile, vision: data.profile.vision === sampleData.profile.vision ? "" : data.profile.vision };
    dispatch({ type: "replace", data: { version: 1, profile, categories: data.categories, goals: [], links: [] } });
    setVision(profile.vision);
    notify("白紙に戻しました。まずはプロフィールを設定しましょう");
  };

  return (
    <Modal title="プロフィールとデータ" eyebrow="Settings" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3">
            <label className="label">名前</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">誕生日</label>
            <DatePicker
              mode="date"
              value={birthDate}
              onChange={setBirthDate}
              min="1900-01-01"
              max={todayStr}
              emptyYear={data.profile.birthYear}
              emptyView="year"
              placeholder="生年月日を選択"
              ariaLabel="誕生日"
            />
          </div>
        </div>
        {!data.profile.birthDate && !birthDate && (
          <p className="-mt-2 text-xs text-slate-400">誕生日が未設定のため、現在は {data.profile.birthYear} 年生まれとして年齢を計算しています。</p>
        )}
        <div>
          <label className="label">人生のビジョン</label>
          <textarea className="input min-h-[72px] resize-y" placeholder="どんな人生を送りたいか、一文で。" value={vision} onChange={(e) => setVision(e.target.value)} />
        </div>
        <div className="flex justify-end">
          <button className="btn-primary">保存</button>
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
        <div>
          <p className="text-[13px] font-medium text-slate-200">カテゴリ</p>
          <p className="text-xs text-slate-400">{data.categories.length}個 · 星座の方角になります</p>
        </div>
        <button className="btn-ghost border border-white/10" onClick={onManageCategories}>
          <Tags size={14} /> カテゴリを管理
        </button>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="label">データ（このブラウザに自動保存されています）</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost border border-white/10" onClick={exportJson}>
            <Download size={14} /> JSONで書き出し
          </button>
          <button className="btn-ghost border border-white/10" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> 読み込み
          </button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          {confirm ? (
            <span className="flex items-center gap-2 text-xs text-rose-300">
              本当に{confirm === "sample" ? "サンプルに戻し" : "全削除し"}ますか？
              <button className="btn bg-rose-500/90 !py-1 text-white" onClick={() => reset(confirm)}>
                実行
              </button>
              <button className="btn-ghost !py-1" onClick={() => setConfirm(null)}>
                やめる
              </button>
            </span>
          ) : (
            <>
              <button className="btn-ghost border border-white/10" onClick={() => setConfirm("sample")}>
                <RotateCcw size={14} /> サンプルに戻す
              </button>
              <button className="btn-ghost border border-white/10 text-rose-300" onClick={() => setConfirm("empty")}>
                白紙から始める
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
