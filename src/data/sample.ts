import type { LifeData } from "../types";

export const sampleData: LifeData = {
  "version": 1,
  "profile": {
    "name": "あなた",
    "birthYear": 2002,
    "birthDate": "2002-03-14",
    "vision": ""
  },
  "categories": [
    {
      "id": "career",
      "label": "キャリア",
      "color": "#38bdf8",
      "icon": "briefcase"
    },
    {
      "id": "learning",
      "label": "英語",
      "color": "#a78bfa",
      "icon": "graduation"
    },
    {
      "id": "finance",
      "label": "お金",
      "color": "#fbbf24",
      "icon": "coins"
    },
    {
      "id": "creative",
      "label": "創造・趣味",
      "color": "#fb923c",
      "icon": "sparkles"
    },
    {
      "id": "c-wfgbbnsj",
      "label": "副業",
      "color": "#fbbf24",
      "icon": "brain"
    }
  ],
  "goals": [
    {
      "id": "g-english",
      "title": "英語を習得",
      "category": "learning",
      "priority": 3,
      "description": "TOEIC 900 と、英語で議論できる会話力。",
      "targetDate": "2027-12",
      "createdAt": "2025-01",
      "steps": [
        {
          "id": "en2",
          "title": "TOEIC 860点 突破",
          "due": "2027-10",
          "done": false
        },
        {
          "id": "2o5ee36m",
          "title": "IELTS General Training 各7.0",
          "done": false,
          "due": "2027-12"
        },
        {
          "id": "su9qbgv7",
          "title": "英検準1級 取得",
          "done": false,
          "due": "2027-02"
        }
      ],
      "startDate": "2026-01"
    },
    {
      "id": "g-global",
      "title": "海外で働く",
      "category": "career",
      "priority": 3,
      "description": "日本を出る",
      "targetDate": "2028-07",
      "createdAt": "2026-01",
      "steps": [],
      "startDate": "2026-01"
    },
    {
      "id": "g-app",
      "title": "自作英単語アプリをリリース",
      "category": "c-wfgbbnsj",
      "priority": 2,
      "description": "自分が欲しいものを、自分の手でつくって世に出す。",
      "targetDate": "2027-03",
      "createdAt": "2026-01",
      "steps": [
        {
          "id": "ap2",
          "title": "プロトタイプを作る",
          "due": "2026-09",
          "done": true
        },
        {
          "id": "ap3",
          "title": "ベータ版を公開",
          "due": "2026-12",
          "done": false
        },
        {
          "id": "ap4",
          "title": "正式リリース",
          "due": "2027-03",
          "done": false
        }
      ]
    },
    {
      "id": "g-side",
      "title": "副業で月20万円",
      "category": "finance",
      "priority": 3,
      "description": "会社以外にも収入の柱をつくる。",
      "targetDate": "2027-12",
      "createdAt": "2026-06",
      "steps": [
        {
          "id": "sd2",
          "title": "アプリの収益化",
          "due": "2027-03",
          "done": false
        },
        {
          "id": "sd3",
          "title": "月5万円達成",
          "due": "2027-06",
          "done": false
        },
        {
          "id": "sd4",
          "title": "月10万円達成",
          "due": "2027-08",
          "done": false
        }
      ]
    },
    {
      "id": "g-uav51pv0",
      "title": "ブログサイトを作成する",
      "description": "",
      "category": "c-wfgbbnsj",
      "targetDate": "2027-03",
      "priority": 2,
      "createdAt": "2026-10",
      "steps": []
    },
    {
      "id": "g-fvy27aot",
      "title": "ピアノで弾き語りができるようになる",
      "description": "",
      "category": "creative",
      "targetDate": "2027-12",
      "priority": 2,
      "createdAt": "2026-10",
      "steps": []
    },
    {
      "id": "g-dyjh16ml",
      "title": "半年留学する",
      "description": "",
      "category": "learning",
      "targetDate": "2028-06",
      "priority": 3,
      "createdAt": "2026-10",
      "steps": [
        {
          "id": "7aeadgrk",
          "title": "留学を開始する",
          "done": false,
          "due": "2028-01"
        }
      ]
    }
  ],
  "links": [
    {
      "id": "l1",
      "source": "g-english",
      "target": "g-global",
      "type": "enables"
    },
    {
      "id": "l4",
      "source": "g-app",
      "target": "g-side",
      "type": "enables"
    },
    {
      "id": "mkf8hpid",
      "source": "g-uav51pv0",
      "target": "g-side",
      "type": "enables"
    },
    {
      "id": "fhd5fu9k",
      "source": "g-side",
      "target": "g-global",
      "type": "enables"
    }
  ]
};
