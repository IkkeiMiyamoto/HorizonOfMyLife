import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Mode = "date" | "month";
type View = "day" | "month" | "year";

interface Props {
  /** date: "YYYY-MM-DD" / month: "YYYY-MM" */
  mode?: Mode;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  /** 値が空のとき最初に表示する年と画面（誕生日なら30年ほど前の「年」一覧から、など） */
  emptyYear?: number;
  emptyView?: View;
  allowClear?: boolean;
  className?: string;
  ariaLabel?: string;
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const POP_W = 304;
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function parse(v: string) {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  return { y, m, d: d || 1 };
}

/** 宇宙テーマに合わせた日付・年月ピッカー（ブラウザ標準のポップアップの代わり） */
export default function DatePicker({
  mode = "date",
  value,
  onChange,
  min,
  max,
  placeholder,
  emptyYear,
  emptyView,
  allowClear = false,
  className = "",
  ariaLabel,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("day");
  const now = new Date();
  const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  const [cursor, setCursor] = useState({ y: today.y, m: today.m });
  const [pos, setPos] = useState({ left: 0, top: 0, above: false });
  const sel = parse(value);

  // 範囲は日付文字列として比較する（YYYY-MM の境界は月初・月末に広げる）
  const lo = min ? (min.length === 7 ? `${min}-01` : min) : null;
  const hi = max ? (max.length === 7 ? `${max}-31` : max) : null;
  const outOfRange = (start: string, end: string) => (lo != null && end < lo) || (hi != null && start > hi);

  const openPicker = () => {
    const base = sel ?? { y: emptyYear ?? today.y, m: today.m };
    setCursor({ y: base.y, m: base.m });
    setView(sel ? (mode === "date" ? "day" : "month") : (emptyView ?? (mode === "date" ? "day" : "month")));
    setOpen(true);
  };
  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  // トリガーの下（入りきらなければ上）に固定配置。スクロール領域やモーダルに切り取られないよう body 直下に出す
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const h = popRef.current?.offsetHeight ?? 380;
      const left = Math.max(12, Math.min(r.left, window.innerWidth - POP_W - 12));
      const fitsBelow = r.bottom + 8 + h <= window.innerHeight - 8;
      const above = !fitsBelow && r.top - 8 - h >= 8;
      setPos({ left, top: above ? r.top - 8 - h : Math.min(r.bottom + 8, window.innerHeight - h - 8), above });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, view]);

  // 外側クリックで閉じる / Esc はピッカーだけを閉じ、背後のパネルやモーダルには伝えない
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      close(true);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const pickDay = (y: number, m: number, d: number) => {
    onChange(ymd(y, m, d));
    close(true);
  };
  const pickMonth = (m: number) => {
    if (mode === "month") {
      onChange(`${cursor.y}-${pad(m)}`);
      close(true);
    } else {
      setCursor({ y: cursor.y, m });
      setView("day");
    }
  };
  const pickYear = (y: number) => {
    setCursor({ y, m: cursor.m });
    setView("month");
  };

  const step = (dir: -1 | 1) => {
    if (view === "day") {
      const idx = cursor.y * 12 + (cursor.m - 1) + dir;
      setCursor({ y: Math.floor(idx / 12), m: (idx % 12) + 1 });
    } else if (view === "month") setCursor({ ...cursor, y: cursor.y + dir });
    else setCursor({ ...cursor, y: cursor.y + dir * 12 });
  };

