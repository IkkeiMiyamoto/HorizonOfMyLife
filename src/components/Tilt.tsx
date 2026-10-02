import { useRef, type CSSProperties, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 最大の傾き（度） */
  max?: number;
  as?: "div" | "section";
}

/** マウス位置に合わせて奥行き方向に傾き、表面に光が走るカード */
export default function Tilt({ children, className = "", style, max = 8, as: Tag = "div" }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    // マウス操作に追従する小さな動きなので、視差効果を減らす設定でも有効にする
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * max}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * max}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
    el.style.setProperty("--glare", "1");
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--glare", "0");
  };

  return (
    <Tag ref={ref as never} onPointerMove={onMove} onPointerLeave={onLeave} className={`tilt ${className}`} style={style}>
      {children}
      <span className="tilt-glare" aria-hidden />
    </Tag>
  );
}
