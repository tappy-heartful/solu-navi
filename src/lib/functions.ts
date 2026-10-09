import { db } from "./firebase";
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
export const globalLineDefaultImage = "https://tappy-heartful.github.io/streak-images/navi/line-profile-unset.png";

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
    <div class="youtube-embed-wrapper" style="margin: 12px 0;">
      <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px;">
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
export async function writeLog({ dataId, action, status = "success", errorDetail = {} }: any) {
  try {
    const uid = getSession("uid") || "unknown";
    const userName = getSession("displayName") || "";
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
    await setDoc(doc(db, colName, logId), {
      uid,
      userName,
      action,
      dataId,
      status,
      errorDetail,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Log failed", e);
  }
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
