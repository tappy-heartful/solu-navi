import { getFeeDetailServer } from "@/features/fee/api/fee-server-actions";
import { FeeConfirmClient } from "@/features/fee/views/confirm/FeeConfirmClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ feeId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const feeId = resolvedParams.feeId;

  if (!feeId) return { title: "部費確認" };

  const data = await getFeeDetailServer(feeId);
  return {
    title: data.fee?.title ? `${data.fee.title} - 部費確認` : "部費確認",
  };
}

export const dynamic = "force-dynamic";

export default async function FeeConfirmPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const feeId = resolvedParams.feeId;

  if (!feeId) notFound();

  const data = await getFeeDetailServer(feeId);
  if (!data.fee) notFound();

  return (
    <FeeConfirmClient
      fee={data.fee}
      initialPayments={data.payments}
      users={data.users}
      feeId={feeId}
    />
  );
}
