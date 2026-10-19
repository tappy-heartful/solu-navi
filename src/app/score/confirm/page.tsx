import { getScoreServer, getGenresServer } from "@/features/score/api/score-server-actions";
import { ScoreConfirmClient } from "@/features/score/views/confirm/ScoreConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Genre, Score } from "@/lib/firestore/types";

type Props = {
  searchParams: Promise<{ scoreId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const scoreId = resolvedParams.scoreId;

  if (!scoreId) return { title: "譜面詳細" };

  const scoreData = (await getScoreServer(scoreId)) as Score | null;

  return {
    title: scoreData?.title ? `${scoreData.title} - 譜面詳細` : "譜面詳細",
  };
}

export const dynamic = "force-dynamic";

export default async function ScoreConfirmPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const scoreId = resolvedParams.scoreId;

  if (!scoreId) notFound();

  const [scoreData, allGenres] = await Promise.all([
    getScoreServer(scoreId) as Promise<Score | null>,
    getGenresServer() as Promise<Genre[]>,
  ]);

  if (!scoreData) notFound();

  return (
    <ScoreConfirmClient
      scoreData={scoreData}
      allGenres={allGenres}
      scoreId={scoreId}
    />
  );
}
