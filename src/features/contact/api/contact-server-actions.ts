"use server";

import { adminDb } from "@/lib/firebase-admin";
import { toPlainObject } from "@/lib/firestore/utils";
import { Contact, ContactMessage } from "@/lib/firestore/types";

/**
 * お問い合わせ一覧を取得 (サーバーサイド)
 * @param userUid 閲覧者のUID
 * @param isSystemAdmin システム管理者フラグ (true の場合は全件取得)
 */
export async function getContactsServer(
  userUid?: string,
  isSystemAdmin: boolean = false
): Promise<Contact[]> {
  try {
    let query: FirebaseFirestore.Query = adminDb.collection("contacts");

    if (!isSystemAdmin) {
      if (!userUid) return [];
      query = query.where("uid", "==", userUid);
    }

    // 最新更新順
    query = query.orderBy("updatedAt", "desc");

    const snap = await query.get();
    if (snap.empty) return [];

    return snap.docs.map((doc) => {
      const data = toPlainObject(doc) as Contact;
      return {
        ...data,
        id: doc.id,
      };
    });
  } catch (err) {
    console.error("[getContactsServer] Error:", err);
    return [];
  }
}

/**
 * お問い合わせ詳細および初期メッセージ一覧を取得 (サーバーサイド)
 */
export async function getContactDetailServer(contactId: string): Promise<{
  contact: Contact | null;
  messages: ContactMessage[];
}> {
  try {
    const contactDoc = await adminDb.collection("contacts").doc(contactId).get();
    if (!contactDoc.exists) {
      return { contact: null, messages: [] };
    }

    const contact = {
      ...(toPlainObject(contactDoc) as Contact),
      id: contactDoc.id,
    };

    // messages サブコレクションからメッセージを取得 (作成日時順)
    const messagesSnap = await adminDb
      .collection("contacts")
      .doc(contactId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    const messages = messagesSnap.docs.map((d) => ({
      ...(toPlainObject(d) as ContactMessage),
      id: d.id,
      contactId,
    }));

    return { contact, messages };
  } catch (err) {
    console.error("[getContactDetailServer] Error:", err);
    return { contact: null, messages: [] };
  }
}

