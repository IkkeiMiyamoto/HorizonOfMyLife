import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { RotateCcw } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { goalProgress } from "../lib/analysis";
import "../lib/patchLineMaterial";
import { useCategories, type CategoryMeta } from "../lib/categories";
import { linkTypeOf } from "../lib/constants";
import { ORBIT_BASE, YEAR_LABEL_ANGLE, categoryAngle, computeOrbitLayout, maxOrbitRadius, yearOrbits } from "../lib/orbit";
import type { CategoryId, Goal, LifeData, Link } from "../types";
import ConstellationOverlay from "./ConstellationOverlay";
import Sky3D from "./Sky3D";

interface Props {
  data: LifeData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  pulse: { id: string; t: number } | null;
  onEditCategories: () => void;
}

/** 2D レイアウト（px）→ 3D 空間の単位 */
const S = 0.1;
/** 進捗に応じて惑星が軌道面から浮かび上がる高さ */
const BASE_HEIGHT = 1.6;
const PROGRESS_HEIGHT = 7;
const PANEL_OFFSET = 220;

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
const planetRadius = (g: Goal) => 0.9 + g.priority * 0.45;
const onPlane = (angle: number, r: number) => new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
const circlePoints = (r: number, seg = 160) =>
  Array.from({ length: seg + 1 }, (_, i) => {
    const a = (i / seg) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  });

