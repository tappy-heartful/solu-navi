"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { BackNavigation } from "@/components/Common/BackNavigation";
import { Modal } from "@/components/Modal";
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
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import {
  showDialog,
  showSpinner,
  hideSpinner,
  writeLog,
} from "@/lib/functions";
import {
  saveSection,
  deleteSection,
  saveRole,
  deleteRole,
  saveInstrument,
  deleteInstrument,
  savePrefecture,
  deletePrefecture,
  saveMunicipality,
  deleteMunicipality,
  saveAttendanceStatus,
  deleteAttendanceStatus,
  saveEventAdjustStatus,
  deleteEventAdjustStatus,
  saveGenre,
  deleteGenre,
  saveScoreStatus,
  deleteScoreStatus,
  seedMasterData,
  getClientSections,
  getClientRoles,
  getClientInstruments,
  getClientPrefectures,
  getClientMunicipalities,
  getClientMunicipalitiesTotalCount,
  getClientAttendanceStatuses,
  getClientEventAdjustStatuses,
  getClientGenres,
  getClientScoreStatuses,
} from "@/features/master/api/master-client-service";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSliders,
  faShieldHalved,
  faLock,
  faDatabase,
  faPlus,
  faLayerGroup,
  faGuitar,
  faFolderOpen,
  faPenToSquare,
  faTrashCan,
  faUserGear,
  faLocationDot,
  faBuilding,
  faMagnifyingGlass,
  faUserCheck,
  faCalendarDays,
  faMusic,
  faFileLines,
  faTriangleExclamation,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./MasterMaintenance.module.css";

type Props = {
  initialSections: SectionDoc[];
  initialRoles?: RoleDoc[];
  initialInstruments: InstrumentDoc[];
  initialPrefectures?: Prefecture[];
  initialPrefecturesCount?: number;
  initialMunicipalitiesCount?: number;
  initialAttendanceStatuses?: AttendanceStatus[];
  initialEventAdjustStatuses?: EventAdjustStatus[];
  initialGenres?: Genre[];
  initialScoreStatuses?: ScoreStatus[];
  isSectionsFromDefault: boolean;
  isRolesFromDefault?: boolean;
  isInstrumentsFromDefault: boolean;
  isPrefecturesFromDefault?: boolean;
  isAttendanceStatusesFromDefault?: boolean;
  isEventAdjustStatusesFromDefault?: boolean;
  isGenresFromDefault?: boolean;
  isScoreStatusesFromDefault?: boolean;
  isMunicipalitiesFromDefault?: boolean;
};

type TabType =
  | "sections"
  | "roles"
  | "instruments"
  | "attendance"
  | "adjust"
  | "genres"
  | "scoreStatus"
  | "prefectures"
  | "municipalities";

const TAB_CONFIG: Record<
  TabType,
  {
    label: string;
  }
> = {
  sections: { label: "パート" },
  roles: { label: "役職" },
  instruments: { label: "楽器" },
  attendance: { label: "出欠ステータス" },
  adjust: { label: "日程調整ステータス" },
  genres: { label: "ジャンル" },
  scoreStatus: { label: "譜面状況" },
  prefectures: { label: "都道府県" },
  municipalities: { label: "市区町村" },
};

