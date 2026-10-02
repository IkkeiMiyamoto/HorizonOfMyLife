import type { YearMonth } from "../types";

export const toIdx = (ym: YearMonth): number => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};

export const fromIdx = (i: number): YearMonth =>
  `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;

export const nowYM = (): YearMonth => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const monthsUntil = (ym: YearMonth): number => toIdx(ym) - toIdx(nowYM());

export const fmtYM = (ym: YearMonth): string => {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
};

export const fmtShortYM = (ym: YearMonth): string => {
  const [y, m] = ym.split("-");
  return `${y}.${m}`;
};

export function humanizeUntil(ym: YearMonth): string {
  const d = monthsUntil(ym);
  if (d < 0) return `${-d}ヶ月超過`;
  if (d === 0) return "今月";
  if (d < 12) return `あと${d}ヶ月`;
  const y = Math.floor(d / 12);
  const m = d % 12;
  return m ? `あと${y}年${m}ヶ月` : `あと${y}年`;
}