export default function Constellation3D({ data, selectedId, onSelect, pulse, onEditCategories }: Props) {
  // R3F の Canvas 内には React コンテキストが届かないので、ここで取得して props で渡す
  const { categories, categoryIds, categoryOf } = useCategories();
  const [hover, setHover] = useState<string | null>(null);
  const [filter, setFilter] = useState<Set<CategoryId>>(new Set());
  const [resetKey, setResetKey] = useState(0);

  // 配置は「時期・カテゴリ・重要度・つながり」が変わったときだけ計算し直す（進捗の変化では動かさない）
  const layoutKey =
    data.goals.map((g) => `${g.id}:${g.targetDate}:${g.category}:${g.priority}`).join("|") + "#" + data.links.map((l) => `${l.source}>${l.target}`).join(",") + "#" + categoryIds.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => computeOrbitLayout(data.goals, data.links, categoryIds), [layoutKey]);
  const maxR = maxOrbitRadius(data.goals) * S;

  const positions = useMemo(() => {
    const m = new Map<string, THREE.Vector3>();
    for (const g of data.goals) {
      const p = layout.get(g.id) ?? { x: 0, y: 0 };
      m.set(g.id, new THREE.Vector3(p.x * S, BASE_HEIGHT + goalProgress(g) * PROGRESS_HEIGHT, p.y * S));
    }
    return m;
  }, [data.goals, layout]);

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

  const visible = (g: Goal) => filter.size === 0 || filter.has(g.category);
  const goalOpacity = (g: Goal) => (!visible(g) ? 0.12 : neighbors && !neighbors.has(g.id) ? 0.25 : 1);

  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);

  // OSの「視差効果を減らす」設定がオンなら自動回転はしない
  const reduceMotion = useMemo(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false, []);
  const camDist = maxR * 2.15 + 8;
  // 手前側（+z）の惑星が見切れないよう、注視点を少し手前に置く
  const homeTarget: [number, number, number] = [0, 0, maxR * 0.24];
  const home: [number, number, number] = [0, camDist * 0.84, camDist * 0.62 + homeTarget[2]];

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: home, fov: 38, near: 0.1, far: 2000 }}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={() => onSelect(null)}
        onCreated={({ gl }) => {
          // 画面が一瞬黒くなる現象の切り分け用：GPU 側でコンテキストが失われたらコンソールに残す
          gl.domElement.addEventListener("webglcontextlost", () => console.warn("[Horizon 3D] WebGL context lost"));
          gl.domElement.addEventListener("webglcontextrestored", () => console.warn("[Horizon 3D] WebGL context restored"));
        }}
      >
        <LabelDistance.Provider value={camDist}>
        <color attach="background" args={["#050716"]} />
        <fog attach="fog" args={["#050716", camDist * 1.1, camDist * 3.2]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[30, 60, 40]} intensity={0.6} color="#c7d2fe" />

        <Sky3D reduceMotion={reduceMotion} />

        <GalacticPlane maxR={maxR} filter={filter} categories={categories} categoryIds={categoryIds} />
        <Sun name={data.profile.name} />

        {data.links.map((l) => {
          const s = data.goals.find((g) => g.id === l.source);
          const t = data.goals.find((g) => g.id === l.target);
          const from = positions.get(l.source);
          const to = positions.get(l.target);
          if (!s || !t || !from || !to) return null;
          const related = l.source === focusId || l.target === focusId;
          const hidden = !visible(s) || !visible(t);
          const surge = !!pulse && l.source === pulse.id && l.type !== "tradeoff";
          const opacity = hidden ? 0.05 : focusId ? (related ? 1 : 0.06) : 0.5;
          return (
            <InfluenceLink
              key={l.id}
              link={l}
              from={from}
              to={to}
              fromR={planetRadius(s)}
              toR={planetRadius(t)}
              opacity={opacity}
              active={related || surge}
              surge={surge}
            />
          );
        })}

        {data.goals.map((g) => (
          <Planet
            key={g.id}
            goal={g}
            cat={categoryOf(g.category)}
            position={positions.get(g.id)!}
            opacity={goalOpacity(g)}
            selected={selectedId === g.id}
            pulseT={pulse?.id === g.id ? pulse.t : null}
            onSelect={onSelect}
            onHover={setHover}
          />
        ))}

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reduceMotion && !selectedId && !hover}
          autoRotateSpeed={0.35}
          minDistance={12}
          maxDistance={camDist * 2.2}
          maxPolarAngle={Math.PI * 0.48}
          target={homeTarget}
        />
        <CameraRig
          target={selectedId ? (positions.get(selectedId) ?? null) : null}
          panelOpen={!!selectedId}
          resetKey={resetKey}
          home={new THREE.Vector3(...home)}
          homeTarget={new THREE.Vector3(...homeTarget)}
        />

        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.35} luminanceSmoothing={0.6} radius={0.75} />
          <Vignette eskil={false} offset={0.2} darkness={0.75} />
        </EffectComposer>
        </LabelDistance.Provider>
      </Canvas>

      <ConstellationOverlay
        filter={filter}
        setFilter={setFilter}
        description="中心の恒星が「今」。遠い軌道ほど遠い未来、高く浮かぶ惑星ほど進んでいる目標です。"
        hint="ドラッグで回転・右ドラッグで移動・ホイールでズーム"
        onEditCategories={onEditCategories}
      />

      <button
        className="glass absolute bottom-5 right-5 z-20 flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] text-slate-200 hover:bg-white/10"
        onClick={() => {
          onSelect(null);
          setResetKey((k) => k + 1);
        }}
      >
        <RotateCcw size={15} /> 視点をリセット
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** 標準の視点距離。ラベルはこの距離で等倍になり、遠いほど小さく・近いほど大きく（上限あり）表示する */
const LabelDistance = createContext(100);

function Label3D({
  position,
  clearRadius,
  children,
}: {
  position: [number, number, number] | THREE.Vector3;
  /** 指定すると、この半径（ワールド単位）の球の「画面上の真下」にラベルを置く */
  clearRadius?: number;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<HTMLDivElement>(null);
  const refDist = useContext(LabelDistance);
  const world = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    if (!group.current || !inner.current) return;
    group.current.getWorldPosition(world);
    const dist = world.distanceTo(camera.position);
    const s = Math.min(1.3, Math.max(0.62, refDist / dist));
    if (clearRadius == null) {
      inner.current.style.transform = `scale(${s.toFixed(3)})`;
      return;
    }
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    const px = (clearRadius / (dist * Math.tan(fov / 2))) * (size.height / 2);
    inner.current.style.transform = `translateY(calc(50% + ${(px + 6).toFixed(1)}px)) scale(${s.toFixed(3)})`;
  });
  return (
    <group ref={group} position={position}>
      <Html center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div ref={inner} style={{ transformOrigin: "center top" }}>
          {children}
        </div>
      </Html>
    </group>
  );
}

