import { getCallServer, getCallConfirmDataServer } from "@/features/call/api/call-server-actions";
import { CallConfirmClient } from "@/features/call/views/confirm/CallConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ callId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { callId } = await searchParams;
  if (!callId) return { title: "曲募集詳細 | Solu Navi" };

  const callData = await getCallServer(callId);
  return {
    title: callData?.title ? `${callData.title} - 曲募集詳細 | Solu Navi` : "曲募集詳細 | Solu Navi",
  };
}

export const dynamic = "force-dynamic";

export default async function CallConfirmPage({ searchParams }: Props) {
  const { callId } = await searchParams;

  if (!callId) notFound();

  const [callData, confirmData] = await Promise.all([
    getCallServer(callId),
    getCallConfirmDataServer(callId),
  ]);

  if (!callData) notFound();

  return (
    <CallConfirmClient
      callData={callData}
      callId={callId}
      callAnswers={confirmData.callAnswers}
      usersMap={confirmData.usersMap}
      scoreStatusMap={confirmData.scoreStatusMap}
    />
  );
}
