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

export type EventSelectItem = {
  id: string;
  title: string;
  date: string;
};

export type ScoreSelectItem = {
  id: string;
  title: string;
  storageLocation?: string;
};

export type MediaConfirmData = {
  media: Media;
  linkedEvent?: { id: string; title: string; date: string } | null;
  linkedScore?: { id: string; title: string; storageLocation?: string } | null;
};

function formatDotDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

/**
 * 過去1ヶ月（今日以前、かつ31日前まで）のイベント一覧を取得（選択肢用）
 */
export async function getPastMonthEventsServer(): Promise<EventSelectItem[]> {
  try {
    const snap = await adminDb.collection("events").get();
    const now = new Date();
    const today = formatDotDate(now);
    const oneMonthAgoDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = formatDotDate(oneMonthAgoDate);

    const items: EventSelectItem[] = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      const rawDate = (data.date || data.startDate || "").replace(/-/g, ".");
      if (rawDate && rawDate <= today && rawDate >= oneMonthAgo) {
        items.push({
          id: d.id,
          title: data.title || "無題イベント",
          date: rawDate,
        });
      }
    });

    items.sort((a, b) => b.date.localeCompare(a.date));
    return items;
  } catch (err) {
    console.error("[getPastMonthEventsServer] Error:", err);
    return [];
  }
}

/**
 * 譜面一覧を取得（選択肢用）
 */
export async function getScoresForSelectServer(): Promise<ScoreSelectItem[]> {
  try {
    const snap = await adminDb.collection("scores").orderBy("title", "asc").get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || "",
        storageLocation: data.storageLocation || "",
      };
    });
  } catch (err) {
    console.error("[getScoresForSelectServer] Error:", err);
    return [];
  }
}

/**
 * メディア確認画面用の統合データ取得（関連イベント・譜面の名前も解決）
 */
export async function getMediaConfirmDataServer(mediaId: string): Promise<MediaConfirmData | null> {
  try {
    const media = await getMediaServer(mediaId);
    if (!media) return null;

    let linkedEvent: { id: string; title: string; date: string } | null = null;
    if (media.eventId) {
      const evSnap = await adminDb.collection("events").doc(media.eventId).get();
      if (evSnap.exists) {
        const evData = evSnap.data() || {};
        linkedEvent = {
          id: evSnap.id,
          title: evData.title || "",
          date: (evData.date || evData.startDate || "").replace(/-/g, "."),
        };
      }
    }

    let linkedScore: { id: string; title: string; storageLocation?: string } | null = null;
    if (media.scoreId) {
      const scSnap = await adminDb.collection("scores").doc(media.scoreId).get();
      if (scSnap.exists) {
        const scData = scSnap.data() || {};
        linkedScore = {
          id: scSnap.id,
          title: scData.title || "",
          storageLocation: scData.storageLocation || "",
        };
      }
    }

    return {
      media,
      linkedEvent,
      linkedScore,
    };
  } catch (err) {
    console.error("[getMediaConfirmDataServer] Error:", err);
    return null;
  }
}
