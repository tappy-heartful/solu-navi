import { fetchEvents } from "@/features/event/api/event-server-actions";
import { EventListClient } from "@/features/event/views/list/EventListClient";
import { adminDb } from "@/lib/firebase-admin";
import { getMunicipalityNamesMapServer } from "@/features/user/api/user-server-actions";

export const metadata = { title: "イベント一覧" };
// 1分間キャッシュしてアクセス集中時の多重フェッチを抑止
export const revalidate = 60;

export default async function EventListPage() {
  const events = await fetchEvents();

  const prefectureIds = Array.from(
    new Set(events.map((e) => e.prefectureId).filter((id): id is string => !!id))
  );
  const municipalityIds = Array.from(
    new Set(events.map((e) => e.municipalityId).filter((id): id is string => !!id))
  );

  const prefNamesMap: Record<string, string> = {};
  if (prefectureIds.length > 0) {
    try {
      const prefSnap = await adminDb.collection("prefectures").get();
      prefSnap.forEach((doc) => {
        prefNamesMap[doc.id] = doc.data().name || "";
      });
    } catch (err) {
      console.error("Failed to fetch prefectures in event list:", err);
    }
  }

  const munNamesMap = await getMunicipalityNamesMapServer(municipalityIds);

  return (
    <EventListClient
      events={events}
      prefNamesMap={prefNamesMap}
      munNamesMap={munNamesMap}
    />
  );
}
