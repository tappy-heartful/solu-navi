import { getCallsServer, getCallAnswerIdsServer } from "@/features/call/api/call-server-actions";
import { CallListClient } from "@/features/call/views/list/CallListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "曲募集一覧 | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solition Orchestra 曲募集一覧",
};

export const dynamic = "force-dynamic";

export default async function CallListPage() {
  const [calls, callAnswerIds] = await Promise.all([
    getCallsServer(),
    getCallAnswerIdsServer(),
  ]);

  return <CallListClient initialData={{ calls, callAnswerIds }} />;
}
