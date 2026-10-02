import { ZoomIn, ZoomOut } from "lucide-react";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { goalProgress, goalStart } from "../lib/analysis";
import { useCategories, type CategoryMeta } from "../lib/categories";
import { LINK_TYPES, linkTypeOf } from "../lib/constants";
import { fmtYM, nowYM, toIdx } from "../lib/date";
import type { Goal, LifeData } from "../types";

interface Props {
  data: LifeData;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const LABEL_W = 260;
const HEADER_H = 64;
const ROW_H = 68;
const CAT_H = 34;
const BAR_H = 24;

type Row = { kind: "cat"; cat: CategoryMeta; y: number } | { kind: "goal"; goal: Goal; y: number };

export default function RoadmapView({ data, selectedId, onSelect }: Props) {
  const { categories: CATEGORIES, categoryOf } = useCategories();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ppm, setPpm] = useState(30); // 1ヶ月あたりのピクセル
  const [hover, setHover] = useState<string | null>(null);

  const nowI = toIdx(nowYM());
  const today = new Date();
  const nowPos = nowI + (today.getDate() - 1) / 31;

  const { rows, bodyH, startI, endI } = useMemo(() => {
    const rows: Row[] = [];
    let y = 0;
    for (const cat of CATEGORIES) {
      const gs = data.goals.filter((g) => g.category === cat.id).sort((a, b) => toIdx(a.targetDate) - toIdx(b.targetDate));
      if (!gs.length) continue;
      rows.push({ kind: "cat", cat, y });
      y += CAT_H;
      for (const goal of gs) {
        rows.push({ kind: "goal", goal, y });
        y += ROW_H;
      }
    }
    const starts = data.goals.map((g) => toIdx(goalStart(g)));
    const ends = data.goals.map((g) => toIdx(g.targetDate));
    const minI = Math.min(nowI - 6, ...starts);
    const maxI = Math.max(nowI + 24, ...ends.map((e) => e + 4));
    return { rows, bodyH: Math.max(y, 200), startI: Math.floor(minI / 12) * 12, endI: (Math.floor(maxI / 12) + 1) * 12 };
  }, [data.goals, nowI, CATEGORIES]);

  const width = (endI - startI) * ppm;
  const xm = (i: number) => (i - startI) * ppm; // 月の左端
  const xc = (ym: string) => xm(toIdx(ym)) + ppm / 2; // 月の中央

