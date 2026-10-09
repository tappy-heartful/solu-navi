import 'server-only';
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { User, SectionDoc, RoleDoc, InstrumentDoc, Prefecture, Municipality } from "@/lib/firestore/types";
import { toPlainObject } from "@/lib/firestore/utils";
import { unstable_cache } from "next/cache";

/**
 * 全ユーザ情報を取得
 */
export async function getUsersServer(): Promise<User[]> {
  try {
    const snap = await adminDb.collection("users").get();
    return snap.docs.map((doc) => toPlainObject(doc)) as unknown as User[];
  } catch (err) {
    console.error("Failed to fetch users server:", err);
    return [];
  }
}

/**
 * 特定のユーザ情報を取得
 */
export async function getUserServer(uid: string): Promise<User | null> {
  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) return null;
    return toPlainObject(snap) as unknown as User;
  } catch (err) {
    console.error("Failed to fetch user server:", err);
    return null;
  }
}

/**
 * 全セクション情報を取得（24時間キャッシュ）
 */
export const getSectionsServer = unstable_cache(
  async (): Promise<SectionDoc[]> => {
    try {
      const snap = await adminDb.collection("sections").orderBy("__name__").get();
      if (!snap.empty) {
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SectionDoc[];
      }
    } catch (err) {
      console.warn("Failed to fetch sections from adminDb, fallback to defaults:", err);
    }
    const { DEFAULT_SECTIONS } = await import("@/lib/firestore/constants");
    return DEFAULT_SECTIONS;
  },
  ["master-sections"],
  { revalidate: 86400, tags: ["master-sections"] }
);

/**
 * 全役職情報を取得（24時間キャッシュ）
 */
export const getRolesServer = unstable_cache(
  async (): Promise<RoleDoc[]> => {
    try {
      const snap = await adminDb.collection("roles").orderBy("__name__").get();
      if (!snap.empty) {
        return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as RoleDoc[];
      }
    } catch (err) {
      console.warn("Failed to fetch roles from adminDb, fallback to defaults:", err);
    }
    const { DEFAULT_ROLES } = await import("@/lib/firestore/constants");
    return DEFAULT_ROLES;
  },
  ["master-roles"],
  { revalidate: 86400, tags: ["master-roles"] }
);

/**
 * 全楽器情報を取得（24時間キャッシュ）
 */
export const getInstrumentsServer = unstable_cache(
  async (): Promise<InstrumentDoc[]> => {
    try {
      const snap = await adminDb.collection("instruments").get();
      if (!snap.empty) {
        const instruments = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as InstrumentDoc[];
        return instruments.sort((a, b) => {
          if (a.sectionId < b.sectionId) return -1;
          if (a.sectionId > b.sectionId) return 1;
          return a.id.localeCompare(b.id);
        });
      }
    } catch (err) {
      console.warn("Failed to fetch instruments from adminDb, fallback to defaults:", err);
    }
    const { DEFAULT_INSTRUMENTS } = await import("@/lib/firestore/constants");
    return DEFAULT_INSTRUMENTS;
  },
  ["master-instruments"],
  { revalidate: 86400, tags: ["master-instruments"] }
);

/**
 * 全都道府県情報を取得（24時間キャッシュ）
 */
export const getPrefecturesServer = unstable_cache(
  async (): Promise<Prefecture[]> => {
    try {
      const snap = await adminDb.collection("prefectures").orderBy("order", "asc").get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Prefecture[];
    } catch (err) {
      console.error("Failed to fetch prefectures:", err);
      return [];
    }
  },
  ["master-prefectures"],
  { revalidate: 86400, tags: ["master-prefectures"] }
);

/**
 * 特定の都道府県の市区町村一覧を取得
 */
export async function getMunicipalitiesServer(prefectureCode: string): Promise<Municipality[]> {
  try {
    const snap = await adminDb
      .collection("municipalities")
      .where("prefectureCode", "==", prefectureCode)
      .get();
    const datalist = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Municipality[];
    return datalist.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ja"));
  } catch (err) {
    console.error("Failed to fetch municipalities:", err);
    return [];
  }
}

/**
 * 複数の市区町村IDから名前のマップを取得
 */
export async function getMunicipalityNamesMapServer(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};

  const chunks = [];
  for (let i = 0; i < ids.length; i += 30) {
    chunks.push(ids.slice(i, i + 30));
  }

  const map: Record<string, string> = {};
  for (const chunk of chunks) {
    try {
      const snap = await adminDb
        .collection("municipalities")
        .where(FieldPath.documentId(), "in", chunk)
        .get();
      snap.forEach((doc) => {
        map[doc.id] = doc.data().name;
      });
    } catch (err) {
      console.error("Failed to get municipality names map chunk:", err);
    }
  }
  return map;
}
