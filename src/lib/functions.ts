import { db, auth } from "./firebase";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  runTransaction,
  DocumentReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  increment,
} from "firebase/firestore";
import { showDialog } from "@/components/Common/CommonDialog";
import { showSpinner, hideSpinner } from "@/components/Common/Spinner";

// --- 定数 ---
export const isTest = typeof window !== "undefined" && window.location.hostname.includes("test");
export const isLocal = typeof window !== "undefined" && window.location.hostname.includes("localhost");
export const globalAppName = isLocal ? "soluNaviLocal" : isTest ? "soluNaviTest" : "soluNavi";
export const globalLineDefaultImage = "/default-avatar.svg";

// --- セッション管理 (localStorage/sessionStorage) ---
const getStorageKey = (key: string) => `${globalAppName}.${key}`;

export function setSession(key: string, value: any) {
  if (typeof window === "undefined") return;
  const val = typeof value === "string" ? value : JSON.stringify(value);
  sessionStorage.setItem(getStorageKey(key), val);
}

export function getSession(key: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(getStorageKey(key));
}

export function removeSession(key: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(getStorageKey(key));
}

export function clearAllAppSession() {
  if (typeof window === "undefined") return;
  const prefix = globalAppName + ".";
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}

export { showSpinner, hideSpinner, showDialog };

