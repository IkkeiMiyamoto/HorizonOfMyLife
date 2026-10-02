import type { Simulation } from "d3-force";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { goalProgress } from "../lib/analysis";
import { useCategories } from "../lib/categories";
import { LINK_TYPES, linkTypeOf } from "../lib/constants";
import {
  CORE_ID,
  CORE_R,
  ORBIT_BASE,
  YEAR_LABEL_ANGLE,
  categoryAngle,
  createOrbitSimulation,
  initialPosition,
  maxOrbitRadius,
  nodeRadius,
  yearOrbits,
  type OrbitNode,
} from "../lib/orbit";
import type { CategoryId, Goal, LifeData } from "../types";
import ConstellationOverlay from "./ConstellationOverlay";

interface Props {
  data: LifeData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  pulse: { id: string; t: number } | null;
  onEditCategories: () => void;
}

type Node = OrbitNode;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
/** ラベル背景の幅を決めるための概算（全角=1em, 半角=0.6em） */
const textWidth = (s: string, fs: number) => [...s].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? fs : fs * 0.6), 0);

/**
 * 横長の画面では軌道を楕円に引き伸ばし、画面を広く使って全体を大きく表示する。
 * シミュレーションは円の座標系で行い、描画時にだけ (sx, sy) を掛ける。
 */
function stretchFor(w: number, h: number) {
  if (!w || !h || w < h) return { sx: 1, sy: 1 };
  return { sx: clamp((0.85 * w) / h, 1, 1.6), sy: 0.85 };
}

