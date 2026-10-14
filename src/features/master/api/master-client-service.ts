import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  collection,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";
import {
  SectionDoc,
  RoleDoc,
  InstrumentDoc,
  Prefecture,
  Municipality,
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
 * 役職 (ロール) の保存（新規または更新）
 */
export async function saveRole(role: RoleDoc): Promise<void> {
  const ref = doc(db, "roles", role.id);
  await setDoc(
    ref,
    {
      name: role.name,
      description: role.description || "",
      order: Number(role.order) || 0,
    },
    { merge: true }
  );
}

/**
 * 役職 (ロール) の削除
 */
export async function deleteRole(roleId: string): Promise<void> {
  await deleteDoc(doc(db, "roles", roleId));
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
 * 都道府県の保存（新規または更新）
 */
export async function savePrefecture(prefecture: Prefecture): Promise<void> {
  const ref = doc(db, "prefectures", prefecture.id);
  await setDoc(
    ref,
    {
      name: prefecture.name,
      order: Number(prefecture.order) || 0,
    },
    { merge: true }
  );
}

/**
 * 都道府県の削除
 */
export async function deletePrefecture(prefectureId: string): Promise<void> {
  await deleteDoc(doc(db, "prefectures", prefectureId));
}

/**
 * 市区町村の保存（新規または更新）
 */
export async function saveMunicipality(municipality: Municipality): Promise<void> {
  const ref = doc(db, "municipalities", municipality.id);
  await setDoc(
    ref,
    {
      name: municipality.name,
      prefectureCode: municipality.prefectureCode,
    },
    { merge: true }
  );
}

/**
 * 市区町村の削除
 */
export async function deleteMunicipality(municipalityId: string): Promise<void> {
  await deleteDoc(doc(db, "municipalities", municipalityId));
}

/**
 * 出欠ステータスの保存（新規または更新）
 */
export async function saveAttendanceStatus(status: AttendanceStatus): Promise<void> {
  const ref = doc(db, "attendanceStatuses", status.id);
  await setDoc(
    ref,
    {
      name: status.name,
      order: Number(status.order) || 0,
    },
    { merge: true }
  );
}

/**
 * 出欠ステータスの削除
 */
export async function deleteAttendanceStatus(statusId: string): Promise<void> {
  await deleteDoc(doc(db, "attendanceStatuses", statusId));
}

/**
 * 日程調整ステータスの保存（新規または更新）
 */
export async function saveEventAdjustStatus(status: EventAdjustStatus): Promise<void> {
  const ref = doc(db, "eventAdjustStatus", status.id);
  await setDoc(
    ref,
    {
      name: status.name,
      description: status.description || "",
      order: Number(status.order) || 0,
    },
    { merge: true }
  );
}

/**
 * 日程調整ステータスの削除
 */
export async function deleteEventAdjustStatus(statusId: string): Promise<void> {
  await deleteDoc(doc(db, "eventAdjustStatus", statusId));
}

/**
 * 音楽ジャンルの保存（新規または更新）
 */
export async function saveGenre(genre: Genre): Promise<void> {
  const ref = doc(db, "genres", genre.id);
  await setDoc(
    ref,
    {
      name: genre.name,
      order: Number(genre.order) || 0,
    },
    { merge: true }
  );
}

/**
 * 音楽ジャンルの削除
 */
export async function deleteGenre(genreId: string): Promise<void> {
  await deleteDoc(doc(db, "genres", genreId));
}

/**
 * 譜面状況の保存（新規または更新）
 */
export async function saveScoreStatus(status: ScoreStatus): Promise<void> {
  const ref = doc(db, "scoreStatus", status.id);
  await setDoc(
    ref,
    {
      name: status.name,
      order: Number(status.order) || 0,
    },
    { merge: true }
  );
}

/**
 * 譜面状況の削除
 */
export async function deleteScoreStatus(statusId: string): Promise<void> {
  await deleteDoc(doc(db, "scoreStatus", statusId));
}

export interface SeedOptions {
  includeSections?: boolean;
  includeRoles?: boolean;
  includeInstruments?: boolean;
  includePrefectures?: boolean;
  includeMunicipalities?: boolean;
  includeAttendanceStatuses?: boolean;
  includeEventAdjustStatuses?: boolean;
  includeGenres?: boolean;
  includeScoreStatuses?: boolean;
  onProgress?: (message: string) => void;
}

export interface SeedResult {
  sectionsCount: number;
  rolesCount: number;
  instrumentsCount: number;
  prefecturesCount: number;
  municipalitiesCount: number;
  attendanceStatusesCount: number;
  eventAdjustStatusesCount: number;
  genresCount: number;
  scoreStatusesCount: number;
}


/**
 * JSON初期マスタデータを Firestore に一括投入
 * (パート、役職、楽器、都道府県、市区町村)
 */
export async function seedMasterData(options: SeedOptions = {}): Promise<SeedResult> {
  const {
    includeSections = true,
    includeRoles = true,
    includeInstruments = true,
    includePrefectures = true,
    includeMunicipalities = true,
    includeAttendanceStatuses = true,
    includeEventAdjustStatuses = true,
    includeGenres = true,
    includeScoreStatuses = true,
    onProgress,
  } = options;

  let sectionsCount = 0;
  let rolesCount = 0;
  let instrumentsCount = 0;
  let prefecturesCount = 0;
  let municipalitiesCount = 0;
  let attendanceStatusesCount = 0;
  let eventAdjustStatusesCount = 0;
  let genresCount = 0;
  let scoreStatusesCount = 0;

  // 1. sections 投入
  if (includeSections) {
    onProgress?.("パートマスタを登録中...");
    const batch = writeBatch(db);
    for (const s of DEFAULT_SECTIONS) {
      const sRef = doc(db, "sections", s.id);
      batch.set(
        sRef,
        {
          name: s.name,
          shortName: s.shortName,
          order: s.order,
          color: s.color,
        },
        { merge: true }
      );
    }
    await batch.commit();
    sectionsCount = DEFAULT_SECTIONS.length;
  }

  // 2. roles 投入
  if (includeRoles) {
    onProgress?.("役職マスタを登録中...");
    const batch = writeBatch(db);
    for (const r of DEFAULT_ROLES) {
      const rRef = doc(db, "roles", r.id);
      batch.set(
        rRef,
        {
          name: r.name,
          description: r.description || "",
          order: r.order,
        },
        { merge: true }
      );
    }
    await batch.commit();
    rolesCount = DEFAULT_ROLES.length;
  }

  // 3. instruments 投入
  if (includeInstruments) {
    onProgress?.("楽器マスタを登録中...");
    const batch = writeBatch(db);
    for (const inst of DEFAULT_INSTRUMENTS) {
      const instRef = doc(db, "instruments", inst.id);
      batch.set(
        instRef,
        {
          name: inst.name,
          sectionId: inst.sectionId,
          order: inst.order,
        },
        { merge: true }
      );
    }
    await batch.commit();
    instrumentsCount = DEFAULT_INSTRUMENTS.length;
  }

  // 4. prefectures 投入
  if (includePrefectures) {
    onProgress?.("都道府県マスタを登録中 (47件)...");
    const batch = writeBatch(db);
    for (const pref of DEFAULT_PREFECTURES) {
      const prefRef = doc(db, "prefectures", pref.id);
      batch.set(
        prefRef,
        {
          name: pref.name,
          order: pref.order,
        },
        { merge: true }
      );
    }
    await batch.commit();
    prefecturesCount = DEFAULT_PREFECTURES.length;
  }

  // 5. municipalities 投入 (チャンク分割: 400件単位)
  if (includeMunicipalities) {
    const chunkSize = 400;
    const total = DEFAULT_MUNICIPALITIES.length;
    const chunks: Municipality[][] = [];
    for (let i = 0; i < total; i += chunkSize) {
      chunks.push(DEFAULT_MUNICIPALITIES.slice(i, i + chunkSize));
    }

    for (let c = 0; c < chunks.length; c++) {
      onProgress?.(
        `市区町村マスタを登録中 (${c + 1}/${chunks.length} バッチ - 計${total}件)...`
      );
      const batch = writeBatch(db);
      for (const mun of chunks[c]) {
        const munRef = doc(db, "municipalities", mun.id);
        batch.set(
          munRef,
          {
            name: mun.name,
            prefectureCode: mun.prefectureCode,
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
    municipalitiesCount = total;
  }

  // 6. attendanceStatuses 投入
  if (includeAttendanceStatuses) {
    onProgress?.("出欠ステータスマスタを登録中...");
    const batch = writeBatch(db);
    for (const att of DEFAULT_ATTENDANCE_STATUSES) {
      const attRef = doc(db, "attendanceStatuses", att.id);
      batch.set(
        attRef,
        {
          name: att.name,
          order: att.order ?? 0,
        },
        { merge: true }
      );
    }
    await batch.commit();
    attendanceStatusesCount = DEFAULT_ATTENDANCE_STATUSES.length;
  }

  // 7. eventAdjustStatus 投入
  if (includeEventAdjustStatuses) {
    onProgress?.("日程調整ステータスマスタを登録中...");
    const batch = writeBatch(db);
    for (const adj of DEFAULT_EVENT_ADJUST_STATUSES) {
      const adjRef = doc(db, "eventAdjustStatus", adj.id);
      batch.set(
        adjRef,
        {
          name: adj.name,
          description: adj.description || "",
          order: adj.order ?? 0,
        },
        { merge: true }
      );
    }
    await batch.commit();
    eventAdjustStatusesCount = DEFAULT_EVENT_ADJUST_STATUSES.length;
  }

  // 8. genres 投入
  if (includeGenres) {
    onProgress?.("ジャンルマスタを登録中...");
    const batch = writeBatch(db);
    for (const gen of DEFAULT_GENRES) {
      const genRef = doc(db, "genres", gen.id);
      batch.set(
        genRef,
        {
          name: gen.name,
          order: gen.order ?? 0,
        },
        { merge: true }
      );
    }
    await batch.commit();
    genresCount = DEFAULT_GENRES.length;
  }

  // 9. scoreStatus 投入
  if (includeScoreStatuses) {
    onProgress?.("譜面状況マスタを登録中...");
    const batch = writeBatch(db);
    for (const sc of DEFAULT_SCORE_STATUSES) {
      const scRef = doc(db, "scoreStatus", sc.id);
      batch.set(
        scRef,
        {
          name: sc.name,
          order: sc.order ?? 0,
        },
        { merge: true }
      );
    }
    await batch.commit();
    scoreStatusesCount = DEFAULT_SCORE_STATUSES.length;
  }

  return {
    sectionsCount,
    rolesCount,
    instrumentsCount,
    prefecturesCount,
    municipalitiesCount,
    attendanceStatusesCount,
    eventAdjustStatusesCount,
    genresCount,
    scoreStatusesCount,
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
 * クライアント側での最新役職一覧再取得
 */
export async function getClientRoles(): Promise<RoleDoc[]> {
  const snap = await getDocs(collection(db, "roles"));
  if (snap.empty) return [...DEFAULT_ROLES];
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as RoleDoc[];
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

/**
 * クライアント側での最新都道府県一覧再取得
 */
export async function getClientPrefectures(): Promise<Prefecture[]> {
  const snap = await getDocs(collection(db, "prefectures"));
  if (snap.empty) return [...DEFAULT_PREFECTURES];
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Prefecture[];
  list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return list;
}

/**
 * クライアント側での指定都道府県の市区町村一覧取得
 */
export async function getClientMunicipalities(prefectureCode: string): Promise<Municipality[]> {
  if (!prefectureCode) return [];
  const q = query(
    collection(db, "municipalities"),
    where("prefectureCode", "==", prefectureCode)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    return DEFAULT_MUNICIPALITIES.filter((m) => m.prefectureCode === prefectureCode);
  }
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Municipality[];
  list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ja"));
  return list;
}

/**
 * クライアント側での市区町村総件数取得
 */
export async function getClientMunicipalitiesTotalCount(): Promise<number> {
  try {
    const snap = await getCountFromServer(collection(db, "municipalities"));
    return snap.data().count;
  } catch (err) {
    console.error("Failed to get municipalities count:", err);
    return DEFAULT_MUNICIPALITIES.length;
  }
}

/**
 * クライアント側での出欠ステータス一覧取得
 */
export async function getClientAttendanceStatuses(): Promise<AttendanceStatus[]> {
  const snap = await getDocs(collection(db, "attendanceStatuses"));
  if (snap.empty) return [...DEFAULT_ATTENDANCE_STATUSES];
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as AttendanceStatus[];
  list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return list;
}

/**
 * クライアント側での日程調整ステータス一覧取得
 */
export async function getClientEventAdjustStatuses(): Promise<EventAdjustStatus[]> {
  const snap = await getDocs(collection(db, "eventAdjustStatus"));
  if (snap.empty) return [...DEFAULT_EVENT_ADJUST_STATUSES];
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as EventAdjustStatus[];
  list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return list;
}

/**
 * クライアント側でのジャンル一覧取得
 */
export async function getClientGenres(): Promise<Genre[]> {
  const snap = await getDocs(collection(db, "genres"));
  if (snap.empty) return [...DEFAULT_GENRES];
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Genre[];
  list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return list;
}

/**
 * クライアント側での譜面状況一覧取得
 */
export async function getClientScoreStatuses(): Promise<ScoreStatus[]> {
  const snap = await getDocs(collection(db, "scoreStatus"));
  if (snap.empty) return [...DEFAULT_SCORE_STATUSES];
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ScoreStatus[];
  list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return list;
}

