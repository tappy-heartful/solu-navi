"use server";

import { adminDb } from "@/lib/firebase-admin";
import { sendLineMulticastMessage, sendLinePushMessage, formatConciergeMessage } from "@/lib/line";

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

const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function getJstDate(): Date {
  const now = new Date();
  const jstOffset = 9 * 60; // JST は UTC+9
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + jstOffset * 60000);
}

/**
 * 全体LINEグループへ向こうM日分のイベント予告＆出欠回答催促通知を送信
 * @param isForce 曜日判定をバイパスして強制送信するか（テスト実行用）
 */
export async function sendUpcomingEventsNoticeToGeneralLine(isForce = false): Promise<{
  success: boolean;
  sent: boolean;
  eventCount: number;
  message: string;
}> {
  try {
    const settingsDoc = await adminDb.collection("settings").doc("general").get();
    const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};

    // 1. 設定確認
    const enableNotice = settings.enableEventNotice ?? true;
    if (!enableNotice && !isForce) {
      return { success: true, sent: false, eventCount: 0, message: "イベント予告通知は無効に設定されています。" };
    }

    const generalGroupId = settings.generalLineGroupId;
    if (!generalGroupId) {
      return { success: false, sent: false, eventCount: 0, message: "全体LINEグループIDが設定されていません。" };
    }

    // 2. 曜日判定 (JST)
    const jstNow = getJstDate();
    const todayDayOfWeek = jstNow.getDay(); // 0(日)〜6(土)
    const allowedDays: number[] = Array.isArray(settings.eventNoticeDaysOfWeek)
      ? settings.eventNoticeDaysOfWeek
      : [1]; // デフォルト: 月曜

    if (!isForce && !allowedDays.includes(todayDayOfWeek)) {
      return {
        success: true,
        sent: false,
        eventCount: 0,
        message: `本日は送信対象曜日ではありません（設定: [${allowedDays.map((d) => WEEKDAY_NAMES[d]).join(", ")}], 本日: ${WEEKDAY_NAMES[todayDayOfWeek]}曜日）。スキップしました。`,
      };
    }

    // 3. 対象期間の計算 (向こうM日分)
    const targetDays = Number(settings.eventNoticeTargetDays) || 7;
    const yyyy = jstNow.getFullYear();
    const mm = String(jstNow.getMonth() + 1).padStart(2, "0");
    const dd = String(jstNow.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}.${mm}.${dd}`;

    const limitDate = new Date(jstNow.getTime() + targetDays * 24 * 60 * 60 * 1000);
    const limitYyyy = limitDate.getFullYear();
    const limitMm = String(limitDate.getMonth() + 1).padStart(2, "0");
    const limitDd = String(limitDate.getDate()).padStart(2, "0");
    const limitStr = `${limitYyyy}.${limitMm}.${limitDd}`;

    // 4. イベント取得
    const eventsSnap = await adminDb.collection("events").get();
    const targetEvents: any[] = [];

    eventsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      const attType = data.attendanceType || "attendance";

      // 該当期間に含まれるか判定
      let isInRange = false;
      let primaryDate = "";

      if (attType === "schedule") {
        // 日程調整: candidateDates のいずれかが今日〜limitStrの範囲内にあるか
        const cDates: string[] = data.candidateDates || [];
        const matchingDates = cDates.filter((d) => d >= todayStr && d <= limitStr);
        if (matchingDates.length > 0) {
          isInRange = true;
          primaryDate = matchingDates[0];
        }
      } else {
        // 出欠確認 or 予定のみ (特定日)
        const d = data.date || data.startDate || "";
        if (d >= todayStr && d <= limitStr) {
          isInRange = true;
          primaryDate = d;
        }
      }

      if (isInRange) {
        targetEvents.push({
          id,
          ...data,
          primaryDate,
        });
      }
    });

    // 日付順にソート
    targetEvents.sort((a, b) => (a.primaryDate || "").localeCompare(b.primaryDate || ""));

    if (targetEvents.length === 0) {
      return {
        success: true,
        sent: false,
        eventCount: 0,
        message: `向こう${targetDays}日間の対象イベントはありませんでした（通知送信はスキップしました）。`,
      };
    }

    // 5. メッセージ構築
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://solu-navi.vercel.app";
    let body = `向こう${targetDays}日間のイベント予告とお知らせです🎷\n内容をご確認の上、期日までの出欠回答にご協力をお願いします✨\n`;

    targetEvents.forEach((ev) => {
      const attType = ev.attendanceType || "attendance";
      body += `\n━━━━━━━━━━━━━━━\n`;

      if (attType === "schedule") {
        // 日程調整
        const cDatesStr = (ev.candidateDates || []).join(", ");
        body += `📌【日程調整】${ev.title}\n`;
        body += `📅 候補日程: ${cDatesStr || "未定"}\n`;
        if (ev.placeName) body += `📍 場所: ${ev.placeName}\n`;
        if (ev.acceptEndDate) body += `⏳ 回答締切: ${ev.acceptEndDate}\n`;
        body += `👉 日程調整の回答はこちら:\n${appUrl}/event/confirm?eventId=${ev.id}\n`;
      } else if (attType === "none") {
        // 予定のみ (回答不要)
        body += `📌【予定のみ】${ev.title}\n`;
        body += `📅 日時: ${ev.date || ev.startDate || "未定"}`;
        if (ev.startTime) body += ` ${ev.startTime}〜${ev.endTime || ""}`;
        body += `\n`;
        if (ev.placeName) body += `📍 場所: ${ev.placeName}\n`;
        body += `※このイベントは出欠・日程調整の回答不要です\n`;
        body += `👉 詳細確認はこちら:\n${appUrl}/event/confirm?eventId=${ev.id}\n`;
      } else {
        // 通常の出欠確認
        body += `📌【出欠確認】${ev.title}\n`;
        body += `📅 日時: ${ev.date || ev.startDate || "未定"}`;
        if (ev.startTime) body += ` ${ev.startTime}〜${ev.endTime || ""}`;
        body += `\n`;
        if (ev.placeName) body += `📍 場所: ${ev.placeName}\n`;
        if (ev.acceptEndDate) body += `⏳ 出欠締切: ${ev.acceptEndDate}\n`;
        body += `👉 出欠回答はこちら:\n${appUrl}/event/confirm?eventId=${ev.id}\n`;
      }
    });

    const fullMessage = formatConciergeMessage(body, "general");

    // 全体公式LINEのトークン取得
    const token =
      settings.generalChannelAccessToken ||
      process.env.LINE_CHANNEL_ACCESS_TOKEN_GENERAL ||
      process.env.LINE_CHANNEL_ACCESS_TOKEN ||
      process.env.LINE_INDIV_ACCESS_TOKEN;

    await sendLinePushMessage(generalGroupId, [{ type: "text", text: fullMessage }], token);

    return {
      success: true,
      sent: true,
      eventCount: targetEvents.length,
      message: `全体LINEグループへ${targetEvents.length}件のイベント予告通知を送信しました！`,
    };
  } catch (err: any) {
    console.error("[sendUpcomingEventsNoticeToGeneralLine] Error:", err);
    return {
      success: false,
      sent: false,
      eventCount: 0,
      message: `イベント予告通知の送信に失敗しました: ${err.message}`,
    };
  }
}
