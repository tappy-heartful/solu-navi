import { notFound } from "next/navigation";
import { fetchVote } from "@/features/vote/api/vote-server-actions";
import { VoteEditClient } from "@/features/vote/views/edit/VoteEditClient";
import { adminDb as db } from "@/lib/firebase-admin";
import { toPlainObject } from "@/lib/firestore/utils";
import { Vote, Call, CallAnswerSong } from "@/lib/firestore/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ mode?: string; voteId?: string; callId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { mode = "new", voteId } = await searchParams;
  if (mode === "new" || !voteId) {
    return { title: "曲投票新規作成 | Solu Navi" };
  }

  const vote = await fetchVote(voteId);
  return {
    title: vote?.name ? `${vote.name} - 曲投票編集 | Solu Navi` : "曲投票編集 | Solu Navi",
  };
}

export default async function VoteEditPage({ searchParams }: Props) {
  const { mode = "new", voteId, callId } = await searchParams;

  let initialData: Vote | null = null;
  let callData: Call | null = null;
  let callAnswers: Array<Record<string, CallAnswerSong[]>> = [];

  if ((mode === "edit" || mode === "copy") && voteId) {
    initialData = await fetchVote(voteId);
    if (!initialData) notFound();
  }

  if (mode === "createFromCall" && callId) {
    const callSnap = await db.collection("calls").doc(callId).get();
    if (callSnap.exists) {
      callData = toPlainObject(callSnap) as Call;
      const answersSnap = await db.collection("callAnswers").get();
      callAnswers = answersSnap.docs
        .filter((doc) => doc.id.startsWith(callId + "_"))
        .map((doc) => (doc.data().answers || {}) as Record<string, CallAnswerSong[]>);
    } else {
      notFound();
    }
  }

  return (
    <VoteEditClient
      mode={mode as "new" | "edit" | "copy" | "createFromCall"}
      voteId={voteId}
      initialVote={initialData}
      callData={callData}
      callAnswers={callAnswers}
    />
  );
}
