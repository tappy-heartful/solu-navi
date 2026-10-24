import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import {
  SectionDoc,
  RoleDoc,
  InstrumentDoc,
  Prefecture,
  AttendanceStatus,
  EventAdjustStatus,
  Genre,
  ScoreStatus,
} from "@/lib/firestore/types";
import {
  DEFAULT_SECTIONS,
  DEFAULT_ROLES,
  DEFAULT_INSTRUMENTS,
  DEFAULT_PREFECTURES,
  DEFAULT_MUNICIPALITIES,
  DEFAULT_ATTENDANCE_STATUSES,
  DEFAULT_EVENT_ADJUST_STATUSES,
  DEFAULT_GENRES,
  DEFAULT_SCORE_STATUSES,
} from "@/lib/firestore/constants";
import { toPlainObject } from "@/lib/firestore/utils";

export interface MasterPageData {
  sections: SectionDoc[];
  roles: RoleDoc[];
  instruments: InstrumentDoc[];
  prefectures: Prefecture[];
  prefecturesCount: number;
  municipalitiesCount: number;
  attendanceStatuses: AttendanceStatus[];
  eventAdjustStatuses: EventAdjustStatus[];
  genres: Genre[];
  scoreStatuses: ScoreStatus[];
  isSectionsFromDefault: boolean;
  isRolesFromDefault: boolean;
  isInstrumentsFromDefault: boolean;
  isPrefecturesFromDefault: boolean;
  isAttendanceStatusesFromDefault: boolean;
  isEventAdjustStatusesFromDefault: boolean;
  isGenresFromDefault: boolean;
  isScoreStatusesFromDefault: boolean;
  isMunicipalitiesFromDefault: boolean;
}


/**
 * サーバー側でパート、役職、楽器、都道府県、市区町村件数を取得
 */
