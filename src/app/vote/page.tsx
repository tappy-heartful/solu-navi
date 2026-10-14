import { fetchVotes, fetchVoteAnswersMap } from "@/features/vote/api/vote-server-actions";
import { VoteListClient } from "@/features/vote/views/list/VoteListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "曲投票一覧 | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solition Orchestra 曲投票一覧",
};

export const dynamic = "force-dynamic";

export default async function VoteListPage() {
  const [votes, participantCountMap] = await Promise.all([
    fetchVotes(),
    fetchVoteAnswersMap(),
  ]);

  return <VoteListClient votes={votes} participantCountMap={participantCountMap} />;
}