/** 選択した惑星へ視線を寄せ、詳細パネルが開いている間は描画中心を左へずらす */
function CameraRig({
  target,
  panelOpen,
  resetKey,
  home,
  homeTarget,
}: {
  target: THREE.Vector3 | null;
  panelOpen: boolean;
  resetKey: number;
  home: THREE.Vector3;
  homeTarget: THREE.Vector3;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const size = useThree((s) => s.size);
  const offset = useRef(0);
  const flyUntil = useRef(0);
  const goal = useRef(new THREE.Vector3());

  useEffect(() => {
    flyUntil.current = performance.now() + 1400;
  }, [target]);

  useEffect(() => {
    if (!resetKey || !controls) return;
    camera.position.copy(home);
    controls.target.copy(homeTarget);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useFrame((_, dt) => {
    if (controls && performance.now() < flyUntil.current) {
      goal.current.copy(target ?? homeTarget);
      controls.target.lerp(goal.current, 1 - Math.exp(-dt * 4));
    }
    const want = panelOpen && size.width >= 900 ? PANEL_OFFSET : 0;
    offset.current += (want - offset.current) * (1 - Math.exp(-dt * 6));
    if (want === 0 && Math.abs(offset.current) < 0.5) {
      if (camera.view?.enabled) camera.clearViewOffset();
    } else {
      camera.setViewOffset(size.width, size.height, offset.current, 0, size.width, size.height);
    }
  });
  return null;
}

/** 中心の恒星＝今の自分 */
function Sun({ name }: { name: string }) {
  const ref = useRef<THREE.Group>(null);
  const corona = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ref.current?.scale.setScalar(1 + Math.sin(t * 1.4) * 0.035);
    if (corona.current) corona.current.rotation.y = t * 0.1;
  });
  return (
    <group>
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[2.6, 64, 64]} />
          <meshBasicMaterial color={[2.2, 2.6, 2.8]} toneMapped={false} />
        </mesh>
        <mesh scale={1.45}>
          <sphereGeometry args={[2.6, 48, 48]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.22} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh scale={2.4}>
          <sphereGeometry args={[2.6, 48, 48]} />
          <meshBasicMaterial color="#6366f1" transparent opacity={0.09} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh ref={corona} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4.4, 0.05, 8, 128]} />
          <meshBasicMaterial color={[0.8, 2, 2.4]} toneMapped={false} transparent opacity={0.7} />
        </mesh>
      </group>
      <pointLight intensity={2.4} distance={0} decay={0} color="#cffafe" />
      <Label3D position={[0, 0, 0]} clearRadius={4.6}>
        <div className="whitespace-nowrap text-center">
          <div className="font-display text-sm font-bold tracking-[0.3em] text-white [text-shadow:0_0_12px_#22d3ee]">NOW</div>
          <div className="text-xs text-slate-300">{truncate(name, 12)}</div>
        </div>
      </Label3D>
    </group>
  );
}

/** 軌道面：年ごとの軌道、カテゴリの方位、ぼんやり光る円盤 */
function GalacticPlane({
  maxR,
  filter,
  categories,
  categoryIds,
}: {
  maxR: number;
  filter: Set<CategoryId>;
  categories: CategoryMeta[];
  categoryIds: CategoryId[];
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0, "rgba(99,102,241,0.55)");
    g.addColorStop(0.25, "rgba(56,189,248,0.18)");
    g.addColorStop(0.7, "rgba(30,41,99,0.12)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const years = yearOrbits(maxR / S);
  let lastR = -Infinity;
  const ringR0 = ORBIT_BASE * 0.55 * S;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[maxR * 1.15, 128]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
      <Line points={circlePoints(ringR0)} color="#a5f3fc" lineWidth={1} transparent opacity={0.35} dashed dashSize={0.4} gapSize={0.4} />
      {years.map(({ year, r }) => {
        const R = r * S;
        const showLabel = R - lastR > 2.2;
        if (showLabel) lastR = R;
        const lp = onPlane(YEAR_LABEL_ANGLE, R);
        return (
          <group key={year}>
            <Line points={circlePoints(R)} color="#94a3b8" lineWidth={1} transparent opacity={0.28} dashed dashSize={0.5} gapSize={0.5} />
            {showLabel && (
              <Label3D position={lp}>
                <div className="rounded-full border border-slate-400/30 bg-[#070a17]/90 px-2 py-0.5 font-display text-[11px] text-slate-300">{year}</div>
              </Label3D>
            )}
          </group>
        );
      })}
      {categories.map((c, i) => {
        // カテゴリ境界の放射線と方位ラベル
        const a = categoryAngle(c.id, categoryIds);
        const border = a + Math.PI / categories.length;
        const active = filter.size === 0 || filter.has(c.id);
        return (
          <group key={c.id}>
            <Line points={[onPlane(border, ringR0), onPlane(border, maxR)]} color="#334155" lineWidth={1} transparent opacity={0.5} />
            <Label3D position={onPlane(a, maxR + 3)}>
              <div
                className="whitespace-nowrap text-sm font-bold tracking-[0.15em]"
                style={{ color: c.color, opacity: active ? 0.9 : 0.25, textShadow: `0 0 14px ${c.color}` }}
                data-index={i}
              >
                {c.label}
              </div>
            </Label3D>
          </group>
        );
      })}
    </group>
  );
}

