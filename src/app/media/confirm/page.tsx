import { getMediaServer, getMediaConfirmDataServer } from "@/features/media/api/media-server-actions";
import { MediaConfirmClient } from "@/features/media/views/confirm/MediaConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mediaId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const mediaId = resolvedParams.mediaId;

  if (!mediaId) return { title: "メディア確認" };

  const mediaData = await getMediaServer(mediaId);
  return {
    title: mediaData?.title ? `${mediaData.title} - メディア確認` : "メディア確認",
  };
}

export const dynamic = "force-dynamic";

export default async function MediaConfirmPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const mediaId = resolvedParams.mediaId;

  if (!mediaId) notFound();

  const confirmData = await getMediaConfirmDataServer(mediaId);
  if (!confirmData) notFound();

  return (
    <MediaConfirmClient
      mediaData={confirmData.media}
      mediaId={mediaId}
      linkedEvent={confirmData.linkedEvent}
      linkedScore={confirmData.linkedScore}
    />
  );
}