  const display = sel ? (mode === "date" ? `${sel.y}年${sel.m}月${sel.d}日` : `${sel.y}年${sel.m}月`) : "";
  const todayValue = mode === "date" ? ymd(today.y, today.m, today.d) : `${today.y}-${pad(today.m)}`;
  const todayDisabled = mode === "date" ? outOfRange(todayValue, todayValue) : outOfRange(`${todayValue}-01`, `${todayValue}-31`);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : openPicker())}
        className={`input flex items-center justify-between gap-2 text-left ${open ? "border-cyan-400/60 ring-2 ring-cyan-400/20" : ""} ${className}`}
      >
        <span className={`truncate ${display ? "text-slate-100" : "text-slate-500"}`}>{display || placeholder || (mode === "date" ? "日付を選択" : "年月を選択")}</span>
        <CalendarDays size={16} className={`shrink-0 transition-colors ${open ? "text-cyan-300" : "text-slate-400"}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label={mode === "date" ? "日付を選択" : "年月を選択"}
            className="picker-in fixed z-[70] rounded-2xl border border-white/10 bg-[#070a17]/95 p-3 shadow-2xl shadow-black/70 backdrop-blur-2xl"
            style={{ left: pos.left, top: pos.top, width: POP_W, transformOrigin: pos.above ? "bottom left" : "top left" }}
          >
            {/* 星空のきらめき */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-cyan-500/15 blur-2xl" />
              <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-violet-600/15 blur-2xl" />
            </div>

            <div className="relative">
              <div className="mb-2 flex items-center justify-between">
                <NavButton onClick={() => step(-1)} label="前へ">
                  <ChevronLeft size={17} />
                </NavButton>
                <div className="flex items-center gap-1 font-display text-[15px] font-bold text-white">
                  {view === "year" ? (
                    <span className="px-2 py-1 tracking-wide">
                      {Math.floor(cursor.y / 12) * 12} – {Math.floor(cursor.y / 12) * 12 + 11}
                    </span>
                  ) : (
                    <>
                      <HeaderButton onClick={() => setView("year")}>{cursor.y}年</HeaderButton>
                      {view === "day" && <HeaderButton onClick={() => setView("month")}>{cursor.m}月</HeaderButton>}
                    </>
                  )}
                </div>
                <NavButton onClick={() => step(1)} label="次へ">
                  <ChevronRight size={17} />
                </NavButton>
              </div>

              {view === "day" && (
                <DayGrid cursor={cursor} sel={mode === "date" ? sel : null} today={today} outOfRange={outOfRange} onPick={pickDay} />
              )}
              {view === "month" && (
                <div className="grid grid-cols-3 gap-2 py-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const disabled = outOfRange(ymd(cursor.y, m, 1), ymd(cursor.y, m, 31));
                    const selected = !!sel && sel.y === cursor.y && sel.m === m;
                    const current = today.y === cursor.y && today.m === m;
                    return (
                      <Cell key={m} onClick={() => pickMonth(m)} disabled={disabled} selected={selected} current={current} className="h-12">
                        {m}月
                      </Cell>
                    );
                  })}
                </div>
              )}
              {view === "year" && (
                <div className="grid grid-cols-3 gap-2 py-1">
                  {Array.from({ length: 12 }, (_, i) => Math.floor(cursor.y / 12) * 12 + i).map((y) => {
                    const disabled = outOfRange(`${y}-01-01`, `${y}-12-31`);
                    return (
                      <Cell key={y} onClick={() => pickYear(y)} disabled={disabled} selected={sel?.y === y} current={today.y === y} className="h-12 font-display">
                        {y}
                      </Cell>
                    );
                  })}
                </div>
              )}

              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                <button
                  type="button"
                  disabled={todayDisabled}
                  onClick={() => {
                    onChange(todayValue);
                    close(true);
                  }}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-400/10 disabled:opacity-30"
                >
                  {mode === "date" ? "今日" : "今月"}
                </button>
                <span className="text-[11px] text-slate-500">{view === "year" ? "年を選択" : view === "month" ? "月を選択" : "日を選択"}</span>
                {allowClear && value ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      close(true);
                    }}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
                  >
                    クリア
                  </button>
                ) : (
                  <span className="w-10" />
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function DayGrid({
  cursor,
  sel,
  today,
  outOfRange,
  onPick,
}: {
  cursor: { y: number; m: number };
  sel: { y: number; m: number; d: number } | null;
  today: { y: number; m: number; d: number };
  outOfRange: (start: string, end: string) => boolean;
  onPick: (y: number, m: number, d: number) => void;
}) {
  const first = new Date(cursor.y, cursor.m - 1, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(cursor.y, cursor.m - 1, 1 - first + i);
    return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate(), wd: date.getDay() };
  });
  return (
    <>
      <div className="grid grid-cols-7 pb-1">
        {WEEK.map((w, i) => (
          <div key={w} className={`py-1 text-center text-[11px] font-medium ${i === 0 ? "text-rose-300/80" : i === 6 ? "text-sky-300/80" : "text-slate-400"}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((c) => {
          const str = ymd(c.y, c.m, c.d);
          const inMonth = c.m === cursor.m;
          const selected = !!sel && sel.y === c.y && sel.m === c.m && sel.d === c.d;
          const current = today.y === c.y && today.m === c.m && today.d === c.d;
          return (
            <Cell
              key={str}
              onClick={() => onPick(c.y, c.m, c.d)}
              disabled={outOfRange(str, str)}
              selected={selected}
              current={current}
              className={`h-9 font-display ${!inMonth && !selected ? "!text-slate-600" : c.wd === 0 && !selected ? "!text-rose-200" : c.wd === 6 && !selected ? "!text-sky-200" : ""}`}
            >
              {c.d}
            </Cell>
          );
        })}
      </div>
    </>
  );
}

function Cell({
  children,
  onClick,
  disabled,
  selected,
  current,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  selected: boolean;
  current: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative rounded-lg text-sm transition-all disabled:cursor-not-allowed disabled:opacity-20 ${
        selected
          ? "bg-gradient-to-br from-cyan-400 to-violet-500 font-bold text-white shadow-[0_0_16px_rgba(34,211,238,0.45)]"
          : "text-slate-200 hover:bg-white/10 hover:text-white"
      } ${current && !selected ? "ring-1 ring-inset ring-cyan-400/60" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

function NavButton({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}

function HeaderButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-0.5 rounded-lg px-2 py-1 transition-colors hover:bg-white/10 hover:text-cyan-200">
      {children}
      <ChevronDown size={13} className="opacity-50" />
    </button>
  );
}
