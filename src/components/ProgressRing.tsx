import { useId } from "react";

interface Props {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  color2?: string;
  label?: string;
  sublabel?: string;
}

export default function ProgressRing({ value, size = 96, stroke = 8, color = "#22d3ee", color2 = "#a78bfa", label, sublabel }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gid = `ring-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 6px ${color}88)` }}
      />
      <text x="50%" y={sublabel ? "47%" : "50%"} textAnchor="middle" dominantBaseline="middle" className="fill-white font-display font-bold" fontSize={size * 0.22}>
        {label ?? `${Math.round(value * 100)}%`}
      </text>
      {sublabel && (
        <text x="50%" y="66%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 font-display" fontSize={Math.min(size * 0.1, 11)} letterSpacing="0.2em">
          {sublabel}
        </text>
      )}
    </svg>
  );
}
