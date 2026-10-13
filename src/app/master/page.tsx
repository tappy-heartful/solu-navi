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
      initialRoles={data.roles}
      initialInstruments={data.instruments}
      initialPrefectures={data.prefectures}
      initialPrefecturesCount={data.prefecturesCount}
      initialMunicipalitiesCount={data.municipalitiesCount}
      initialAttendanceStatuses={data.attendanceStatuses}
      initialEventAdjustStatuses={data.eventAdjustStatuses}
      initialGenres={data.genres}
      initialScoreStatuses={data.scoreStatuses}
      isSectionsFromDefault={data.isSectionsFromDefault}
      isRolesFromDefault={data.isRolesFromDefault}
      isInstrumentsFromDefault={data.isInstrumentsFromDefault}
      isPrefecturesFromDefault={data.isPrefecturesFromDefault}
      isAttendanceStatusesFromDefault={data.isAttendanceStatusesFromDefault}
      isEventAdjustStatusesFromDefault={data.isEventAdjustStatusesFromDefault}
      isGenresFromDefault={data.isGenresFromDefault}
      isScoreStatusesFromDefault={data.isScoreStatusesFromDefault}
    />
  );
}

