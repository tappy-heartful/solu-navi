import { Timestamp, FieldValue } from "firebase/firestore";

/**
 * ユーザー型定義
 */
export interface UserDoc {
  uid: string;
  id?: string; // uid との互換性用
  displayName?: string;
  kana?: string;
  abbreviation: string;
  pictureUrl?: string;
  sectionId?: string; // 1: Sax, 2: Tmp, 3: Trb, 4: Rhythm, etc.
  roleId?: string;    // 1: 代表, 2: バンマス, 3: コンマス, etc.
  instrumentIds?: string[];
  enrollmentYear?: number; // 入学年度 (例: 2024 -> 3回生)
  grade?: string;     // 旧互換用
  phoneNumber?: string;
  paypayId?: string;
  agreedAt?: number | Timestamp;
  isSystemAdmin?: boolean;
  // 各モジュール管理者権限
  isMasterAdmin?: boolean;    // マスタ管理者 (パート・楽器等の編集)
  isUserAdmin?: boolean;      // ユーザ管理者
  isEventAdmin?: boolean;     // イベント管理者
  isCallAdmin?: boolean;      // 曲募集管理者
  isVoteAdmin?: boolean;      // 曲投票管理者
  isScoreAdmin?: boolean;     // 楽譜管理者
  isMediaAdmin?: boolean;     // メディア・録音管理者
  isFeeAdmin?: boolean;       // 会計・部費管理者
  isNoticeAdmin?: boolean;    // お知らせ管理者
  isLiveAdmin?: boolean;      // ライブ管理者
  isBoardAdmin?: boolean;     // 掲示板管理者
  isTicketAdmin?: boolean;    // チケット管理者
  createdAt?: number | Timestamp | FieldValue;
  updatedAt?: number | Timestamp | FieldValue;
  [key: string]: any;
}

export type User = UserDoc;

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

export type Section = SectionDoc;

/**
 * 役職型定義
 */
export interface RoleDoc {
  id: string;
  name: string;
  order: number;
  description?: string;
}

export type Role = RoleDoc;

/**
 * 楽器型定義
 */
export interface InstrumentDoc {
  id: string;
  name: string;
  sectionId: string;
  order: number;
}

export type Instrument = InstrumentDoc;

/**
 * 都道府県・市区町村
 */
export interface Prefecture {
  id: string;
  name: string;
  order?: number;
}

export interface Municipality {
  id: string;
  name: string;
  prefectureCode: string;
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
  errorDetail?: any;
  createdAt: number | Timestamp | FieldValue;
}

