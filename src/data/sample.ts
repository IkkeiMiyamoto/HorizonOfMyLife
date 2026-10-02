import { DEFAULT_CATEGORIES } from "../lib/categories";
import type { Goal, LifeData, Link, Step } from "../types";

const s = (id: string, title: string, due: string, done = false): Step => ({ id, title, due, done });

const goals: Goal[] = [
  {
    id: "g-pm", title: "プロダクトマネージャーになる", category: "career", priority: 3,
    description: "ユーザーの課題から事業をつくれる人になる。", targetDate: "2028-04", createdAt: "2025-04",
    steps: [
      s("pm1", "PM関連の名著を10冊読む", "2025-10", true),
      s("pm2", "社内でPM補佐を担当", "2026-04", true),
      s("pm3", "新機能を1つ企画からリード", "2026-12"),
      s("pm4", "数値で語れる実績をまとめる", "2027-06"),
      s("pm5", "PMポジションへ異動・転職", "2028-03"),
    ],
  },
  {
    id: "g-english", title: "ビジネス英語を習得", category: "learning", priority: 2,
    description: "TOEIC 900 と、英語で議論できる会話力。", targetDate: "2027-06", createdAt: "2025-01",
    steps: [
      s("en1", "毎日オンライン英会話25分", "2025-06", true),
      s("en2", "TOEIC 800突破", "2026-06", true),
      s("en3", "英語で社内プレゼン", "2027-01"),
      s("en4", "TOEIC 900突破", "2027-06"),
    ],
  },
  {
    id: "g-global", title: "海外で働く", category: "career", priority: 3,
    description: "多様な人と働き、視野を世界に広げる。", targetDate: "2030-04", createdAt: "2026-01",
    steps: [
      s("gl1", "海外カンファレンスに参加", "2027-09"),
      s("gl2", "海外チームとの協業プロジェクト", "2028-06"),
      s("gl3", "移住先・ビザのリサーチ", "2029-03"),
      s("gl4", "海外拠点へ異動", "2030-04"),
    ],
  },
  {
    id: "g-marathon", title: "フルマラソン完走", category: "health", priority: 2,
    description: "42.195kmを自分の足で。", targetDate: "2027-11", createdAt: "2025-09",
    steps: [
      s("ma1", "週3回のラン習慣", "2025-12", true),
      s("ma2", "10kmレースに出場", "2026-05", true),
      s("ma3", "ハーフマラソン完走", "2027-03"),
      s("ma4", "フルマラソン完走", "2027-11"),
    ],
  },
  {
    id: "g-sleep", title: "睡眠と食生活を整える", category: "health", priority: 1,
    description: "すべての目標の土台になるコンディション。", targetDate: "2027-03", createdAt: "2026-03",
    steps: [
      s("sl1", "23時就寝を習慣化", "2026-06", true),
      s("sl2", "自炊を週4回", "2026-12"),
      s("sl3", "健康診断オールA", "2027-03"),
    ],
  },
  {
    id: "g-app", title: "自作アプリをリリース", category: "creative", priority: 2,
    description: "自分が欲しいものを、自分の手でつくって世に出す。", targetDate: "2027-03", createdAt: "2026-01",
    steps: [
      s("ap1", "アイデアを50個書き出す", "2026-03", true),
      s("ap2", "プロトタイプを作る", "2026-09", true),
      s("ap3", "ベータ版を公開", "2026-12"),
      s("ap4", "正式リリース", "2027-03"),
    ],
  },
  {
    id: "g-side", title: "副業で月10万円", category: "career", priority: 1,
    description: "会社以外にも収入の柱をつくる。", targetDate: "2028-12", createdAt: "2026-06",
    steps: [
      s("sd1", "技術ブログを月4本", "2027-01"),
      s("sd2", "アプリの収益化", "2027-06"),
      s("sd3", "月5万円達成", "2028-01"),
      s("sd4", "月10万円達成", "2028-12"),
    ],
  },
  {
    id: "g-asset", title: "資産1,000万円", category: "finance", priority: 2,
    description: "選択肢を増やすための経済的な余裕。", targetDate: "2030-12", createdAt: "2025-01",
    steps: [
      s("as1", "家計簿を自動化", "2025-03", true),
      s("as2", "新NISAを満額設定", "2026-12"),
      s("as3", "生活防衛資金6ヶ月分", "2027-06"),
      s("as4", "資産500万円", "2028-06"),
      s("as5", "資産1,000万円", "2030-12"),
    ],
  },
  {
    id: "g-house", title: "理想の家に住む", category: "finance", priority: 1,
    description: "家族と心地よく暮らせる場所。", targetDate: "2032-04", createdAt: "2026-06",
    steps: [
      s("ho1", "理想の暮らしを言語化", "2027-12"),
      s("ho2", "頭金の準備", "2030-12"),
      s("ho3", "住まいを決める", "2032-04"),
    ],
  },
  {
    id: "g-family", title: "パートナーと家族を築く", category: "relationships", priority: 3,
    description: "大切な人と、同じ未来を見る。", targetDate: "2029-12", createdAt: "2025-06",
    steps: [
      s("fa1", "月1回の小旅行", "2025-12", true),
      s("fa2", "将来について深く話し合う", "2027-03"),
      s("fa3", "結婚", "2028-10"),
      s("fa4", "新しい家族の暮らしを始める", "2029-12"),
    ],
  },
  {
    id: "g-community", title: "一生モノの仲間をつくる", category: "relationships", priority: 1,
    description: "刺激し合える仲間がいる人生。", targetDate: "2028-06", createdAt: "2025-10",
    steps: [
      s("co1", "勉強会に月1回参加", "2026-03", true),
      s("co2", "LTで登壇する", "2026-11"),
      s("co3", "勉強会を主催する", "2027-06"),
      s("co4", "仲間と合宿を開く", "2028-06"),
    ],
  },
];

const l = (id: string, source: string, target: string, type: Link["type"]): Link => ({ id, source, target, type });

const links: Link[] = [
  l("l1", "g-english", "g-global", "enables"),
  l("l2", "g-pm", "g-global", "enables"),
  l("l3", "g-app", "g-pm", "boosts"),
  l("l4", "g-app", "g-side", "enables"),
  l("l5", "g-side", "g-asset", "boosts"),
  l("l6", "g-asset", "g-house", "enables"),
  l("l7", "g-family", "g-house", "boosts"),
  l("l8", "g-sleep", "g-marathon", "boosts"),
  l("l9", "g-sleep", "g-pm", "boosts"),
  l("l10", "g-english", "g-pm", "boosts"),
  l("l11", "g-community", "g-app", "boosts"),
  l("l12", "g-community", "g-side", "boosts"),
  l("l13", "g-marathon", "g-app", "tradeoff"),
  l("l14", "g-global", "g-family", "tradeoff"),
  l("l15", "g-marathon", "g-sleep", "boosts"),
];

export const sampleData: LifeData = {
  version: 1,
  profile: {
    name: "あなた",
    birthYear: 1996,
    vision: "世界を舞台に、大切な人と、つくることを楽しみ続ける人生。",
  },
  categories: DEFAULT_CATEGORIES,
  goals,
  links,
};
