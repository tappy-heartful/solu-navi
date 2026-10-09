import { Timestamp, FieldValue } from "firebase/firestore";

/**
 * ユーザー型定義
 */
export interface UserDoc {
  uid: string;
  displayName: string;
  kana?: string;
  abbreviation: string;
  pictureUrl?: string;
  sectionId?: string; // 1: Sax, 2: Tmp, 3: Trb, 4: Rhythm, etc.
  roleId?: string;    // 1: 代表, 2: バンマス, 3: コンマス, etc.
  instrumentIds?: string[];
  grade?: string;     // B1, B2, B3, B4, M1, OB/OG etc.
  phoneNumber?: string;
  paypayId?: string;
  agreedAt?: number | Timestamp;
  isSystemAdmin?: boolean;
  // 各モジュール管理者権限
  isUserAdmin?: boolean;
  isEventAdmin?: boolean;
  isScoreAdmin?: boolean;
  isNoticeAdmin?: boolean;
  isLiveAdmin?: boolean;
  createdAt?: number | Timestamp | FieldValue;
  updatedAt?: number | Timestamp | FieldValue;
}

/**
 * パート型定義
 */
export interface SectionDoc {
  id: string;
  name: string;
  shortName: string;
  order: number;
  color?: string;
}

/**
 * 役職型定義
 */
export interface RoleDoc {
  id: string;
  name: string;
  order: number;
  description?: string;
}

/**
 * 楽器型定義
 */
export interface InstrumentDoc {
  id: string;
  name: string;
  sectionId: string;
  order: number;
}

/**
 * 監査ログ型定義
 */
export interface LogDoc {
  id?: string;
  uid: string;
  userName: string;
  action: string;
  dataId?: string;
  status: "success" | "error" | "info";
  errorDetail?: string;
  createdAt: number | Timestamp | FieldValue;
}
