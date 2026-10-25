"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faSliders,
  faFloppyDisk,
  faRotateLeft,
  faCircleExclamation,
  faCalendarCheck,
  faMusic,
  faPhotoFilm,
  faBullhorn,
  faSquarePollVertical,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import { faLine } from "@fortawesome/free-brands-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { AppSettings, SectionDoc } from "@/lib/firestore/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/firestore/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { showDialog, showSpinner, hideSpinner, writeLog } from "@/lib/functions";
import { saveAppSettings } from "../api/settings-client-service";
import { SettingsFormData } from "../types";
import styles from "./SettingsEditClient.module.css";

interface SettingsEditClientProps {
  initialSettings: AppSettings;
  sections: SectionDoc[];
}

export function SettingsEditClient({
  initialSettings,
  sections = [],
}: SettingsEditClientProps) {
  const router = useRouter();
  const { userData, isSystemAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  // 管理者判定: システム管理者のみ操作可能
  const canEdit = Boolean(isSystemAdmin || userData?.isSystemAdmin);

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "アプリ設定", href: "" },
    ]);
  }, [setBreadcrumbs]);

  const [formData, setFormData] = useState<SettingsFormData>({
    generalLineGroupId: initialSettings.generalLineGroupId || "",
    sectionLineGroupIds: initialSettings.sectionLineGroupIds || {},
    homeAttendanceDays:
      initialSettings.homeAttendanceDays ?? DEFAULT_APP_SETTINGS.homeAttendanceDays ?? 7,
    homeScoreCount:
      initialSettings.homeScoreCount ?? DEFAULT_APP_SETTINGS.homeScoreCount ?? 6,
    homeMediaCount:
      initialSettings.homeMediaCount ?? DEFAULT_APP_SETTINGS.homeMediaCount ?? 4,
    showCallInAnnouncement:
      initialSettings.showCallInAnnouncement ?? DEFAULT_APP_SETTINGS.showCallInAnnouncement ?? true,
    showVoteInAnnouncement:
      initialSettings.showVoteInAnnouncement ?? DEFAULT_APP_SETTINGS.showVoteInAnnouncement ?? true,
    showFeeInAnnouncement:
      initialSettings.showFeeInAnnouncement ?? DEFAULT_APP_SETTINGS.showFeeInAnnouncement ?? true,
  });

  const [isSaving, setIsSaving] = useState(false);

  // パート別LINEグループIDの更新
  const handleSectionLineGroupChange = (sectionId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      sectionLineGroupIds: {
        ...prev.sectionLineGroupIds,
        [sectionId]: value,
      },
    }));
  };

  // 初期値にリセット
  const handleResetToDefault = async () => {
    if (!canEdit) return;
    const ok = await showDialog(
      "ホーム表示設定などを初期設定に戻しますか？\n（入力中のLINEグループIDは保持されます）"
    );
    if (!ok) return;

    setFormData((prev) => ({
      ...prev,
      homeAttendanceDays: DEFAULT_APP_SETTINGS.homeAttendanceDays ?? 7,
      homeScoreCount: DEFAULT_APP_SETTINGS.homeScoreCount ?? 6,
      homeMediaCount: DEFAULT_APP_SETTINGS.homeMediaCount ?? 4,
      showCallInAnnouncement: DEFAULT_APP_SETTINGS.showCallInAnnouncement ?? true,
      showVoteInAnnouncement: DEFAULT_APP_SETTINGS.showVoteInAnnouncement ?? true,
      showFeeInAnnouncement: DEFAULT_APP_SETTINGS.showFeeInAnnouncement ?? true,
    }));
  };

  // 保存処理
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEdit) {
      await showDialog("設定の変更にはシステム管理者権限が必要です。", true);
      return;
    }

    const ok = await showDialog("アプリ設定を更新しますか？");
    if (!ok) return;

    setIsSaving(true);
    showSpinner();

    try {
      await saveAppSettings(formData, userData?.id || userData?.uid);
      await writeLog({
        dataId: "settings_general",
        action: "アプリ設定更新",
      });
      hideSpinner();
      await showDialog("アプリ設定を保存しました🍀", true);
      router.refresh();
    } catch (err) {
      hideSpinner();
      console.error("[SettingsEditClient] Save error:", err);
      await writeLog({
        dataId: "settings_general",
        action: "アプリ設定更新失敗",
        status: "error",
        errorDetail: { message: err instanceof Error ? err.message : String(err) },
      });
      await showDialog("アプリ設定の保存に失敗しました。", true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faGear} className={styles.headerIcon} />
            <span>アプリ設定</span>
          </h1>
          <p className={styles.description}>
            全体およびパート別のLINEグループID、ホーム画面の各コンテンツ表示設定を一元管理します。
          </p>
        </div>

        {!canEdit && (
          <div className={styles.adminWarning}>
            <FontAwesomeIcon icon={faCircleExclamation} className={styles.warningIcon} />
            <div>
              設定の変更にはシステム管理者権限が必要です。現在は閲覧のみ可能です。
            </div>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* 1. LINEグループ設定 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIcon} ${styles.lineIconBg}`}>
                <FontAwesomeIcon icon={faLine} />
              </div>
              <h2 className={styles.cardTitle}>LINEグループID設定</h2>
            </div>
            <p className={styles.cardSubtitle}>
              サークル公式LINE BOTからの連絡・出欠リマインド・通知の宛先となるグループIDを設定します。
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="generalLineGroupId" className={styles.label}>
                全体LINEグループID
              </label>
              <span className={styles.helpText}>
                部員全体のLINEグループID（例: Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx）
              </span>
              <input
                id="generalLineGroupId"
                type="text"
                className={styles.input}
                placeholder="C..."
                value={formData.generalLineGroupId}
                disabled={!canEdit || isSaving}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    generalLineGroupId: e.target.value,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <span className={styles.label}>パート別LINEグループID</span>
              <span className={styles.helpText}>
                パート連絡用の各LINEグループID。パート個別のお知らせやリマインドに使用されます。
              </span>

              <div className={styles.sectionList}>
                {sections.map((sec) => (
                  <div key={sec.id} className={styles.sectionRow}>
                    <div className={styles.sectionHeader}>
                      <span
                        className={styles.sectionBadge}
                        style={{ backgroundColor: sec.color || "#0284c7" }}
                      >
                        {sec.shortName || sec.name}
                      </span>
                      <span className={styles.sectionName}>{sec.name}</span>
                    </div>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder={`${sec.name}のグループID (C...)`}
                      value={formData.sectionLineGroupIds[sec.id] || ""}
                      disabled={!canEdit || isSaving}
                      onChange={(e) =>
                        handleSectionLineGroupChange(sec.id, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. ホーム画面表示件数設定 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIcon} ${styles.displayIconBg}`}>
                <FontAwesomeIcon icon={faSliders} />
              </div>
              <h2 className={styles.cardTitle}>ホーム画面表示設定</h2>
            </div>
            <p className={styles.cardSubtitle}>
              ホーム画面に一度に表示する各コンテンツの表示日数・最大件数を調整できます。
            </p>

            <div className={styles.countsGrid}>
              {/* 出欠クイック登録 */}
              <div className={styles.countCard}>
                <div>
                  <div className={styles.countLabel}>
                    <FontAwesomeIcon
                      icon={faCalendarCheck}
                      className={styles.countIcon}
                      style={{ color: "#0d9488" }}
                    />
                    <span>出欠クイック登録</span>
                  </div>
                  <div className={styles.countSub}>
                    今日から何日後までの予定を表示するか（推奨: 3〜14日分）
                  </div>
                </div>
                <div className={styles.numberInputWrapper}>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className={styles.numberInput}
                    value={formData.homeAttendanceDays}
                    disabled={!canEdit || isSaving}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        homeAttendanceDays: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                  />
                  <span className={styles.unitText}>日分</span>
                </div>
              </div>

              {/* 新着譜面 */}
              <div className={styles.countCard}>
                <div>
                  <div className={styles.countLabel}>
                    <FontAwesomeIcon
                      icon={faMusic}
                      className={styles.countIcon}
                      style={{ color: "#7c3aed" }}
                    />
                    <span>新着譜面</span>
                  </div>
                  <div className={styles.countSub}>
                    ホームに並べる新着譜面の最大表示数（推奨: 4〜12件）
                  </div>
                </div>
                <div className={styles.numberInputWrapper}>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className={styles.numberInput}
                    value={formData.homeScoreCount}
                    disabled={!canEdit || isSaving}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        homeScoreCount: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                  />
                  <span className={styles.unitText}>件</span>
                </div>
              </div>

              {/* 録音・メディア */}
              <div className={styles.countCard}>
                <div>
                  <div className={styles.countLabel}>
                    <FontAwesomeIcon
                      icon={faPhotoFilm}
                      className={styles.countIcon}
                      style={{ color: "#d97706" }}
                    />
                    <span>録音・メディア</span>
                  </div>
                  <div className={styles.countSub}>
                    ホームに並べる練習録音・動画の最大表示数（推奨: 2〜8件）
                  </div>
                </div>
                <div className={styles.numberInputWrapper}>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className={styles.numberInput}
                    value={formData.homeMediaCount}
                    disabled={!canEdit || isSaving}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        homeMediaCount: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                  />
                  <span className={styles.unitText}>件</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. ホームお知らせ表示設定 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIcon} ${styles.announcementIconBg}`}>
                <FontAwesomeIcon icon={faBullhorn} />
              </div>
              <h2 className={styles.cardTitle}>ホームお知らせ表示設定</h2>
            </div>
            <p className={styles.cardSubtitle}>
              ホーム上部のお知らせ枠（重要なお知らせ）に掲載する項目を制御します。
            </p>

            <div className={styles.checkboxList}>
              {/* 曲募集 */}
              <label className={styles.checkboxOptionRow}>
                <div className={styles.checkboxTextGroup}>
                  <div className={styles.checkboxTitle}>
                    <FontAwesomeIcon
                      icon={faBullhorn}
                      className={styles.inlineOptionIcon}
                      style={{ color: "#0284c7" }}
                    />
                    <span>曲募集をお知らせに表示</span>
                  </div>
                  <div className={styles.checkboxDesc}>
                    現在メンバーから募集中の曲がある場合、ホーム上部に募集案内バナーを表示します。
                  </div>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={formData.showCallInAnnouncement}
                  disabled={!canEdit || isSaving}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      showCallInAnnouncement: e.target.checked,
                    }))
                  }
                />
              </label>

              {/* 曲投票 */}
              <label className={styles.checkboxOptionRow}>
                <div className={styles.checkboxTextGroup}>
                  <div className={styles.checkboxTitle}>
                    <FontAwesomeIcon
                      icon={faSquarePollVertical}
                      className={styles.inlineOptionIcon}
                      style={{ color: "#8b5cf6" }}
                    />
                    <span>投票をお知らせに表示</span>
                  </div>
                  <div className={styles.checkboxDesc}>
                    現在投票受付中の曲がある場合、ホーム上部に投票案内バナーを表示します。
                  </div>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={formData.showVoteInAnnouncement}
                  disabled={!canEdit || isSaving}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      showVoteInAnnouncement: e.target.checked,
                    }))
                  }
                />
              </label>

              {/* 未払い部費 */}
              <label className={styles.checkboxOptionRow}>
                <div className={styles.checkboxTextGroup}>
                  <div className={styles.checkboxTitle}>
                    <FontAwesomeIcon
                      icon={faCoins}
                      className={styles.inlineOptionIcon}
                      style={{ color: "#d97706" }}
                    />
                    <span>未払いの部費があればお知らせに表示</span>
                  </div>
                  <div className={styles.checkboxDesc}>
                    自分に未払いの部費・集金がある場合、ホーム上部に未納案内を表示して注意を促します。
                  </div>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={formData.showFeeInAnnouncement}
                  disabled={!canEdit || isSaving}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      showFeeInAnnouncement: e.target.checked,
                    }))
                  }
                />
              </label>
            </div>
          </div>

          {/* アクションボタンバー */}
          {canEdit && (
            <div className={styles.actionsBar}>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={handleResetToDefault}
                disabled={isSaving}
              >
                <FontAwesomeIcon icon={faRotateLeft} className={styles.btnIcon} />{" "}
                初期値に戻す
              </button>
              <button
                type="submit"
                className={styles.saveBtn}
                disabled={isSaving}
              >
                <FontAwesomeIcon icon={faFloppyDisk} className={styles.btnIcon} />{" "}
                {isSaving ? "保存中..." : "設定を保存する"}
              </button>
            </div>
          )}
        </form>
      </div>
    </BaseLayout>
  );
}
