import { Timestamp } from "firebase/firestore";

/**
 * FirestoreドキュメントのTimestampや再帰的オブジェクトをシリアライズ可能なプレーンオブジェクトに変換する
 */
export function toPlainObject<T>(data: unknown): T {
  if (data === null || data === undefined) {
    return data as T;
  }

  // Firestore Timestamp
  if (data instanceof Timestamp || (typeof data === "object" && "toMillis" in data && typeof (data as { toMillis: () => number }).toMillis === "function")) {
    return (data as { toMillis: () => number }).toMillis() as unknown as T;
  }

  // Date
  if (data instanceof Date) {
    return data.getTime() as unknown as T;
  }

  // 配列
  if (Array.isArray(data)) {
    return data.map((item) => toPlainObject(item)) as unknown as T;
  }

  // オブジェクト
  if (typeof data === "object") {
    const plain: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      plain[key] = toPlainObject(value);
    }
    return plain as T;
  }

  return data as T;
}

/**
 * 日本時間 (JST) での日時文字列フォーマット
 */
export function formatJSTDate(timestamp?: number | Timestamp | null, format = "YYYY/MM/DD HH:mm"): string {
  if (!timestamp) return "";
  const ms = typeof timestamp === "number" ? timestamp : "toMillis" in timestamp ? timestamp.toMillis() : 0;
  if (!ms) return "";

  const d = new Date(ms + 9 * 60 * 60 * 1000); // JST
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");

  return format
    .replace("YYYY", String(yyyy))
    .replace("MM", mm)
    .replace("DD", dd)
    .replace("HH", hh)
    .replace("mm", min);
}
