import { db } from "@/lib/firebase";
import { Vote } from "@/lib/firestore/types";
import { collection, doc, setDoc, updateDoc, getDocs, serverTimestamp } from "firebase/firestore";
import { archiveAndDeleteDoc } from "@/lib/functions";

export async function addVote(voteData: Omit<Vote, "id">): Promise<string> {
  const voteRef = doc(collection(db, "votes"));
  await setDoc(voteRef, {
    ...voteData,
    createdAt: serverTimestamp(),
  });
  return voteRef.id;
}

export async function updateVote(voteId: string, updates: Partial<Vote>): Promise<void> {
  const voteRef = doc(db, "votes", voteId);
  await updateDoc(voteRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteVoteWithAnswers(voteId: string): Promise<void> {
  await archiveAndDeleteDoc("votes", voteId);

  const answersRef = collection(db, "voteAnswers");
  const snap = await getDocs(answersRef);

  for (const answerDoc of snap.docs) {
    if (answerDoc.id.startsWith(`${voteId}_`)) {
      await archiveAndDeleteDoc("voteAnswers", answerDoc.id);
    }
  }
}

export async function submitVoteAnswer(
  voteId: string,
  uid: string,
  answers: Record<string, string | string[] | null>,
  displayName?: string
): Promise<void> {
  const answerId = `${voteId}_${uid}`;
  const answerRef = doc(db, "voteAnswers", answerId);
  await setDoc(
    answerRef,
    {
      voteId,
      uid,
      displayName: displayName || "",
      answers,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deleteMyVoteAnswer(voteId: string, uid: string): Promise<void> {
  const answerId = `${voteId}_${uid}`;
  await archiveAndDeleteDoc("voteAnswers", answerId);
}
