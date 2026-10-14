import { doc, getDoc, updateDoc, setDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserDoc } from "@/lib/firestore/types";
import { toPlainObject } from "@/lib/firestore/utils";

/**
 * ユーザー一覧取得
 */
export async function fetchUsers(): Promise<UserDoc[]> {
  try {
    const ref = collection(db, "users");
    const snap = await getDocs(ref);
    const users = snap.docs.map((d) => toPlainObject<UserDoc>({ ...d.data(), uid: d.id }));
    // パート順 -> 氏名順でソート
    return users.sort((a, b) => {
      const secA = a.sectionId || "99";
      const secB = b.sectionId || "99";
      if (secA !== secB) return secA.localeCompare(secB);
      return (a.displayName || "").localeCompare(b.displayName || "");
    });
  } catch (err) {
    console.error("fetchUsers error:", err);
    return [];
  }
}

/**
 * 特定ユーザーの取得
 */
export async function fetchUserById(uid: string): Promise<UserDoc | null> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return toPlainObject<UserDoc>({ ...snap.data(), uid: snap.id });
  } catch (err) {
    console.error("fetchUserById error:", err);
    return null;
  }
}

/**
 * プロフィール更新
 */
export async function updateUserProfile(uid: string, data: Partial<UserDoc>): Promise<void> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const now = Date.now();

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
