import { db, storage } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export type MediaFormData = {
  date: string;
  title: string;
  instagramUrl: string;
  youtubeUrl: string;
  driveUrl: string;
  isDispTop: boolean;
};

/**
 * 練習録音などの音声/動画ファイルをFirebase Storageにアップロード
 */
export async function uploadMediaFile(file: File, mediaIdPrefix?: string): Promise<string> {
  const timestamp = Date.now();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `medias/${mediaIdPrefix || "media"}_${timestamp}_${cleanFileName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || "audio/mpeg" });
  return await getDownloadURL(storageRef);
}

/**
 * メディアデータの保存（新規・更新・コピー）
 */
export const saveMedia = async (
  mode: "new" | "edit" | "copy",
  data: MediaFormData,
  mediaId?: string
): Promise<string> => {
  const payload = {
    ...data,
    date: data.date.replace(/-/g, "."),
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && mediaId) {
    const mediaRef = doc(db, "medias", mediaId);
    await updateDoc(mediaRef, payload);
    return mediaId;
  } else {
    const docRef = await addDoc(collection(db, "medias"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }
};