/** 目標＝惑星。土星の輪のような環が進捗、浮かぶ高さも進捗を表す */
function Planet({
  goal,
  cat,
  position,
  opacity,
  selected,
  pulseT,
  onSelect,
  onHover,
}: {
  goal: Goal;
  cat: CategoryMeta;
  position: THREE.Vector3;
  opacity: number;
  selected: boolean;
  pulseT: number | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const p = goalProgress(goal);
  const r = planetRadius(goal);
  const complete = p >= 1;
  const ringColor = complete ? "#fde68a" : cat.color;
  const body = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Group>(null);
  const ripple = useRef<THREE.Mesh>(null);
  const rippleStart = useRef<number | null>(null);
  const bob = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const glow = useMemo(() => new THREE.Color(cat.color).multiplyScalar(2.2), [cat.color]);
  // 毎レンダーで配列を作ると drei の Line がジオメトリとマテリアルを作り直すので固定する
  const stemPoints = useMemo(() => [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -position.y, 0)], [position.y]);

  useEffect(() => {
    if (pulseT) rippleStart.current = performance.now();
  }, [pulseT]);

  useFrame(({ clock }, dt) => {
    if (body.current) body.current.rotation.y += dt * 0.35;
    if (bob.current) bob.current.position.y = Math.sin(clock.elapsedTime * 0.8 + phase) * 0.25;
    if (halo.current) halo.current.rotation.z += dt * 0.6;
    const m = ripple.current;
    if (m) {
      const st = rippleStart.current;
      const t = st == null ? 2 : (performance.now() - st) / 1600;
      m.visible = t <= 1;
      if (t <= 1) {
        m.scale.setScalar(1 + t * 3.5);
        (m.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      }
    }
  });

  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect(goal.id);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      onHover(goal.id);
    },
    onPointerOut: () => onHover(null),
  };

  return (
    <group position={position}>
      {/* 軌道面まで降りる支柱と、その接地点 */}
      <Line points={stemPoints} color={cat.color} lineWidth={1} transparent opacity={0.45 * opacity} dashed dashSize={0.25} gapSize={0.2} />
      <mesh position={[0, -position.y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.55, 32]} />
        <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0.8 * opacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <group ref={bob}>
        <mesh ref={body} {...handlers}>
          <sphereGeometry args={[r, 48, 48]} />
          <meshStandardMaterial
            color={cat.color}
            emissive={cat.color}
            emissiveIntensity={0.3 + p * 0.9}
            roughness={0.45}
            metalness={0.2}
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>
        {/* 大気 */}
        <mesh scale={1.3}>
          <sphereGeometry args={[r, 32, 32]} />
          <meshBasicMaterial color={cat.color} transparent opacity={0.16 * opacity} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        {/* 進捗の環 */}
        <group rotation={[-Math.PI / 2 + 0.42, 0.18, 0]}>
          <mesh>
            <ringGeometry args={[r * 1.55, r * 1.85, 96]} />
            <meshBasicMaterial color="#94a3b8" transparent opacity={0.16 * opacity} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {p > 0 && (
            <mesh>
              <ringGeometry args={[r * 1.5, r * 1.9, 96, 1, Math.PI / 2, Math.PI * 2 * p]} />
              <meshBasicMaterial
                color={new THREE.Color(ringColor).multiplyScalar(1.8)}
                toneMapped={false}
                transparent
                opacity={0.95 * opacity}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          )}
          <mesh ref={ripple} visible={false}>
            <ringGeometry args={[r * 1.1, r * 1.25, 64]} />
            <meshBasicMaterial color={glow} toneMapped={false} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
        {selected && (
          <group ref={halo} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <torusGeometry args={[r * 2.35, 0.06, 8, 96, Math.PI * 1.6]} />
              <meshBasicMaterial color={glow} toneMapped={false} />
            </mesh>
          </group>
        )}

        <Label3D position={[0, 0, 0]} clearRadius={r * 1.55}>
          <div
            className="whitespace-nowrap rounded-lg border px-2.5 py-1 text-center transition-opacity duration-300"
            style={{
              opacity: Math.max(opacity, 0.15),
              background: "rgba(5,8,20,0.8)",
              borderColor: selected ? cat.color : "rgba(148,163,184,0.2)",
              boxShadow: selected ? `0 0 16px ${cat.color}55` : undefined,
            }}
          >
            <div className="text-[13px] font-medium text-white">{truncate(goal.title, 13)}</div>
            <div className="font-display text-[11px]" style={{ color: cat.color }}>
              {complete ? "★ 達成" : `${Math.round(p * 100)}%`} · {goal.targetDate.replace("-", ".")}
            </div>
          </div>
        </Label3D>
      </group>
    </group>
  );
}

