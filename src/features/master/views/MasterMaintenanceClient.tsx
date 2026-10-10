"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { BackNavigation } from "@/components/Common/BackNavigation";
import { Modal } from "@/components/Modal";
import { SectionDoc, InstrumentDoc } from "@/lib/firestore/types";
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
  saveInstrument,
  deleteInstrument,
  seedMasterData,
  getClientSections,
  getClientInstruments,
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
} from "@fortawesome/free-solid-svg-icons";
import styles from "./MasterMaintenance.module.css";

type Props = {
  initialSections: SectionDoc[];
  initialInstruments: InstrumentDoc[];
  isSectionsFromDefault: boolean;
  isInstrumentsFromDefault: boolean;
};

type TabType = "sections" | "instruments";

export function MasterMaintenanceClient({
  initialSections,
  initialInstruments,
  isSectionsFromDefault,
  isInstrumentsFromDefault,
}: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  // マスタ管理者またはシステム管理者のみ編集可能
  const canEdit = !!(userData?.isMasterAdmin || userData?.isSystemAdmin);

  const [currentTab, setCurrentTab] = useState<TabType>("sections");
  const [sections, setSections] = useState<SectionDoc[]>(initialSections);
  const [instruments, setInstruments] = useState<InstrumentDoc[]>(initialInstruments);

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
      await writeLog({
        dataId: inst.id,
        action: "楽器マスタ削除",
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
      "標準のパート・楽器データを Firestore に一括登録しますか？\n（既存データがある場合は上書き・追加されます）"
    );
    if (!confirmed) return;

    showSpinner();
    try {
      const res = await seedMasterData();
      await writeLog({
        action: "マスタデータ初期投入",
        dataId: "seed",
      });
      const [newSecs, newInsts] = await Promise.all([
        getClientSections(),
        getClientInstruments(),
      ]);
      setSections(newSecs);
      setInstruments(newInsts);
      hideSpinner();
      await showDialog(
        `初期マスタを登録しました。\n（パート: ${res.sectionsCount}件、楽器: ${res.instrumentsCount}件）`,
        true
      );
      router.refresh();
    } catch (err) {
      hideSpinner();
      await writeLog({
        action: "マスタデータ初期投入",
        dataId: "seed",
        status: "error",
        errorDetail: { message: (err as Error).message },
      });
      await showDialog("初期投入に失敗しました", true);
    }
  };

  // セクションIDからパート名を取得する辞書
  const sectionMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    sections.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [sections]);

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
                  title="初期データをFirestoreに投入します"
                >
                  <FontAwesomeIcon icon={faDatabase} /> 初期データ投入
                </button>
                {currentTab === "sections" ? (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddSection}
                  >
                    <FontAwesomeIcon icon={faPlus} /> パート追加
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleOpenAddInstrument}
                  >
                    <FontAwesomeIcon icon={faPlus} /> 楽器追加
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
          </button>
          <button
            type="button"
            className={`${styles.tabItem} ${currentTab === "instruments" ? styles.tabItemActive : ""}`}
            onClick={() => setCurrentTab("instruments")}
          >
            <FontAwesomeIcon icon={faGuitar} />
            楽器
            <span className={styles.tabBadge}>{instruments.length}</span>
          </button>
        </div>

        {/* タブコンテンツ: パート一覧 */}
        {currentTab === "sections" && (
          <div className={styles.contentCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>パート一覧</h2>
            </div>
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

        {/* タブコンテンツ: 楽器一覧 */}
        {currentTab === "instruments" && (
          <div className={styles.contentCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>楽器一覧</h2>
            </div>
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
      </div>

      <BackNavigation href="/" label="ホーム" />
    </BaseLayout>
  );
}
