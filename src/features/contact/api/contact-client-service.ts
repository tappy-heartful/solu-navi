import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  Contact,
  ContactMessage,
  ContactCategory,
  ContactFeature,
  ContactStatus,
} from "@/lib/firestore/types";

/**
 * 新規お問い合わせを作成
 * 1. contacts コレクションに親ドキュメントを作成
 * 2. messages サブコレクションに初回の内容をメッセージとして登録
 */
export async function createContact(params: {
  uid: string;
  userName: string;
  userAvatar?: string;
  category: ContactCategory;
  feature: ContactFeature;
  title: string;
  deviceInfo?: string;
  content: string;
}): Promise<string> {
  const contactsCol = collection(db, "contacts");
  const contactDocRef = doc(contactsCol);
  const contactId = contactDocRef.id;

  const now = Date.now();

  const newContact: Contact = {
    id: contactId,
    uid: params.uid,
    userName: params.userName,
    userAvatar: params.userAvatar || "",
    category: params.category,
    feature: params.feature,
    title: params.title.trim(),
    deviceInfo: params.deviceInfo || "",
    status: "open",
    latestMessage: params.content.trim(),
    latestMessageAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(contactDocRef, newContact);

  // 1件目のメッセージを messages サブコレクションへ追加
  const messagesCol = collection(db, "contacts", contactId, "messages");
  const messageDocRef = doc(messagesCol);
  const initialMessage: ContactMessage = {
    id: messageDocRef.id,
    contactId,
    senderUid: params.uid,
    senderName: params.userName,
    senderAvatar: params.userAvatar || "",
    isAdmin: false,
    text: params.content.trim(),
    createdAt: now,
  };

  await setDoc(messageDocRef, initialMessage);

  return contactId;
}

/**
 * チャットメッセージを送信
 */
export async function sendContactMessage(params: {
  contactId: string;
  senderUid: string;
  senderName: string;
  senderAvatar?: string;
  isAdmin: boolean;
  text: string;
}): Promise<string> {
  const now = Date.now();
  const messagesCol = collection(db, "contacts", params.contactId, "messages");
  const msgDocRef = doc(messagesCol);

  const newMsg: ContactMessage = {
    id: msgDocRef.id,
    contactId: params.contactId,
    senderUid: params.senderUid,
    senderName: params.senderName,
    senderAvatar: params.senderAvatar || "",
    isAdmin: params.isAdmin,
    text: params.text.trim(),
    createdAt: now,
  };

  await setDoc(msgDocRef, newMsg);

  // 親ドキュメントの最新メッセージと更新日時を更新
  const contactDocRef = doc(db, "contacts", params.contactId);
  await updateDoc(contactDocRef, {
    latestMessage: params.text.trim(),
    latestMessageAt: now,
    updatedAt: now,
  });

  return msgDocRef.id;
}

/**
 * お問い合わせステータスを更新 (open / in_progress / resolved)
 */
export async function updateContactStatus(
  contactId: string,
  status: ContactStatus
): Promise<void> {
  const contactDocRef = doc(db, "contacts", contactId);
  await updateDoc(contactDocRef, {
    status,
    updatedAt: Date.now(),
  });
}

/**
 * お問い合わせのメッセージ一覧をリアルタイム購読 (onSnapshot)
 */
export function subscribeContactMessages(
  contactId: string,
  onUpdate: (messages: ContactMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  const messagesCol = collection(db, "contacts", contactId, "messages");
  const q = query(messagesCol, orderBy("createdAt", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ContactMessage[] = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as ContactMessage),
        id: docSnap.id,
        contactId,
      }));
      onUpdate(messages);
    },
    (err) => {
      console.error("[subscribeContactMessages] Error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * お問い合わせ親ドキュメントをリアルタイム購読 (ステータス変更の即時反映)
 */
export function subscribeContact(
  contactId: string,
  onUpdate: (contact: Contact | null) => void
): () => void {
  const contactDocRef = doc(db, "contacts", contactId);
  return onSnapshot(contactDocRef, (snap) => {
    if (!snap.exists()) {
      onUpdate(null);
      return;
    }
    onUpdate({
      ...(snap.data() as Contact),
      id: snap.id,
    });
  });
}