// タイムスタンプ文字列(mm:ss)を秒数に変換
export function timestampToSeconds(timestamp: string): number {
  if (!timestamp) return 0;
  const parts = timestamp.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

// YouTube動画ID抽出
export function extractYouTubeId(input: string): string {
  if (!input) return "";
  try {
    if (input.includes("youtube.com") || input.includes("youtu.be")) {
      const url = new URL(input);
      return url.searchParams.get("v") || url.pathname.split("/").pop() || "";
    }
    return input;
  } catch {
    return input;
  }
}

// YouTube埋め込みHTML生成
export function buildYouTubeHtml(
  youtubeInput: string | string[],
  showLink = true,
  showNotice = false
): string {
  if (!youtubeInput) return "";

  const inputs = Array.isArray(youtubeInput) ? youtubeInput : [youtubeInput];
  const videoIds = inputs
    .map((input) => extractYouTubeId(input))
    .filter((id): id is string => Boolean(id) && id.length === 11);

  if (videoIds.length === 0) return "";

  const embedId = videoIds[0];
  const youtubeLink =
    Array.isArray(youtubeInput) && videoIds.length > 1
      ? `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(",")}`
      : `https://www.youtube.com/watch?v=${embedId}`;

  return `
    <div class="youtube-embed-wrapper" style="margin: 12px 0; width: 100%; max-width: 100%; box-sizing: border-box;">
      <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
        <iframe src="https://www.youtube.com/embed/${embedId}?loop=1&playlist=${embedId}" allowfullscreen style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border: 0;"></iframe>
      </div>
      <div style="margin-top: 8px; font-size: 13px;">
        ${showNotice ? `<span style="color: #ef4444; font-weight: bold; margin-right: 6px;">🔒限定公開</span>` : ""}
        <a href="${youtubeLink}" target="_blank" rel="noopener noreferrer" style="color: #146081; text-decoration: underline;">
          ${!showLink ? "" : videoIds.length > 1 ? "プレイリストを聴く" : "YouTubeでみる"}
        </a>
      </div>
    </div>`;
}

// --- 日付操作 ---
export function formatDateToYMDDot(dateInput: any): string {
  if (!dateInput) return "";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

// --- ログ記録 ---
export async function writeLog({
  dataId = null,
  action = "",
  status = "success",
  errorDetail = {},
}: {
  dataId?: string | null;
  action?: string;
  status?: string;
  errorDetail?: Record<string, any>;
}) {
  try {
    const currentAuthUser = auth.currentUser;
    const uid = currentAuthUser?.uid || getSession("uid") || "unknown";
    const userName = currentAuthUser?.displayName || getSession("displayName") || "";
    const now = new Date();
    const dateStr =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "_" +
      String(now.getHours()).padStart(2, "0") +
      "-" +
      String(now.getMinutes()).padStart(2, "0") +
      "-" +
      String(now.getSeconds()).padStart(2, "0") +
      "-" +
      String(now.getMilliseconds()).padStart(3, "0");
    const logId = `${dateStr}_${uid}`;
    const colName = status === "success" ? "logs" : "errorLogs";

    const logData: Record<string, any> = {
      uid: uid || "unknown",
      userName: userName || "",
      action: action || "",
      dataId: dataId ?? null,
      status: status || "success",
      createdAt: serverTimestamp(),
    };

    if (errorDetail && typeof errorDetail === "object" && Object.keys(errorDetail).length > 0) {
      const sanitizedError: Record<string, any> = {};
      for (const [k, v] of Object.entries(errorDetail)) {
        if (v !== undefined) {
          sanitizedError[k] = v;
        }
      }
      logData.errorDetail = sanitizedError;
    } else {
      logData.errorDetail = {};
    }

    // エラー時は自動的にブラウザコンソールにも明確に出力
    if (status !== "success") {
      console.error(
        `[ErrorLog] action="${action}", dataId="${dataId}", user="${userName}(${uid})":`,
        logData.errorDetail
      );
    }

    await setDoc(doc(db, colName, logId), logData);
  } catch (e) {
    console.error("Log failed", e);
  }
}

/**
 * エラーログ記録ヘルパー
 * コンソールへの詳細出力（console.error）と errorLogs コレクションへの保存を同時に実施
 */
export async function writeErrorLog({
  action,
  error,
  dataId = null,
  extra = {},
}: {
  action: string;
  error: unknown;
  dataId?: string | null;
  extra?: Record<string, any>;
}) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[Error] ${action} (dataId=${dataId}):`, error);

  await writeLog({
    dataId,
    action,
    status: "error",
    errorDetail: {
      message,
      ...(stack ? { stack } : {}),
      ...extra,
    },
  });
}

export async function archiveAndDeleteDoc(collectionName: string, docId: string) {
  const docRef = doc(db, collectionName, docId);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const archiveRef = doc(db, "archives", `${collectionName}_${docId}_${Date.now()}`);
    await setDoc(archiveRef, {
      ...snap.data(),
      archivedAt: serverTimestamp(),
      originalCollection: collectionName,
      originalId: docId,
    });
    await deleteDoc(docRef);
  }
}

/**
 * JST Date オブジェクト取得
 */
export function getJSTDate(dateInput?: any): Date {
  let date: Date;
  if (!dateInput) {
    date = new Date();
  } else if (typeof dateInput.toDate === "function") {
    date = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else if (dateInput.seconds !== undefined) {
    date = new Date(dateInput.seconds * 1000);
  } else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else if (typeof dateInput === "string") {
    date = new Date(dateInput.replace(/[\.\-]/g, "/"));
  } else {
    date = new Date();
  }

  if (isNaN(date.getTime())) {
    date = new Date();
  }

  return new Date(date.getTime() + 9 * 60 * 60 * 1000);
}

/**
 * 日付フォーマット（JST基準）
 */
export function format(dateOrTimestamp: any, formatString = "yyyy.MM.dd"): string {
  if (!dateOrTimestamp) return "";
  const jstDate = getJSTDate(dateOrTimestamp);

  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jstDate.getUTCDate()).padStart(2, "0");

  if (formatString === "yyyy.MM.dd") return `${year}.${month}.${day}`;
  if (formatString === "yyyy-MM-dd") return `${year}-${month}-${day}`;
  if (formatString === "MMdd") return `${month}${day}`;
  if (formatString === "MM") return `${month}`;
  if (formatString === "yyyy/MM/dd HH:mm") {
    const hours = String(jstDate.getUTCHours()).padStart(2, "0");
    const minutes = String(jstDate.getUTCMinutes()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  }
  return `${year}.${month}.${day}`;
}

export function parseDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== "string") return null;
  const parts = dateString.split(".");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d ? date : null;
}

/**
 * 期間内チェック（JST基準）
 */
export function isInTerm(startDateStr: string, endDateStr: string): boolean {
  const now = Date.now();

  const parseJST = (dateStr: string, timeStr: string): number => {
    const normalized = dateStr.replace(/[\.\/]/g, "-").trim();
    const isoStr = `${normalized}T${timeStr}+09:00`;
    const t = new Date(isoStr).getTime();
    return isNaN(t) ? 0 : t;
  };

  const start = startDateStr ? parseJST(startDateStr, "00:00:00") : 0;
  const end = endDateStr ? parseJST(endDateStr, "23:59:59") : Infinity;
  return now >= start && now <= end;
}

export function dotDateToHyphen(dateStr: string): string {
  return dateStr?.replace(/\./g, "-") || "";
}

export function hyphenDateToDot(dateStr: string): string {
  return dateStr?.replace(/-/g, ".") || "";
}

export function getDayOfWeek(dateStr: string, short = false): string {
  if (!dateStr) return "";
  const normalized = dateStr.replace(/-/g, ".");
  const parts = normalized.split(".");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayStr = days[date.getDay()];
  if (short) return dayStr;
  return `${y}年${m}月${d}日(${dayStr})`;
}

/**
 * 現在の年度 (4月〜翌年3月) を取得 (JST基準)
 */
/**
 * 日本標準時 (Asia/Tokyo) における学年・年度（4月1日〜翌年3月31日）を取得
 * 4月1日 00:00:00 (JST) を迎えた瞬間に当年年度へ確実に切り替わる
 */
export function getCurrentAcademicYear(dateInput?: any): number {
  let targetDate: Date;
  if (!dateInput) {
    targetDate = new Date();
  } else if (typeof dateInput.toDate === "function") {
    targetDate = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    targetDate = dateInput;
  } else if (dateInput.seconds !== undefined) {
    targetDate = new Date(dateInput.seconds * 1000);
  } else if (typeof dateInput === "number") {
    targetDate = new Date(dateInput);
  } else if (typeof dateInput === "string") {
    const normalized = dateInput.replace(/\./g, "-");
    targetDate = new Date(normalized);
  } else {
    targetDate = new Date();
  }

  if (isNaN(targetDate.getTime())) {
    targetDate = new Date();
  }

  try {
    // 日本標準時 (Asia/Tokyo) の年月日を厳密に分解取得
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(targetDate);

    const yearPart = parts.find((p) => p.type === "year")?.value;
    const monthPart = parts.find((p) => p.type === "month")?.value;
    const year = yearPart ? parseInt(yearPart, 10) : targetDate.getFullYear();
    const month = monthPart ? parseInt(monthPart, 10) : targetDate.getMonth() + 1;

    // 4月1日〜12月31日は当年年度、1月1日〜3月31日は前年年度
    return month >= 4 ? year : year - 1;
  } catch (err) {
    // Intl フォールバック
    const jst = getJSTDate(targetDate);
    const year = jst.getUTCFullYear();
    const month = jst.getUTCMonth() + 1;
    return month >= 4 ? year : year - 1;
  }
}

// --- 学年・回生判定共通関数 ---

/**
 * 入学年度から現在の回生・学年を判定（サークル規約に完全準拠）
 *
 * 【回生判定ルール】
 * - 1回生: 1年目 4/1 〜 2年目 3/31
 * - 2回生: 2年目 4/1 〜 3年目 3/31
 * - 3回生: 3年目 4/1 〜 12/31（※12月引退）
 * - それ以降（4年目 1/1 以降）: OBOG
 * - 1回生開始前（1年目 4/1 より前）: 新入生
 *
 * @param enrollmentYear 入学年度 (例: 2024)
 * @param dateOrSettings 判定基準日 (Date / 文字列 / タイムスタンプ) または 任意の引数（後方互換）
 */
export function getGradeFromEnrollmentYear(
  enrollmentYear?: number | string | null,
  dateOrSettings?: any
): string {
  if (!enrollmentYear) return "未設定";
  const yearNum = typeof enrollmentYear === "string" ? parseInt(enrollmentYear, 10) : enrollmentYear;
  if (isNaN(yearNum) || yearNum <= 0) return "未設定";

  // 判定基準日の JST 年月日を取得
  const targetDateInput =
    dateOrSettings && (dateOrSettings instanceof Date || typeof dateOrSettings === "string" || typeof dateOrSettings === "number")
      ? new Date(dateOrSettings)
      : new Date();

  let targetYear: number;
  let targetMonth: number;
  let targetDay: number;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(targetDateInput);
    const yStr = parts.find((p) => p.type === "year")?.value;
    const mStr = parts.find((p) => p.type === "month")?.value;
    const dStr = parts.find((p) => p.type === "day")?.value;
    targetYear = yStr ? parseInt(yStr, 10) : targetDateInput.getFullYear();
    targetMonth = mStr ? parseInt(mStr, 10) : targetDateInput.getMonth() + 1;
    targetDay = dStr ? parseInt(dStr, 10) : targetDateInput.getDate();
  } catch {
    const jst = getJSTDate(targetDateInput);
    targetYear = jst.getUTCFullYear();
    targetMonth = jst.getUTCMonth() + 1;
    targetDay = jst.getUTCDate();
  }

  // 判定基準日の数値表現 YYYYMMDD (例: 20261026)
  const targetYMD = targetYear * 10000 + targetMonth * 100 + targetDay;

  // 1回生: 入学年4/1 〜 翌年3/31
  const g1Start = yearNum * 10000 + 401;
  const g1End = (yearNum + 1) * 10000 + 331;

  // 2回生: 入学2年目4/1 〜 3年目3/31
  const g2Start = (yearNum + 1) * 10000 + 401;
  const g2End = (yearNum + 2) * 10000 + 331;

  // 3回生: 入学3年目4/1 〜 3年目12/31 (12月引退)
  const g3Start = (yearNum + 2) * 10000 + 401;
  const g3End = (yearNum + 2) * 10000 + 1231;

  // 判定
  if (targetYMD < g1Start) {
    return "新入生";
  }
  if (targetYMD >= g1Start && targetYMD <= g1End) {
    return "1回生";
  }
  if (targetYMD >= g2Start && targetYMD <= g2End) {
    return "2回生";
  }
  if (targetYMD >= g3Start && targetYMD <= g3End) {
    return "3回生";
  }
  if (targetYMD > g3End) {
    return "OBOG";
  }

  // 期間の隙間がある場合の安全フォールバック
  if (targetYMD < g2Start) {
    return "1回生";
  }
  if (targetYMD < g3Start) {
    return "2回生";
  }
  return "OBOG";
}

/**
 * 特定の回生・学年かどうかを判定する共通述語関数
 */
export function isGrade(
  enrollmentYear?: number | string | null,
  targetGrade?: "1回生" | "2回生" | "3回生" | "OBOG" | "新入生",
  dateOrSettings?: any
): boolean {
  if (!enrollmentYear || !targetGrade) return false;
  return getGradeFromEnrollmentYear(enrollmentYear, dateOrSettings) === targetGrade;
}

/**
 * 入学年度の選択肢リストを生成（現役生: 1〜3回生まで）
 */
export function getEnrollmentYearOptions(): { year: number; label: string }[] {
  const currentAcademicYear = getCurrentAcademicYear();
  const options: { year: number; label: string }[] = [];

  // 来年度 (入学予定・新入生用)
  const nextYear = currentAcademicYear + 1;
  options.push({
    year: nextYear,
    label: `${nextYear}年度 (新入生)`,
  });

  // 現在年度から3回生まで (3学年分: 1回生, 2回生, 3回生)
  for (let y = currentAcademicYear; y >= currentAcademicYear - 2; y--) {
    const grade = getGradeFromEnrollmentYear(y);
    options.push({
      year: y,
      label: `${y}年度 (${grade})`,
    });
  }

  return options;
}

export function buildGoogleDriveHtml(driveUrl: string, showNotice = false): string {
  const match = driveUrl?.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return "";
  return `
    <div class="drive-embed-wrapper" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; margin: 10px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <iframe src="https://drive.google.com/file/d/${match[1]}/preview" style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
    </div>
    ${showNotice ? `<div style="font-size: 0.8rem; color: #666; margin-top: 4px;">🔒サークル内限定公開</div>` : ""}
  `;
}

// --- プレイヤー補助ロジック ---
export function getWatchVideosOrder(currentIndex: number, items: any[]): string[] {
  const ids = items.map(n => n.youtubeId || extractYouTubeId(n.referenceTrack || ""));
  return [...ids.slice(currentIndex), ...ids.slice(0, currentIndex)];
}

export function getRandomIndex(exclude: number, arrayLength: number): number {
  if (arrayLength <= 1) return 0;
  let idx;
  do { idx = Math.floor(Math.random() * arrayLength); } while (idx === exclude);
  return idx;
}


// 再エクスポート
export {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
  runTransaction,
  db,
};

export type {
  DocumentReference,
  Query,
  QuerySnapshot,
  DocumentSnapshot,
};
