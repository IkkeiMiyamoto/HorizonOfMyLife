import type { CategoryId, Goal, LifeData, Link, Step } from "../types";
import { fromIdx, monthsUntil, nowYM, toIdx } from "./date";

export const goalProgress = (g: Goal): number =>
  g.steps.length ? g.steps.filter((s) => s.done).length / g.steps.length : 0;

/** ロードマップ上のバーの開始月：指定があればそれ、なければ作成月と各ステップ期日のうち最も早いもの */
export function goalStart(g: Goal): string {
  if (g.startDate) return fromIdx(Math.min(toIdx(g.startDate), toIdx(g.targetDate)));
  const idxs = [g.createdAt, ...g.steps.map((s) => s.due).filter(Boolean)].map((d) => toIdx(d!));
  return fromIdx(Math.min(...idxs, toIdx(g.targetDate)));
}

export const overallProgress = (goals: Goal[]): number =>
  goals.length ? goals.reduce((a, g) => a + goalProgress(g), 0) / goals.length : 0;

export function categoryProgress(goals: Goal[], categoryIds: CategoryId[]): Record<CategoryId, number | null> {
  const out = {} as Record<CategoryId, number | null>;
  for (const c of categoryIds) {
    const gs = goals.filter((g) => g.category === c);
    out[c] = gs.length ? overallProgress(gs) : null;
  }
  return out;
}

const isPositive = (l: Link) => l.type !== "tradeoff";

/** goalId から前提・相乗効果リンクを辿って到達できる目標（自身を除く） */
export function influenceReach(goalId: string, links: Link[]): Set<string> {
  const seen = new Set<string>();
  const queue = [goalId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const l of links) {
      if (l.source === cur && isPositive(l) && l.target !== goalId && !seen.has(l.target)) {
        seen.add(l.target);
        queue.push(l.target);
      }
    }
  }
  return seen;
}

export interface Impact {
  goal: Goal;
  direct: number;
  reach: number;
  score: number;
}

/** 波及効果の大きい「キーストーン目標」のランキング */
export function impactRanking(data: LifeData): Impact[] {
  return data.goals
    .map((goal) => {
      const out = data.links.filter((l) => l.source === goal.id && isPositive(l));
      const direct = out.length;
      const reach = influenceReach(goal.id, data.links).size;
      const score = out.reduce((a, l) => a + (l.type === "enables" ? 2 : 1), 0) + reach;
      return { goal, direct, reach, score };
    })
    .filter((i) => i.score > 0)
    .sort((a, b) => b.reach - a.reach || b.score - a.score);
}

/** 前提条件となる目標の平均進捗（前提が無ければ null） */
export function readiness(goal: Goal, data: LifeData): number | null {
  const pre = data.links
    .filter((l) => l.type === "enables" && l.target === goal.id)
    .map((l) => data.goals.find((g) => g.id === l.source))
    .filter(Boolean) as Goal[];
  return pre.length ? overallProgress(pre) : null;
}

export interface UpcomingStep {
  goal: Goal;
  step: Step;
  overdue: boolean;
}

export function upcomingSteps(goals: Goal[]): UpcomingStep[] {
  const now = toIdx(nowYM());
  const far = "9999-12";
  return goals
    .flatMap((goal) => goal.steps.filter((s) => !s.done).map((step) => ({ goal, step, overdue: !!step.due && toIdx(step.due) < now })))
    .sort((a, b) => toIdx(a.step.due ?? far) - toIdx(b.step.due ?? far));
}

export const stepsWithinMonths = (goals: Goal[], months: number): number =>
  upcomingSteps(goals).filter((u) => u.step.due && monthsUntil(u.step.due) <= months).length;
