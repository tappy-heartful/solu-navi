import { notFound } from "next/navigation";
import { fetchVote, fetchVoteAnswersByVoteId } from "@/features/vote/api/vote-server-actions";
import { VoteConfirmClient } from "@/features/vote/views/confirm/VoteConfirmClient";
import { adminDb as db } from "@/lib/firebase-admin";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ voteId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { voteId } = await searchParams;
  if (!voteId) return { title: "曲投票詳細 | Solu Navi" };

  const vote = await fetchVote(voteId);
  return {
    title: vote?.name ? `${vote.name} - 曲投票詳細 | Solu Navi` : "曲投票詳細 | Solu Navi",
  };
}

export default async function VoteConfirmPage({ searchParams }: Props) {
  const { voteId } = await searchParams;
  if (!voteId) notFound();

  const [vote, voteAnswers, usersSnap] = await Promise.all([
    fetchVote(voteId),
    fetchVoteAnswersByVoteId(voteId),
    db.collection("users").get(),
  ]);

  if (!vote) notFound();

  const usersMap: Record<string, { name: string; pictureUrl: string }> = {};
  usersSnap.docs.forEach((doc) => {
    const data = doc.data();
    usersMap[doc.id] = {
      name: data.displayName || "名無し",
      pictureUrl: data.pictureUrl || "",
    };
  });

  return (
    <VoteConfirmClient
      voteData={vote}
      voteId={voteId}
      voteAnswers={voteAnswers}
      usersMap={usersMap}
    />
  );
}
