import { notFound } from "next/navigation";
import { fetchVote } from "@/features/vote/api/vote-server-actions";
import { VoteAnswerClient } from "@/features/vote/views/answer/VoteAnswerClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ voteId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { voteId } = await searchParams;
  if (!voteId) return { title: "曲投票 | Solu Navi" };

  const vote = await fetchVote(voteId);
  return {
    title: vote?.name ? `${vote.name} - 曲投票 | Solu Navi` : "曲投票 | Solu Navi",
  };
}

export default async function VoteAnswerPage({ searchParams }: Props) {
  const { voteId } = await searchParams;
  if (!voteId) notFound();

  const vote = await fetchVote(voteId);
  if (!vote) notFound();

  return <VoteAnswerClient vote={vote} voteId={voteId} />;
}