/** 影響のつながり：弧を描く光の線と、その上を流れる光の粒 */
function InfluenceLink({
  link,
  from,
  to,
  fromR,
  toR,
  opacity,
  active,
  surge,
}: {
  link: Link;
  from: THREE.Vector3;
  to: THREE.Vector3;
  fromR: number;
  toR: number;
  opacity: number;
  active: boolean;
  surge: boolean;
}) {
  const meta = linkTypeOf(link.type);
  const isTradeoff = link.type === "tradeoff";
  const { curve, points, arrowPos, arrowQuat } = useMemo(() => {
    const dir = to.clone().sub(from).normalize();
    const a = from.clone().add(dir.clone().multiplyScalar(fromR * 1.1));
    const b = to.clone().sub(dir.clone().multiplyScalar(toR * 1.3));
    const mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y += a.distanceTo(b) * 0.3 + 1.5;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const tangent = curve.getTangentAt(0.97);
    return {
      curve,
      points: curve.getPoints(64),
      arrowPos: curve.getPointAt(0.97),
      arrowQuat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent),
    };
  }, [from, to, fromR, toR]);

  const lineRef = useRef<{ material: { dashOffset: number } } | null>(null);
  const particles = useRef<(THREE.Mesh | null)[]>([]);
  const color = useMemo(() => new THREE.Color(meta.color).multiplyScalar(active ? 2 : 1.2), [meta.color, active]);
  const count = isTradeoff ? 0 : active ? 4 : 2;

  useFrame(({ clock }, dt) => {
    if (lineRef.current && !isTradeoff) lineRef.current.material.dashOffset -= dt * (surge ? 5 : active ? 1.6 : 0.4);
    const speed = surge ? 0.9 : active ? 0.35 : 0.12;
    particles.current.forEach((m, i) => {
      if (!m) return;
      const t = (clock.elapsedTime * speed + i / count) % 1;
      m.position.copy(curve.getPointAt(t));
      m.scale.setScalar(0.6 + Math.sin(t * Math.PI) * 0.6);
    });
  });

  return (
    <group>
      <Line
        ref={lineRef as never}
        points={points}
        color={color}
        lineWidth={active ? 2.4 : 1.3}
        transparent
        opacity={opacity}
        dashed
        dashSize={isTradeoff ? 0.7 : 0.9}
        gapSize={isTradeoff ? 0.5 : active ? 0.35 : 0.08}
        toneMapped={false}
        depthWrite={false}
      />
      {!isTradeoff && (
        <mesh position={arrowPos} quaternion={arrowQuat}>
          <coneGeometry args={[0.35, 0.9, 12]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      )}
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(m) => (particles.current[i] = m)}>
          <sphereGeometry args={[0.16, 12, 12]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
