import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { SectionDoc, RoleDoc, InstrumentDoc, Prefecture } from "@/lib/firestore/types";
import {
  DEFAULT_SECTIONS,
  DEFAULT_ROLES,
  DEFAULT_INSTRUMENTS,
  DEFAULT_PREFECTURES,
  DEFAULT_MUNICIPALITIES,
} from "@/lib/firestore/constants";
import { toPlainObject } from "@/lib/firestore/utils";

export interface MasterPageData {
  sections: SectionDoc[];
  roles: RoleDoc[];
  instruments: InstrumentDoc[];
  prefectures: Prefecture[];
  prefecturesCount: number;
  municipalitiesCount: number;
  isSectionsFromDefault: boolean;
  isRolesFromDefault: boolean;
  isInstrumentsFromDefault: boolean;
  isPrefecturesFromDefault: boolean;
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
  try {
    const munCountSnap = await adminDb.collection("municipalities").count().get();
    municipalitiesCount = munCountSnap.data().count;
  } catch (err) {
    console.error("Failed to fetch municipalities count:", err);
    municipalitiesCount = DEFAULT_MUNICIPALITIES.length;
  }

  return {
    sections,
    roles,
    instruments,
    prefectures,
    prefecturesCount: prefectures.length,
    municipalitiesCount,
    isSectionsFromDefault,
    isRolesFromDefault,
    isInstrumentsFromDefault,
    isPrefecturesFromDefault,
  };
}
