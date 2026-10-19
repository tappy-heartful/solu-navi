import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Fee } from "@/lib/firestore/types";

export type FeeFormData = {
  title: string;
  amount: number;
  dueDate: string;
  description: string;
};

/**
 * 部費案件の保存（新規登録・編集）
 */
export const saveFee = async (
  mode: "new" | "edit" | "copy",
  data: FeeFormData,
  feeId?: string,
  userDisplayName?: string
): Promise<string> => {
  const payload = {
    ...data,
    amount: Number(data.amount) || 0,
    dueDate: data.dueDate.replace(/-/g, "."),
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && feeId) {
    const feeRef = doc(db, "fees", feeId);
    await updateDoc(feeRef, payload);
    return feeId;
  } else {
    const docRef = await addDoc(collection(db, "fees"), {
      ...payload,
      createdAt: serverTimestamp(),
      createdBy: userDisplayName || "Unknown",
    });
    return docRef.id;
  }
};

/**
 * 部員の支払ステータスを更新（管理者/会計担当者用）
 */
export async function updateFeePaymentStatus(
  feeId: string,
  uid: string,
  status: "unpaid" | "paid" | "exempt",
  paidMethod: "paypay" | "cash" | "bank" | "other" = "paypay",
  note: string = ""
) {
  const paymentId = `${feeId}_${uid}`;
  const paymentRef = doc(db, "feePayments", paymentId);

  await setDoc(
    paymentRef,
    {
      feeId,
      uid,
      status,
      paidMethod: status === "paid" ? paidMethod : null,
      paidAt: status === "paid" ? Date.now() : null,
      note,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
