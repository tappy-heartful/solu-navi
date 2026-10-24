import {
  getMediaServer,
  getPastMonthEventsServer,
  getScoresForSelectServer,
} from "@/features/media/api/media-server-actions";
import { MediaEditClient } from "@/features/media/views/edit/MediaEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mode?: string; mediaId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const mediaId = resolvedParams.mediaId;
  const mode = resolvedParams.mode;

  if (!mode || mode === "new" || !mediaId) {
    return { title: "メディア新規登録" };
  }

  const mediaData = await getMediaServer(mediaId);
  return {
    title: mediaData?.title ? `${mediaData.title} - メディア編集` : "メディア編集",
  };
}

export const dynamic = "force-dynamic";

export default async function MediaEditPage({ searchParams }: Props) {
  const { mode, mediaId } = await searchParams;

  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  const [initialMedia, events, scores] = await Promise.all([
    mediaId ? getMediaServer(mediaId) : Promise.resolve(null),
    getPastMonthEventsServer(),
    getScoresForSelectServer(),
  ]);

  if ((mode === "edit" || mode === "copy") && !initialMedia) {
    notFound();
  }

  return (
    <MediaEditClient
      mode={mode as "new" | "edit" | "copy"}
      mediaId={mediaId}
      initialMedia={initialMedia}
      events={events}
      scores={scores}
    />
  );
}
