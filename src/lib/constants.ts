import type { LinkType } from "../types";

export interface LinkMeta {
  id: LinkType;
  label: string;
  verb: string;
  color: string;
}

export const LINK_TYPES: LinkMeta[] = [
  { id: "enables", label: "前提", verb: "の前提になる", color: "#7dd3fc" },
  { id: "boosts", label: "相乗効果", verb: "を後押しする", color: "#86efac" },
  { id: "tradeoff", label: "トレードオフ", verb: "と資源を奪い合う", color: "#fb7185" },
];

export const linkTypeOf = (id: LinkType): LinkMeta =>
  LINK_TYPES.find((l) => l.id === id) ?? LINK_TYPES[0];
