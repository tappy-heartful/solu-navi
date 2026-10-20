import { getScoreServer, getGenresServer } from "@/features/score/api/score-server-actions";
import { getSectionsServer, getInstrumentsServer } from "@/features/user/api/user-server-actions";
import { ScoreEditClient } from "@/features/score/views/edit/ScoreEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Genre, SectionDoc, InstrumentDoc } from "@/lib/firestore/types";

type Props = {
  searchParams: Promise<{ mode?: string; scoreId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const scoreId = resolvedParams.scoreId;
  const mode = resolvedParams.mode;

  if (!mode || mode === "new" || !scoreId) {
    return { title: "譜面新規登録" };
  }

  const scoreData = await getScoreServer(scoreId);
  return {
    title: scoreData?.title ? `${scoreData.title} - 譜面編集` : "譜面編集",
  };
}

export const dynamic = "force-dynamic";

export default async function ScoreEditPage({ searchParams }: Props) {
  const { mode, scoreId } = await searchParams;

  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  const [initialScore, allGenresData, sectionsData, instrumentsData] = await Promise.all([
    scoreId ? getScoreServer(scoreId) : null,
    getGenresServer(),
    getSectionsServer(),
    getInstrumentsServer(),
  ]);

  const allGenres = allGenresData as Genre[];
  const allSections = sectionsData as SectionDoc[];
  const allInstruments = instrumentsData as InstrumentDoc[];

  if ((mode === "edit" || mode === "copy") && !initialScore) {
    notFound();
  }

  return (
    <ScoreEditClient
      mode={mode as "new" | "edit" | "copy"}
      scoreId={scoreId}
      initialScore={initialScore}
      allGenres={allGenres}
      allSections={allSections}
      allInstruments={allInstruments}
    />
  );
}
