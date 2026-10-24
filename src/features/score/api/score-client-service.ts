import { db, storage } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { InstrumentPart } from "@/lib/firestore/types";

export type ScoreFormData = {
  title: string;
  storageLocation?: string;
  scoreUrl?: string;
  mediaId?: string;
  referenceTrack?: string;
  genres: string[];
  instrumentConfig?: Record<string, InstrumentPart[]>;
  abbreviation: string;
  note: string;
  isDispTop: boolean;
};

/**
 * 譜面PDFをFirebase Storageにアップロード
 */
export async function uploadScorePdf(file: File, scoreIdPrefix?: string): Promise<string> {
  const timestamp = Date.now();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `scores/${scoreIdPrefix || "new"}_${timestamp}_${cleanFileName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type || "application/pdf" });
  return await getDownloadURL(storageRef);
}

/**
 * 譜面データの保存（新規・更新・コピー）
 */
export const saveScore = async (
  mode: "new" | "edit" | "copy",
  data: ScoreFormData,
  scoreId?: string,
  userDisplayName?: string
) => {
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (mode === "edit" && scoreId) {
    const scoreRef = doc(db, "scores", scoreId);
    await updateDoc(scoreRef, payload);
    return scoreId;
  } else {
    const docRef = await addDoc(collection(db, "scores"), {
      ...payload,
      createdAt: serverTimestamp(),
      createdBy: userDisplayName || "Unknown",
    });
    return docRef.id;
  }
};
