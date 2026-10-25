import { HomeClient } from "@/features/home/views/HomeClient";
import { getHomeAnnouncementsServer } from "@/features/home/api/home-server-actions";
import { getEventsServer } from "@/features/event/api/event-server-actions";
import { getFeesServer } from "@/features/fee/api/fee-server-actions";
import { getScoresServer } from "@/features/score/api/score-server-actions";
import { getBlueNotesServer } from "@/features/blue-note/api/blue-note-server-actions";
import { getMediasServer } from "@/features/media/api/media-server-actions";
import { getAppSettingsServer } from "@/features/settings/api/settings-server-actions";
import { adminDb } from "@/lib/firebase-admin";
import { toPlainObject } from "@/lib/firestore/utils";
import { Vote, Call, Score, BlueNote, Media } from "@/lib/firestore/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ホーム | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solution Orchestra 活動ポータル",
};

export default async function HomePage() {
  const [announcements, events, fees, scores, blueNotes, medias, votesSnap, callsSnap, settings] = await Promise.all([
    getHomeAnnouncementsServer(),
    getEventsServer(),
    getFeesServer(),
    getScoresServer(),
    getBlueNotesServer(),
    getMediasServer(20),
    adminDb.collection("votes").orderBy("acceptStartDate", "desc").limit(20).get(),
    adminDb.collection("calls").orderBy("acceptStartDate", "desc").limit(20).get(),
    getAppSettingsServer(),
  ]);

  const votes = votesSnap.docs.map(toPlainObject) as Vote[];
  const calls = callsSnap.docs.map(toPlainObject) as Call[];

  return (
    <HomeClient
      initialAnnouncements={announcements}
      events={events}
      fees={fees}
      scores={scores}
      blueNotes={blueNotes}
      medias={medias}
      votes={votes}
      calls={calls}
      settings={settings}
    />
  );
}
