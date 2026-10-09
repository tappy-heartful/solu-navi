import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { UserDoc } from "./types";
import { toPlainObject } from "./utils";

/**
 * ユーザー情報の取得
 */
export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return toPlainObject<UserDoc>({ ...snap.data(), uid: snap.id });
  } catch (err) {
    console.error("getUserDoc error:", err);
    return null;
  }
}

/**
 * ユーザー情報の新規作成または更新
 */
export async function saveUserDoc(uid: string, data: Partial<UserDoc>): Promise<void> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const now = serverTimestamp();

  if (snap.exists()) {
    await updateDoc(ref, {
      ...data,
      updatedAt: now,
    });
  } else {
    await setDoc(ref, {
      ...data,
      uid,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * 全ユーザー一覧の取得
 */
export async function getAllUsers(): Promise<UserDoc[]> {
  try {
    const ref = collection(db, "users");
    const q = query(ref, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => toPlainObject<UserDoc>({ ...d.data(), uid: d.id }));
  } catch (err) {
    console.error("getAllUsers error:", err);
    // フォールバック（ソート無し）
    try {
      const snap = await getDocs(collection(db, "users"));
      return snap.docs.map((d) => toPlainObject<UserDoc>({ ...d.data(), uid: d.id }));
    } catch (e) {
      console.error("getAllUsers fallback error:", e);
      return [];
    }
  }
}
