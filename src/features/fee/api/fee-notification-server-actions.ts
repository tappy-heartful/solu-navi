"use server";

import { adminDb } from "@/lib/firebase-admin";
import { sendLineMulticastMessage } from "@/lib/line";

/**
 * 部費未払い者へのLINE催促通知送信
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
    const text = `【部費・集金 納入のお願い】\n「${fee.title}」のお支払いが未納となっております。\n\n・金額: ¥${amountStr}\n・支払期日: ${fee.dueDate}\n\n会計担当の負担軽減と円滑なサークル運営のため、期日までのお支払いをお願いします！\n\n▼ 納入確認はこちら\n${process.env.NEXT_PUBLIC_APP_URL || "https://solu-navi.web.app"}/fee/confirm?feeId=${feeId}`;

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
