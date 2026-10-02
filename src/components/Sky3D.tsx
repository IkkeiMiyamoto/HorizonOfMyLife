import { Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * 3D 星座の背景となる天球。
 * - カメラに追従させ「無限遠」に置くので、視点を動かしても星がぶれない
 * - 星は画面上で一定サイズ（1px 未満にならない）の柔らかい点として描き、移動時のチラつきを防ぐ
 * - ときどき流れ星が流れる
 */
export default function Sky3D({ reduceMotion }: { reduceMotion: boolean }) {
  const sky = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    sky.current?.position.copy(camera.position);
  });
  return (
    <group ref={sky}>
      <Nebulae />
      <StarField reduceMotion={reduceMotion} />
      <ShootingStar />
    </group>
  );
}

const SKY_R = 900;

/** 天の川の帯の傾き（帯は この法線に垂直な大円に沿う） */
// 見下ろす視点でも視界を斜めに横切るよう、ほぼ縦向きの大円にしている
const GALAXY_NORMAL = new THREE.Vector3(1, 0.25, 0.45).normalize();

function randomOnSphere(): THREE.Vector3 {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(s * Math.cos(t), u, s * Math.sin(t));
}

/** 天の川の帯の近くに寄せた方向 */
function randomInBand(spread: number): THREE.Vector3 {
  const v = randomOnSphere();
  const n = GALAXY_NORMAL;
  const d = v.dot(n);
  // 法線方向の成分をガウス的に小さくして帯に集める
  const g = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
  return v.sub(n.clone().multiplyScalar(d - g)).normalize();
}

const STAR_COLORS = ["#ffffff", "#ffffff", "#e8f1ff", "#cfe0ff", "#fff1d6", "#ffd9b0", "#c7d2fe", "#bae6fd"].map((c) => new THREE.Color(c));

function StarField({ reduceMotion }: { reduceMotion: boolean }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const { geometry, material } = useMemo(() => {
    const count = 14000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const inBand = i < count * 0.45;
      const v = inBand ? randomInBand(0.22) : randomOnSphere();
      v.multiplyScalar(SKY_R);
      pos.set([v.x, v.y, v.z], i * 3);
      // 大半は小さく、ごく一部だけ大きく明るい星
      const r = Math.random();
      const s = r < 0.72 ? 1.7 + Math.random() * 0.9 : r < 0.95 ? 2.6 + Math.random() * 1.3 : 4 + Math.random() * 2.8;
      size[i] = inBand ? s * 0.85 : s;
      const c = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)].clone();
      const brightness = s > 4 ? 2 : s > 2.6 ? 1.45 : 0.95 + Math.random() * 0.45;
      c.multiplyScalar(brightness);
      col.set([c.r, c.g, c.b], i * 3);
      phase[i] = Math.random() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(size, 1));
    geometry.setAttribute("phase", new THREE.BufferAttribute(phase, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uTwinkle: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float phase;
        attribute vec3 color;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uTwinkle;
        varying vec3 vColor;
        void main() {
          // ゆっくりとした、ごく控えめな瞬き（チラつかない程度）
          float tw = 1.0 - uTwinkle * 0.18 * (0.5 + 0.5 * sin(uTime * (0.4 + fract(phase) * 0.6) + phase));
          vColor = color * tw;
          gl_PointSize = size * uPixelRatio;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = 1.0 - smoothstep(0.0, 0.5, d);
          a = a * a;
          gl_FragColor = vec4(vColor * a, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geometry, material };
  }, []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPixelRatio.value = dpr;
    material.uniforms.uTwinkle.value = reduceMotion ? 0 : 1;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={-10} />;
}

function nebulaTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 天の川に沿って淡い星雲を散らす */
function Nebulae() {
  const items = useMemo(() => {
    const tex = nebulaTexture();
    const palette = ["#6d28d9", "#2563eb", "#0891b2", "#7c3aed", "#db2777", "#1d4ed8"];
    return Array.from({ length: 22 }, (_, i) => {
      const dir = randomInBand(0.12).multiplyScalar(SKY_R * 0.95);
      const scale = 260 + Math.random() * 380;
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: palette[i % palette.length],
        transparent: true,
        opacity: 0.16 + Math.random() * 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      });
      return { pos: dir, scale, mat, key: i };
    });
  }, []);
  return (
    <>
      {items.map((n) => (
        <sprite key={n.key} position={n.pos} scale={[n.scale * 1.6, n.scale, 1]} material={n.mat} renderOrder={-11} />
      ))}
    </>
  );
}

