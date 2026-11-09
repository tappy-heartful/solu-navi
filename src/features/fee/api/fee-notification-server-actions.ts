"use server";

import { adminDb } from "@/lib/firebase-admin";
import { sendLinePushMessage, sendLineMulticastMessage, formatConciergeMessage } from "@/lib/line";
import { AppSettings, Fee, User } from "@/lib/firestore/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/firestore/constants";
import { getGradeFromEnrollmentYear } from "@/lib/functions";

/**
 * 部費未払い者へのLINE催促通知送信（個別集金ID指定）
 */
export async function sendFeeRemindAction(feeId: string): Promise<{
  success: boolean;
  count: number;
  message: string;
}> {
  try {
    const feeDoc = await adminDb.collection("fees").doc(feeId).get();
    if (!feeDoc.exists) {
      return { success: false, count: 0, message: "部費案件が見つかりませんでした。" };
    }
    const fee = feeDoc.data()!;

    // 支払状況と全部員を取得
    const [paymentsSnap, usersSnap] = await Promise.all([
      adminDb.collection("feePayments").where("feeId", "==", feeId).get(),
      adminDb.collection("users").get(),
    ]);

    const paidUids = new Set<string>();
    paymentsSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.status === "paid" || data.status === "exempt") {
        paidUids.add(data.uid);
      }
    });

    // 集金対象部員（未設定なら全員）
    const targetUids =
      fee.targetUserIds && Array.isArray(fee.targetUserIds) && fee.targetUserIds.length > 0
        ? new Set(fee.targetUserIds)
        : null;

    // 未払いの対象部員を特定
    const unpaidUids: string[] = [];
    usersSnap.docs.forEach((d) => {
      if (targetUids && !targetUids.has(d.id)) return; // 対象外はスキップ
      if (!paidUids.has(d.id)) {
        unpaidUids.push(d.id);
      }
    });

    if (unpaidUids.length === 0) {
      return {
        success: true,
        count: 0,
        message: "未払いの部員はいません（全員納入済み、または免除です）。",
      };
    }

    // lineMessagingIds から LINE UID を取得
    const lineUids: string[] = [];
    for (const uid of unpaidUids) {
      const lineDoc = await adminDb.collection("lineMessagingIds").doc(uid).get();
      if (lineDoc.exists && lineDoc.data()?.lineUid) {
        lineUids.push(lineDoc.data()!.lineUid);
      }
    }

    if (lineUids.length === 0) {
      return {
        success: true,
        count: 0,
        message: "未払い部員のLINE連携アカウントが見つかりませんでした。",
      };
    }

    const amountStr = Number(fee.amount || 0).toLocaleString();
    const text = formatConciergeMessage(
      `【部費・集金 納入のお願い】\n「${fee.title}」のお支払いが未納となっております。\n\n・金額: ¥${amountStr}\n・支払期日: ${fee.dueDate}\n\n会計担当の負担軽減と円滑なサークル運営のため、期日までのお支払いをお願いします！\n\n▼ 納入確認はこちら\n${process.env.NEXT_PUBLIC_APP_URL || "https://solu-navi.vercel.app"}/fee/confirm?feeId=${feeId}`,
      "general"
    );

    const res = await sendLineMulticastMessage(lineUids, [{ type: "text", text }]);
    return {
      success: true,
      count: res.successCount,
      message: `${res.successCount}名の未払い部員へLINE催促通知を送信しました！`,
    };
  } catch (err: any) {
    console.error("[sendFeeRemindAction] Error:", err);
    return { success: false, count: 0, message: `催促送信に失敗しました: ${err.message}` };
  }
}

/**
 * 日次定期実行 (GAS / Cron): 期限のN日前に該当する集金の未払い者へ個人宛てLINE催促を送信
 * @param isForce 期限日判定をスキップして未締切・未払いの集金を対象にテスト送信するか
 */
