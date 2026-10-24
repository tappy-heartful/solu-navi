import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { toPlainObject } from "@/lib/firestore/utils";
import { BlueNote } from "@/lib/firestore/types";

export async function getBlueNotesServer(): Promise<BlueNote[]> {
  const snap = await adminDb.collection("blueNotes").orderBy("__name__", "asc").get();
  return snap.docs.map(toPlainObject) as BlueNote[];
}
