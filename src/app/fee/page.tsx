import { getFeesServer } from "@/features/fee/api/fee-server-actions";
import { FeeListClient } from "@/features/fee/views/list/FeeListClient";
import { adminDb } from "@/lib/firebase-admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "部費・集金管理",
};

export const dynamic = "force-dynamic";

export default async function FeeListPage() {
  const [fees, usersSnap] = await Promise.all([
    getFeesServer(),
    adminDb.collection("users").get(),
  ]);

  return <FeeListClient initialFees={fees} totalUserCount={usersSnap.size} />;
}
