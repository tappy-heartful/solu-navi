import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  collection,
} from "firebase/firestore";
import { SectionDoc, InstrumentDoc } from "@/lib/firestore/types";
import { DEFAULT_SECTIONS, DEFAULT_INSTRUMENTS } from "@/lib/firestore/constants";

/**
 * パート (セクション) の保存（新規または更新）
 */
export async function saveSection(section: SectionDoc): Promise<void> {
  const ref = doc(db, "sections", section.id);
  await setDoc(
    ref,
    {
      name: section.name,
      shortName: section.shortName,
      order: Number(section.order) || 0,
      color: section.color || "#146081",
    },
    { merge: true }
  );
}

/**
 * パート (セクション) の削除
 */
export async function deleteSection(sectionId: string): Promise<void> {
  await deleteDoc(doc(db, "sections", sectionId));
}

/**
 * 楽器の保存（新規または更新）
 */
export async function saveInstrument(instrument: InstrumentDoc): Promise<void> {
  const ref = doc(db, "instruments", instrument.id);
  await setDoc(
    ref,
    {
      name: instrument.name,
      sectionId: instrument.sectionId,
      order: Number(instrument.order) || 0,
    },
    { merge: true }
  );
}

/**
 * 楽器の削除
 */
export async function deleteInstrument(instrumentId: string): Promise<void> {
  await deleteDoc(doc(db, "instruments", instrumentId));
}

/**
 * デフォルトのマスタデータを Firestore に初期投入
 */
export async function seedMasterData(): Promise<{ sectionsCount: number; instrumentsCount: number }> {
  const batch = writeBatch(db);

  // sections 投入
  for (const s of DEFAULT_SECTIONS) {
    const sRef = doc(db, "sections", s.id);
    batch.set(sRef, {
      name: s.name,
      shortName: s.shortName,
      order: s.order,
      color: s.color,
    }, { merge: true });
  }

  // instruments 投入
  for (const inst of DEFAULT_INSTRUMENTS) {
    const instRef = doc(db, "instruments", inst.id);
    batch.set(instRef, {
      name: inst.name,
      sectionId: inst.sectionId,
      order: inst.order,
    }, { merge: true });
  }

  await batch.commit();

  return {
    sectionsCount: DEFAULT_SECTIONS.length,
    instrumentsCount: DEFAULT_INSTRUMENTS.length,
  };
}

/**
 * クライアント側での最新パート一覧再取得
 */
export async function getClientSections(): Promise<SectionDoc[]> {
  const snap = await getDocs(collection(db, "sections"));
  if (snap.empty) return [...DEFAULT_SECTIONS];
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as SectionDoc[];
  list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return list;
}

/**
 * クライアント側での最新楽器一覧再取得
 */
export async function getClientInstruments(): Promise<InstrumentDoc[]> {
  const snap = await getDocs(collection(db, "instruments"));
  if (snap.empty) return [...DEFAULT_INSTRUMENTS];
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InstrumentDoc[];
  list.sort((a, b) => {
    if (a.sectionId !== b.sectionId) return a.sectionId.localeCompare(b.sectionId);
    return (a.order ?? 999) - (b.order ?? 999);
  });
  return list;
}
