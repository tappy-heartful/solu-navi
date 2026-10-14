import { HomeClient } from "@/features/home/views/HomeClient";
import { getHomeAnnouncementsServer } from "@/features/home/api/home-server-actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ホーム | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solition Orchestra 活動ポータル",
};

export default async function HomePage() {
  const announcements = await getHomeAnnouncementsServer();
  return <HomeClient initialAnnouncements={announcements} />;
}