// ===== 楽譜・譜面 =====
export interface Score {
  id: string;
  title: string;
  abbreviation?: string;
  storageLocation?: string; // 保管場所・ボックス番号 (例: ボックスA-3、部室 棚2段目など)
  scoreUrl?: string; // 関連リンク
  genres?: string[];
  referenceTrack?: string;
  youtubeId?: string;
  instrumentConfig?: Record<string, InstrumentPart[]>; // 楽器編成 { [sectionId]: InstrumentPart[] }
  note?: string;
  isDispTop?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

// ===== 曲募集 =====
export interface Call {
  id: string;
  title: string;
  description?: string;
  acceptStartDate: string;  // "yyyy.MM.dd"
  acceptEndDate: string;    // "yyyy.MM.dd"
  items: string[];          // 募集ジャンル一覧
  maxSongsPerGenre?: number;
  isAnonymous?: boolean;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type CallAnswerSong = {
  title: string;
  url?: string;
  scorestatus?: string;
  purchase?: string;
  note?: string;
};

export interface CallAnswer {
  id: string;
  uid: string;
  answers: { [genre: string]: CallAnswerSong[] };
}

export type Genre = {
  id: string;
  name: string;
  order?: number;
};

export interface EventWithSetlist {
  id: string;
  title: string;
  date: string;
  scoreIdsInSetlist: string[];
}

export interface Media {
  id: string;
  title: string;
  date: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  driveUrl?: string;
  note?: string;
  isDispTop?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

// ===== 部費・集金管理 =====
export interface Fee {
  id: string;
  title: string;          // 例: "2026年5月度 部費", "夏合宿集金"
  amount: number;         // 金額 (例: 2000, 15000)
  dueDate: string;        // 期日 "yyyy.MM.dd" または "yyyy-MM-dd"
  description?: string;   // 案内・備考
  targetGrades?: string[]; // 対象学年 (空なら全員)
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

export interface FeePayment {
  id: string;             // `${feeId}_${uid}`
  feeId: string;
  uid: string;
  status: "unpaid" | "paid" | "exempt"; // 未払い、支払済、免除
  paidAt?: number;
  paidMethod?: "paypay" | "cash" | "bank" | "other"; // 支払方法
  note?: string;
  updatedAt?: number;
  updatedBy?: string;
}

export interface ScoreStatus {
  id: string;
  name: string;
  order?: number;
}


// ===== 曲投票 =====
export interface VoteChoice {
  name: string;
  link?: string;
  difficulty?: number; // 1-10評価
}

export interface VoteItem {
  name: string;
  link?: string;
  choices: VoteChoice[];
}

export interface Vote {
  id: string;
  name: string;
  description: string;
  descriptionLink?: string;
  acceptStartDate: string;
  acceptEndDate: string;
  isAnonymous?: boolean;
  hideVotes?: boolean;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
  items: VoteItem[];
  type?: "single" | "borda";
  bordaConfig?: {
    maxRanks: number;
    scoring: "linear" | "weighted";
  };
}

export interface VoteAnswer {
  id: string;
  voteId: string;
  uid: string;
  displayName?: string;
  answers: Record<string, string | string[] | null>;
  updatedAt?: number;
}

// ===== イベント =====
export interface SetlistGroup {
  title: string;
  songIds: string[];
}

export interface InstrumentPart {
  partName: string;
  instrumentId?: string;
}

export interface EventYouTubeTimestamp {
  time: string; // "mm:ss"
  comment: string;
}

export interface EventRentTimeRange {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface Event {
  id: string;
  title: string;
  attendanceType: "schedule" | "attendance";
  date?: string;              // "yyyy.MM.dd" (出欠タイプ)
  startDate?: string;         // "yyyy.MM.dd" または "yyyy-MM-dd"
  endDate?: string;           // "yyyy.MM.dd" または "yyyy-MM-dd"
  isAllDay?: boolean;
  startTime?: string;         // "HH:mm"
  endTime?: string;           // "HH:mm"
  candidateDates?: string[];  // "yyyy.MM.dd"[] (日程調整タイプ)
  acceptStartDate: string;
  acceptEndDate: string;
  placeName?: string;
  prefectureId?: string;
  municipalityId?: string;
  website?: string;
  link?: string;
  access?: string;
  googleMap?: string;
  youtubeUrl?: string;
  youtubeTimestamps?: EventYouTubeTimestamp[];
  rentTimeRanges?: EventRentTimeRange[];
  schedule?: string;
  dress?: string;
  bring?: string;
  rent?: string;
  other?: string;
  note?: string;
  allowAssign?: boolean;
  setlist?: SetlistGroup[];
  instrumentConfig?: Record<string, InstrumentPart[]>;
  isVenueReserved?: boolean;
  isRecurring?: boolean;
  recurrenceId?: string;
  color?: string;
  createdUid?: string;
  createdByUid?: string;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface EventAttendanceAnswer {
  id: string;
  eventId: string;
  uid: string;
  status: string;
  comment?: string;
  updatedAt?: number;
}

export interface EventAdjustAnswer {
  id: string;
  eventId: string;
  uid: string;
  answers: Record<string, string>; // { "yyyy.MM.dd": statusId }
  comment?: string;
  updatedAt?: number;
}

export interface AttendanceStatus {
  id: string;
  name: string;
  order?: number;
}

export interface EventAdjustStatus {
  id: string;
  name: string;
  description?: string;
  order?: number;
}


export interface EventRecording {
  id: string;
  eventId: string;
  uid: string;
  title: string;
  url: string;
  createdAt?: number;
}
