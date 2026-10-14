import { getCallServer, getScoreStatusesServer } from "@/features/call/api/call-server-actions";
import { CallAnswerClient } from "@/features/call/views/answer/CallAnswerClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ callId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { callId } = await searchParams;
  if (!callId) return { title: "選曲応募 | Solu Navi" };

  const callData = await getCallServer(callId);
  return {
    title: callData?.title ? `${callData.title} - 選曲応募 | Solu Navi` : "選曲応募 | Solu Navi",
  };
}

export const dynamic = "force-dynamic";

export default async function CallAnswerPage({ searchParams }: Props) {
  const { callId } = await searchParams;

  if (!callId) notFound();

  const [callData, scoreStatuses] = await Promise.all([
    getCallServer(callId),
    getScoreStatusesServer(),
  ]);

  if (!callData) notFound();

  return (
    <CallAnswerClient
      callData={callData}
      callId={callId}
      scoreStatuses={scoreStatuses}
    />
  );
}
