import type { Profile } from "../types";

const DAY = 86_400_000;

function birthday(p: Profile): { y: number; m: number; d: number } {
  if (p.birthDate) {
    const [y, m, d] = p.birthDate.split("-").map(Number);
    return { y, m, d };
  }
  return { y: p.birthYear, m: 1, d: 1 };
}

/** 指定日時点の満年齢 */
export function ageOn(p: Profile, date = new Date()): number {
  const b = birthday(p);
  const beforeBirthday = date.getMonth() + 1 < b.m || (date.getMonth() + 1 === b.m && date.getDate() < b.d);
  return date.getFullYear() - b.y - (beforeBirthday ? 1 : 0);
}

/** 小数点つきの年齢（人生軸上の位置に使う） */
export function exactAge(p: Profile, date = new Date()): number {
  const b = birthday(p);
  return (date.getTime() - new Date(b.y, b.m - 1, b.d).getTime()) / (365.2425 * DAY);
}

/** 次の誕生日までの日数（今日が誕生日なら 0、誕生日が未設定なら null） */
export function daysUntilBirthday(p: Profile, today = new Date()): number | null {
  if (!p.birthDate) return null;
  const b = birthday(p);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(t0.getFullYear(), b.m - 1, b.d);
  if (next < t0) next = new Date(t0.getFullYear() + 1, b.m - 1, b.d);
  return Math.round((next.getTime() - t0.getTime()) / DAY);
}

export const isValidBirthDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const y = Number(s.slice(0, 4));
  return y >= 1900 && new Date(s).getTime() <= Date.now();
};
