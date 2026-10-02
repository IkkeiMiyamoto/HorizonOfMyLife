import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  color: string;
  phase: number;
  speed: number;
  vx: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  t: number;
  dur: number;
  emitCarry: number;
}

/** 尾がほどけてできる四角い光の粒 */
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  seed: number;
  size: number;
}

const COLORS = ["#ffffff", "#ffffff", "#ffffff", "#e0ecff", "#cfe0ff", "#fff1d6", "#ffd9b0", "#c7d2fe"];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * ダッシュボード・ロードマップ・2D星座の背景となる星空。
 * 「視差効果を減らす」設定では星の瞬きと漂いを止めるが、流れ星はたまに流す（間隔が長く一瞬なので）。
 */
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let meteor: Meteor | null = null;
    let sparks: Spark[] = [];
    let nextMeteor = performance.now() + rand(6000, 12000);
    let last = performance.now();
    let raf = 0;

    // 明るい星の光彩用スプライト
    const glow = document.createElement("canvas");
    glow.width = glow.height = 32;
    const gctx = glow.getContext("2d")!;
    const gg = gctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gg.addColorStop(0, "rgba(220,235,255,0.9)");
    gg.addColorStop(0.3, "rgba(200,220,255,0.25)");
    gg.addColorStop(1, "rgba(200,220,255,0)");
    gctx.fillStyle = gg;
    gctx.fillRect(0, 0, 32, 32);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((w * h) / 3200) }, () => {
        const r = Math.random() ** 2.6 * 1.9 + 0.5;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r,
          alpha: Math.min(1, 0.4 + r * 0.38 + Math.random() * 0.15),
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.6 + 0.2,
          vx: -(Math.random() * 0.03 + 0.004),
        };
      });
    };

    /** 尾の上（先頭から d0〜d1 px の範囲）に光の粒を1つ生む */
    const emitSpark = (m: Meteor, d0: number, d1: number, now: number, lifeScale = 1) => {
      const sp = Math.hypot(m.vx, m.vy);
      const d = rand(d0, d1);
      sparks.push({
        x: m.x - (m.vx / sp) * d + rand(-1.5, 1.5),
        y: m.y - (m.vy / sp) * d + rand(-1.5, 1.5),
        // 進行方向に少し流されつつ、下へパラパラ落ちる（px/ms）
        vx: (m.vx / sp) * rand(0.005, 0.02),
        vy: (m.vy / sp) * rand(0.005, 0.02) + rand(0.012, 0.03),
        born: now,
        life: rand(700, 1500) * lifeScale,
        seed: Math.random() * 10,
        size: Math.random() < 0.25 ? 2 : 1.5,
      });
    };

    const drawMeteor = (now: number, dt: number) => {
      if (!meteor && now > nextMeteor) {
        const fromLeft = Math.random() < 0.5;
        const dur = rand(1000, 1400);
        const angle = rand(0.15, 0.4); // 水平から下向きの角度(rad)
        const travel = rand(0.9, 1.25) * Math.hypot(w, h); // 画面を大きく横切る
        const speed = travel / dur; // px/ms
        meteor = {
          x: fromLeft ? rand(-0.15, 0.25) * w : rand(0.75, 1.15) * w,
          y: rand(-0.05, 0.35) * h,
          vx: (fromLeft ? 1 : -1) * Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          len: rand(280, 420),
          t: 0,
          dur,
          emitCarry: 0,
        };
      }

      if (meteor) {
        const m = meteor;
        m.t += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const p = Math.min(1, m.t / m.dur);
        // ふっと現れ、最後は尾全体が光の粒にほどけて消える
        const fade = Math.min(1, p * 6) * Math.min(1, (1 - p) * 6);
        const sp = Math.hypot(m.vx, m.vy);
        const tail = m.len * Math.min(1, p * 3);
        const tx = m.x - (m.vx / sp) * tail;
        const ty = m.y - (m.vy / sp) * tail;
        const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
        g.addColorStop(0, `rgba(170,205,255,${0.7 * fade})`);
        g.addColorStop(0.25, `rgba(59,130,246,${0.4 * fade})`);
        g.addColorStop(1, "rgba(29,78,216,0)");
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        // 先端のごく小さな光
        const hg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 2.5);
        hg.addColorStop(0, `rgba(210,228,255,${0.6 * fade})`);
        hg.addColorStop(1, "rgba(96,165,250,0)");
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        // 飛んでいる間も尾の後ろ半分から少しずつ粒がこぼれる
        m.emitCarry += dt * 0.028;
        while (m.emitCarry >= 1) {
          m.emitCarry -= 1;
          emitSpark(m, tail * 0.35, tail, now);
        }
        if (p >= 1) {
          for (let k = 0; k < 60; k++) emitSpark(m, 0, tail, now, 1.2);
          meteor = null;
          nextMeteor = now + rand(10000, 26000);
        }
      }

      // 光の粒：四角いドットがチカチカ瞬きながら薄れて消える
      if (sparks.length) {
        sparks = sparks.filter((k) => now - k.born < k.life);
        for (const k of sparks) {
          const age = now - k.born;
          const t = age / k.life;
          k.x += k.vx * dt;
          k.y += k.vy * dt;
          const blink = Math.sin(age * 0.022 + k.seed * 7) > -0.2 ? 1 : 0.15;
          ctx.globalAlpha = (1 - t) ** 1.3 * blink * 0.85;
          ctx.fillStyle = t < 0.4 ? "#c7dcff" : "#60a5fa";
          ctx.fillRect(Math.round(k.x), Math.round(k.y), k.size, k.size);
        }
        ctx.globalAlpha = 1;
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = reduce ? 1 : 0.8 + 0.2 * Math.sin(now * 0.001 * s.speed + s.phase);
        ctx.globalAlpha = s.alpha * tw;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.6) {
          // 明るい星はほんのり光をまとう（縁が出ないようグラデーションの光彩を重ねる）
          const gr = s.r * 4;
          ctx.globalAlpha = s.alpha * tw * 0.5;
          ctx.drawImage(glow, s.x - gr, s.y - gr, gr * 2, gr * 2);
        }
        if (!reduce) {
          s.x += s.vx;
          if (s.x < -4) s.x = w + 4;
        }
      }
      drawMeteor(now, dt);
      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}
