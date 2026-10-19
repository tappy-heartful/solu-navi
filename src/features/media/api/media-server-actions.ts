import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { toPlainObject } from "@/lib/firestore/utils";
import { Media } from "@/lib/firestore/types";

/**
 * メディアデータを全件取得（サーバーサイド専用）
 */
export async function getMediasServer(count = 100): Promise<Media[]> {
  try {
    const snap = await adminDb
      .collection("medias")
      .orderBy("date", "desc")
      .limit(count)
      .get();
    return snap.docs.map(toPlainObject) as Media[];
  } catch (err) {
    console.error("[getMediasServer] Error:", err);
    return [];
  }
}

/**
 * 特定のメディアデータをIDで取得（サーバーサイド専用）
 */
export async function getMediaServer(mediaId: string): Promise<Media | null> {
  try {
    const docSnap = await adminDb.collection("medias").doc(mediaId).get();
    if (!docSnap.exists) return null;
    return toPlainObject(docSnap) as Media;
  } catch (err) {
    console.error("[getMediaServer] Error:", err);
    return null;
  }
}
