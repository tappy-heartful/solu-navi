import { notFound } from "next/navigation";
import { fetchVote } from "@/features/vote/api/vote-server-actions";
import { VoteLinkEditClient } from "@/features/vote/views/link-edit/VoteLinkEditClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ voteId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { voteId } = await searchParams;
  if (!voteId) return { title: "投票リンク設定 | Solu Navi" };

  const vote = await fetchVote(voteId);
  return {
    title: vote?.name ? `${vote.name} - 投票リンク設定 | Solu Navi` : "投票リンク設定 | Solu Navi",
  };
}

export default async function VoteLinkEditPage({ searchParams }: Props) {
  const { voteId } = await searchParams;
  if (!voteId) notFound();

  const vote = await fetchVote(voteId);
  if (!vote) notFound();

  return <VoteLinkEditClient vote={vote} voteId={voteId} />;
}
