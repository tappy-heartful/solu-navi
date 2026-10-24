import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import * as utils from "@/lib/functions";
import { Genre, Score, EventWithSetlist } from "@/lib/firestore/types";
import { toPlainObject } from "@/lib/firestore/utils";
import defaultGenres from "@/data/master/genres.json";
import { unstable_cache } from "next/cache";

/**
 * 全譜面データを取得（サーバーサイド専用）
 */
export async function getScoresServer(): Promise<Score[]> {
  try {
    const snap = await adminDb.collection("scores").orderBy("createdAt", "desc").get();
    return snap.docs.map((doc) => {
      const data = toPlainObject(doc) as Record<string, any>;
      return {
        id: doc.id,
        ...data,
        youtubeId: utils.extractYouTubeId(data.referenceTrack || ""),
      } as Score;
    });
  } catch (err) {
    console.error("[getScoresServer] Error:", err);
    return [];
  }
}

/**
 * 特定の譜面データをIDで取得（サーバーサイド専用）
 */
export async function getScoreServer(scoreId: string): Promise<Score | null> {
  try {
    const docSnap = await adminDb.collection("scores").doc(scoreId).get();
    if (!docSnap.exists) return null;

    const data = toPlainObject(docSnap) as Record<string, any>;
    return {
      id: docSnap.id,
      ...data,
      youtubeId: utils.extractYouTubeId(data.referenceTrack || ""),
    } as Score;
  } catch (err) {
    console.error("[getScoreServer] Error:", err);
    return null;
  }
}

/**
 * ジャンル一覧を取得（24時間キャッシュ）
 */
export const getGenresServer = unstable_cache(
  async (): Promise<Genre[]> => {
    try {
      const snapshot = await adminDb.collection("genres").orderBy("order", "asc").get();
      if (snapshot.empty) {
        return defaultGenres as Genre[];
      }
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Genre[];
    } catch {
      return defaultGenres as Genre[];
    }
  },
  ["master-genres"],
  { revalidate: 86400, tags: ["master-genres"] }
);

/**
 * セットリストが存在する今後のイベントを取得（サーバーサイド専用）
 */
export async function getUpcomingEventsWithSetlistServer(): Promise<EventWithSetlist[]> {
  try {
    const today = new Date().toISOString().split("T")[0].replace(/-/g, ".");
    const snap = await adminDb
      .collection("events")
      .where("date", ">=", today)
      .orderBy("date", "asc")
      .get();

    return snap.docs
      .map((doc) => {
        const data = doc.data();
        const scoreIds = (data.setlist || []).flatMap(
          (item: { songIds?: string[] }) => item.songIds || []
        );
        return {
          id: doc.id,
          title: data.title,
          date: data.date,
          scoreIdsInSetlist: scoreIds,
        };
      })
      .filter((e) => e.scoreIdsInSetlist.length > 0);
  } catch (err) {
    console.error("[getUpcomingEventsWithSetlistServer] Error:", err);
    return [];
  }
}

export type MediaSelectItem = {
  id: string;
  title: string;
  date: string;
};

/**
 * メディア一覧を取得（譜面・イベント選択肢用）
 */
export async function getMediasForSelectServer(): Promise<MediaSelectItem[]> {
  try {
    const snap = await adminDb.collection("medias").orderBy("date", "desc").get();
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || "",
        date: (data.date || "").replace(/-/g, "."),
      };
    });
  } catch (err) {
    console.error("[getMediasForSelectServer] Error:", err);
    return [];
  }
}

/**
 * 紐づく単一メディア情報を取得
 */
export async function getLinkedMediaServer(
  mediaId?: string
): Promise<{ id: string; title: string; date: string } | null> {
  if (!mediaId) return null;
  try {
    const docSnap = await adminDb.collection("medias").doc(mediaId).get();
    if (!docSnap.exists) return null;
    const data = docSnap.data() || {};
    return {
      id: docSnap.id,
      title: data.title || "",
      date: (data.date || "").replace(/-/g, "."),
    };
  } catch (err) {
    console.error("[getLinkedMediaServer] Error:", err);
    return null;
  }
}
