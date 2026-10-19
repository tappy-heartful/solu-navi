import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { toPlainObject } from "@/lib/firestore/utils";
import { Fee, FeePayment, User } from "@/lib/firestore/types";

/**
 * 部費・集金案件一覧を取得（サーバーサイド）
 */
export async function getFeesServer(): Promise<Fee[]> {
  try {
    const snap = await adminDb.collection("fees").orderBy("dueDate", "desc").get();
    return snap.docs.map(toPlainObject) as Fee[];
  } catch (err) {
    console.error("[getFeesServer] Error:", err);
    return [];
  }
}

/**
 * 特定の部費案件と、全部員の支払状況を取得（サーバーサイド）
 */
export async function getFeeDetailServer(feeId: string): Promise<{
  fee: Fee | null;
  payments: FeePayment[];
  users: User[];
}> {
  try {
    const [feeDoc, paymentsSnap, usersSnap] = await Promise.all([
      adminDb.collection("fees").doc(feeId).get(),
      adminDb.collection("feePayments").where("feeId", "==", feeId).get(),
      adminDb.collection("users").orderBy("enrollmentYear", "desc").get(),
    ]);

    if (!feeDoc.exists) {
      return { fee: null, payments: [], users: [] };
    }

    const fee = toPlainObject(feeDoc) as Fee;
    const payments = paymentsSnap.docs.map(toPlainObject) as FeePayment[];
    const users = usersSnap.docs.map(toPlainObject) as User[];

    return { fee, payments, users };
  } catch (err) {
    console.error("[getFeeDetailServer] Error:", err);
    return { fee: null, payments: [], users: [] };
  }
}

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
    const fee = toPlainObject(feeDoc) as Fee;

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

    // 未払いの部員を特定
    const unpaidUids: string[] = [];
    usersSnap.docs.forEach((d) => {
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

    const { sendLineMulticastMessage } = await import("@/lib/line");
    const amountStr = fee.amount.toLocaleString();
    const text = `【部費・集金 納入のお願い】\n「${fee.title}」のお支払いが未納となっております。\n\n・金額: ¥${amountStr}\n・支払期日: ${fee.dueDate}\n\n会計担当の負担軽減と円滑なサークル運営のため、期日までのお支払いをお願いします！\n\n▼ 納入確認・詳細はこちら\n${process.env.NEXT_PUBLIC_APP_URL || "https://solu-navi.web.app"}/fee/confirm?feeId=${feeId}`;

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