const TRAIL_POINTS = 32;
const SPARK_COUNT = 220;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 尾がほどけてできる四角い光の粒（マインクラフト風にチカチカ瞬きながら消える） */
function createSparks() {
  const pos = new Float32Array(SPARK_COUNT * 3);
  const alpha = new Float32Array(SPARK_COUNT);
  const size = new Float32Array(SPARK_COUNT);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aAlpha;
      attribute float aSize;
      uniform float uPixelRatio;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha;
        gl_PointSize = aSize * uPixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    // 円形にマスクせず、ドットそのままの四角で描く
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        if (vAlpha <= 0.001) discard;
        vec3 c = mix(vec3(0.25, 0.5, 1.0), vec3(0.75, 0.9, 1.0), vAlpha);
        gl_FragColor = vec4(c * vAlpha, vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  return {
    geometry,
    material,
    pos,
    alpha,
    size,
    birth: new Float32Array(SPARK_COUNT).fill(-1e9),
    life: new Float32Array(SPARK_COUNT),
    vel: new Float32Array(SPARK_COUNT * 3),
    seed: new Float32Array(SPARK_COUNT),
    next: 0,
  };
}

/** 十数秒に一度、遥か遠くの夜空を青い流れ星がゆっくり長い軌道で横切り、尾が光の粒にほどけて消える */
function ShootingStar() {
  const dpr = useThree((st) => st.viewport.dpr);
  const line = useRef<{
    geometry: { attributes: { instanceStart: { data: { array: Float32Array; needsUpdate: boolean } } } };
    material: { opacity: number };
    visible: boolean;
  } | null>(null);
  const state = useRef({
    active: false,
    t: 0,
    dur: 1,
    start: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    fall: new THREE.Vector3(),
    len: 0,
    travel: 0,
    emitCarry: 0,
    next: performance.now() + rand(5000, 10000),
  });
  const sparks = useMemo(createSparks, []);
  const flat = useMemo(() => new Array(TRAIL_POINTS * 3).fill(0), []);
  // 先頭は淡い青白、尾に向かって深い青へ溶けていく（加算合成なので黒＝透明）。遠くの星らしく明るさは控えめ
  const colors = useMemo(
    () =>
      Array.from({ length: TRAIL_POINTS }, (_, i) => {
        const k = 1 - i / (TRAIL_POINTS - 1);
        const a = k ** 1.4 * 0.95;
        return [a * (0.05 + 0.4 * k * k), a * (0.25 + 0.45 * k), a * 1.25] as [number, number, number];
      }),
    [],
  );
  const initialPoints = useMemo(() => Array.from({ length: TRAIL_POINTS }, (_, i) => [i, 0, 0] as [number, number, number]), []);

  /** 尾の上（先頭からの距離 d0〜d1 の範囲）に粒を1つ生む */
  const emit = (s: typeof state.current, headDist: number, d0: number, d1: number, now: number, lifeScale = 1) => {
    const i = sparks.next;
    sparks.next = (i + 1) % SPARK_COUNT;
    const d = headDist - rand(d0, d1);
    sparks.pos[i * 3] = s.start.x + s.dir.x * d + rand(-1.5, 1.5);
    sparks.pos[i * 3 + 1] = s.start.y + s.dir.y * d + rand(-1.5, 1.5);
    sparks.pos[i * 3 + 2] = s.start.z + s.dir.z * d + rand(-1.5, 1.5);
    // 進行方向に少し流されつつ、画面の下へパラパラ落ちる
    const drift = rand(2, 10);
    const drop = rand(6, 18);
    sparks.vel[i * 3] = s.dir.x * drift + s.fall.x * drop;
    sparks.vel[i * 3 + 1] = s.dir.y * drift + s.fall.y * drop;
    sparks.vel[i * 3 + 2] = s.dir.z * drift + s.fall.z * drop;
    sparks.birth[i] = now;
    sparks.life[i] = rand(700, 1500) * lifeScale;
    sparks.seed[i] = Math.random() * 10;
    sparks.size[i] = Math.random() < 0.25 ? 3 : 2;
  };

  useFrame(({ camera }, dt) => {
    const now = performance.now();
    const s = state.current;
    const l = line.current;

    // ---- 光の粒の更新 ----
    sparks.material.uniforms.uPixelRatio.value = dpr;
    let anyAlive = false;
    for (let i = 0; i < SPARK_COUNT; i++) {
      const age = now - sparks.birth[i];
      const t = age / sparks.life[i];
      if (t >= 1 || age < 0) {
        sparks.alpha[i] = 0;
        continue;
      }
      anyAlive = true;
      sparks.pos[i * 3] += sparks.vel[i * 3] * dt;
      sparks.pos[i * 3 + 1] += sparks.vel[i * 3 + 1] * dt;
      sparks.pos[i * 3 + 2] += sparks.vel[i * 3 + 2] * dt;
      // チカチカ：一定の間隔で点いたり消えたりしながら、全体としては薄れていく
      const blink = Math.sin(age * 0.022 + sparks.seed[i] * 7) > -0.2 ? 1 : 0.15;
      sparks.alpha[i] = (1 - t) ** 1.3 * blink * 0.9;
    }
    sparks.geometry.attributes.position.needsUpdate = anyAlive;
    sparks.geometry.attributes.aAlpha.needsUpdate = true;
    sparks.geometry.attributes.aSize.needsUpdate = true;

    if (!l) return;
    if (!s.active) {
      l.visible = false;
      if (now < s.next) return;
      // 視界の奥（遠い天球側）の上寄りに出現させる。天球はカメラに追従しているのでローカル座標で計算
      const forward = camera.getWorldDirection(new THREE.Vector3());
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const D = 820;
      const side = Math.random() < 0.5 ? -1 : 1;
      // 進行方向と反対側の端寄りから出発し、画面を大きく横切る
      s.start
        .copy(forward)
        .multiplyScalar(D)
        .add(right.clone().multiplyScalar(-side * rand(250, 560)))
        .add(up.clone().multiplyScalar(rand(200, 320)));
      s.dir.copy(right).multiplyScalar(side).add(up.clone().multiplyScalar(-rand(0.04, 0.15))).normalize();
      s.fall.copy(up).multiplyScalar(-1);
      s.travel = rand(1200, 1700);
      s.len = rand(340, 500);
      s.dur = rand(1.0, 1.4);
      s.t = 0;
      s.emitCarry = 0;
      s.active = true;
    }
    s.t += dt / s.dur;
    const p = Math.min(1, s.t);
    const headDist = s.travel * p;
    // 尾の長さが 0 だと線分が潰れるので最小値を設ける
    const tailLen = Math.max(8, s.len * Math.min(1, p * 3));
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const d = headDist - (tailLen * i) / (TRAIL_POINTS - 1);
      flat[i * 3] = s.start.x + s.dir.x * d;
      flat[i * 3 + 1] = s.start.y + s.dir.y * d;
      flat[i * 3 + 2] = s.start.z + s.dir.z * d;
    }
    // 既存のバッファを書き換える（setPositions は毎回 GPU バッファを確保し直してしまう）
    // LineGeometry のバッファは線分ごとに [始点xyz, 終点xyz] が並ぶ
    const buf = l.geometry.attributes.instanceStart.data;
    for (let i = 0; i < TRAIL_POINTS - 1; i++) {
      buf.array.set(flat.slice(i * 3, i * 3 + 6), i * 6);
    }
    buf.needsUpdate = true;

    // 飛んでいる間も尾の後ろ半分から少しずつ粒がこぼれる
    s.emitCarry += dt * 28;
    while (s.emitCarry >= 1) {
      s.emitCarry -= 1;
      emit(s, headDist, tailLen * 0.35, tailLen, now);
    }

    // ふっと現れ、最後は尾全体が光の粒にほどけて消える
    l.material.opacity = 0.9 * Math.min(1, p * 6) * Math.min(1, (1 - p) * 6);
    l.visible = true;
    if (s.t >= 1) {
      for (let k = 0; k < 70; k++) emit(s, headDist, 0, tailLen, now, 1.2);
      s.active = false;
      s.next = now + rand(8000, 24000);
    }
  });

  // 注意: drei の Line は残りの props をマテリアルにも渡すので、visible はここで指定せず useFrame で切り替える
  return (
    <>
      <Line
        ref={line as never}
        points={initialPoints}
        vertexColors={colors}
        lineWidth={0.85}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        fog={false}
        frustumCulled={false}
        renderOrder={-9}
      />
      <points geometry={sparks.geometry} material={sparks.material} frustumCulled={false} renderOrder={-9} />
    </>
  );
}