export default function ConstellationView({ data, selectedId, onSelect, pulse, onEditCategories }: Props) {
  const { categories: CATEGORIES, categoryIds, categoryOf } = useCategories();
  const categoryKey = categoryIds.join("|");
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<Map<string, Node>>(new Map());
  const simRef = useRef<Simulation<Node, undefined> | null>(null);
  const dragRef = useRef<{ kind: "pan" | "node"; id?: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const [, setFrame] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [hover, setHover] = useState<string | null>(null);
  const [filter, setFilter] = useState<Set<CategoryId>>(new Set());

  const maxRadius = useMemo(() => maxOrbitRadius(data.goals), [data.goals]);

  function fitView(w: number, h: number) {
    const { sx, sy } = stretchFor(w, h);
    const k = clamp(Math.min(w / (maxRadius * sx * 2 + 120), h / (maxRadius * sy * 2 + 150)), 0.35, 1.5);
    // ラベルはノードの下に付くので、中心を少し上に寄せる
    return { x: w / 2, y: h / 2 - 14, k };
  }

  // ---- サイズ追従 & 初期センタリング ----
  useEffect(() => {
    const el = wrapRef.current!;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((prev) => {
        if (prev.w === 0) setView(fitView(width, height));
        return { w: width, h: height };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { sx, sy } = stretchFor(size.w, size.h);
  /** ズームアウトしても文字が潰れないよう、ラベルは画面上でほぼ一定の大きさに保つ */
  const ts = clamp(1 / view.k, 0.9, 2.4);

  // ---- 力学シミュレーション ----
  useEffect(() => {
    const prev = nodesRef.current;
    const next = new Map<string, Node>();
    const core: Node = prev.get(CORE_ID) ?? { id: CORE_ID, goal: null, r: CORE_R };
    core.fx = 0;
    core.fy = 0;
    next.set(CORE_ID, core);
    for (const g of data.goals) {
      const n: Node = prev.get(g.id) ?? { id: g.id, goal: g, r: 0, ...initialPosition(g, categoryIds) };
      n.goal = g;
      n.r = nodeRadius(g);
      next.set(g.id, n);
    }
    const isUpdate = prev.size > 0;
    nodesRef.current = next;

    const sim = createOrbitSimulation([...next.values()], data.links, categoryIds)
      .alpha(isUpdate ? 0.35 : 1)
      .alphaDecay(0.03)
      .on("tick", () => setFrame((f) => (f + 1) % 1e9));
    simRef.current = sim;
    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.goals, data.links, categoryKey]);

  // ---- 選択した目標が詳細パネル（右側 約440px）に隠れるなら、見える位置へなめらかに寄せる ----
  const [animating, setAnimating] = useState(false);
  useEffect(() => {
    if (!selectedId || !size.w) return;
    const n = nodesRef.current.get(selectedId);
    if (!n || n.x == null) return;
    const { sx: kx, sy: ky } = stretchFor(size.w, size.h);
    const screenX = view.x + n.x * kx * view.k;
    const screenY = view.y + (n.y ?? 0) * ky * view.k;
    const visibleW = size.w >= 900 ? size.w - 460 : size.w;
    const outX = screenX > visibleW - 80 || screenX < 80;
    const outY = screenY < 80 || screenY > size.h - 80;
    if (!outX && !outY) return;
    setAnimating(true);
    setView((v) => ({
      ...v,
      x: outX ? v.x + (visibleW / 2 - screenX) : v.x,
      y: outY ? v.y + (size.h / 2 - screenY) : v.y,
    }));
    const t = window.setTimeout(() => setAnimating(false), 500);
    return () => window.clearTimeout(t);
    // 選択が変わったときだけ判定する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ---- ホイールズーム（passive: false が必要なのでネイティブで登録） ----
  useEffect(() => {
    const svg = svgRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setView((v) => {
        const k = clamp(v.k * Math.exp(-e.deltaY * 0.0015), 0.25, 3);
        return { k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (f: number) =>
    setView((v) => {
      const k = clamp(v.k * f, 0.25, 3);
      const cx = size.w / 2;
      const cy = size.h / 2;
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });

  // ---- ドラッグ（背景=パン / ノード=移動、動かさなければクリック扱い） ----
  /** 画面座標 → シミュレーション（円）座標 */
  const toSim = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - rect.left - view.x) / view.k / sx, y: (clientY - rect.top - view.y) / view.k / sy };
  };

  const onBgDown = (e: React.PointerEvent) => {
    svgRef.current!.setPointerCapture(e.pointerId);
    dragRef.current = { kind: "pan", sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false };
  };

  const onNodeDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    svgRef.current!.setPointerCapture(e.pointerId);
    dragRef.current = { kind: "node", id, sx: e.clientX, sy: e.clientY, ox: 0, oy: 0, moved: false };
  };

  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    if (d.kind === "pan") {
      setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
    } else if (d.id && d.id !== CORE_ID) {
      const n = nodesRef.current.get(d.id);
      if (!n) return;
      const p = toSim(e.clientX, e.clientY);
      n.fx = p.x;
      n.fy = p.y;
      simRef.current?.alphaTarget(0.25).restart();
    }
  };

  const onUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.kind === "node" && d.id) {
      const n = nodesRef.current.get(d.id);
      if (n && d.id !== CORE_ID) {
        n.fx = null;
        n.fy = null;
      }
      simRef.current?.alphaTarget(0);
      if (!d.moved) onSelect(d.id === CORE_ID ? null : d.id);
    } else if (!d.moved) {
      onSelect(null);
    }
  };

  // ---- ハイライト計算 ----
  const focusId = hover ?? selectedId;
  const neighbors = useMemo(() => {
    if (!focusId) return null;
    const s = new Set([focusId]);
    for (const l of data.links) {
      if (l.source === focusId) s.add(l.target);
      if (l.target === focusId) s.add(l.source);
    }
    return s;
  }, [focusId, data.links]);

  const nodeVisible = (g: Goal) => filter.size === 0 || filter.has(g.category);
  const nodeOpacity = (id: string, g: Goal | null) => {
    if (g && !nodeVisible(g)) return 0.15;
    if (neighbors && !neighbors.has(id)) return 0.3;
    return 1;
  };

  const nodes = nodesRef.current;
  const pos = (n: Node) => ({ x: (n.x ?? 0) * sx, y: (n.y ?? 0) * sy });
  const core = nodes.get(CORE_ID);
  let lastLabelR = -Infinity;
  const years = yearOrbits(maxRadius).map(({ year, r }) => {
    // 遠い未来は軌道の間隔が詰まるので、画面上で重ならない年だけラベルを出す
    const label = (r - lastLabelR) * view.k * sy >= 22;
    if (label) lastLabelR = r;
    return { y: year, label, R: r };
  });

  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        className="block cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onBgDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="core-grad">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#a5f3fc" />
            <stop offset="70%" stopColor="#6366f1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
          {CATEGORIES.map((c) => (
            <radialGradient key={c.id} id={`halo-${c.id}`}>
              <stop offset="0%" stopColor={c.color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={c.color} stopOpacity="0" />
            </radialGradient>
          ))}
          {LINK_TYPES.map((t) => (
            <marker key={t.id} id={`arrow-${t.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,1 L9,5 L0,9 z" fill={t.color} />
            </marker>
          ))}
        </defs>

        <g
          style={{
            transform: `translate(${view.x}px,${view.y}px) scale(${view.k})`,
            transition: animating ? "transform .45s cubic-bezier(.2,.8,.2,1)" : undefined,
          }}
        >
          {/* 時間の軌道 */}
          <ellipse rx={ORBIT_BASE * 0.55 * sx} ry={ORBIT_BASE * 0.55 * sy} fill="none" stroke="rgba(165,243,252,0.2)" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
          {years.map(({ y, label, R }) => {
            const lx = Math.cos(YEAR_LABEL_ANGLE) * R * sx;
            const ly = Math.sin(YEAR_LABEL_ANGLE) * R * sy;
            return (
              <g key={y}>
                <ellipse rx={R * sx} ry={R * sy} fill="none" stroke="rgba(148,163,184,0.22)" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
                {label && (
                  <>
                    <rect x={lx - 22 * ts} y={ly - 9 * ts} width={44 * ts} height={18 * ts} rx={9 * ts} fill="#070a17" stroke="rgba(148,163,184,0.25)" strokeWidth={ts} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" className="fill-slate-300 font-display" fontSize={11 * ts} letterSpacing="0.08em">
                      {y}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* カテゴリの方位ラベル */}
          {CATEGORIES.map((c) => {
            const a = categoryAngle(c.id, categoryIds);
            const R = maxRadius + 14;
            return (
              <text
                key={c.id}
                x={Math.cos(a) * R * sx}
                y={Math.sin(a) * R * sy}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={c.color}
                opacity={filter.size === 0 || filter.has(c.id) ? 0.8 : 0.2}
                fontSize={14 * ts}
                fontWeight={700}
                letterSpacing="0.15em"
              >
                {c.label}
              </text>
            );
          })}

          {/* 影響のリンク：普段は静かに、注目中の目標に関係するものだけ流れる */}
          {data.links.map((l) => {
            const s = nodes.get(l.source);
            const t = nodes.get(l.target);
            if (!s?.goal || !t?.goal || s.x == null || t.x == null) return null;
            const ps = pos(s);
            const pt = pos(t);
            const meta = linkTypeOf(l.type);
            const dx = pt.x - ps.x;
            const dy = pt.y - ps.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const x1 = ps.x + ux * (s.r + 8);
            const y1 = ps.y + uy * (s.r + 8);
            const x2 = pt.x - ux * (t.r + 12);
            const y2 = pt.y - uy * (t.r + 12);
            const bend = len * 0.12;
            const cx = (x1 + x2) / 2 - uy * bend;
            const cy = (y1 + y2) / 2 + ux * bend;
            const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
            const related = l.source === focusId || l.target === focusId;
            const surge = !!pulse && l.source === pulse.id && l.type !== "tradeoff";
            const hidden = !nodeVisible(s.goal) || !nodeVisible(t.goal);
            const opacity = hidden ? 0.06 : focusId ? (related ? 1 : 0.07) : 0.55;
            const active = related || surge;
            return (
              <g key={l.id} opacity={opacity} style={{ transition: "opacity .25s" }}>
                {l.type === "tradeoff" ? (
                  <>
                    <path d={d} fill="none" stroke={meta.color} strokeWidth={active ? 2 : 1.5} strokeDasharray="6 6" className={active ? "blink" : undefined} />
                    <circle cx={(x1 + 2 * cx + x2) / 4} cy={(y1 + 2 * cy + y2) / 4} r={4} fill={meta.color} />
                  </>
                ) : active ? (
                  <>
                    <path d={d} fill="none" stroke={meta.color} strokeOpacity={0.3} strokeWidth={surge ? 6 : 4} />
                    <path
                      d={d}
                      fill="none"
                      stroke={meta.color}
                      strokeWidth={surge ? 3 : 2.5}
                      strokeLinecap="round"
                      className={surge ? "flow-fast" : "flow"}
                      markerEnd={`url(#arrow-${l.type})`}
                      filter="url(#glow)"
                    />
                  </>
                ) : (
                  <path d={d} fill="none" stroke={meta.color} strokeWidth={1.5} markerEnd={`url(#arrow-${l.type})`} />
                )}
              </g>
            );
          })}

          {/* 中心：今の自分 */}
          {core && (
            <g transform={`translate(${pos(core).x},${pos(core).y})`} onPointerDown={(e) => onNodeDown(e, CORE_ID)} className="cursor-pointer">
              <circle r={CORE_R * 2.4} fill="url(#core-grad)" opacity={0.35} className="breathe" />
              <circle r={CORE_R} fill="#0b1226" stroke="#a5f3fc" strokeOpacity={0.5} />
              <circle r={CORE_R + 8} fill="none" stroke="#a5f3fc" strokeOpacity={0.35} strokeDasharray="2 5" className="spin-slow" />
              <circle r={CORE_R * 0.42} fill="url(#core-grad)" />
              <text y={CORE_R + 10 + 14 * ts} textAnchor="middle" className="fill-white font-display" fontSize={14 * ts} fontWeight={700} letterSpacing="0.2em" style={{ paintOrder: "stroke" }} stroke="#04050d" strokeWidth={4 * ts}>
                NOW
              </text>
              <text y={CORE_R + 10 + 30 * ts} textAnchor="middle" className="fill-slate-300" fontSize={12 * ts} style={{ paintOrder: "stroke" }} stroke="#04050d" strokeWidth={4 * ts}>
                {truncate(data.profile.name, 12)}
              </text>
            </g>
          )}

          {/* 目標ノード */}
          {data.goals.map((g) => {
            const n = nodes.get(g.id);
            if (!n || n.x == null) return null;
            const { x, y } = pos(n);
            const cat = categoryOf(g.category);
            const p = goalProgress(g);
            const circ = 2 * Math.PI * (n.r + 5);
            const isSel = selectedId === g.id;
            const complete = p >= 1;
            const title = truncate(g.title, 13);
            const fsTitle = 13 * ts;
            const fsSub = 11 * ts;
            const labelTop = n.r + 12;
            const pillW = Math.max(textWidth(title, fsTitle), textWidth("2028.04 · 0/0", fsSub)) + 18 * ts;
            const pillH = 40 * ts;
            return (
              <g
                key={g.id}
                transform={`translate(${x},${y})`}
                opacity={nodeOpacity(g.id, g)}
                style={{ transition: "opacity .25s" }}
                className="cursor-pointer"
                onPointerDown={(e) => onNodeDown(e, g.id)}
                onPointerEnter={() => setHover(g.id)}
                onPointerLeave={() => setHover(null)}
              >
                <circle r={n.r * 2.2} fill={`url(#halo-${g.category})`} opacity={0.35 + p * 0.65} />
                {pulse?.id === g.id && <circle key={pulse.t} r={n.r} fill="none" stroke={cat.color} strokeWidth={3} className="ripple" />}
                {isSel && <circle r={n.r + 14} fill="none" stroke={cat.color} strokeWidth={2} strokeDasharray="4 6" className="spin-slow" />}
                <circle r={n.r + 5} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth={5} />
                <circle
                  r={n.r + 5}
                  fill="none"
                  stroke={complete ? "#fde68a" : cat.color}
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeDasharray={`${circ * p} ${circ}`}
                  transform="rotate(-90)"
                  filter="url(#glow)"
                  style={{ transition: "stroke-dasharray .8s cubic-bezier(.2,.8,.2,1)" }}
                />
                <circle r={n.r} fill="#0a0f1f" stroke={cat.color} strokeOpacity={0.7} />
                <circle r={n.r * 0.92} fill={cat.color} opacity={0.1 + p * 0.22} />
                <text textAnchor="middle" dominantBaseline="central" className="fill-white font-display" fontSize={Math.max(n.r * 0.55, 10 * ts)} fontWeight={700}>
                  {complete ? "★" : `${Math.round(p * 100)}%`}
                </text>
                {/* ラベル：線や星と重なっても読めるよう背景付き */}
                <g transform={`translate(0,${labelTop})`}>
                  <rect
                    x={-pillW / 2}
                    y={0}
                    width={pillW}
                    height={pillH}
                    rx={8 * ts}
                    fill="rgba(5,8,20,0.82)"
                    stroke={isSel ? cat.color : "rgba(148,163,184,0.18)"}
                    strokeWidth={ts}
                  />
                  <text y={pillH * 0.38} textAnchor="middle" dominantBaseline="central" className="fill-white" fontSize={fsTitle} fontWeight={500}>
                    {title}
                  </text>
                  <text y={pillH * 0.74} textAnchor="middle" dominantBaseline="central" fill={cat.color} fontSize={fsSub} className="font-display" letterSpacing="0.05em">
                    {g.targetDate.replace("-", ".")} · {g.steps.filter((s) => s.done).length}/{g.steps.length}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      <ConstellationOverlay
        filter={filter}
        setFilter={setFilter}
        description="中心が「今」。外側の軌道ほど遠い未来の目標です。"
        hint="ドラッグで移動・ホイールでズーム・クリックで詳細"
        onEditCategories={onEditCategories}
      />

      <div className="glass absolute bottom-5 right-5 flex flex-col overflow-hidden rounded-xl">
        <button className="p-2.5 text-slate-200 hover:bg-white/10" onClick={() => zoomBy(1.25)} aria-label="ズームイン" title="ズームイン">
          <Plus size={18} />
        </button>
        <button className="p-2.5 text-slate-200 hover:bg-white/10" onClick={() => zoomBy(0.8)} aria-label="ズームアウト" title="ズームアウト">
          <Minus size={18} />
        </button>
        <button className="p-2.5 text-slate-200 hover:bg-white/10" onClick={() => setView(fitView(size.w, size.h))} aria-label="全体を表示" title="全体を表示">
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
}
