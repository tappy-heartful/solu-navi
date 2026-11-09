import {
  Contact,
  ContactMessage,
  ContactCategory,
  ContactFeature,
  ContactStatus,
} from "@/lib/firestore/types";

export type {
  Contact,
  ContactMessage,
  ContactCategory,
  ContactFeature,
  ContactStatus,
};

// お問い合わせ種別のラベルと説明
export const CONTACT_CATEGORY_MAP: Record<
  ContactCategory,
  { label: string; badgeColor: string; description: string }
> = {
  bug: {
    label: "不具合・エラー報告",
    badgeColor: "#ef4444",
    description: "画面が表示されない、ボタンが動かない、エラーが出るなど",
  },
  request: {
    label: "機能要望・改善提案",
    badgeColor: "#3b82f6",
    description: "こんな機能が欲しい、こうなると使いやすいなど",
  },
  question: {
    label: "使い方・操作の質問",
    badgeColor: "#10b981",
    description: "操作方法やサークル規約の扱いがわからないなど",
  },
  data_fix: {
    label: "データ修正・削除依頼",
    badgeColor: "#f59e0b",
    description: "登録した名前、パート、過去データの修正をお願いしたいなど",
  },
  other: {
    label: "その他",
    badgeColor: "#64748b",
    description: "上記に当てはまらないお問い合わせや連絡",
  },
};

// 対象機能のラベル
export const CONTACT_FEATURE_MAP: Record<ContactFeature, { label: string; iconName?: string }> = {
  event: { label: "イベント・出欠・日程調整" },
  fee: { label: "部費・集金" },
  score: { label: "譜面（楽譜）" },
  media: { label: "録音・メディア" },
  vote_call: { label: "曲募集・曲投票" },
  blue_note: { label: "今日の一曲 (BlueNote)" },
  user: { label: "プロフィール・部員名簿" },
  auth: { label: "LINEログイン・認証・PWA" },
  other: { label: "全般・その他" },
};

// ステータスのラベル
export const CONTACT_STATUS_MAP: Record<
  ContactStatus,
  { label: string; badgeColor: string; bg: string }
> = {
  open: { label: "未対応", badgeColor: "#ef4444", bg: "#fef2f2" },
  in_progress: { label: "対応中", badgeColor: "#3b82f6", bg: "#eff6ff" },
  resolved: { label: "解決済み", badgeColor: "#10b981", bg: "#f0fdf4" },
};

