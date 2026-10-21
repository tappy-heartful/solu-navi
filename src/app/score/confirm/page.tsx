import { getScoreServer, getGenresServer } from "@/features/score/api/score-server-actions";
import { getSectionsServer, getInstrumentsServer } from "@/features/user/api/user-server-actions";
import { ScoreConfirmClient } from "@/features/score/views/confirm/ScoreConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Genre, Score, SectionDoc, InstrumentDoc } from "@/lib/firestore/types";

type Props = {
  searchParams: Promise<{ scoreId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const scoreId = resolvedParams.scoreId;

  if (!scoreId) return { title: "譜面確認" };

  const scoreData = (await getScoreServer(scoreId)) as Score | null;

  return {
    title: scoreData?.title ? `${scoreData.title} - 譜面確認` : "譜面確認",
  };
}

export const dynamic = "force-dynamic";

export default async function ScoreConfirmPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const scoreId = resolvedParams.scoreId;

  if (!scoreId) notFound();

  const [scoreData, allGenres, sectionsData, instrumentsData] = await Promise.all([
    getScoreServer(scoreId) as Promise<Score | null>,
    getGenresServer() as Promise<Genre[]>,
    getSectionsServer(),
    getInstrumentsServer(),
  ]);

  const allSections = sectionsData as SectionDoc[];
  const allInstruments = instrumentsData as InstrumentDoc[];

  if (!scoreData) notFound();

  return (
    <ScoreConfirmClient
      scoreData={scoreData}
      allGenres={allGenres}
      allSections={allSections}
      allInstruments={allInstruments}
      scoreId={scoreId}
    />
  );
}