export async function fetchMasterDataServer(): Promise<MasterPageData> {
  let sections: SectionDoc[] = [];
  let roles: RoleDoc[] = [];
  let instruments: InstrumentDoc[] = [];
  let prefectures: Prefecture[] = [];
  let municipalitiesCount = 0;
  let isSectionsFromDefault = false;
  let isRolesFromDefault = false;
  let isInstrumentsFromDefault = false;
  let isPrefecturesFromDefault = false;

  // 1. sections
  try {
    const secSnap = await adminDb.collection("sections").get();
    if (!secSnap.empty) {
      sections = secSnap.docs.map((d) => ({
        ...toPlainObject(d.data()),
        id: d.id,
      })) as SectionDoc[];
    } else {
      sections = [...DEFAULT_SECTIONS];
      isSectionsFromDefault = true;
    }
  } catch (err) {
    console.error("Failed to fetch sections:", err);
    sections = [...DEFAULT_SECTIONS];
    isSectionsFromDefault = true;
  }
  sections.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  // 2. roles
  try {
    const roleSnap = await adminDb.collection("roles").get();
    if (!roleSnap.empty) {
      roles = roleSnap.docs.map((d) => ({
        ...toPlainObject(d.data()),
        id: d.id,
      })) as RoleDoc[];
    } else {
      roles = [...DEFAULT_ROLES];
      isRolesFromDefault = true;
    }
  } catch (err) {
    console.error("Failed to fetch roles:", err);
    roles = [...DEFAULT_ROLES];
    isRolesFromDefault = true;
  }
  roles.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  // 3. instruments
  try {
    const instSnap = await adminDb.collection("instruments").get();
    if (!instSnap.empty) {
      instruments = instSnap.docs.map((d) => ({
        ...toPlainObject(d.data()),
        id: d.id,
      })) as InstrumentDoc[];
    } else {
      instruments = [...DEFAULT_INSTRUMENTS];
      isInstrumentsFromDefault = true;
    }
  } catch (err) {
    console.error("Failed to fetch instruments:", err);
    instruments = [...DEFAULT_INSTRUMENTS];
    isInstrumentsFromDefault = true;
  }
  instruments.sort((a, b) => {
    if (a.sectionId !== b.sectionId) {
      return a.sectionId.localeCompare(b.sectionId);
    }
    return (a.order ?? 999) - (b.order ?? 999);
  });

  // 3. prefectures
  try {
    const prefSnap = await adminDb.collection("prefectures").get();
    if (!prefSnap.empty) {
      prefectures = prefSnap.docs.map((d) => ({
        ...toPlainObject(d.data()),
        id: d.id,
      })) as Prefecture[];
    } else {
      prefectures = [...DEFAULT_PREFECTURES];
      isPrefecturesFromDefault = true;
    }
  } catch (err) {
    console.error("Failed to fetch prefectures:", err);
    prefectures = [...DEFAULT_PREFECTURES];
    isPrefecturesFromDefault = true;
  }
  prefectures.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  // 4. municipalities count
  let isMunicipalitiesFromDefault = false;
  try {
    const munCountSnap = await adminDb.collection("municipalities").count().get();
    municipalitiesCount = munCountSnap.data().count;
    if (municipalitiesCount === 0) {
      municipalitiesCount = DEFAULT_MUNICIPALITIES.length;
      isMunicipalitiesFromDefault = true;
    }
  } catch (err) {
    console.error("Failed to fetch municipalities count:", err);
    municipalitiesCount = DEFAULT_MUNICIPALITIES.length;
    isMunicipalitiesFromDefault = true;
  }

  // 5. attendanceStatuses
  let attendanceStatuses: AttendanceStatus[] = [];
  let isAttendanceStatusesFromDefault = false;
  try {
    const snap = await adminDb.collection("attendanceStatuses").get();
    if (!snap.empty) {
      attendanceStatuses = snap.docs.map((d) => ({
        ...toPlainObject(d.data()),
        id: d.id,
      })) as AttendanceStatus[];
    } else {
      attendanceStatuses = [...DEFAULT_ATTENDANCE_STATUSES];
      isAttendanceStatusesFromDefault = true;
    }
  } catch (err) {
    console.error("Failed to fetch attendanceStatuses:", err);
    attendanceStatuses = [...DEFAULT_ATTENDANCE_STATUSES];
    isAttendanceStatusesFromDefault = true;
  }
  attendanceStatuses.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  // 6. eventAdjustStatus
  let eventAdjustStatuses: EventAdjustStatus[] = [];
  let isEventAdjustStatusesFromDefault = false;
  try {
    const snap = await adminDb.collection("eventAdjustStatus").get();
    if (!snap.empty) {
      eventAdjustStatuses = snap.docs.map((d) => ({
        ...toPlainObject(d.data()),
        id: d.id,
      })) as EventAdjustStatus[];
    } else {
      eventAdjustStatuses = [...DEFAULT_EVENT_ADJUST_STATUSES];
      isEventAdjustStatusesFromDefault = true;
    }
  } catch (err) {
    console.error("Failed to fetch eventAdjustStatus:", err);
    eventAdjustStatuses = [...DEFAULT_EVENT_ADJUST_STATUSES];
    isEventAdjustStatusesFromDefault = true;
  }
  eventAdjustStatuses.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  // 7. genres
  let genres: Genre[] = [];
  let isGenresFromDefault = false;
  try {
    const snap = await adminDb.collection("genres").get();
    if (!snap.empty) {
      genres = snap.docs.map((d) => ({
        ...toPlainObject(d.data()),
        id: d.id,
      })) as Genre[];
    } else {
      genres = [...DEFAULT_GENRES];
      isGenresFromDefault = true;
    }
  } catch (err) {
    console.error("Failed to fetch genres:", err);
    genres = [...DEFAULT_GENRES];
    isGenresFromDefault = true;
  }
  genres.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  // 8. scoreStatus
  let scoreStatuses: ScoreStatus[] = [];
  let isScoreStatusesFromDefault = false;
  try {
    const snap = await adminDb.collection("scoreStatus").get();
    if (!snap.empty) {
      scoreStatuses = snap.docs.map((d) => ({
        ...toPlainObject(d.data()),
        id: d.id,
      })) as ScoreStatus[];
    } else {
      scoreStatuses = [...DEFAULT_SCORE_STATUSES];
      isScoreStatusesFromDefault = true;
    }
  } catch (err) {
    console.error("Failed to fetch scoreStatus:", err);
    scoreStatuses = [...DEFAULT_SCORE_STATUSES];
    isScoreStatusesFromDefault = true;
  }
  scoreStatuses.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return {
    sections,
    roles,
    instruments,
    prefectures,
    prefecturesCount: prefectures.length,
    municipalitiesCount,
    attendanceStatuses,
    eventAdjustStatuses,
    genres,
    scoreStatuses,
    isSectionsFromDefault,
    isRolesFromDefault,
    isInstrumentsFromDefault,
    isPrefecturesFromDefault,
    isAttendanceStatusesFromDefault,
    isEventAdjustStatusesFromDefault,
    isGenresFromDefault,
    isScoreStatusesFromDefault,
    isMunicipalitiesFromDefault,
  };
}

