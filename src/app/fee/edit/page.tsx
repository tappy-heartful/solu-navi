import { getFeeDetailServer } from "@/features/fee/api/fee-server-actions";
import { FeeEditClient } from "@/features/fee/views/edit/FeeEditClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{ mode?: string; feeId?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const feeId = resolvedParams.feeId;
  const mode = resolvedParams.mode;

  if (!mode || mode === "new" || !feeId) {
    return { title: "部費・集金 新規登録" };
  }

  const data = await getFeeDetailServer(feeId);
  return {
    title: data.fee?.title ? `${data.fee.title} - 部費編集` : "部費編集",
  };
}

export const dynamic = "force-dynamic";

export default async function FeeEditPage({ searchParams }: Props) {
  const { mode, feeId } = await searchParams;

  const validModes = ["new", "edit", "copy"];
  if (!mode || !validModes.includes(mode)) notFound();

  const data = feeId ? await getFeeDetailServer(feeId) : null;
  const initialFee = data?.fee || null;

  if ((mode === "edit" || mode === "copy") && !initialFee) {
    notFound();
  }

  return (
    <FeeEditClient
      mode={mode as "new" | "edit" | "copy"}
      feeId={feeId}
      initialFee={initialFee}
    />
  );
}
