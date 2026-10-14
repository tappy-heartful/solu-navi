"use server";

import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { isInTerm } from "@/lib/functions";
import { HomeAnnouncement } from "../types";

/**
 * ホーム画面用のお知らせ一覧を取得（受付中の曲投票・曲募集）
 */
export async function getHomeAnnouncementsServer(): Promise<HomeAnnouncement[]> {
  try {
    const [votesSnap, callsSnap] = await Promise.all([
      adminDb.collection("votes").orderBy("createdAt", "desc").get(),
      adminDb.collection("calls").orderBy("createdAt", "desc").get(),
    ]);

    const items: HomeAnnouncement[] = [];

    // 1. 曲投票 (votes)
    let voteHeaderAdded = false;
    votesSnap.forEach((doc) => {
      const d = doc.data();
      if (isInTerm(d.acceptStartDate, d.acceptEndDate)) {
        if (!voteHeaderAdded) {
          items.push({ type: "pending", message: "曲投票、受付中です！" });
          voteHeaderAdded = true;
        }
        items.push({
          type: "item",
          label: d.name || "名称未設定",
          link: `/vote/confirm?voteId=${doc.id}`,
          category: "vote",
        });
      }
    });

    // 2. 候補曲募集 (calls)
    let callHeaderAdded = false;
    callsSnap.forEach((doc) => {
      const d = doc.data();
      if (isInTerm(d.acceptStartDate, d.acceptEndDate)) {
        if (!callHeaderAdded) {
          items.push({ type: "pending", message: "候補曲、募集中です！" });
          callHeaderAdded = true;
        }
        items.push({
          type: "item",
          label: d.title || "名称未設定",
          link: `/call/confirm?callId=${doc.id}`,
          category: "call",
        });
      }
    });

    return items.length
      ? items
      : [{ type: "empty", message: "お知らせはありません🍀" }];
  } catch (err) {
    console.error("Failed to fetch home announcements:", err);
    return [{ type: "empty", message: "お知らせはありません🍀" }];
  }
}
