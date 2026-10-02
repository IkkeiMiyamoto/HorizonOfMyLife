import { AlertTriangle, Check, Flame, Orbit, Target, Zap } from "lucide-react";
import { useMemo } from "react";
import {
  categoryProgress,
  goalProgress,
  impactRanking,
  overallProgress,
  readiness,
  stepsWithinMonths,
  upcomingSteps,
} from "../lib/analysis";
import { useCategories } from "../lib/categories";
import { fmtShortYM, humanizeUntil, nowYM, toIdx } from "../lib/date";
import type { LifeData } from "../types";
import { ageOn, daysUntilBirthday, exactAge } from "../lib/age";
import ProgressRing from "./ProgressRing";
import Tilt from "./Tilt";

interface Props {
  data: LifeData;
  onSelect: (id: string) => void;
  onToggleStep: (goalId: string, stepId: string) => void;
}

const LIFESPAN = 90;

export default function DashboardView({ data, onSelect, onToggleStep }: Props) {
  const { categoryOf, categoryIds } = useCategories();
  const { goals, profile } = data;
  const overall = overallProgress(goals);
  const doneSteps = goals.reduce((a, g) => a + g.steps.filter((s) => s.done).length, 0);
  const totalSteps = goals.reduce((a, g) => a + g.steps.length, 0);
  const completedGoals = goals.filter((g) => g.steps.length && goalProgress(g) >= 1).length;
  const upcoming = useMemo(() => upcomingSteps(goals).slice(0, 7), [goals]);
  const impacts = useMemo(() => impactRanking(data).slice(0, 4), [data]);
  const blocked = goals
    .map((g) => ({ g, r: readiness(g, data) }))
    .filter((x) => x.r != null && x.r < 0.5 && goalProgress(x.g) < 1)
    .sort((a, b) => a.r! - b.r!);
  const tradeoffs = data.links.filter((l) => l.type === "tradeoff");
  const goalById = (id: string) => goals.find((g) => g.id === id);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 py-6">
      {/* ヒーロー */}
      <Tilt as="section" className="glass overflow-hidden rounded-3xl p-6 md:p-8" max={2.5}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="eyebrow">Horizon of {profile.name}</p>
            <h1 className="mt-3 bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text font-display text-2xl font-bold leading-snug text-transparent md:text-3xl">
              {profile.vision || "あなたの人生のビジョンを設定しましょう"}
            </h1>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat icon={Target} label="目標" value={goals.length} sub={`達成 ${completedGoals}`} />
              <Stat icon={Check} label="完了ステップ" value={doneSteps} sub={`/ ${totalSteps}`} />
              <Stat icon={Flame} label="90日以内" value={stepsWithinMonths(goals, 3)} sub="のステップ" />
              <Stat icon={Orbit} label="つながり" value={data.links.length} sub="の影響関係" />
            </div>
          </div>
          <div className="flex justify-center">
            <ProgressRing value={overall} size={168} stroke={12} sublabel="LIFE PROGRESS" />
          </div>
        </div>
        <LifeHorizon data={data} onSelect={onSelect} />
      </Tilt>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* バランス */}
        <Tilt as="section" className="glass rounded-3xl p-6" max={6}>
          <p className="eyebrow">Balance</p>
          <h3 className="mt-1 font-display text-lg font-bold text-white">人生のバランス</h3>
          <Radar values={categoryProgress(goals, categoryIds)} />
        </Tilt>

        {/* 次のアクション */}
        <section className="glass rounded-3xl p-6 fade-in lg:col-span-2">
          <p className="eyebrow">Next Actions</p>
          <h3 className="mt-1 font-display text-lg font-bold text-white">次の一歩</h3>
          <ul className="mt-4 space-y-2">
            {upcoming.length === 0 && <li className="text-sm text-slate-400">未完了のステップはありません 🎉</li>}
            {upcoming.map(({ goal, step, overdue }) => {
              const cat = categoryOf(goal.category);
              return (
                <li key={step.id} className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.05]">
                  <button
                    onClick={() => onToggleStep(goal.id, step.id)}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-all hover:scale-110"
                    style={{ borderColor: cat.color }}
                    aria-label={`${step.title}を完了にする`}
                  >
                    <Check size={12} className="opacity-0 group-hover:opacity-40" style={{ color: cat.color }} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-slate-100">{step.title}</div>
                    <button onClick={() => onSelect(goal.id)} className="flex items-center gap-1 truncate text-xs hover:underline" style={{ color: cat.color }}>
                      <cat.icon size={11} /> {goal.title}
                    </button>
                  </div>
                  {step.due && (
                    <span className={`chip shrink-0 ${overdue ? "border-rose-400/50 bg-rose-500/10 text-rose-300" : "border-white/10 text-slate-400"}`}>
                      {overdue && <AlertTriangle size={11} />}
                      {fmtShortYM(step.due)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* キーストーン */}
        <section className="glass rounded-3xl p-6 fade-in lg:col-span-2">
          <p className="eyebrow">Keystone Goals</p>
          <h3 className="mt-1 font-display text-lg font-bold text-white">波及効果の大きい目標</h3>
          <p className="mt-1 text-xs text-slate-400">進めると、つながりを通じて他の目標にも良い影響が広がる目標です。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {impacts.map((im, i) => {
              const cat = categoryOf(im.goal.category);
              return (
                <Tilt key={im.goal.id} className="rounded-2xl" max={12}>
                <button
                  onClick={() => onSelect(im.goal.id)}
                  className="group relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:border-white/20"
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity group-hover:opacity-100" style={{ background: `${cat.color}33` }} />
                  <div className="flex items-center justify-between">
                    <span className="pop font-display text-3xl font-bold" style={{ color: cat.color }}>
                      #{i + 1}
                    </span>
                    <span className="chip border-white/10 text-slate-300">
                      <Zap size={11} className="text-yellow-300" />
                      {im.reach}件に波及
                    </span>
                  </div>
                  <div className="mt-2 font-medium text-white">{im.goal.title}</div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${goalProgress(im.goal) * 100}%`, background: cat.color }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs text-slate-400">
                    <span>進捗 {Math.round(goalProgress(im.goal) * 100)}%</span>
                    <span>{humanizeUntil(im.goal.targetDate)}</span>
                  </div>
                </button>
                </Tilt>
              );
            })}
            {impacts.length === 0 && <p className="text-sm text-slate-400">目標同士の影響関係を追加すると表示されます。</p>}
          </div>
        </section>

        {/* 注意 */}
        <section className="glass rounded-3xl p-6 fade-in">
          <p className="eyebrow">Watch Out</p>
          <h3 className="mt-1 font-display text-lg font-bold text-white">気をつけたいこと</h3>
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-2 text-xs font-medium text-sky-300">前提が整っていない目標</div>
              {blocked.length === 0 && <p className="text-xs text-slate-400">なし</p>}
              <ul className="space-y-1.5">
                {blocked.map(({ g, r }) => (
                  <li key={g.id}>
                    <button onClick={() => onSelect(g.id)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5">
                      <span className="truncate text-slate-200">{g.title}</span>
                      <span className="shrink-0 font-display text-xs text-sky-300">準備度 {Math.round(r! * 100)}%</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium text-rose-300">トレードオフ</div>
              {tradeoffs.length === 0 && <p className="text-xs text-slate-400">なし</p>}
              <ul className="space-y-1.5">
                {tradeoffs.map((l) => (
                  <li key={l.id} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-300">
                    <button className="truncate hover:underline" onClick={() => onSelect(l.source)}>
                      {goalById(l.source)?.title}
                    </button>
                    <span className="shrink-0 text-rose-400">⇄</span>
                    <button className="truncate hover:underline" onClick={() => onSelect(l.target)}>
                      {goalById(l.target)?.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Target; label: string; value: number; sub: string }) {
  return (
    <Tilt className="rounded-2xl border border-white/10 bg-white/[0.03] p-3" max={14}>
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Icon size={13} />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="pop-sm font-display text-2xl font-bold text-white">{value}</span>
        <span className="text-xs text-slate-400">{sub}</span>
      </div>
    </Tilt>
  );
}

/** 0歳〜90歳の一本線の上に「今」と各目標の到達点を並べる */
function LifeHorizon({ data, onSelect }: { data: LifeData; onSelect: (id: string) => void }) {
  const { categoryOf } = useCategories();
  const age = exactAge(data.profile);
  const untilBirthday = daysUntilBirthday(data.profile);
  const pos = (a: number) => `${Math.max(0, Math.min(100, (a / LIFESPAN) * 100))}%`;
  const goalAge = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return exactAge(data.profile, new Date(y, m - 1, 1));
  };

  return (
    <div className="relative mt-10">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="eyebrow">Life Horizon</p>
        <p className="text-xs text-slate-400">
          現在 <span className="font-display text-base font-bold text-cyan-300">{ageOn(data.profile)}</span> 歳
          {untilBirthday != null && (
            <span className="ml-2 text-slate-400">{untilBirthday === 0 ? "🎂 今日は誕生日です" : `· 次の誕生日まで あと${untilBirthday}日`}</span>
          )}
        </p>
      </div>
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-8 h-px bg-gradient-to-r from-slate-700 via-slate-500 to-transparent" />
        <div className="absolute left-0 top-[31px] h-[3px] rounded-full bg-gradient-to-r from-violet-500/40 to-cyan-400 shadow-[0_0_12px_#22d3ee]" style={{ width: pos(age) }} />
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((a) => (
          <div key={a} className="absolute top-11 -translate-x-1/2 font-display text-[11px] text-slate-400" style={{ left: pos(a) }}>
            {a}
          </div>
        ))}
        <div className="absolute top-8 -translate-x-1/2 -translate-y-1/2" style={{ left: pos(age) }}>
          <span className="absolute inset-0 -m-1.5 animate-ping rounded-full bg-cyan-400/40" />
          <span className="relative block h-3.5 w-3.5 rounded-full border-2 border-white bg-cyan-400 shadow-[0_0_14px_#22d3ee]" />
        </div>
        {data.goals.map((g) => {
          const cat = categoryOf(g.category);
          const done = goalProgress(g) >= 1;
          return (
            <button
              key={g.id}
              onClick={() => onSelect(g.id)}
              className="group absolute top-1 -translate-x-1/2"
              style={{ left: pos(goalAge(g.targetDate)) }}
              aria-label={g.title}
            >
              <span className="block h-2.5 w-2.5 rotate-45 transition-transform group-hover:scale-150" style={{ background: done ? "#fde68a" : cat.color, boxShadow: `0 0 10px ${cat.color}` }} />
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/95 px-2 py-1 text-xs text-slate-200 shadow-xl group-hover:block">
                {g.title} <span style={{ color: cat.color }}>{Math.floor(goalAge(g.targetDate))}歳</span>
              </span>
            </button>
          );
        })}
      </div>
      <NearHorizon data={data} onSelect={onSelect} />
    </div>
  );
}

/** 直近の目標を、重ならないよう段に分けて拡大表示する */
function NearHorizon({ data, onSelect }: { data: LifeData; onSelect: (id: string) => void }) {
  const { categoryOf } = useCategories();
  const nowI = toIdx(nowYM());
  const endI = Math.max(nowI + 24, ...data.goals.map((g) => toIdx(g.targetDate) + 4));
  const span = endI - nowI;
  const pct = (i: number) => Math.max(0, Math.min(100, ((i - nowI) / span) * 100));
  const LABEL_PCT = 18;
  const lanes: number[] = [];
  const placed = [...data.goals]
    .sort((a, b) => toIdx(a.targetDate) - toIdx(b.targetDate))
    .map((g) => {
      const x = pct(toIdx(g.targetDate));
      let lane = lanes.findIndex((end) => end <= x);
      if (lane === -1) lane = lanes.length;
      lanes[lane] = x + LABEL_PCT;
      return { g, x, lane };
    });
  const firstYear = Math.ceil(nowI / 12);
  const yearTicks: number[] = [];
  for (let y = firstYear; y * 12 <= endI; y++) yearTicks.push(y);

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="eyebrow">Next Horizon</p>
        <p className="text-xs text-slate-400">目標をクリックで詳細 →</p>
      </div>
      <div className="relative rounded-2xl border border-white/5 bg-white/[0.02] px-4 pb-8 pt-3" style={{ height: lanes.length * 32 + 52 }}>
        <div className="relative h-full">
          {yearTicks.map((y) => (
            <div key={y} className="absolute bottom-0 top-0 border-l border-white/[0.06]" style={{ left: `${pct(y * 12)}%` }}>
              <span className="absolute -bottom-6 -translate-x-1/2 whitespace-nowrap font-display text-[11px] text-slate-400">
                {y}
                <span className="ml-1 text-slate-500">{y - data.profile.birthYear}歳</span>
              </span>
            </div>
          ))}
          <div className="absolute bottom-0 top-0 w-px bg-cyan-400 shadow-[0_0_8px_#22d3ee]" style={{ left: 0 }} />
          {placed.map(({ g, x, lane }) => {
            const cat = categoryOf(g.category);
            const p = goalProgress(g);
            const flip = x > 100 - LABEL_PCT; // 右端ではラベルを左側に出す
            return (
              <button
                key={g.id}
                onClick={() => onSelect(g.id)}
                className={`group absolute flex items-center gap-1.5 whitespace-nowrap text-left ${flip ? "translate-x-[7px] flex-row-reverse" : "-translate-x-[7px]"}`}
                style={flip ? { right: `${100 - x}%`, top: lane * 32 } : { left: `${x}%`, top: lane * 32 }}
              >
                <span
                  className="block h-3.5 w-3.5 shrink-0 rotate-45 rounded-[3px] border-2 transition-transform group-hover:scale-125"
                  style={{ borderColor: cat.color, background: p >= 1 ? "#fde68a" : `${cat.color}${Math.round(40 + p * 200).toString(16).padStart(2, "0")}`, boxShadow: `0 0 10px ${cat.color}88` }}
                />
                <span className="max-w-[160px] truncate text-[13px] text-slate-100 group-hover:text-white">{g.title}</span>
                <span className="font-display text-[11px]" style={{ color: cat.color }}>
                  {Math.round(p * 100)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Radar({ values }: { values: Record<string, number | null> }) {
  const { categories: CATEGORIES } = useCategories();
  // 2つ以下だとレーダーにならないので横棒で表示する
  if (CATEGORIES.length < 3) {
    return (
      <ul className="mt-6 space-y-4">
        {CATEGORIES.map((cat) => {
          const v = values[cat.id];
          return (
            <li key={cat.id}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium" style={{ color: cat.color }}>
                  <cat.icon size={14} /> {cat.label}
                </span>
                <span className="font-display text-xs text-slate-300">{v == null ? "—" : `${Math.round(v * 100)}%`}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(v ?? 0) * 100}%`, background: cat.color, boxShadow: `0 0 10px ${cat.color}` }} />
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  const size = 280;
  const c = size / 2;
  const R = 88;
  const n = CATEGORIES.length;
  const pt = (i: number, r: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [c + Math.cos(a) * r, c + Math.sin(a) * r];
  };
  const poly = CATEGORIES.map((cat, i) => pt(i, R * Math.max(0.04, values[cat.id] ?? 0)).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto mt-2 w-full max-w-[300px]">
      <defs>
        <linearGradient id="radar-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.35} />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon key={f} points={CATEGORIES.map((_, i) => pt(i, R * f).join(",")).join(" ")} fill="none" stroke="rgba(148,163,184,0.15)" />
      ))}
      {CATEGORIES.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(148,163,184,0.12)" />;
      })}
      <polygon points={poly} fill="url(#radar-fill)" stroke="#67e8f9" strokeWidth={1.5} style={{ filter: "drop-shadow(0 0 8px #22d3ee88)", transition: "all .6s" }} />
      {CATEGORIES.map((cat, i) => {
        const v = values[cat.id];
        const [x, y] = pt(i, R * Math.max(0.04, v ?? 0));
        const [lx, ly] = pt(i, R + 30);
        return (
          <g key={cat.id}>
            <circle cx={x} cy={y} r={3.5} fill={cat.color} />
            <text x={lx} y={ly - 6} textAnchor="middle" fill={cat.color} fontSize={n > 8 ? 11 : 13} fontWeight={700}>
              {cat.label.length > 7 ? `${cat.label.slice(0, 7)}…` : cat.label}
            </text>
            <text x={lx} y={ly + 10} textAnchor="middle" className="fill-slate-300 font-display" fontSize={12}>
              {v == null ? "—" : `${Math.round(v * 100)}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
