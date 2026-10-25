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


