/** カテゴリはユーザーが自由に追加・削除できるので任意の文字列 */
export type CategoryId = string;

export interface Category {
  id: CategoryId;
  label: string;
  color: string;
  /** lib/categories.ts の CATEGORY_ICONS のキー */
  icon: string;
}

/** 年月は "YYYY-MM" 形式の文字列で扱う */
export type YearMonth = string;

export interface Step {
  id: string;
  title: string;
  done: boolean;
  due?: YearMonth;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  targetDate: YearMonth;
  /** ロードマップの開始月。未設定なら作成月と各ステップ期日から自動で決める */
  startDate?: YearMonth;
  /** 1=通常, 2=重要, 3=最重要（コンステレーション上のノードの大きさに反映） */
  priority: 1 | 2 | 3;
  createdAt: YearMonth;
  steps: Step[];
}

/**
 * enables : source が target の前提条件
 * boosts  : source が進むと target も進みやすくなる（相乗効果）
 * tradeoff: 時間やお金などの資源を奪い合う（向きは表示上の意味を持たない）
 */
export type LinkType = "enables" | "boosts" | "tradeoff";

export interface Link {
  id: string;
  source: string;
  target: string;
  type: LinkType;
}

export interface Profile {
  name: string;
  birthYear: number;
  /** 誕生日 "YYYY-MM-DD"。未設定なら birthYear の1月1日生まれとして年齢を概算する */
  birthDate?: string;
  vision: string;
}

export interface LifeData {
  version: 1;
  profile: Profile;
  /** 表示順（星座の方角やロードマップの並び）もこの順番 */
  categories: Category[];
  goals: Goal[];
  links: Link[];
}

export type ViewId = "dashboard" | "constellation" | "roadmap";
