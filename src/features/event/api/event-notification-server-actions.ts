"use server";

import { adminDb } from "@/lib/firebase-admin";
import {
  sendLineMulticastMessage,
  sendLinePushMessage,
  formatConciergeMessage,
  getLineAccessTokenForTarget,
} from "@/lib/line";
import { DEFAULT_ATTENDANCE_STATUSES } from "@/lib/firestore/constants";
import { AttendanceStatus } from "@/lib/firestore/types";

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

/**
 * 各パート（セクション）LINEグループ宛て イベント開始N分前リマインド通知
 * イベント内容およびパートメンバーの出欠状況一覧を送信
 * 
 * @param isForce - テスト送信フラグ (日時の判定や送信済みチェックをバイパス)
 */
export async function sendUpcomingEventsNoticeToSectionsAction(isForce = false): Promise<{
  success: boolean;
  sentCount: number;
  message: string;
  details?: any[];
}> {
  try {
    // 1. アプリ設定を取得
    const settingsDoc = await adminDb.collection("appSettings").doc("default").get();
    const settings = (settingsDoc.exists ? settingsDoc.data() : {}) as any;

    // 有効判定 (force でない場合)
    if (!isForce && settings.enableSectionEventRemind === false) {
      return {
        success: true,
        sentCount: 0,
        message: "パート別イベント前リマインド通知は無効に設定されています。",
      };
    }

    const minutesBefore = Number(settings.sectionEventRemindMinutesBefore ?? 30);
    const sectionLineGroupIds: Record<string, string> = settings.sectionLineGroupIds || {};

    const configuredSectionIds = Object.keys(sectionLineGroupIds).filter(
      (secId) => Boolean(sectionLineGroupIds[secId])
    );

    if (configuredSectionIds.length === 0) {
      return {
        success: true,
        sentCount: 0,
        message: "パートLINEグループIDが1件も設定されていません。アプリ設定をご確認ください。",
      };
    }

    // 2. 現在日時 (JST)
    const now = new Date();
    const jstOffset = 9 * 60; // minutes
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const jstNow = new Date(utc + jstOffset * 60000);
    const yyyy = jstNow.getFullYear();
    const mm = String(jstNow.getMonth() + 1).padStart(2, "0");
    const dd = String(jstNow.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}.${mm}.${dd}`;

    // 3. セクションマスタ取得
    const sectionsSnap = await adminDb.collection("sections").get();
    const sections = sectionsSnap.docs.length > 0
      ? sectionsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any))
      : (await import("@/data/master/sections.json")).default;

    // 4. 出欠ステータスマスタ取得
    const statusesSnap = await adminDb.collection("attendanceStatuses").get();
    const attendanceStatuses: AttendanceStatus[] = statusesSnap.docs.length > 0
      ? statusesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AttendanceStatus))
      : (DEFAULT_ATTENDANCE_STATUSES || []);
    
    const statusMap = new Map<string, string>();
    attendanceStatuses.forEach((st) => statusMap.set(st.id, st.name));

    // 5. ユーザー一覧を取得し、パート別に整理
    const usersSnap = await adminDb.collection("users").get();
    const usersBySection = new Map<string, any[]>();
    usersSnap.docs.forEach((doc) => {
      const u = { id: doc.id, ...doc.data() } as any;
      if (u.status === "archived") return;
      const secId = String(u.sectionId || "");
      if (secId) {
        if (!usersBySection.has(secId)) usersBySection.set(secId, []);
        usersBySection.get(secId)!.push(u);
      }
    });

    // 6. 全イベント取得
    const eventsSnap = await adminDb.collection("events").get();
    const allEvents = eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));

    // 7. 対象イベントの抽出
    let targetEvents: any[] = [];

    if (isForce) {
      // テスト送信時: 今日のイベントがあれば優先、なければ直近（日付順で一番近い）のイベントを1件対象にする
      const todayEvents = allEvents.filter((ev) => {
        const d = (ev.date || ev.startDate || "").replace(/-/g, ".");
        return d === todayStr;
      });

      if (todayEvents.length > 0) {
        targetEvents = [todayEvents[0]];
      } else {
        // 今日以降のイベント、なければ直近のイベント
        const futureEvents = allEvents
          .filter((ev) => (ev.date || ev.startDate || "").replace(/-/g, ".") >= todayStr)
          .sort((a, b) => (a.date || a.startDate || "").localeCompare(b.date || b.startDate || ""));
        if (futureEvents.length > 0) {
          targetEvents = [futureEvents[0]];
        } else if (allEvents.length > 0) {
          targetEvents = [allEvents[0]];
        }
      }
    } else {
      // 通常定期実行時:
      // 本日のイベントで、開始時刻が設定されており、開始N分前の通知ウィンドウに入っているもの
      const nowMs = jstNow.getTime();

      targetEvents = allEvents.filter((ev) => {
        const d = (ev.date || ev.startDate || "").replace(/-/g, ".");
        if (d !== todayStr) return false;
        if (!ev.startTime) return false;

        const timeParts = ev.startTime.split(":");
        if (timeParts.length < 2) return false;
        const startH = Number(timeParts[0]);
        const startM = Number(timeParts[1]);
        if (isNaN(startH) || isNaN(startM)) return false;

        // イベント開始のミリ秒
        const eventStartDate = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate(), startH, startM, 0, 0);
        const eventStartMs = eventStartDate.getTime();

        // リマインド予定時刻
        const remindTriggerMs = eventStartMs - minutesBefore * 60 * 1000;

        // 現在時刻がトリガー時刻以降、かつイベント開始後30分以内であること
        const inWindow = nowMs >= remindTriggerMs && nowMs <= (eventStartMs + 30 * 60 * 1000);
        return inWindow;
      });
    }

    if (targetEvents.length === 0) {
      return {
        success: true,
        sentCount: 0,
        message: isForce
          ? "対象となるイベントが見つかりませんでした。"
          : `現在、開始${minutesBefore}分前のリマインド対象となるイベントはありません。`,
      };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://solu-navi.vercel.app";
    let totalSentCount = 0;
    const sendDetails: any[] = [];

    // 8. イベントごと・パートごとにメッセージを生成して送信
    for (const ev of targetEvents) {
      // イベントの出欠回答を取得
      const answersSnap = await adminDb
        .collection("eventAttendanceAnswers")
        .where("eventId", "==", ev.id)
        .get();
      const answersByUid = new Map<string, any>();
      answersSnap.docs.forEach((d) => {
        const a = d.data();
        answersByUid.set(a.uid, a);
      });

      const evDate = ev.date || ev.startDate || "日程未定";
      const timeStr = ev.startTime ? ` ${ev.startTime}${ev.endTime ? `〜${ev.endTime}` : ""}` : "";
      const alreadySentMap = ev.sectionRemindSent || {};
      const updatedSentMap = { ...alreadySentMap };

      for (const sec of sections) {
        const secId = String(sec.id);
        const groupId = sectionLineGroupIds[secId];
        if (!groupId) continue; // グループID未設定のパートはスキップ

        // 通常実行時、すでに送信済みであればスキップ
        if (!isForce && alreadySentMap[secId]) {
          continue;
        }

        // このパートのメンバー
        const secUsers = usersBySection.get(secId) || [];
        if (secUsers.length === 0 && !isForce) {
          continue;
        }

        // ステータスごとの部員集計
        // statusId -> ユーザーリスト (名前 + コメント)
        const statusGroups = new Map<string, string[]>();
        const unansweredUsers: string[] = [];

        secUsers.forEach((u) => {
          const uName = u.displayName || u.abbreviation || "部員";
          const ans = answersByUid.get(u.id || u.uid);
          if (!ans || !ans.status) {
            unansweredUsers.push(uName);
          } else {
            const stId = String(ans.status);
            if (!statusGroups.has(stId)) statusGroups.set(stId, []);
            let note = uName;
            if (ans.comment && ans.comment.trim()) {
              note += ` (${ans.comment.trim()})`;
            }
            statusGroups.get(stId)!.push(note);
          }
        });

        // 出欠ステータスごとのテキスト生成
        let statusSummary = "";
        attendanceStatuses.forEach((st) => {
          const list = statusGroups.get(String(st.id)) || [];
          if (list.length > 0) {
            statusSummary += `\n📌 ${st.name} (${list.length}名):\n${list.join("\n")}\n`;
          }
        });

        // 定義外ステータスがあれば追記
        statusGroups.forEach((list, stId) => {
          if (!statusMap.has(stId) && list.length > 0) {
            statusSummary += `\n📌 回答 (${list.length}名):\n${list.join("\n")}\n`;
          }
        });

        // 未回答者
        if (unansweredUsers.length > 0) {
          statusSummary += `\n❓ 未回答 (${unansweredUsers.length}名):\n${unansweredUsers.join("\n")}\n`;
        }

        if (!statusSummary.trim()) {
          statusSummary = "\n（出欠回答はありません）\n";
        }

        // メッセージ本文の組み立て
        let body = `【パート別イベント直前リマインド】\n`;
        body += isForce
          ? `※テスト送信です※\n`
          : `まもなくイベントが開始されます（開始${minutesBefore}分前）🎺\n`;
        body += `準備や出欠状況を確認しましょう！\n\n`;
        body += `📌 イベント: ${ev.title}\n`;
        body += `📅 日時: ${evDate}${timeStr}\n`;
        if (ev.placeName) body += `📍 場所: ${ev.placeName}\n`;
        if (ev.description) body += `📝 備考: ${ev.description}\n`;
        body += `\n━━━━━━━━━━━━━━━\n`;
        body += `👥【${sec.name} 出欠状況】(計${secUsers.length}名)\n`;
        body += statusSummary;
        body += `━━━━━━━━━━━━━━━\n`;
        body += `▼ 出欠の変更・詳細確認はこちら\n${appUrl}/event/confirm?eventId=${ev.id}`;

        const fullMessage = formatConciergeMessage(body, "section", secId);

        // トークン取得
        const token =
          settings.sectionChannelAccessTokens?.[secId] ||
          getLineAccessTokenForTarget("section", secId);

        try {
          await sendLinePushMessage(groupId, [{ type: "text", text: fullMessage }], token);
          totalSentCount++;
          updatedSentMap[secId] = Date.now();
          sendDetails.push({
            eventId: ev.id,
            eventTitle: ev.title,
            sectionId: secId,
            sectionName: sec.name,
            groupId,
            status: "success",
          });
        } catch (sendErr: any) {
          console.error(`[sendUpcomingEventsNoticeToSectionsAction] Send error for sec ${secId}:`, sendErr);
          sendDetails.push({
            eventId: ev.id,
            eventTitle: ev.title,
            sectionId: secId,
            sectionName: sec.name,
            groupId,
            status: "error",
            error: sendErr.message,
          });
        }
      }

      // イベントの送信済み記録をFirestoreに更新 (通常送信、またはテスト送信でも記録可能だが重複防止のため通常時更新)
      if (!isForce) {
        await adminDb.collection("events").doc(ev.id).set(
          { sectionRemindSent: updatedSentMap },
          { merge: true }
        );
      }
    }

    return {
      success: true,
      sentCount: totalSentCount,
      message: `${totalSentCount}件のパートLINEグループへイベント前リマインド通知を送信しました！`,
      details: sendDetails,
    };
  } catch (err: any) {
    console.error("[sendUpcomingEventsNoticeToSectionsAction] Error:", err);
    return {
      success: false,
      sentCount: 0,
      message: `パート別イベント前リマインド送信に失敗しました: ${err.message}`,
    };
  }
}
