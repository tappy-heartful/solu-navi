import { fetchMasterDataServer } from "@/features/master/api/master-server-actions";
import { MasterMaintenanceClient } from "@/features/master/views/MasterMaintenanceClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "マスタ管理",
};

export const dynamic = "force-dynamic";

export default async function MasterPage() {
  const data = await fetchMasterDataServer();

  return (
    <MasterMaintenanceClient
      initialSections={data.sections}
      initialInstruments={data.instruments}
      isSectionsFromDefault={data.isSectionsFromDefault}
      isInstrumentsFromDefault={data.isInstrumentsFromDefault}
    />
  );
}