  // 初回表示で「今」が左寄りに来るようスクロール
  const didScroll = useRef(false);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || didScroll.current) return;
    didScroll.current = true;
    el.scrollLeft = Math.max(0, xm(nowPos) - (el.clientWidth - LABEL_W) * 0.25);
  });

  // ズーム時は「今」の位置を基準に保つ
  const prevPpm = useRef(ppm);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || prevPpm.current === ppm) return;
    const anchor = el.scrollLeft + (el.clientWidth - LABEL_W) / 2;
    el.scrollLeft = (anchor / prevPpm.current) * ppm - (el.clientWidth - LABEL_W) / 2;
    prevPpm.current = ppm;
  }, [ppm]);

  const goalRowY = new Map<string, number>();
  for (const r of rows) if (r.kind === "goal") goalRowY.set(r.goal.id, r.y + ROW_H / 2);

  const years: number[] = [];
  for (let i = startI; i < endI; i += 12) years.push(i / 12);
  const focus = hover ?? selectedId;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-5">
        <div className="fade-in">
          <p className="eyebrow">Roadmap</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-white">ロードマップ</h2>
          <p className="mt-1.5 text-[13px] text-slate-300">◆ はステップ、★ はゴール。目標にカーソルを合わせると、ステップ名と影響のつながりが表示されます。</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-4 text-[13px] text-slate-300 md:flex">
            {LINK_TYPES.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5">
                <span className="h-[3px] w-6 rounded" style={{ background: t.color }} />
                {t.label}
              </span>
            ))}
          </div>
          <div className="glass flex items-center gap-1 rounded-lg p-1">
            <button className="btn-ghost !px-2" onClick={() => setPpm((p) => Math.max(8, p / 1.4))} aria-label="縮小">
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min={8}
              max={90}
              value={ppm}
              onChange={(e) => setPpm(Number(e.target.value))}
              className="w-24 accent-cyan-400"
              aria-label="ズーム"
            />
            <button className="btn-ghost !px-2" onClick={() => setPpm((p) => Math.min(90, p * 1.4))} aria-label="拡大">
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="relative mx-6 mb-6 flex-1 overflow-auto rounded-2xl border border-white/10 bg-slate-950/40 backdrop-blur-md">
        <div style={{ width: LABEL_W + width }} className="relative">
          {/* ヘッダー（年・年齢・月） */}
          <div className="sticky top-0 z-20 flex border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
            <div className="sticky left-0 z-30 flex shrink-0 items-end border-r border-white/10 bg-[#070a17] px-4 pb-2" style={{ width: LABEL_W, height: HEADER_H }}>
              <span className="eyebrow">Goals</span>
            </div>
            <svg width={width} height={HEADER_H} className="block">
              {years.map((y) => {
                const x = xm(y * 12);
                const age = y - data.profile.birthYear;
                return (
                  <g key={y}>
                    <line x1={x} x2={x} y1={0} y2={HEADER_H} stroke="rgba(148,163,184,0.25)" />
                    <text x={x + 10} y={24} className="fill-white font-display" fontSize={15} fontWeight={700}>
                      {y}
                    </text>
                    {ppm * 12 > 70 && (
                      <text x={x + 10 + (ppm * 12 > 110 ? 50 : 0)} y={ppm * 12 > 110 ? 24 : 40} className="fill-slate-300" fontSize={12}>
                        {age}歳
                      </text>
                    )}
                    {ppm >= 18 &&
                      Array.from({ length: 12 }, (_, m) => (
                        <text key={m} x={xm(y * 12 + m) + ppm / 2} y={HEADER_H - 10} textAnchor="middle" className="fill-slate-400" fontSize={11}>
                          {m + 1}
                        </text>
                      ))}
                  </g>
                );
              })}
              <g transform={`translate(${xm(nowPos)},0)`}>
                <rect x={-20} y={HEADER_H - 22} width={40} height={16} rx={8} fill="#22d3ee" />
                <text y={HEADER_H - 11} textAnchor="middle" fontSize={10} fontWeight={700} fill="#04050d" className="font-display">
                  NOW
                </text>
              </g>
            </svg>
          </div>

          <div className="flex">
            {/* 左：目標名 */}
            <div className="sticky left-0 z-10 shrink-0 border-r border-white/10 bg-[#070a17]" style={{ width: LABEL_W, height: bodyH }}>
              {rows.map((r) =>
                r.kind === "cat" ? (
                  <div key={r.cat.id} className="flex items-center gap-2 px-4 text-[13px] font-bold tracking-widest" style={{ height: CAT_H, color: r.cat.color }}>
                    <r.cat.icon size={14} />
                    {r.cat.label}
                  </div>
                ) : (
                  <button
                    key={r.goal.id}
                    onClick={() => onSelect(r.goal.id)}
                    onMouseEnter={() => setHover(r.goal.id)}
                    onMouseLeave={() => setHover(null)}
                    className={`flex w-full items-center gap-3 border-l-2 px-4 text-left transition-colors ${focus === r.goal.id ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"}`}
                    style={{ height: ROW_H, borderColor: focus === r.goal.id ? categoryOf(r.goal.category).color : "transparent" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-medium text-white">{r.goal.title}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${goalProgress(r.goal) * 100}%`, background: categoryOf(r.goal.category).color }}
                          />
                        </div>
                        <span className="w-10 text-right font-display text-xs text-slate-300">{Math.round(goalProgress(r.goal) * 100)}%</span>
                      </div>
                    </div>
                  </button>
                ),
              )}
            </div>

            {/* 右：タイムライン */}
            <svg width={width} height={bodyH} className="block">
              <defs>
                <filter id="rm-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {CATEGORIES.map((c) => (
                  <linearGradient key={c.id} id={`bar-${c.id}`} x1="0" x2="1">
                    <stop offset="0%" stopColor={c.color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={c.color} stopOpacity={0.9} />
                  </linearGradient>
                ))}
              </defs>

              {/* 過去の領域 */}
              <rect x={0} y={0} width={xm(nowPos)} height={bodyH} fill="rgba(2,6,23,0.45)" />

              {/* グリッド */}
              {years.map((y) => (
                <Fragment key={y}>
                  <line x1={xm(y * 12)} x2={xm(y * 12)} y1={0} y2={bodyH} stroke="rgba(148,163,184,0.16)" />
                  {ppm >= 18 &&
                    [3, 6, 9].map((m) => (
                      <line key={m} x1={xm(y * 12 + m)} x2={xm(y * 12 + m)} y1={0} y2={bodyH} stroke="rgba(148,163,184,0.06)" />
                    ))}
                </Fragment>
              ))}
              {rows.map((r) =>
                r.kind === "cat" ? (
                  <rect key={r.cat.id} x={0} y={r.y} width={width} height={CAT_H} fill={r.cat.color} opacity={0.035} />
                ) : (
                  <line key={r.goal.id} x1={0} x2={width} y1={r.y + ROW_H} y2={r.y + ROW_H} stroke="rgba(148,163,184,0.05)" />
                ),
              )}

              {/* 影響の曲線（目標の到達点同士を結ぶ） */}
              {data.links.map((l) => {
                const s = data.goals.find((g) => g.id === l.source);
                const t = data.goals.find((g) => g.id === l.target);
                const ys = goalRowY.get(l.source);
                const yt = goalRowY.get(l.target);
                if (!s || !t || ys == null || yt == null) return null;
                // ★と日付ラベルの右側から線を出し、文字に重ねない
                const tail = ppm * 12 > 160 ? 80 : 24;
                const x1 = xc(s.targetDate) + ppm / 2 + tail;
                const x2 = xc(t.targetDate) + ppm / 2 + tail;
                const bulge = 40 + Math.abs(yt - ys) * 0.25;
                const d = `M${x1},${ys} C${Math.max(x1, x2) + bulge},${ys} ${Math.max(x1, x2) + bulge},${yt} ${x2},${yt}`;
                const meta = linkTypeOf(l.type);
                const on = focus === l.source || focus === l.target;
                return (
                  <path
                    key={l.id}
                    d={d}
                    fill="none"
                    stroke={meta.color}
                    strokeWidth={on ? 2 : 1.2}
                    strokeOpacity={focus ? (on ? 0.95 : 0.06) : 0.2}
                    strokeDasharray={l.type === "tradeoff" ? "5 5" : undefined}
                    className={on && l.type !== "tradeoff" ? "flow" : undefined}
                    style={{ transition: "stroke-opacity .2s" }}
                  />
                );
              })}

              {/* 目標バー */}
              {rows.map((r) => {
                if (r.kind !== "goal") return null;
                const g = r.goal;
                const cat = categoryOf(g.category);
                const p = goalProgress(g);
                const x1 = xm(toIdx(goalStart(g)));
                const x2 = xm(toIdx(g.targetDate) + 1);
                const cy = r.y + ROW_H / 2;
                const w = Math.max(ppm, x2 - x1);
                const dim = focus && focus !== g.id && !data.links.some((l) => (l.source === focus && l.target === g.id) || (l.target === focus && l.source === g.id));
                return (
                  <g
                    key={g.id}
                    opacity={dim ? 0.3 : 1}
                    style={{ transition: "opacity .2s" }}
                    className="cursor-pointer"
                    onClick={() => onSelect(g.id)}
                    onMouseEnter={() => setHover(g.id)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <rect x={x1} y={cy - BAR_H / 2} width={w} height={BAR_H} rx={BAR_H / 2} fill={cat.color} fillOpacity={0.08} stroke={cat.color} strokeOpacity={selectedId === g.id ? 0.9 : 0.35} />
                    <rect
                      x={x1}
                      y={cy - BAR_H / 2}
                      width={w * p}
                      height={BAR_H}
                      rx={BAR_H / 2}
                      fill={`url(#bar-${g.category})`}
                      style={{ transition: "width .8s cubic-bezier(.2,.8,.2,1)" }}
                    />
                    {/* ゴールの星 */}
                    <g transform={`translate(${x2 + 12},${cy})`} filter="url(#rm-glow)">
                      <path d={starPath(9, 4)} fill={p >= 1 ? "#fde68a" : cat.color} fillOpacity={p >= 1 ? 1 : 0.85} />
                    </g>
                    {ppm * 12 > 160 && (
                      <text x={x2 + 26} y={cy + 4} fontSize={12} fill={cat.color} className="font-display">
                        {g.targetDate.replace("-", ".")}
                      </text>
                    )}
                    {/* ステップ */}
                    {g.steps
                      .filter((s) => s.due)
                      .map((s, i) => {
                        const sx = xc(s.due!);
                        const overdue = !s.done && toIdx(s.due!) < nowI;
                        return (
                          <g key={s.id} transform={`translate(${sx},${cy})`}>
                            <title>
                              {s.title}（{fmtYM(s.due!)}）{s.done ? " ✓ 完了" : overdue ? " ⚠ 期限超過" : ""}
                            </title>
                            <rect
                              x={-6}
                              y={-6}
                              width={12}
                              height={12}
                              transform="rotate(45)"
                              fill={s.done ? cat.color : "#0a0f1f"}
                              stroke={overdue ? "#fb7185" : cat.color}
                              strokeWidth={1.8}
                              filter={s.done ? "url(#rm-glow)" : undefined}
                            />
                            {(ppm >= 44 || focus === g.id) && (
                              <text
                                y={i % 2 ? 28 : -18}
                                textAnchor="middle"
                                fontSize={11.5}
                                fill={s.done ? "#e2e8f0" : "#cbd5e1"}
                                style={{ paintOrder: "stroke" }}
                                stroke="#060914"
                                strokeWidth={4}
                              >
                                {s.title.length > 10 ? `${s.title.slice(0, 10)}…` : s.title}
                              </text>
                            )}
                          </g>
                        );
                      })}
                  </g>
                );
              })}

              {/* 今日の線 */}
              <g>
                <line x1={xm(nowPos)} x2={xm(nowPos)} y1={0} y2={bodyH} stroke="#22d3ee" strokeWidth={6} strokeOpacity={0.12} />
                <line x1={xm(nowPos)} x2={xm(nowPos)} y1={0} y2={bodyH} stroke="#22d3ee" strokeWidth={1.5} />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function starPath(outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}