export function MasterMaintenanceClient({
  initialSections,
  initialRoles = [],
  initialInstruments,
  initialPrefectures = [],
  initialPrefecturesCount = 0,
  initialMunicipalitiesCount = 0,
  initialAttendanceStatuses = [],
  initialEventAdjustStatuses = [],
  initialGenres = [],
  initialScoreStatuses = [],
  isSectionsFromDefault,
  isRolesFromDefault,
  isInstrumentsFromDefault,
  isPrefecturesFromDefault,
  isAttendanceStatusesFromDefault,
  isEventAdjustStatusesFromDefault,
  isGenresFromDefault,
  isScoreStatusesFromDefault,
  isMunicipalitiesFromDefault,
}: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  // マスタ管理者またはシステム管理者のみ編集可能
  const canEdit = !!(userData?.isMasterAdmin || userData?.isSystemAdmin);

  const [currentTab, setCurrentTab] = useState<TabType>("sections");
  const [sections, setSections] = useState<SectionDoc[]>(initialSections);
  const [roles, setRoles] = useState<RoleDoc[]>(initialRoles);
  const [instruments, setInstruments] = useState<InstrumentDoc[]>(initialInstruments);
  const [prefectures, setPrefectures] = useState<Prefecture[]>(initialPrefectures);
  const [municipalitiesCount, setMunicipalitiesCount] = useState<number>(initialMunicipalitiesCount);
  const [attendanceStatuses, setAttendanceStatuses] = useState<AttendanceStatus[]>(initialAttendanceStatuses);
  const [eventAdjustStatuses, setEventAdjustStatuses] = useState<EventAdjustStatus[]>(initialEventAdjustStatuses);
  const [genres, setGenres] = useState<Genre[]>(initialGenres);
  const [scoreStatuses, setScoreStatuses] = useState<ScoreStatus[]>(initialScoreStatuses);

  // 未登録（初期JSONファイル表示中）フラグ管理
  const [fromDefaultMap, setFromDefaultMap] = useState<Record<TabType, boolean>>({
    sections: isSectionsFromDefault,
    roles: !!isRolesFromDefault,
    instruments: isInstrumentsFromDefault,
    attendance: !!isAttendanceStatusesFromDefault,
    adjust: !!isEventAdjustStatusesFromDefault,
    genres: !!isGenresFromDefault,
    scoreStatus: !!isScoreStatusesFromDefault,
    prefectures: !!isPrefecturesFromDefault,
    municipalities: !!isMunicipalitiesFromDefault,
  });

  // 役職編集・作成モーダル用
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<RoleDoc> | null>(null);
  const [isRoleNew, setIsRoleNew] = useState(false);

  // 出欠ステータス編集・作成モーダル用
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Partial<AttendanceStatus> | null>(null);
  const [isAttendanceNew, setIsAttendanceNew] = useState(false);

  // 日程調整ステータス編集・作成モーダル用
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [editingAdjust, setEditingAdjust] = useState<Partial<EventAdjustStatus> | null>(null);
  const [isAdjustNew, setIsAdjustNew] = useState(false);

  // ジャンル編集・作成モーダル用
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Partial<Genre> | null>(null);
  const [isGenreNew, setIsGenreNew] = useState(false);

  // 譜面状況編集・作成モーダル用
  const [scoreStatusModalOpen, setScoreStatusModalOpen] = useState(false);
  const [editingScoreStatus, setEditingScoreStatus] = useState<Partial<ScoreStatus> | null>(null);
  const [isScoreStatusNew, setIsScoreStatusNew] = useState(false);

  // 都道府県編集・作成モーダル用
  const [prefectureModalOpen, setPrefectureModalOpen] = useState(false);
  const [editingPrefecture, setEditingPrefecture] = useState<Partial<Prefecture> | null>(null);
  const [isPrefectureNew, setIsPrefectureNew] = useState(false);

  // 市区町村管理用
  const [selectedPrefectureCode, setSelectedPrefectureCode] = useState<string>("38"); // 初期値: 愛媛県
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [municipalitySearchQuery, setMunicipalitySearchQuery] = useState("");
  const [municipalityModalOpen, setMunicipalityModalOpen] = useState(false);
  const [editingMunicipality, setEditingMunicipality] = useState<Partial<Municipality> | null>(null);
  const [isMunicipalityNew, setIsMunicipalityNew] = useState(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);

  // パート編集・作成モーダル用
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Partial<SectionDoc> | null>(null);
  const [isSectionNew, setIsSectionNew] = useState(false);

  // 楽器編集・作成モーダル用
  const [instrumentModalOpen, setInstrumentModalOpen] = useState(false);
  const [editingInstrument, setEditingInstrument] = useState<Partial<InstrumentDoc> | null>(null);
  const [isInstrumentNew, setIsInstrumentNew] = useState(false);


  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "マスタ管理", href: "/master" },
    ]);
  }, [setBreadcrumbs]);

  // 市区町村一覧の取得 (市区町村タブ表示中または都道府県選択変更時)
  useEffect(() => {
    if (currentTab === "municipalities" && selectedPrefectureCode) {
      let isCancelled = false;
      setIsLoadingMunicipalities(true);
      getClientMunicipalities(selectedPrefectureCode)
        .then((list) => {
          if (!isCancelled) {
            setMunicipalities(list);
            setIsLoadingMunicipalities(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load municipalities:", err);
          if (!isCancelled) setIsLoadingMunicipalities(false);
        });
      return () => {
        isCancelled = true;
      };
    }
  }, [currentTab, selectedPrefectureCode]);

  // ---- パート (Section) のハンドラ ----

  const handleOpenAddSection = () => {
    if (!canEdit) return;
    const nextOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order || 0)) + 1 : 1;
    setEditingSection({
      id: String(nextOrder),
      name: "",
      shortName: "",
      order: nextOrder,
      color: "#146081",
    });
    setIsSectionNew(true);
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (sec: SectionDoc) => {
    if (!canEdit) return;
    setEditingSection({ ...sec });
    setIsSectionNew(false);
    setSectionModalOpen(true);
  };

  const handleSaveSection = async () => {
    if (!canEdit || !editingSection) return;
    if (!editingSection.id?.trim()) {
      await showDialog("パートIDを入力してください", true);
      return;
    }
    if (!editingSection.name?.trim()) {
      await showDialog("パート名を入力してください", true);
      return;
    }
    if (!editingSection.shortName?.trim()) {
      await showDialog("略称を入力してください", true);
      return;
    }

    const confirmed = await showDialog(
      `パート「${editingSection.name}」を${isSectionNew ? "追加" : "更新"}しますか？`
    );
    if (!confirmed) return;

    setSectionModalOpen(false);
    showSpinner();
    try {
      await saveSection(editingSection as SectionDoc);
      await writeLog({
        dataId: editingSection.id,
        action: `パートマスタ${isSectionNew ? "追加" : "更新"}`,
      });
      const updated = await getClientSections();
      setSections(updated);
      hideSpinner();
      await showDialog(`パートを${isSectionNew ? "追加" : "更新"}しました`, true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] パートマスタ保存エラー:", err);
      await writeLog({
        dataId: editingSection.id,
        action: `パートマスタ${isSectionNew ? "追加" : "更新"}`,
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  const handleDeleteSection = async (sec: SectionDoc) => {
    if (!canEdit) return;
    const confirmed = await showDialog(
      `パート「${sec.name}」を削除しますか？\n※所属している部員や楽器の参照に影響する可能性があります。`
    );
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteSection(sec.id);
      await writeLog({
        dataId: sec.id,
        action: "パートマスタ削除",
      });
      const updated = await getClientSections();
      setSections(updated);
      hideSpinner();
      await showDialog("パートを削除しました", true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] パートマスタ削除エラー:", err);
      await writeLog({
        dataId: sec.id,
        action: "パートマスタ削除",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- 楽器 (Instrument) のハンドラ ----

  const handleOpenAddInstrument = () => {
    if (!canEdit) return;
    const defaultSecId = sections[0]?.id || "1";
    setEditingInstrument({
      id: "",
      name: "",
      sectionId: defaultSecId,
      order: 10,
    });
    setIsInstrumentNew(true);
    setInstrumentModalOpen(true);
  };

  const handleOpenEditInstrument = (inst: InstrumentDoc) => {
    if (!canEdit) return;
    setEditingInstrument({ ...inst });
    setIsInstrumentNew(false);
    setInstrumentModalOpen(true);
  };

  const handleSaveInstrument = async () => {
    if (!canEdit || !editingInstrument) return;
    if (!editingInstrument.id?.trim()) {
      await showDialog("楽器ID（英数字・記号）を入力してください", true);
      return;
    }
    if (!editingInstrument.name?.trim()) {
      await showDialog("楽器名を入力してください", true);
      return;
    }
    if (!editingInstrument.sectionId) {
      await showDialog("所属パートを選択してください", true);
      return;
    }

    const confirmed = await showDialog(
      `楽器「${editingInstrument.name}」を${isInstrumentNew ? "追加" : "更新"}しますか？`
    );
    if (!confirmed) return;

    setInstrumentModalOpen(false);
    showSpinner();
    try {
      await saveInstrument(editingInstrument as InstrumentDoc);
      await writeLog({
        dataId: editingInstrument.id,
        action: `楽器マスタ${isInstrumentNew ? "追加" : "更新"}`,
      });
      const updated = await getClientInstruments();
      setInstruments(updated);
      hideSpinner();
      await showDialog(`楽器を${isInstrumentNew ? "追加" : "更新"}しました`, true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 楽器マスタ保存エラー:", err);
      await writeLog({
        dataId: editingInstrument.id,
        action: `楽器マスタ${isInstrumentNew ? "追加" : "更新"}`,
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  const handleDeleteInstrument = async (inst: InstrumentDoc) => {
    if (!canEdit) return;
    const confirmed = await showDialog(`楽器「${inst.name}」を削除しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteInstrument(inst.id);
      await writeLog({
        dataId: inst.id,
        action: "楽器マスタ削除",
      });
      const updated = await getClientInstruments();
      setInstruments(updated);
      hideSpinner();
      await showDialog("楽器を削除しました", true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 楽器マスタ削除エラー:", err);
      await writeLog({
        dataId: inst.id,
        action: "楽器マスタ削除",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- 役職 (Role) のハンドラ ----

  const handleOpenAddRole = () => {
    if (!canEdit) return;
    const nextOrder = roles.length > 0 ? Math.max(...roles.map((r) => r.order || 0)) + 1 : 1;
    setEditingRole({
      id: String(nextOrder),
      name: "",
      description: "",
      order: nextOrder,
    });
    setIsRoleNew(true);
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: RoleDoc) => {
    if (!canEdit) return;
    setEditingRole({ ...role });
    setIsRoleNew(false);
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!canEdit || !editingRole) return;
    if (!editingRole.id?.trim()) {
      await showDialog("役職IDを入力してください", true);
      return;
    }
    if (!editingRole.name?.trim()) {
      await showDialog("役職名を入力してください", true);
      return;
    }

    const confirmed = await showDialog(
      `役職「${editingRole.name}」を${isRoleNew ? "追加" : "更新"}しますか？`
    );
    if (!confirmed) return;

    setRoleModalOpen(false);
    showSpinner();
    try {
      await saveRole(editingRole as RoleDoc);
      await writeLog({
        dataId: editingRole.id,
        action: `役職マスタ${isRoleNew ? "追加" : "更新"}`,
      });
      const updated = await getClientRoles();
      setRoles(updated);
      hideSpinner();
      await showDialog(`役職を${isRoleNew ? "追加" : "更新"}しました`, true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 役職マスタ保存エラー:", err);
      await writeLog({
        dataId: editingRole.id,
        action: `役職マスタ${isRoleNew ? "追加" : "更新"}`,
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  const handleDeleteRole = async (role: RoleDoc) => {
    if (!canEdit) return;
    const confirmed = await showDialog(`役職「${role.name}」を削除しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteRole(role.id);
      await writeLog({
        dataId: role.id,
        action: "役職マスタ削除",
      });
      const updated = await getClientRoles();
      setRoles(updated);
      hideSpinner();
      await showDialog("役職を削除しました", true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 役職マスタ削除エラー:", err);
      await writeLog({
        dataId: role.id,
        action: "役職マスタ削除",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- 都道府県 (Prefecture) のハンドラ ----

  const handleOpenAddPrefecture = () => {
    if (!canEdit) return;
    const nextOrder = prefectures.length > 0 ? Math.max(...prefectures.map((p) => p.order || 0)) + 1 : 1;
    const padId = String(nextOrder).padStart(2, "0");
    setEditingPrefecture({
      id: padId,
      name: "",
      order: nextOrder,
    });
    setIsPrefectureNew(true);
    setPrefectureModalOpen(true);
  };

  const handleOpenEditPrefecture = (pref: Prefecture) => {
    if (!canEdit) return;
    setEditingPrefecture({ ...pref });
    setIsPrefectureNew(false);
    setPrefectureModalOpen(true);
  };

  const handleSavePrefecture = async () => {
    if (!canEdit || !editingPrefecture) return;
    if (!editingPrefecture.id?.trim()) {
      await showDialog("都道府県コード（2桁）を入力してください", true);
      return;
    }
    if (!editingPrefecture.name?.trim()) {
      await showDialog("都道府県名を入力してください", true);
      return;
    }

    const confirmed = await showDialog(
      `都道府県「${editingPrefecture.name}」を${isPrefectureNew ? "追加" : "更新"}しますか？`
    );
    if (!confirmed) return;

    setPrefectureModalOpen(false);
    showSpinner();
    try {
      await savePrefecture(editingPrefecture as Prefecture);
      await writeLog({
        dataId: editingPrefecture.id,
        action: `都道府県マスタ${isPrefectureNew ? "追加" : "更新"}`,
      });
      const updated = await getClientPrefectures();
      setPrefectures(updated);
      hideSpinner();
      await showDialog(`都道府県を${isPrefectureNew ? "追加" : "更新"}しました`, true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 都道府県マスタ保存エラー:", err);
      await writeLog({
        dataId: editingPrefecture.id,
        action: `都道府県マスタ${isPrefectureNew ? "追加" : "更新"}`,
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  const handleDeletePrefecture = async (pref: Prefecture) => {
    if (!canEdit) return;
    const confirmed = await showDialog(`都道府県「${pref.name}」を削除しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deletePrefecture(pref.id);
      await writeLog({
        dataId: pref.id,
        action: "都道府県マスタ削除",
      });
      const updated = await getClientPrefectures();
      setPrefectures(updated);
      hideSpinner();
      await showDialog("都道府県を削除しました", true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 都道府県マスタ削除エラー:", err);
      await writeLog({
        dataId: pref.id,
        action: "都道府県マスタ削除",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- 市区町村 (Municipality) のハンドラ ----

  const handleOpenAddMunicipality = () => {
    if (!canEdit) return;
    setEditingMunicipality({
      id: `${selectedPrefectureCode || "01"}000`,
      name: "",
      prefectureCode: selectedPrefectureCode || "01",
    });
    setIsMunicipalityNew(true);
    setMunicipalityModalOpen(true);
  };

  const handleOpenEditMunicipality = (mun: Municipality) => {
    if (!canEdit) return;
    setEditingMunicipality({ ...mun });
    setIsMunicipalityNew(false);
    setMunicipalityModalOpen(true);
  };

  const handleSaveMunicipality = async () => {
    if (!canEdit || !editingMunicipality) return;
    if (!editingMunicipality.id?.trim()) {
      await showDialog("市区町村コードを入力してください", true);
      return;
    }
    if (!editingMunicipality.name?.trim()) {
      await showDialog("市区町村名を入力してください", true);
      return;
    }
    if (!editingMunicipality.prefectureCode?.trim()) {
      await showDialog("都道府県を選択してください", true);
      return;
    }

    const confirmed = await showDialog(
      `市区町村「${editingMunicipality.name}」を${isMunicipalityNew ? "追加" : "更新"}しますか？`
    );
    if (!confirmed) return;

    setMunicipalityModalOpen(false);
    showSpinner();
    try {
      await saveMunicipality(editingMunicipality as Municipality);
      await writeLog({
        dataId: editingMunicipality.id,
        action: `市区町村マスタ${isMunicipalityNew ? "追加" : "更新"}`,
      });
      const updated = await getClientMunicipalities(editingMunicipality.prefectureCode);
      if (editingMunicipality.prefectureCode === selectedPrefectureCode) {
        setMunicipalities(updated);
      }
      const newTotal = await getClientMunicipalitiesTotalCount();
      setMunicipalitiesCount(newTotal);
      hideSpinner();
      await showDialog(`市区町村を${isMunicipalityNew ? "追加" : "更新"}しました`, true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 市区町村マスタ保存エラー:", err);
      await writeLog({
        dataId: editingMunicipality.id,
        action: `市区町村マスタ${isMunicipalityNew ? "追加" : "更新"}`,
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  const handleDeleteMunicipality = async (mun: Municipality) => {
    if (!canEdit) return;
    const confirmed = await showDialog(`市区町村「${mun.name}」を削除しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteMunicipality(mun.id);
      await writeLog({
        dataId: mun.id,
        action: "市区町村マスタ削除",
      });
      const updated = await getClientMunicipalities(mun.prefectureCode);
      setMunicipalities(updated);
      const newTotal = await getClientMunicipalitiesTotalCount();
      setMunicipalitiesCount(newTotal);
      hideSpinner();
      await showDialog("市区町村を削除しました", true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 市区町村マスタ削除エラー:", err);
      await writeLog({
        dataId: mun.id,
        action: "市区町村マスタ削除",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- 出欠ステータス (AttendanceStatus) ハンドラ ----

  const handleOpenAddAttendance = () => {
    if (!canEdit) return;
    const nextOrder = attendanceStatuses.length > 0 ? Math.max(...attendanceStatuses.map((a) => a.order || 0)) + 1 : 1;
    setEditingAttendance({
      id: String(nextOrder),
      name: "",
      order: nextOrder,
    });
    setIsAttendanceNew(true);
    setAttendanceModalOpen(true);
  };

  const handleOpenEditAttendance = (att: AttendanceStatus) => {
    if (!canEdit) return;
    setEditingAttendance({ ...att });
    setIsAttendanceNew(false);
    setAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async () => {
    if (!canEdit || !editingAttendance) return;
    if (!editingAttendance.id?.trim()) {
      await showDialog("ステータスIDを入力してください", true);
      return;
    }
    if (!editingAttendance.name?.trim()) {
      await showDialog("ステータス名を入力してください", true);
      return;
    }

    const confirmed = await showDialog(
      `出欠ステータス「${editingAttendance.name}」を${isAttendanceNew ? "追加" : "更新"}しますか？`
    );
    if (!confirmed) return;

    setAttendanceModalOpen(false);
    showSpinner();
    try {
      await saveAttendanceStatus(editingAttendance as AttendanceStatus);
      await writeLog({
        dataId: editingAttendance.id,
        action: `出欠ステータスマスタ${isAttendanceNew ? "追加" : "更新"}`,
      });
      const updated = await getClientAttendanceStatuses();
      setAttendanceStatuses(updated);
      hideSpinner();
      await showDialog(`出欠ステータスを${isAttendanceNew ? "追加" : "更新"}しました`, true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 出欠ステータス保存エラー:", err);
      await writeLog({
        dataId: editingAttendance.id,
        action: `出欠ステータスマスタ${isAttendanceNew ? "追加" : "更新"}`,
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  const handleDeleteAttendance = async (att: AttendanceStatus) => {
    if (!canEdit) return;
    const confirmed = await showDialog(`出欠ステータス「${att.name}」を削除しますか？\n※既存の出欠回答に影響する可能性があります。`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteAttendanceStatus(att.id);
      await writeLog({
        dataId: att.id,
        action: "出欠ステータスマスタ削除",
      });
      const updated = await getClientAttendanceStatuses();
      setAttendanceStatuses(updated);
      hideSpinner();
      await showDialog("出欠ステータスを削除しました", true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 出欠ステータス削除エラー:", err);
      await writeLog({
        dataId: att.id,
        action: "出欠ステータスマスタ削除",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- 日程調整ステータス (EventAdjustStatus) ハンドラ ----

  const handleOpenAddAdjust = () => {
    if (!canEdit) return;
    const nextOrder = eventAdjustStatuses.length > 0 ? Math.max(...eventAdjustStatuses.map((a) => a.order || 0)) + 1 : 1;
    setEditingAdjust({
      id: String(nextOrder),
      name: "",
      description: "",
      order: nextOrder,
    });
    setIsAdjustNew(true);
    setAdjustModalOpen(true);
  };

  const handleOpenEditAdjust = (adj: EventAdjustStatus) => {
    if (!canEdit) return;
    setEditingAdjust({ ...adj });
    setIsAdjustNew(false);
    setAdjustModalOpen(true);
  };

  const handleSaveAdjust = async () => {
    if (!canEdit || !editingAdjust) return;
    if (!editingAdjust.id?.trim()) {
      await showDialog("ステータスIDを入力してください", true);
      return;
    }
    if (!editingAdjust.name?.trim()) {
      await showDialog("記号/ステータス名を入力してください", true);
      return;
    }

    const confirmed = await showDialog(
      `日程調整ステータス「${editingAdjust.name}」を${isAdjustNew ? "追加" : "更新"}しますか？`
    );
    if (!confirmed) return;

    setAdjustModalOpen(false);
    showSpinner();
    try {
      await saveEventAdjustStatus(editingAdjust as EventAdjustStatus);
      await writeLog({
        dataId: editingAdjust.id,
        action: `日程調整ステータスマスタ${isAdjustNew ? "追加" : "更新"}`,
      });
      const updated = await getClientEventAdjustStatuses();
      setEventAdjustStatuses(updated);
      hideSpinner();
      await showDialog(`日程調整ステータスを${isAdjustNew ? "追加" : "更新"}しました`, true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 日程調整ステータス保存エラー:", err);
      await writeLog({
        dataId: editingAdjust.id,
        action: `日程調整ステータスマスタ${isAdjustNew ? "追加" : "更新"}`,
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  const handleDeleteAdjust = async (adj: EventAdjustStatus) => {
    if (!canEdit) return;
    const confirmed = await showDialog(`日程調整ステータス「${adj.name}」を削除しますか？\n※既存の日程回答に影響する可能性があります。`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteEventAdjustStatus(adj.id);
      await writeLog({
        dataId: adj.id,
        action: "日程調整ステータスマスタ削除",
      });
      const updated = await getClientEventAdjustStatuses();
      setEventAdjustStatuses(updated);
      hideSpinner();
      await showDialog("日程調整ステータスを削除しました", true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 日程調整ステータス削除エラー:", err);
      await writeLog({
        dataId: adj.id,
        action: "日程調整ステータスマスタ削除",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- 音楽ジャンル (Genre) ハンドラ ----

  const handleOpenAddGenre = () => {
    if (!canEdit) return;
    const nextOrder = genres.length > 0 ? Math.max(...genres.map((g) => g.order || 0)) + 1 : 1;
    setEditingGenre({
      id: String(nextOrder),
      name: "",
      order: nextOrder,
    });
    setIsGenreNew(true);
    setGenreModalOpen(true);
  };

  const handleOpenEditGenre = (gen: Genre) => {
    if (!canEdit) return;
    setEditingGenre({ ...gen });
    setIsGenreNew(false);
    setGenreModalOpen(true);
  };

  const handleSaveGenre = async () => {
    if (!canEdit || !editingGenre) return;
    if (!editingGenre.id?.trim()) {
      await showDialog("ジャンルIDを入力してください", true);
      return;
    }
    if (!editingGenre.name?.trim()) {
      await showDialog("ジャンル名を入力してください", true);
      return;
    }

    const confirmed = await showDialog(
      `ジャンル「${editingGenre.name}」を${isGenreNew ? "追加" : "更新"}しますか？`
    );
    if (!confirmed) return;

    setGenreModalOpen(false);
    showSpinner();
    try {
      await saveGenre(editingGenre as Genre);
      await writeLog({
        dataId: editingGenre.id,
        action: `ジャンルマスタ${isGenreNew ? "追加" : "更新"}`,
      });
      const updated = await getClientGenres();
      setGenres(updated);
      hideSpinner();
      await showDialog(`ジャンルを${isGenreNew ? "追加" : "更新"}しました`, true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] ジャンルマスタ保存エラー:", err);
      await writeLog({
        dataId: editingGenre.id,
        action: `ジャンルマスタ${isGenreNew ? "追加" : "更新"}`,
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  const handleDeleteGenre = async (gen: Genre) => {
    if (!canEdit) return;
    const confirmed = await showDialog(`ジャンル「${gen.name}」を削除しますか？\n※楽譜や曲募集のカテゴリ参照に影響する可能性があります。`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteGenre(gen.id);
      await writeLog({
        dataId: gen.id,
        action: "ジャンルマスタ削除",
      });
      const updated = await getClientGenres();
      setGenres(updated);
      hideSpinner();
      await showDialog("ジャンルを削除しました", true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] ジャンルマスタ削除エラー:", err);
      await writeLog({
        dataId: gen.id,
        action: "ジャンルマスタ削除",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- 譜面状況 (ScoreStatus) ハンドラ ----

  const handleOpenAddScoreStatus = () => {
    if (!canEdit) return;
    const nextOrder = scoreStatuses.length > 0 ? Math.max(...scoreStatuses.map((s) => s.order || 0)) + 1 : 1;
    setEditingScoreStatus({
      id: String(nextOrder),
      name: "",
      order: nextOrder,
    });
    setIsScoreStatusNew(true);
    setScoreStatusModalOpen(true);
  };

  const handleOpenEditScoreStatus = (sc: ScoreStatus) => {
    if (!canEdit) return;
    setEditingScoreStatus({ ...sc });
    setIsScoreStatusNew(false);
    setScoreStatusModalOpen(true);
  };

  const handleSaveScoreStatus = async () => {
    if (!canEdit || !editingScoreStatus) return;
    if (!editingScoreStatus.id?.trim()) {
      await showDialog("状況IDを入力してください", true);
      return;
    }
    if (!editingScoreStatus.name?.trim()) {
      await showDialog("譜面状況名を入力してください", true);
      return;
    }

    const confirmed = await showDialog(
      `譜面状況「${editingScoreStatus.name}」を${isScoreStatusNew ? "追加" : "更新"}しますか？`
    );
    if (!confirmed) return;

    setScoreStatusModalOpen(false);
    showSpinner();
    try {
      await saveScoreStatus(editingScoreStatus as ScoreStatus);
      await writeLog({
        dataId: editingScoreStatus.id,
        action: `譜面状況マスタ${isScoreStatusNew ? "追加" : "更新"}`,
      });
      const updated = await getClientScoreStatuses();
      setScoreStatuses(updated);
      hideSpinner();
      await showDialog(`譜面状況を${isScoreStatusNew ? "追加" : "更新"}しました`, true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 譜面状況マスタ保存エラー:", err);
      await writeLog({
        dataId: editingScoreStatus.id,
        action: `譜面状況マスタ${isScoreStatusNew ? "追加" : "更新"}`,
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  const handleDeleteScoreStatus = async (sc: ScoreStatus) => {
    if (!canEdit) return;
    const confirmed = await showDialog(`譜面状況「${sc.name}」を削除しますか？\n※既存の曲募集回答に影響する可能性があります。`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteScoreStatus(sc.id);
      await writeLog({
        dataId: sc.id,
        action: "譜面状況マスタ削除",
      });
      const updated = await getClientScoreStatuses();
      setScoreStatuses(updated);
      hideSpinner();
      await showDialog("譜面状況を削除しました", true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] 譜面状況マスタ削除エラー:", err);
      await writeLog({
        dataId: sc.id,
        action: "譜面状況マスタ削除",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- 初期マスタシード投入 ----

  const handleSeed = async () => {
    if (!canEdit) return;
    const confirmed = await showDialog(
      "全マスタデータ（パート、役職、楽器、出欠、日程調整、ジャンル、譜面状況、都道府県、市区町村）を Firestore に一括登録しますか？\n（JSONファイル定義に基づき初期データが登録・上書きされます）"
    );
    if (!confirmed) return;

    showSpinner();
    try {
      const res = await seedMasterData({
        onProgress: (msg) => {
          // 進捗ログ
          console.log(msg);
        },
      });
      await writeLog({
        action: "マスタデータ一括初期投入",
        dataId: "seed-all",
      });
      const [
        newSecs,
        newRoles,
        newInsts,
        newPrefs,
        newMunCount,
        newAtts,
        newAdjs,
        newGenres,
        newScoreStatuses,
      ] = await Promise.all([
        getClientSections(),
        getClientRoles(),
        getClientInstruments(),
        getClientPrefectures(),
        getClientMunicipalitiesTotalCount(),
        getClientAttendanceStatuses(),
        getClientEventAdjustStatuses(),
        getClientGenres(),
        getClientScoreStatuses(),
      ]);
      setSections(newSecs);
      setRoles(newRoles);
      setInstruments(newInsts);
      setPrefectures(newPrefs);
      setMunicipalitiesCount(newMunCount);
      setAttendanceStatuses(newAtts);
      setEventAdjustStatuses(newAdjs);
      setGenres(newGenres);
      setScoreStatuses(newScoreStatuses);

      setFromDefaultMap({
        sections: false,
        roles: false,
        instruments: false,
        attendance: false,
        adjust: false,
        genres: false,
        scoreStatus: false,
        prefectures: false,
        municipalities: false,
      });

      if (selectedPrefectureCode) {
        const updatedMuns = await getClientMunicipalities(selectedPrefectureCode);
        setMunicipalities(updatedMuns);
      }

      hideSpinner();
      await showDialog(
        `初期マスタを一括登録しました。\n・パート: ${res.sectionsCount}件\n・役職: ${res.rolesCount}件\n・楽器: ${res.instrumentsCount}件\n・出欠: ${res.attendanceStatusesCount}件\n・日程調整: ${res.eventAdjustStatusesCount}件\n・ジャンル: ${res.genresCount}件\n・譜面状況: ${res.scoreStatusesCount}件\n・都道府県: ${res.prefecturesCount}件\n・市区町村: ${res.municipalitiesCount}件`,
        true
      );
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[MasterMaintenanceClient] マスタデータ初期投入エラー:", err);
      await writeLog({
        action: "マスタデータ一括初期投入",
        dataId: "seed-all",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("初期投入に失敗しました", true);
    }
  };

  // ---- 初期マスタシード投入 (マスタ個別) ----

  const handleSeedSingle = async (tab: TabType) => {
    if (!canEdit) return;
    const config = TAB_CONFIG[tab];
    const confirmed = await showDialog(
      `「${config.label}マスタ」の初期データを Firestore に登録しますか？\n（JSONファイル定義に基づき初期データが登録・上書きされます）`
    );
    if (!confirmed) return;

    showSpinner();
    try {
      const res = await seedMasterData({
        includeSections: tab === "sections",
        includeRoles: tab === "roles",
        includeInstruments: tab === "instruments",
        includeAttendanceStatuses: tab === "attendance",
        includeEventAdjustStatuses: tab === "adjust",
        includeGenres: tab === "genres",
        includeScoreStatuses: tab === "scoreStatus",
        includePrefectures: tab === "prefectures",
        includeMunicipalities: tab === "municipalities",
        onProgress: (msg) => console.log(msg),
      });

      await writeLog({
        action: `マスタデータ個別初期投入: ${config.label}`,
        dataId: `seed-${tab}`,
      });

      // 最新データ再取得
      if (tab === "sections") {
        const data = await getClientSections();
        setSections(data);
      } else if (tab === "roles") {
        const data = await getClientRoles();
        setRoles(data);
      } else if (tab === "instruments") {
        const data = await getClientInstruments();
        setInstruments(data);
      } else if (tab === "attendance") {
        const data = await getClientAttendanceStatuses();
        setAttendanceStatuses(data);
      } else if (tab === "adjust") {
        const data = await getClientEventAdjustStatuses();
        setEventAdjustStatuses(data);
      } else if (tab === "genres") {
        const data = await getClientGenres();
        setGenres(data);
      } else if (tab === "scoreStatus") {
        const data = await getClientScoreStatuses();
        setScoreStatuses(data);
      } else if (tab === "prefectures") {
        const data = await getClientPrefectures();
        setPrefectures(data);
      } else if (tab === "municipalities") {
        const count = await getClientMunicipalitiesTotalCount();
        setMunicipalitiesCount(count);
        if (selectedPrefectureCode) {
          const updatedMuns = await getClientMunicipalities(selectedPrefectureCode);
          setMunicipalities(updatedMuns);
        }
      }

      setFromDefaultMap((prev) => ({
        ...prev,
        [tab]: false,
      }));

      hideSpinner();
      await showDialog(`「${config.label}マスタ」の初期データを登録しました。`, true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error(`[MasterMaintenanceClient] ${config.label}初期投入エラー:`, err);
      await writeLog({
        action: `マスタデータ個別初期投入: ${config.label}`,
        dataId: `seed-${tab}`,
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog(`${config.label}マスタの初期投入に失敗しました`, true);
    }
  };

  // 各タブ共通のカードヘッダー & 未登録アラート描画
  const renderMasterHeader = (tabKey: TabType, title: string) => {
    const isDefault = fromDefaultMap[tabKey];
    const config = TAB_CONFIG[tabKey];

    return (
      <>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <h2 className={styles.cardTitle}>{title}</h2>
            {isDefault ? (
              <span className={styles.badgeUnregistered}>
                <FontAwesomeIcon icon={faTriangleExclamation} /> マスタ未登録（初期JSONを表示中）
              </span>
            ) : (
              <span className={styles.badgeRegistered}>
                <FontAwesomeIcon icon={faCircleCheck} /> Firestore登録済み
              </span>
            )}
          </div>
          {canEdit && (
            <div className={styles.cardHeaderActions}>
              <button
                type="button"
                className={styles.btnSeedSingle}
                onClick={() => handleSeedSingle(tabKey)}
                title={`${config.label}マスタの初期データをFirestoreに投入します`}
              >
                <FontAwesomeIcon icon={faDatabase} /> {config.label}初期投入
              </button>
            </div>
          )}
        </div>

        {isDefault && (
          <div className={styles.unregisteredAlert}>
            <div className={styles.unregisteredAlertIcon}>
              <FontAwesomeIcon icon={faTriangleExclamation} />
            </div>
            <div className={styles.unregisteredAlertContent}>
              <strong className={styles.unregisteredAlertTitle}>
                {config.label}マスタは未登録です（初期設定JSONを表示中）
              </strong>
              <p className={styles.unregisteredAlertDesc}>
                Firestoreにデータが存在しないため、定義ファイル（<code>src/data/master/*.json</code>）の内容を表示しています。
                マスタデータをFirestoreに登録して編集・追加・削除できるようにするには、「{config.label}初期投入」ボタンを押してください。
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                className={styles.btnUnregisteredAlertAction}
                onClick={() => handleSeedSingle(tabKey)}
              >
                <FontAwesomeIcon icon={faDatabase} /> {config.label}初期データを投入
              </button>
            )}
          </div>
        )}
      </>
    );
  };

  // セクションIDからパート名を取得する辞書
  const sectionMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [sections]);

  // 市区町村の検索フィルター
  const filteredMunicipalities = React.useMemo(() => {
    if (!municipalitySearchQuery.trim()) return municipalities;
    const q = municipalitySearchQuery.trim().toLowerCase();
    return municipalities.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
    );
  }, [municipalities, municipalitySearchQuery]);

  return (
    <BaseLayout>
      <div className={styles.container}>
        {/* ヘッダーエリア */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>
              <FontAwesomeIcon icon={faSliders} />
              マスタ管理
            </h1>
            {canEdit ? (
              <span className={`${styles.badge} ${styles.badgeAdmin}`}>
                <FontAwesomeIcon icon={faShieldHalved} /> 管理者モード
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeReadOnly}`}>
                <FontAwesomeIcon icon={faLock} /> 閲覧のみ
              </span>
            )}
          </div>

          <div className={styles.headerActions}>
            {canEdit && (
              <>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={handleSeed}
                  title="全マスタの初期データをFirestoreに一括投入します"
                >
                  <FontAwesomeIcon icon={faDatabase} /> 全マスタ一括初期投入
                </button>
                <button
                  type="button"
                  className={styles.btnSeedCurrentTab}
                  onClick={() => handleSeedSingle(currentTab)}
                  title={`${TAB_CONFIG[currentTab].label}マスタの初期データをFirestoreに投入します`}
                >
                  <FontAwesomeIcon icon={faDatabase} /> {TAB_CONFIG[currentTab].label}初期データ投入
                </button>
                {currentTab === "sections" && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddSection}
                  >
                    <FontAwesomeIcon icon={faPlus} /> パート追加
                  </button>
                )}
                {currentTab === "roles" && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddRole}
                  >
                    <FontAwesomeIcon icon={faPlus} /> 役職追加
                  </button>
                )}
                {currentTab === "instruments" && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddInstrument}
                  >
                    <FontAwesomeIcon icon={faPlus} /> 楽器追加
                  </button>
                )}
                {currentTab === "attendance" && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddAttendance}
                  >
                    <FontAwesomeIcon icon={faPlus} /> 出欠ステータス追加
                  </button>
                )}
                {currentTab === "adjust" && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddAdjust}
                  >
                    <FontAwesomeIcon icon={faPlus} /> 日程調整ステータス追加
                  </button>
                )}
                {currentTab === "genres" && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddGenre}
                  >
                    <FontAwesomeIcon icon={faPlus} /> ジャンル追加
                  </button>
                )}
                {currentTab === "scoreStatus" && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddScoreStatus}
                  >
                    <FontAwesomeIcon icon={faPlus} /> 譜面状況追加
                  </button>
                )}
                {currentTab === "prefectures" && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddPrefecture}
                  >
                    <FontAwesomeIcon icon={faPlus} /> 都道府県追加
                  </button>
                )}
                {currentTab === "municipalities" && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddMunicipality}
                  >
                    <FontAwesomeIcon icon={faPlus} /> 市区町村追加
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* タブバー */}
        <div className={styles.tabBar}>
          <button
            type="button"
            className={`${styles.tabItem} ${currentTab === "sections" ? styles.tabItemActive : ""}`}
            onClick={() => setCurrentTab("sections")}
          >
            <FontAwesomeIcon icon={faLayerGroup} />
            パート
            <span className={styles.tabBadge}>{sections.length}</span>
            {fromDefaultMap.sections && (
              <span className={styles.tabBadgeUnregistered}>未登録</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabItem} ${currentTab === "roles" ? styles.tabItemActive : ""}`}
            onClick={() => setCurrentTab("roles")}
          >
            <FontAwesomeIcon icon={faUserGear} />
            役職
            <span className={styles.tabBadge}>{roles.length}</span>
            {fromDefaultMap.roles && (
              <span className={styles.tabBadgeUnregistered}>未登録</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabItem} ${currentTab === "instruments" ? styles.tabItemActive : ""}`}
            onClick={() => setCurrentTab("instruments")}
          >
            <FontAwesomeIcon icon={faGuitar} />
            楽器
            <span className={styles.tabBadge}>{instruments.length}</span>
            {fromDefaultMap.instruments && (
              <span className={styles.tabBadgeUnregistered}>未登録</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabItem} ${currentTab === "attendance" ? styles.tabItemActive : ""}`}
            onClick={() => setCurrentTab("attendance")}
          >
            <FontAwesomeIcon icon={faUserCheck} />
            出欠
            <span className={styles.tabBadge}>{attendanceStatuses.length}</span>
            {fromDefaultMap.attendance && (
              <span className={styles.tabBadgeUnregistered}>未登録</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabItem} ${currentTab === "adjust" ? styles.tabItemActive : ""}`}
            onClick={() => setCurrentTab("adjust")}
          >
            <FontAwesomeIcon icon={faCalendarDays} />
            日程調整
            <span className={styles.tabBadge}>{eventAdjustStatuses.length}</span>
            {fromDefaultMap.adjust && (
              <span className={styles.tabBadgeUnregistered}>未登録</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabItem} ${currentTab === "genres" ? styles.tabItemActive : ""}`}
            onClick={() => setCurrentTab("genres")}
          >
            <FontAwesomeIcon icon={faMusic} />
            ジャンル
            <span className={styles.tabBadge}>{genres.length}</span>
            {fromDefaultMap.genres && (
              <span className={styles.tabBadgeUnregistered}>未登録</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabItem} ${currentTab === "scoreStatus" ? styles.tabItemActive : ""}`}
            onClick={() => setCurrentTab("scoreStatus")}
          >
            <FontAwesomeIcon icon={faFileLines} />
            譜面状況
            <span className={styles.tabBadge}>{scoreStatuses.length}</span>
            {fromDefaultMap.scoreStatus && (
              <span className={styles.tabBadgeUnregistered}>未登録</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabItem} ${currentTab === "prefectures" ? styles.tabItemActive : ""}`}
            onClick={() => setCurrentTab("prefectures")}
          >
            <FontAwesomeIcon icon={faLocationDot} />
            都道府県
            <span className={styles.tabBadge}>{prefectures.length}</span>
            {fromDefaultMap.prefectures && (
              <span className={styles.tabBadgeUnregistered}>未登録</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tabItem} ${currentTab === "municipalities" ? styles.tabItemActive : ""}`}
            onClick={() => setCurrentTab("municipalities")}
          >
            <FontAwesomeIcon icon={faBuilding} />
            市区町村
            <span className={styles.tabBadge}>{municipalitiesCount}</span>
            {fromDefaultMap.municipalities && (
              <span className={styles.tabBadgeUnregistered}>未登録</span>
            )}
          </button>
        </div>


        {/* タブコンテンツ: パート一覧 */}
        {currentTab === "sections" && (
          <div className={styles.contentCard}>
            {renderMasterHeader("sections", "パート一覧")}
            {sections.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FontAwesomeIcon icon={faFolderOpen} />
                </div>
                <p>登録されているパートはありません</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "70px", minWidth: "70px" }}>ID</th>
                      <th style={{ minWidth: "150px" }}>パート名</th>
                      <th style={{ width: "130px", minWidth: "130px" }}>略称</th>
                      <th style={{ width: "130px", minWidth: "130px" }}>表示色</th>
                      <th style={{ width: "80px", minWidth: "80px", textAlign: "center" }}>並び順</th>
                      {canEdit && <th style={{ width: "160px", minWidth: "160px", textAlign: "right" }}>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((sec) => (
                      <tr key={sec.id}>
                        <td>
                          <code style={{ fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {sec.id}
                          </code>
                        </td>
                        <td>
                          <strong>{sec.name}</strong>
                        </td>
                        <td>
                          <span style={{ color: "#475569", fontWeight: 600 }}>{sec.shortName}</span>
                        </td>
                        <td>
                          {sec.color ? (
                            <span style={{ display: "inline-flex", alignItems: "center" }}>
                              <span
                                className={styles.colorPreview}
                                style={{ backgroundColor: sec.color }}
                              />
                              <code style={{ fontSize: "11px", color: "#64748b" }}>{sec.color}</code>
                            </span>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>-</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          {sec.order ?? "-"}
                        </td>
                        {canEdit && (
                          <td>
                            <div className={styles.actionsCell}>
                              <button
                                type="button"
                                className={styles.btnActionEdit}
                                onClick={() => handleOpenEditSection(sec)}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>編集</span>
                              </button>
                              <button
                                type="button"
                                className={styles.btnActionDelete}
                                onClick={() => handleDeleteSection(sec)}
                                title="削除"
                                aria-label="削除"
                              >
                                <FontAwesomeIcon icon={faTrashCan} />
                                <span>削除</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* タブコンテンツ: 役職一覧 */}
        {currentTab === "roles" && (
          <div className={styles.contentCard}>
            {renderMasterHeader("roles", "役職一覧")}
            {roles.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FontAwesomeIcon icon={faFolderOpen} />
                </div>
                <p>登録されている役職はありません</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "70px", minWidth: "70px" }}>ID</th>
                      <th style={{ minWidth: "160px" }}>役職名</th>
                      <th style={{ minWidth: "220px" }}>説明</th>
                      <th style={{ width: "80px", minWidth: "80px", textAlign: "center" }}>並び順</th>
                      {canEdit && <th style={{ width: "160px", minWidth: "160px", textAlign: "right" }}>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id}>
                        <td>
                          <code style={{ fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {role.id}
                          </code>
                        </td>
                        <td>
                          <strong>{role.name}</strong>
                        </td>
                        <td>
                          <span style={{ color: "#475569" }}>{role.description || "-"}</span>
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          {role.order ?? "-"}
                        </td>
                        {canEdit && (
                          <td>
                            <div className={styles.actionsCell}>
                              <button
                                type="button"
                                className={styles.btnActionEdit}
                                onClick={() => handleOpenEditRole(role)}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>編集</span>
                              </button>
                              <button
                                type="button"
                                className={styles.btnActionDelete}
                                onClick={() => handleDeleteRole(role)}
                                title="削除"
                                aria-label="削除"
                              >
                                <FontAwesomeIcon icon={faTrashCan} />
                                <span>削除</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* タブコンテンツ: 楽器一覧 */}
        {currentTab === "instruments" && (
          <div className={styles.contentCard}>
            {renderMasterHeader("instruments", "楽器一覧")}
            {instruments.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FontAwesomeIcon icon={faGuitar} />
                </div>
                <p>登録されている楽器はありません</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px", minWidth: "80px" }}>ID</th>
                      <th style={{ minWidth: "160px" }}>楽器名</th>
                      <th style={{ width: "180px", minWidth: "180px" }}>所属パート</th>
                      <th style={{ width: "80px", minWidth: "80px", textAlign: "center" }}>並び順</th>
                      {canEdit && <th style={{ width: "160px", minWidth: "160px", textAlign: "right" }}>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {instruments.map((inst) => (
                      <tr key={inst.id}>
                        <td>
                          <code style={{ fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {inst.id}
                          </code>
                        </td>
                        <td>
                          <strong>{inst.name}</strong>
                        </td>
                        <td>
                          <span style={{ color: "#334155" }}>
                            {sectionMap[inst.sectionId] || `ID: ${inst.sectionId}`}
                          </span>
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          {inst.order ?? "-"}
                        </td>
                        {canEdit && (
                          <td>
                            <div className={styles.actionsCell}>
                              <button
                                type="button"
                                className={styles.btnActionEdit}
                                onClick={() => handleOpenEditInstrument(inst)}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>編集</span>
                              </button>
                              <button
                                type="button"
                                className={styles.btnActionDelete}
                                onClick={() => handleDeleteInstrument(inst)}
                                title="削除"
                                aria-label="削除"
                              >
                                <FontAwesomeIcon icon={faTrashCan} />
                                <span>削除</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* タブコンテンツ: 出欠ステータス一覧 */}
        {currentTab === "attendance" && (
          <div className={styles.contentCard}>
            {renderMasterHeader("attendance", `出欠ステータス一覧（全${attendanceStatuses.length}件）`)}
            {attendanceStatuses.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FontAwesomeIcon icon={faFolderOpen} />
                </div>
                <p>登録されている出欠ステータスはありません</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px", minWidth: "80px" }}>ID</th>
                      <th style={{ minWidth: "160px" }}>ステータス名</th>
                      <th style={{ width: "80px", minWidth: "80px", textAlign: "center" }}>並び順</th>
                      {canEdit && <th style={{ width: "160px", minWidth: "160px", textAlign: "right" }}>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceStatuses.map((att) => (
                      <tr key={att.id}>
                        <td>
                          <code style={{ fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {att.id}
                          </code>
                        </td>
                        <td>
                          <strong>{att.name}</strong>
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          {att.order ?? "-"}
                        </td>
                        {canEdit && (
                          <td>
                            <div className={styles.actionsCell}>
                              <button
                                type="button"
                                className={styles.btnActionEdit}
                                onClick={() => handleOpenEditAttendance(att)}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>編集</span>
                              </button>
                              <button
                                type="button"
                                className={styles.btnActionDelete}
                                onClick={() => handleDeleteAttendance(att)}
                                title="削除"
                                aria-label="削除"
                              >
                                <FontAwesomeIcon icon={faTrashCan} />
                                <span>削除</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* タブコンテンツ: 日程調整ステータス一覧 */}
        {currentTab === "adjust" && (
          <div className={styles.contentCard}>
            {renderMasterHeader("adjust", `日程調整ステータス一覧（全${eventAdjustStatuses.length}件）`)}
            {eventAdjustStatuses.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FontAwesomeIcon icon={faFolderOpen} />
                </div>
                <p>登録されている日程調整ステータスはありません</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px", minWidth: "80px" }}>ID</th>
                      <th style={{ width: "120px", minWidth: "120px" }}>記号 / 名称</th>
                      <th style={{ minWidth: "180px" }}>説明</th>
                      <th style={{ width: "80px", minWidth: "80px", textAlign: "center" }}>並び順</th>
                      {canEdit && <th style={{ width: "160px", minWidth: "160px", textAlign: "right" }}>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {eventAdjustStatuses.map((adj) => (
                      <tr key={adj.id}>
                        <td>
                          <code style={{ fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {adj.id}
                          </code>
                        </td>
                        <td>
                          <strong style={{ fontSize: "1.1rem" }}>{adj.name}</strong>
                        </td>
                        <td style={{ color: "#64748b" }}>
                          {adj.description || "-"}
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          {adj.order ?? "-"}
                        </td>
                        {canEdit && (
                          <td>
                            <div className={styles.actionsCell}>
                              <button
                                type="button"
                                className={styles.btnActionEdit}
                                onClick={() => handleOpenEditAdjust(adj)}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>編集</span>
                              </button>
                              <button
                                type="button"
                                className={styles.btnActionDelete}
                                onClick={() => handleDeleteAdjust(adj)}
                                title="削除"
                                aria-label="削除"
                              >
                                <FontAwesomeIcon icon={faTrashCan} />
                                <span>削除</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* タブコンテンツ: ジャンル一覧 */}
        {currentTab === "genres" && (
          <div className={styles.contentCard}>
            {renderMasterHeader("genres", `ジャンル一覧（全${genres.length}件）`)}
            {genres.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FontAwesomeIcon icon={faFolderOpen} />
                </div>
                <p>登録されているジャンルはありません</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px", minWidth: "80px" }}>ID</th>
                      <th style={{ minWidth: "180px" }}>ジャンル名</th>
                      <th style={{ width: "80px", minWidth: "80px", textAlign: "center" }}>並び順</th>
                      {canEdit && <th style={{ width: "160px", minWidth: "160px", textAlign: "right" }}>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {genres.map((gen) => (
                      <tr key={gen.id}>
                        <td>
                          <code style={{ fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {gen.id}
                          </code>
                        </td>
                        <td>
                          <strong>{gen.name}</strong>
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          {gen.order ?? "-"}
                        </td>
                        {canEdit && (
                          <td>
                            <div className={styles.actionsCell}>
                              <button
                                type="button"
                                className={styles.btnActionEdit}
                                onClick={() => handleOpenEditGenre(gen)}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>編集</span>
                              </button>
                              <button
                                type="button"
                                className={styles.btnActionDelete}
                                onClick={() => handleDeleteGenre(gen)}
                                title="削除"
                                aria-label="削除"
                              >
                                <FontAwesomeIcon icon={faTrashCan} />
                                <span>削除</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* タブコンテンツ: 譜面状況一覧 */}
        {currentTab === "scoreStatus" && (
          <div className={styles.contentCard}>
            {renderMasterHeader("scoreStatus", `譜面状況一覧（全${scoreStatuses.length}件）`)}
            {scoreStatuses.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FontAwesomeIcon icon={faFolderOpen} />
                </div>
                <p>登録されている譜面状況はありません</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "80px", minWidth: "80px" }}>ID</th>
                      <th style={{ minWidth: "200px" }}>状況名</th>
                      <th style={{ width: "80px", minWidth: "80px", textAlign: "center" }}>並び順</th>
                      {canEdit && <th style={{ width: "160px", minWidth: "160px", textAlign: "right" }}>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {scoreStatuses.map((sc) => (
                      <tr key={sc.id}>
                        <td>
                          <code style={{ fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {sc.id}
                          </code>
                        </td>
                        <td>
                          <strong>{sc.name}</strong>
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          {sc.order ?? "-"}
                        </td>
                        {canEdit && (
                          <td>
                            <div className={styles.actionsCell}>
                              <button
                                type="button"
                                className={styles.btnActionEdit}
                                onClick={() => handleOpenEditScoreStatus(sc)}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>編集</span>
                              </button>
                              <button
                                type="button"
                                className={styles.btnActionDelete}
                                onClick={() => handleDeleteScoreStatus(sc)}
                                title="削除"
                                aria-label="削除"
                              >
                                <FontAwesomeIcon icon={faTrashCan} />
                                <span>削除</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* タブコンテンツ: 都道府県一覧 */}
        {currentTab === "prefectures" && (

          <div className={styles.contentCard}>
            {renderMasterHeader("prefectures", `都道府県一覧（全${prefectures.length}件）`)}
            {prefectures.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FontAwesomeIcon icon={faFolderOpen} />
                </div>
                <p>登録されている都道府県はありません</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "90px", minWidth: "90px" }}>コード</th>
                      <th style={{ minWidth: "180px" }}>都道府県名</th>
                      <th style={{ width: "90px", minWidth: "90px", textAlign: "center" }}>並び順</th>
                      {canEdit && <th style={{ width: "160px", minWidth: "160px", textAlign: "right" }}>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {prefectures.map((pref) => (
                      <tr key={pref.id}>
                        <td>
                          <code style={{ fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {pref.id}
                          </code>
                        </td>
                        <td>
                          <strong>{pref.name}</strong>
                        </td>
                        <td style={{ textAlign: "center", color: "#64748b" }}>
                          {pref.order ?? "-"}
                        </td>
                        {canEdit && (
                          <td>
                            <div className={styles.actionsCell}>
                              <button
                                type="button"
                                className={styles.btnActionEdit}
                                onClick={() => handleOpenEditPrefecture(pref)}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>編集</span>
                              </button>
                              <button
                                type="button"
                                className={styles.btnActionDelete}
                                onClick={() => handleDeletePrefecture(pref)}
                                title="削除"
                                aria-label="削除"
                              >
                                <FontAwesomeIcon icon={faTrashCan} />
                                <span>削除</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* タブコンテンツ: 市区町村一覧 */}
        {currentTab === "municipalities" && (
          <div className={styles.contentCard}>
            {renderMasterHeader("municipalities", `市区町村一覧（マスタ総数: ${municipalitiesCount}件）`)}
            {/* 検索・絞り込みフィルターバー */}
            <div className={styles.filterBar}>
              <select
                value={selectedPrefectureCode}
                onChange={(e) => setSelectedPrefectureCode(e.target.value)}
                className={styles.filterSelect}
                aria-label="都道府県を選択"
              >
                {prefectures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id}: {p.name}
                  </option>
                ))}
              </select>
              <div className={styles.filterSearch}>
                <FontAwesomeIcon icon={faMagnifyingGlass} style={{ color: "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="市区町村名・コードで絞り込み..."
                  value={municipalitySearchQuery}
                  onChange={(e) => setMunicipalitySearchQuery(e.target.value)}
                />
              </div>
            </div>

            {isLoadingMunicipalities ? (
              <div className={styles.emptyState}>
                <p>市区町村データを読み込み中...</p>
              </div>
            ) : filteredMunicipalities.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <FontAwesomeIcon icon={faFolderOpen} />
                </div>
                <p>該当する市区町村はありません</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: "100px", minWidth: "100px" }}>コード</th>
                      <th style={{ minWidth: "180px" }}>市区町村名</th>
                      <th style={{ width: "120px", minWidth: "120px" }}>都道府県</th>
                      {canEdit && <th style={{ width: "160px", minWidth: "160px", textAlign: "right" }}>操作</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMunicipalities.map((mun) => (
                      <tr key={mun.id}>
                        <td>
                          <code style={{ fontSize: "12px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                            {mun.id}
                          </code>
                        </td>
                        <td>
                          <strong>{mun.name}</strong>
                        </td>
                        <td>
                          <span style={{ color: "#64748b" }}>
                            {prefectures.find((p) => p.id === mun.prefectureCode)?.name || mun.prefectureCode}
                          </span>
                        </td>
                        {canEdit && (
                          <td>
                            <div className={styles.actionsCell}>
                              <button
                                type="button"
                                className={styles.btnActionEdit}
                                onClick={() => handleOpenEditMunicipality(mun)}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                                <span>編集</span>
                              </button>
                              <button
                                type="button"
                                className={styles.btnActionDelete}
                                onClick={() => handleDeleteMunicipality(mun)}
                                title="削除"
                                aria-label="削除"
                              >
                                <FontAwesomeIcon icon={faTrashCan} />
                                <span>削除</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* パート追加・編集モーダル */}
        {sectionModalOpen && editingSection && (
          <Modal
            onClose={() => setSectionModalOpen(false)}
            title={isSectionNew ? "パートの追加" : "パートの編集"}
          >
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>パートID (半角英数字)</label>
                <input
                  type="text"
                  value={editingSection.id || ""}
                  onChange={(e) =>
                    setEditingSection((prev) => ({ ...prev, id: e.target.value }))
                  }
                  disabled={!isSectionNew}
                  className={styles.formInput}
                  placeholder="例: 1, sax"
                />
                {!isSectionNew && (
                  <p className={styles.formHelp}>※一度作成したIDは変更できません。</p>
                )}
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>パート名</label>
                <input
                  type="text"
                  value={editingSection.name || ""}
                  onChange={(e) =>
                    setEditingSection((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: Saxophone (サックス)"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>略称</label>
                <input
                  type="text"
                  value={editingSection.shortName || ""}
                  onChange={(e) =>
                    setEditingSection((prev) => ({ ...prev, shortName: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: Sax"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>表示カラー</label>
                <div className={styles.colorPickerRow}>
                  <input
                    type="color"
                    value={editingSection.color || "#146081"}
                    onChange={(e) =>
                      setEditingSection((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className={styles.colorInput}
                  />
                  <input
                    type="text"
                    value={editingSection.color || "#146081"}
                    onChange={(e) =>
                      setEditingSection((prev) => ({ ...prev, color: e.target.value }))
                    }
                    className={styles.formInput}
                    style={{ width: "120px" }}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>並び順 (数値)</label>
                <input
                  type="number"
                  value={editingSection.order ?? 0}
                  onChange={(e) =>
                    setEditingSection((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value) || 0,
                    }))
                  }
                  className={styles.formInput}
                  placeholder="例: 1"
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSectionModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSaveSection}
                >
                  {isSectionNew ? "追加する" : "保存する"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* 楽器追加・編集モーダル */}
        {instrumentModalOpen && editingInstrument && (
          <Modal
            onClose={() => setInstrumentModalOpen(false)}
            title={isInstrumentNew ? "楽器の追加" : "楽器の編集"}
          >
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>楽器ID (半角英数字)</label>
                <input
                  type="text"
                  value={editingInstrument.id || ""}
                  onChange={(e) =>
                    setEditingInstrument((prev) => ({ ...prev, id: e.target.value }))
                  }
                  disabled={!isInstrumentNew}
                  className={styles.formInput}
                  placeholder="例: as, tp, dr"
                />
                {!isInstrumentNew && (
                  <p className={styles.formHelp}>※一度作成したIDは変更できません。</p>
                )}
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>楽器名</label>
                <input
                  type="text"
                  value={editingInstrument.name || ""}
                  onChange={(e) =>
                    setEditingInstrument((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: Alto Saxophone"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>所属パート</label>
                <select
                  value={editingInstrument.sectionId || ""}
                  onChange={(e) =>
                    setEditingInstrument((prev) => ({ ...prev, sectionId: e.target.value }))
                  }
                  className={styles.formInput}
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.shortName})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>並び順 (数値)</label>
                <input
                  type="number"
                  value={editingInstrument.order ?? 0}
                  onChange={(e) =>
                    setEditingInstrument((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value) || 0,
                    }))
                  }
                  className={styles.formInput}
                  placeholder="例: 10"
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setInstrumentModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSaveInstrument}
                >
                  {isInstrumentNew ? "追加する" : "保存する"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* 役職追加・編集モーダル */}
        {roleModalOpen && editingRole && (
          <Modal
            onClose={() => setRoleModalOpen(false)}
            title={isRoleNew ? "役職の追加" : "役職の編集"}
          >
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>役職ID (半角英数字)</label>
                <input
                  type="text"
                  value={editingRole.id || ""}
                  onChange={(e) =>
                    setEditingRole((prev) => ({ ...prev, id: e.target.value }))
                  }
                  disabled={!isRoleNew}
                  className={styles.formInput}
                  placeholder="例: 1, leader"
                />
                {!isRoleNew && (
                  <p className={styles.formHelp}>※一度作成したIDは変更できません。</p>
                )}
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>役職名</label>
                <input
                  type="text"
                  value={editingRole.name || ""}
                  onChange={(e) =>
                    setEditingRole((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: 👑バンマス"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>説明</label>
                <input
                  type="text"
                  value={editingRole.description || ""}
                  onChange={(e) =>
                    setEditingRole((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: バンドマスター / 音楽監督・進行"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>並び順 (数値)</label>
                <input
                  type="number"
                  value={editingRole.order ?? 0}
                  onChange={(e) =>
                    setEditingRole((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value) || 0,
                    }))
                  }
                  className={styles.formInput}
                  placeholder="例: 1"
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setRoleModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSaveRole}
                >
                  {isRoleNew ? "追加する" : "保存する"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* 都道府県追加・編集モーダル */}
        {prefectureModalOpen && editingPrefecture && (
          <Modal
            onClose={() => setPrefectureModalOpen(false)}
            title={isPrefectureNew ? "都道府県の追加" : "都道府県の編集"}
          >
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>都道府県コード (2桁数値 例: 01, 38)</label>
                <input
                  type="text"
                  value={editingPrefecture.id || ""}
                  onChange={(e) =>
                    setEditingPrefecture((prev) => ({ ...prev, id: e.target.value }))
                  }
                  disabled={!isPrefectureNew}
                  className={styles.formInput}
                  placeholder="例: 38"
                />
                {!isPrefectureNew && (
                  <p className={styles.formHelp}>※一度作成したコードは変更できません。</p>
                )}
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>都道府県名</label>
                <input
                  type="text"
                  value={editingPrefecture.name || ""}
                  onChange={(e) =>
                    setEditingPrefecture((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: 愛媛県"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>並び順 (数値)</label>
                <input
                  type="number"
                  value={editingPrefecture.order ?? 0}
                  onChange={(e) =>
                    setEditingPrefecture((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value) || 0,
                    }))
                  }
                  className={styles.formInput}
                  placeholder="例: 38"
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setPrefectureModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSavePrefecture}
                >
                  {isPrefectureNew ? "追加する" : "保存する"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* 市区町村追加・編集モーダル */}
        {municipalityModalOpen && editingMunicipality && (
          <Modal
            onClose={() => setMunicipalityModalOpen(false)}
            title={isMunicipalityNew ? "市区町村の追加" : "市区町村の編集"}
          >
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>市区町村コード (5桁数値 例: 38201)</label>
                <input
                  type="text"
                  value={editingMunicipality.id || ""}
                  onChange={(e) =>
                    setEditingMunicipality((prev) => ({ ...prev, id: e.target.value }))
                  }
                  disabled={!isMunicipalityNew}
                  className={styles.formInput}
                  placeholder="例: 38201"
                />
                {!isMunicipalityNew && (
                  <p className={styles.formHelp}>※一度作成したコードは変更できません。</p>
                )}
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>市区町村名</label>
                <input
                  type="text"
                  value={editingMunicipality.name || ""}
                  onChange={(e) =>
                    setEditingMunicipality((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: 松山市"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>所属都道府県</label>
                <select
                  value={editingMunicipality.prefectureCode || selectedPrefectureCode}
                  onChange={(e) =>
                    setEditingMunicipality((prev) => ({ ...prev, prefectureCode: e.target.value }))
                  }
                  className={styles.formInput}
                >
                  {prefectures.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id}: {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setMunicipalityModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSaveMunicipality}
                >
                  {isMunicipalityNew ? "追加する" : "保存する"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* 出欠ステータス追加・編集モーダル */}
        {attendanceModalOpen && editingAttendance && (
          <Modal
            onClose={() => setAttendanceModalOpen(false)}
            title={isAttendanceNew ? "出欠ステータスの追加" : "出欠ステータスの編集"}
          >
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>ステータスID (数値 例: 1)</label>
                <input
                  type="text"
                  value={editingAttendance.id || ""}
                  onChange={(e) =>
                    setEditingAttendance((prev) => ({ ...prev, id: e.target.value }))
                  }
                  disabled={!isAttendanceNew}
                  className={styles.formInput}
                  placeholder="例: 1"
                />
                {!isAttendanceNew && (
                  <p className={styles.formHelp}>※一度作成したIDは変更できません。</p>
                )}
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>ステータス名</label>
                <input
                  type="text"
                  value={editingAttendance.name || ""}
                  onChange={(e) =>
                    setEditingAttendance((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: 出席"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>並び順 (数値)</label>
                <input
                  type="number"
                  value={editingAttendance.order ?? 0}
                  onChange={(e) =>
                    setEditingAttendance((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className={styles.formInput}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setAttendanceModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSaveAttendance}
                >
                  {isAttendanceNew ? "追加する" : "保存する"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* 日程調整ステータス追加・編集モーダル */}
        {adjustModalOpen && editingAdjust && (
          <Modal
            onClose={() => setAdjustModalOpen(false)}
            title={isAdjustNew ? "日程調整ステータスの追加" : "日程調整ステータスの編集"}
          >
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>ステータスID (数値 例: 1)</label>
                <input
                  type="text"
                  value={editingAdjust.id || ""}
                  onChange={(e) =>
                    setEditingAdjust((prev) => ({ ...prev, id: e.target.value }))
                  }
                  disabled={!isAdjustNew}
                  className={styles.formInput}
                  placeholder="例: 1"
                />
                {!isAdjustNew && (
                  <p className={styles.formHelp}>※一度作成したIDは変更できません。</p>
                )}
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>記号 / ステータス名</label>
                <input
                  type="text"
                  value={editingAdjust.name || ""}
                  onChange={(e) =>
                    setEditingAdjust((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: ◯"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>説明</label>
                <input
                  type="text"
                  value={editingAdjust.description || ""}
                  onChange={(e) =>
                    setEditingAdjust((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: 参加可能"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>並び順 (数値)</label>
                <input
                  type="number"
                  value={editingAdjust.order ?? 0}
                  onChange={(e) =>
                    setEditingAdjust((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className={styles.formInput}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setAdjustModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSaveAdjust}
                >
                  {isAdjustNew ? "追加する" : "保存する"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ジャンル追加・編集モーダル */}
        {genreModalOpen && editingGenre && (
          <Modal
            onClose={() => setGenreModalOpen(false)}
            title={isGenreNew ? "ジャンルの追加" : "ジャンルの編集"}
          >
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>ジャンルID (数値 例: 1)</label>
                <input
                  type="text"
                  value={editingGenre.id || ""}
                  onChange={(e) =>
                    setEditingGenre((prev) => ({ ...prev, id: e.target.value }))
                  }
                  disabled={!isGenreNew}
                  className={styles.formInput}
                  placeholder="例: 1"
                />
                {!isGenreNew && (
                  <p className={styles.formHelp}>※一度作成したIDは変更できません。</p>
                )}
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>ジャンル名</label>
                <input
                  type="text"
                  value={editingGenre.name || ""}
                  onChange={(e) =>
                    setEditingGenre((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: Swing"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>並び順 (数値)</label>
                <input
                  type="number"
                  value={editingGenre.order ?? 0}
                  onChange={(e) =>
                    setEditingGenre((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className={styles.formInput}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setGenreModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSaveGenre}
                >
                  {isGenreNew ? "追加する" : "保存する"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* 譜面状況追加・編集モーダル */}
        {scoreStatusModalOpen && editingScoreStatus && (
          <Modal
            onClose={() => setScoreStatusModalOpen(false)}
            title={isScoreStatusNew ? "譜面状況の追加" : "譜面状況の編集"}
          >
            <div className={styles.modalForm}>
              <div className={styles.formRow}>
                <label className={styles.formLabel}>状況ID (数値 例: 1)</label>
                <input
                  type="text"
                  value={editingScoreStatus.id || ""}
                  onChange={(e) =>
                    setEditingScoreStatus((prev) => ({ ...prev, id: e.target.value }))
                  }
                  disabled={!isScoreStatusNew}
                  className={styles.formInput}
                  placeholder="例: 1"
                />
                {!isScoreStatusNew && (
                  <p className={styles.formHelp}>※一度作成したIDは変更できません。</p>
                )}
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>状況名</label>
                <input
                  type="text"
                  value={editingScoreStatus.name || ""}
                  onChange={(e) =>
                    setEditingScoreStatus((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={styles.formInput}
                  placeholder="例: 部費で購入希望"
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.formLabel}>並び順 (数値)</label>
                <input
                  type="number"
                  value={editingScoreStatus.order ?? 0}
                  onChange={(e) =>
                    setEditingScoreStatus((prev) => ({
                      ...prev,
                      order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                  className={styles.formInput}
                />
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setScoreStatusModalOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={handleSaveScoreStatus}
                >
                  {isScoreStatusNew ? "追加する" : "保存する"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>

      <BackNavigation href="/" label="ホーム" />
    </BaseLayout>
  );
}

