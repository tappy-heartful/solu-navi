import { Metadata } from "next";
import { SettingsEditClient } from "@/features/settings/views/SettingsEditClient";
import {
  getAppSettingsServer,
  getSectionsForConfigServer,
} from "@/features/settings/api/settings-server-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "アプリ設定 | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solution Orchestra アプリ設定・LINE設定・表示日数管理",
};

export default async function SettingsPage() {
  const [settings, sections] = await Promise.all([
    getAppSettingsServer(),
    getSectionsForConfigServer(),
  ]);

  return <SettingsEditClient initialSettings={settings} sections={sections} />;
}