export async function sendDueFeeRemindersAction(isForce: boolean = false): Promise<{
  success: boolean;
  count: number;
  feeCount: number;
  message: string;
}> {
  try {
    // 1. アプリ設定から催促有効フラグおよび対象日数Nを取得
    const settingsDoc = await adminDb.collection("settings").doc("general").get();
    const settings = (settingsDoc.exists ? settingsDoc.data() : {}) as Partial<AppSettings>;
    const enableFeeRemind = settings.enableFeeRemind ?? DEFAULT_APP_SETTINGS.enableFeeRemind ?? true;
    const feeRemindDaysBefore =
      typeof settings.feeRemindDaysBefore === "number"
        ? settings.feeRemindDaysBefore
        : DEFAULT_APP_SETTINGS.feeRemindDaysBefore ?? 3;

    if (!enableFeeRemind && !isForce) {
      return {
        success: true,
        count: 0,
        feeCount: 0,
        message: "部費・集金の未払い催促通知はアプリ設定で無効化されています。",
      };
    }

    // 2. JST 現在日および N日後のターゲット期日を計算 (YYYY-MM-DD)
    const now = new Date();
    // JST の現在年月日を取得
    const nowJstParts = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(now)
      .split("/"); // ["2026", "11", "09"]
    const todayJstStr = `${nowJstParts[0]}-${nowJstParts[1]}-${nowJstParts[2]}`;

    // N日後の年月日を取得
    const targetDateObj = new Date(now.getTime() + feeRemindDaysBefore * 24 * 60 * 60 * 1000);
    const targetJstParts = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(targetDateObj)
      .split("/");
    const targetDueDateStr = `${targetJstParts[0]}-${targetJstParts[1]}-${targetJstParts[2]}`;

    console.log(
      `[sendDueFeeRemindersAction] 実行開始: today=${todayJstStr}, targetDueDate=${targetDueDateStr} (${feeRemindDaysBefore}日前), isForce=${isForce}`
    );

    // 3. 全ての集金案件を取得
    const feesSnap = await adminDb.collection("fees").get();
    if (feesSnap.empty) {
      return {
        success: true,
        count: 0,
        feeCount: 0,
        message: "集金案件が登録されていません。",
      };
    }

    // 4. 該当する集金案件を抽出
    const targetFees: Array<Fee & { id: string }> = [];
    feesSnap.docs.forEach((doc) => {
      const data = doc.data() as Fee;
      const feeItem = { ...data, id: doc.id };
      const rawDueDate = (feeItem.dueDate || "").trim();
      if (!rawDueDate) return;

      // "YYYY.MM.DD" または "YYYY-MM-DD" を "YYYY-MM-DD" に正規化
      const normalizedDueDate = rawDueDate.replace(/\./g, "-");

      if (isForce) {
        // テスト実行時は、期日が本日以降（未締切）の集金案件を対象とする
        // （本日以降がなければ直近の全集金案件を対象）
        targetFees.push(feeItem);
      } else {
        // 通常実行: 期限のN日前に合致する集金案件のみ
        if (normalizedDueDate === targetDueDateStr) {
          targetFees.push(feeItem);
        }
      }
    });

    if (targetFees.length === 0) {
      return {
        success: true,
        count: 0,
        feeCount: 0,
        message: isForce
          ? "テスト対象となる集金案件がありませんでした。"
          : `支払期日の${feeRemindDaysBefore}日前（${targetDueDateStr}）に該当する集金案件はありません。`,
      };
    }

    // 5. ユーザー一覧を取得
    const usersSnap = await adminDb.collection("users").get();
    const userMap: Record<string, User> = {};
    usersSnap.docs.forEach((d) => {
      userMap[d.id] = { ...(d.data() as User), id: d.id, uid: d.id };
    });

    let totalSentCount = 0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://solu-navi.vercel.app";

    // 6. 各集金案件について未払いメンバーを特定し、個別プッシュ送信
    for (const fee of targetFees) {
      // 支払データ取得
      const paymentsSnap = await adminDb
        .collection("feePayments")
        .where("feeId", "==", fee.id)
        .get();

      const paidUids = new Set<string>();
      paymentsSnap.docs.forEach((d) => {
        const p = d.data();
        if (p.status === "paid" || p.status === "exempt") {
          paidUids.add(p.uid);
        }
      });

      // 集金対象者判定
      const targetUserIds =
        fee.targetUserIds && Array.isArray(fee.targetUserIds) && fee.targetUserIds.length > 0
          ? new Set(fee.targetUserIds)
          : null;

      const targetGrades =
        fee.targetGrades && Array.isArray(fee.targetGrades) && fee.targetGrades.length > 0
          ? new Set(fee.targetGrades)
          : null;

      const unpaidUids: string[] = [];

      for (const [uid, user] of Object.entries(userMap)) {
        // 特定部員指定がある場合
        if (targetUserIds && !targetUserIds.has(uid)) continue;

        // 学年指定がある場合 (getGradeFromEnrollmentYear を使用: 規約18)
        if (targetGrades) {
          const userGrade = getGradeFromEnrollmentYear(user.enrollmentYear);
          if (!targetGrades.has(userGrade)) continue;
        }

        // 支払い済みまたは免除なら除外
        if (paidUids.has(uid)) continue;

        unpaidUids.push(uid);
      }

      if (unpaidUids.length === 0) {
        console.log(`[sendDueFeeRemindersAction] fee "${fee.title}" は未払い部員がいません。`);
        continue;
      }

      // 未払い部員へ個人宛てプッシュ通知
      for (const uid of unpaidUids) {
        const lineMsgDoc = await adminDb.collection("lineMessagingIds").doc(uid).get();
        const lineUid = lineMsgDoc.data()?.lineUid;
        if (!lineUid) {
          console.warn(`[sendDueFeeRemindersAction] uid=${uid} の生 lineUid が見つかりません。`);
          continue;
        }

        const amountStr = Number(fee.amount || 0).toLocaleString();
        const messageText = formatConciergeMessage(
          `【部費・集金 納入のお願い】\n` +
            `「${fee.title}」のお支払期日は【あと${feeRemindDaysBefore}日】（${fee.dueDate}）です。⚠️\n\n` +
            `■ お支払い金額: ¥${amountStr}\n` +
            `■ お支払期日: ${fee.dueDate}\n\n` +
            `サークル運営と会計手続き円滑化のため、期日までに納入手続きをお願いいたします。🙇‍♂️\n\n` +
            `▼ 納入確認・詳細はこちら\n` +
            `${appUrl}/fee/confirm?feeId=${fee.id}`,
          "general"
        );

        await sendLinePushMessage(lineUid, [{ type: "text", text: messageText }]);
        totalSentCount++;
        console.log(`[sendDueFeeRemindersAction] 催促送信完了: fee="${fee.title}", uid=${uid}`);
      }
    }

    // 7. 監査ログ記録
    await adminDb.collection("logs").add({
      action: "cron_fee_remind",
      status: "success",
      totalSentCount,
      targetFeeCount: targetFees.length,
      feeRemindDaysBefore,
      isForce,
      createdAt: new Date(),
    });

    const resultMsg = `${targetFees.length}件の集金案件に対し、計${totalSentCount}名へ未払い催促通知を送信しました。`;
    return {
      success: true,
      count: totalSentCount,
      feeCount: targetFees.length,
      message: resultMsg,
    };
  } catch (err: any) {
    console.error("[sendDueFeeRemindersAction] Error:", err);
    try {
      await adminDb.collection("logs").add({
        action: "cron_fee_remind",
        status: "error",
        error: err.message,
        createdAt: new Date(),
      });
    } catch {
      // ログ書き込み失敗は握りつぶす
    }
    return {
      success: false,
      count: 0,
      feeCount: 0,
      message: `未払い催促バッチ処理に失敗しました: ${err.message}`,
    };
  }
}
