import { getBlueNotesServer } from "@/features/blue-note/api/blue-note-server-actions";
import { BlueNoteClient } from "@/features/blue-note/views/BlueNoteClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "今日の一曲 | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solution Orchestra 今日の一曲",
};

export const dynamic = "force-dynamic";

export default async function BlueNotePage() {
  const blueNotes = await getBlueNotesServer();
  return <BlueNoteClient initialBlueNotes={blueNotes} />;
}
