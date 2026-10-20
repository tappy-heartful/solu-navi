import { getMediasServer } from "@/features/media/api/media-server-actions";
import { MediaListClient } from "@/features/media/views/list/MediaListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "メディア・音源一覧",
};

export const dynamic = "force-dynamic";

export default async function MediaListPage() {
  const medias = await getMediasServer();
  return <MediaListClient initialData={{ medias }} />;
}
