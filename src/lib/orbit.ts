import { forceCollide, forceLink, forceManyBody, forceRadial, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import type { CategoryId, Goal, Link } from "../types";
import { nowYM, toIdx } from "./date";

export const ORBIT_BASE = 110;
export const ORBIT_SCALE = 165;
export const CORE_R = 44;
export const YEAR_LABEL_ANGLE = -Math.PI / 2 + Math.PI / 6;

/**
 * 「中心＝今の自分、外側の軌道ほど遠い未来」という座標系。
 * 近い未来ほど解像度が欲しいので、距離は年数の平方根で圧縮する。
 */
export function orbitRadius(ym: string): number {
  const years = Math.max(0, (toIdx(ym) - toIdx(nowYM())) / 12);
  return ORBIT_BASE + Math.sqrt(years) * ORBIT_SCALE;
}

/** カテゴリごとの方角。categoryIds の並び順で円周を等分する（一覧に無いカテゴリは真上） */
export function categoryAngle(c: CategoryId, categoryIds: CategoryId[]): number {
  const i = Math.max(0, categoryIds.indexOf(c));
  return (i / Math.max(1, categoryIds.length)) * Math.PI * 2 - Math.PI / 2;
}

export const nodeRadius = (g: Goal) => 20 + g.priority * 6;

export const maxOrbitRadius = (goals: Goal[]) =>
  Math.max(ORBIT_BASE + ORBIT_SCALE * 1.5, ...goals.map((g) => orbitRadius(g.targetDate))) + 60;

/** 未来の各年（1月）の軌道。ラベルを出すかどうかは呼び出し側で決める */
export function yearOrbits(maxR: number): { year: number; r: number }[] {
  const out: { year: number; r: number }[] = [];
  for (let y = new Date().getFullYear() + 1; orbitRadius(`${y}-01`) <= maxR - 20; y++) out.push({ year: y, r: orbitRadius(`${y}-01`) });
  return out;
}

/** 0〜1 の決定的な疑似乱数（同じ目標は毎回同じ位置から配置を始める） */
export function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export type OrbitNode = SimulationNodeDatum & { id: string; goal: Goal | null; r: number };

export const CORE_ID = "__core";

export function initialPosition(g: Goal, categoryIds: CategoryId[]) {
  const a = categoryAngle(g.category, categoryIds) + (hash01(g.id) - 0.5) * 0.8;
  const R = orbitRadius(g.targetDate);
  return { x: Math.cos(a) * R, y: Math.sin(a) * R };
}

/** 2D（ライブ）・3D（一括計算）で共通の力学モデル */
export function createOrbitSimulation(nodes: OrbitNode[], links: Pick<Link, "source" | "target">[], categoryIds: CategoryId[]) {
  const anchor = (n: OrbitNode) => {
    if (!n.goal) return { x: 0, y: 0 };
    const a = categoryAngle(n.goal.category, categoryIds);
    const R = orbitRadius(n.goal.targetDate);
    return { x: Math.cos(a) * R, y: Math.sin(a) * R };
  };
  const ids = new Set(nodes.map((n) => n.id));
  const simLinks = links.filter((l) => ids.has(l.source) && ids.has(l.target)).map((l) => ({ source: l.source, target: l.target }));
  return (
    forceSimulation<OrbitNode>(nodes)
      .force("charge", forceManyBody<OrbitNode>().strength((n) => (n.goal ? -360 : 0)))
      // ラベルが下に付くぶん、衝突半径は大きめに取る
      .force("collide", forceCollide<OrbitNode>().radius((n) => (n.goal ? n.r + 58 : CORE_R + 56)))
      .force("link", forceLink<OrbitNode, { source: string; target: string }>(simLinks).id((n) => n.id).distance(140).strength(0.03))
      .force("radial", forceRadial<OrbitNode>((n) => (n.goal ? orbitRadius(n.goal.targetDate) : 0), 0, 0).strength((n) => (n.goal ? 0.8 : 0)))
      .force("x", forceX<OrbitNode>((n) => anchor(n).x).strength((n) => (n.goal ? 0.03 : 0)))
      .force("y", forceY<OrbitNode>((n) => anchor(n).y).strength((n) => (n.goal ? 0.03 : 0)))
  );
}

/** シミュレーションを同期的に最後まで回して、目標ごとの平面座標を返す */
export function computeOrbitLayout(goals: Goal[], links: Link[], categoryIds: CategoryId[]): Map<string, { x: number; y: number }> {
  const core: OrbitNode = { id: CORE_ID, goal: null, r: CORE_R, x: 0, y: 0, fx: 0, fy: 0 };
  const nodes: OrbitNode[] = [core, ...goals.map((g) => ({ id: g.id, goal: g, r: nodeRadius(g), ...initialPosition(g, categoryIds) }))];
  const sim = createOrbitSimulation(nodes, links, categoryIds).stop();
  for (let i = 0; i < 320; i++) sim.tick();
  return new Map(nodes.filter((n) => n.goal).map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
}
