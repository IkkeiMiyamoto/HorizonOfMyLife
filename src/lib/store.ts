import { useEffect, useReducer } from "react";
import { sampleData } from "../data/sample";
import type { Category, Goal, LifeData, Link, Profile, Step } from "../types";
import { DEFAULT_CATEGORIES } from "./categories";

const STORAGE_KEY = "horizon-of-my-life:v1";

export const uid = () => Math.random().toString(36).slice(2, 10);

export type Action =
  | { type: "addGoal"; goal: Goal }
  | { type: "updateGoal"; id: string; patch: Partial<Goal> }
  | { type: "deleteGoal"; id: string }
  | { type: "addStep"; goalId: string; step: Step }
  | { type: "toggleStep"; goalId: string; stepId: string }
  | { type: "deleteStep"; goalId: string; stepId: string }
  | { type: "addLink"; link: Link }
  | { type: "deleteLink"; id: string }
  | { type: "setProfile"; profile: Profile }
  | { type: "addCategory"; category: Category }
  | { type: "updateCategory"; id: string; patch: Partial<Omit<Category, "id">> }
  | { type: "deleteCategory"; id: string; moveTo: string }
  | { type: "replace"; data: LifeData };

const mapGoal = (state: LifeData, id: string, fn: (g: Goal) => Goal): LifeData => ({
  ...state,
  goals: state.goals.map((g) => (g.id === id ? fn(g) : g)),
});

function reducer(state: LifeData, action: Action): LifeData {
  switch (action.type) {
    case "addGoal":
      return { ...state, goals: [...state.goals, action.goal] };
    case "updateGoal":
      return mapGoal(state, action.id, (g) => ({ ...g, ...action.patch }));
    case "deleteGoal":
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.id),
        links: state.links.filter((l) => l.source !== action.id && l.target !== action.id),
      };
    case "addStep":
      return mapGoal(state, action.goalId, (g) => ({ ...g, steps: [...g.steps, action.step] }));
    case "toggleStep":
      return mapGoal(state, action.goalId, (g) => ({
        ...g,
        steps: g.steps.map((s) => (s.id === action.stepId ? { ...s, done: !s.done } : s)),
      }));
    case "deleteStep":
      return mapGoal(state, action.goalId, (g) => ({ ...g, steps: g.steps.filter((s) => s.id !== action.stepId) }));
    case "addLink": {
      const { source, target } = action.link;
      const dup = state.links.some(
        (l) => (l.source === source && l.target === target) || (l.source === target && l.target === source),
      );
      return dup || source === target ? state : { ...state, links: [...state.links, action.link] };
    }
    case "deleteLink":
      return { ...state, links: state.links.filter((l) => l.id !== action.id) };
    case "setProfile":
      return { ...state, profile: action.profile };
    case "addCategory":
      return { ...state, categories: [...state.categories, action.category] };
    case "updateCategory":
      return { ...state, categories: state.categories.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)) };
    case "deleteCategory":
      // 最後の1つは消さない。所属していた目標は移動先のカテゴリへ移す
      if (state.categories.length <= 1) return state;
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        goals: state.goals.map((g) => (g.category === action.id ? { ...g, category: action.moveTo } : g)),
      };
    case "replace":
      return normalizeLifeData(action.data);
  }
}

export function isLifeData(x: unknown): x is LifeData {
  const d = x as LifeData;
  return !!d && d.version === 1 && Array.isArray(d.goals) && Array.isArray(d.links) && !!d.profile;
}

/** 古い保存データ（カテゴリ機能より前のもの）には初期カテゴリを補う */
export function normalizeLifeData(d: LifeData): LifeData {
  const categories = Array.isArray(d.categories) && d.categories.length ? d.categories : structuredClone(DEFAULT_CATEGORIES);
  return { ...d, categories };
}

function load(): LifeData {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (isLifeData(parsed)) return normalizeLifeData(parsed);
  } catch {
    // 壊れたデータはサンプルで置き換える
  }
  return structuredClone(sampleData);
}

export function useLifeData() {
  const [data, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // プライベートモード等で保存できない場合はメモリ上のみで動作
    }
  }, [data]);
  return [data, dispatch] as const;
}
