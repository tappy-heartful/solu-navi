import {
  getScoresServer,
  getGenresServer,
  getUpcomingEventsWithSetlistServer,
} from "@/features/score/api/score-server-actions";
import { ScoreListClient } from "@/features/score/views/list/ScoreListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "譜面一覧",
};

export const revalidate = 300;

export default async function ScoreListPage() {
  const [scores, genres, events] = await Promise.all([
    getScoresServer(),
    getGenresServer(),
    getUpcomingEventsWithSetlistServer(),
  ]);

  return <ScoreListClient initialData={{ scores, genres, events }} />;
}
