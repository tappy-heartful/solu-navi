import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { SectionDoc, InstrumentDoc } from "@/lib/firestore/types";
import { DEFAULT_SECTIONS, DEFAULT_INSTRUMENTS } from "@/lib/firestore/constants";
import { toPlainObject } from "@/lib/firestore/utils";

export interface MasterPageData {
  sections: SectionDoc[];
  instruments: InstrumentDoc[];
  isSectionsFromDefault: boolean;
  isInstrumentsFromDefault: boolean;
}

/**
 * サーバー側でパートおよび楽器マスタを取得
 */
export async function fetchMasterDataServer(): Promise<MasterPageData> {
  let sections: SectionDoc[] = [];
  let instruments: InstrumentDoc[] = [];
  let isSectionsFromDefault = false;
  let isInstrumentsFromDefault = false;

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

  // 並び順ソート
  sections.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

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

  // 楽器のソート (セクション順 -> order順)
  instruments.sort((a, b) => {
    if (a.sectionId !== b.sectionId) {
      return a.sectionId.localeCompare(b.sectionId);
    }
    return (a.order ?? 999) - (b.order ?? 999);
  });

  return {
    sections,
    instruments,
    isSectionsFromDefault,
    isInstrumentsFromDefault,
  };
}
