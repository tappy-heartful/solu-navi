"use server";

import { adminDb } from "@/lib/firebase-admin";
import { sendLineMulticastMessage, formatConciergeMessage } from "@/lib/line";

/**
 * 出欠未回答者へのLINEリマインド自動通知
 */
export async function sendAttendanceRemindAction(eventId: string): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  try {
    const eventDoc = await adminDb.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return { success: false, count: 0, message: "イベントが見つかりませんでした。" };
    }
    const event = eventDoc.data()!;

    // 回答者一覧を取得
    const answersSnap = await adminDb
      .collection("eventAttendanceAnswers")
      .where("eventId", "==", eventId)
      .get();
    const answeredUids = new Set(answersSnap.docs.map((d) => d.data().uid));

    // 全ユーザーを取得
    const usersSnap = await adminDb.collection("users").get();
    const unansweredUids: string[] = [];
    usersSnap.docs.forEach((d) => {
      if (!answeredUids.has(d.id)) {
        unansweredUids.push(d.id);
      }
    });

    if (unansweredUids.length === 0) {
      return { success: true, count: 0, message: "未回答者はいません（全員回答済みです）。" };
    }

    // lineMessagingIds から対象LINE UIDを取得
    const lineUids: string[] = [];
    for (const uid of unansweredUids) {
      const lineDoc = await adminDb.collection("lineMessagingIds").doc(uid).get();
      if (lineDoc.exists && lineDoc.data()?.lineUid) {
        lineUids.push(lineDoc.data()!.lineUid);
      }
    }

    if (lineUids.length === 0) {
      return {
        success: true,
        count: 0,
        message: "未回答者のLINE連携アカウントが見つかりませんでした。",
      };
    }

    const text = formatConciergeMessage(
      `【出欠回答のお願い】\nイベント「${event.title}」(${event.date || "日程未定"})の出欠が未回答です。\n\nメンバー・パートリーダー双方が円滑に進行できるよう、お早めにSolu Naviから回答をお願いします！\n\n▼ 回答はこちら\n${process.env.NEXT_PUBLIC_APP_URL || "https://solu-navi.vercel.app"}/event/confirm?eventId=${eventId}`,
      "general"
    );

    const res = await sendLineMulticastMessage(lineUids, [{ type: "text", text }]);
    return {
      success: true,
      count: res.successCount,
      message: `${res.successCount}名の未回答者へLINEリマインド通知を送信しました！`,
    };
  } catch (err: any) {
    console.error("[sendAttendanceRemindAction] Error:", err);
    return { success: false, count: 0, message: `リマインド送信に失敗しました: ${err.message}` };
  }
}

/**
 * 日程調整未回答者へのLINEリマインド自動通知
 */
export async function sendAdjustRemindAction(eventId: string): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  try {
    const eventDoc = await adminDb.collection("events").doc(eventId).get();
    if (!eventDoc.exists) {
      return { success: false, count: 0, message: "イベントが見つかりませんでした。" };
    }
    const event = eventDoc.data()!;

    const answersSnap = await adminDb
      .collection("eventAdjustAnswers")
      .where("eventId", "==", eventId)
      .get();
    const answeredUids = new Set(answersSnap.docs.map((d) => d.data().uid));

    const usersSnap = await adminDb.collection("users").get();
    const unansweredUids: string[] = [];
    usersSnap.docs.forEach((d) => {
      if (!answeredUids.has(d.id)) {
        unansweredUids.push(d.id);
      }
    });

    if (unansweredUids.length === 0) {
      return { success: true, count: 0, message: "未回答者はいません（全員回答済みです）。" };
    }

    const lineUids: string[] = [];
    for (const uid of unansweredUids) {
      const lineDoc = await adminDb.collection("lineMessagingIds").doc(uid).get();
      if (lineDoc.exists && lineDoc.data()?.lineUid) {
        lineUids.push(lineDoc.data()!.lineUid);
      }
    }

    if (lineUids.length === 0) {
      return {
        success: true,
        count: 0,
        message: "未回答者のLINE連携アカウントが見つかりませんでした。",
      };
    }

    const text = formatConciergeMessage(
      `【日程調整回答のお願い】\n「${event.title}」の日程調整が未回答です。\n\n部員のみなさんの参加可能日を集約しています。お早めにSolu Naviから回答をお願いします！\n\n▼ 回答はこちら\n${process.env.NEXT_PUBLIC_APP_URL || "https://solu-navi.vercel.app"}/event/confirm?eventId=${eventId}`,
      "general"
    );

    const res = await sendLineMulticastMessage(lineUids, [{ type: "text", text }]);
    return {
      success: true,
      count: res.successCount,
      message: `${res.successCount}名の未回答者へLINEリマインド通知を送信しました！`,
    };
  } catch (err: any) {
    console.error("[sendAdjustRemindAction] Error:", err);
    return { success: false, count: 0, message: `リマインド送信に失敗しました: ${err.message}` };
  }
}
