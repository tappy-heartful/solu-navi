import { SectionDoc, RoleDoc, InstrumentDoc } from "./types";

export const DEFAULT_SECTIONS: SectionDoc[] = [
  { id: "1", name: "Saxophone (サックス)", shortName: "Sax", order: 1, color: "#f59e0b" },
  { id: "2", name: "Trumpet (トランペット)", shortName: "Tmp", order: 2, color: "#ef4444" },
  { id: "3", name: "Trombone (トロンボーン)", shortName: "Trb", order: 3, color: "#3b82f6" },
  { id: "4", name: "Rhythm (リズム)", shortName: "Rhy", order: 4, color: "#10b981" },
  { id: "5", name: "Guest / OB・OG", shortName: "Other", order: 5, color: "#8b5cf6" },
];

export const DEFAULT_ROLES: RoleDoc[] = [
  { id: "1", name: "代表", order: 1, description: "サークル代表・統括" },
  { id: "2", name: "バンドマスター (バンマス)", order: 2, description: "音楽監督・練習進行" },
  { id: "3", name: "コンサートマスター (コンマス)", order: 3, description: "演奏指導・アンサンブル調整" },
  { id: "4", name: "会計マネージャー", order: 4, description: "部費管理・精算" },
  { id: "5", name: "パートリーダー", order: 5, description: "パート統括" },
  { id: "6", name: "メンバー", order: 6, description: "一般メンバー" },
];

export const DEFAULT_INSTRUMENTS: InstrumentDoc[] = [
  // Saxophone
  { id: "as", name: "Alto Saxophone", sectionId: "1", order: 1 },
  { id: "ts", name: "Tenor Saxophone", sectionId: "1", order: 2 },
  { id: "bs", name: "Baritone Saxophone", sectionId: "1", order: 3 },
  { id: "ss", name: "Soprano Saxophone", sectionId: "1", order: 4 },
  { id: "fl", name: "Flute", sectionId: "1", order: 5 },
  { id: "cl", name: "Clarinet", sectionId: "1", order: 6 },
  
  // Trumpet
  { id: "tp", name: "Trumpet", sectionId: "2", order: 10 },
  { id: "flgh", name: "Flugelhorn", sectionId: "2", order: 11 },

  // Trombone
  { id: "tb", name: "Tenor Trombone", sectionId: "3", order: 20 },
  { id: "btb", name: "Bass Trombone", sectionId: "3", order: 21 },

  // Rhythm
  { id: "pf", name: "Piano / Keyboard", sectionId: "4", order: 30 },
  { id: "gt", name: "Guitar", sectionId: "4", order: 31 },
  { id: "ba", name: "Bass", sectionId: "4", order: 32 },
  { id: "dr", name: "Drums", sectionId: "4", order: 33 },
  { id: "perc", name: "Percussion", sectionId: "4", order: 34 },
];

export const GRADES = [
  "学部1年 (B1)",
  "学部2年 (B2)",
  "学部3年 (B3)",
  "学部4年 (B4)",
  "修士1年 (M1)",
  "修士2年 (M2)",
  "OB / OG",
  "その他",
];
