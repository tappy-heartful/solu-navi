"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGear,
  faSliders,
  faFloppyDisk,
  faRotateLeft,
  faCircleQuestion,
  faCalendarCheck,
  faMusic,
  faPhotoFilm,
  faBullhorn,
  faSquarePollVertical,
  faCoins,
  faCircleCheck,
  faLock,
  faClock,
  faUsers,
  faBell,
  faCalendarDays,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import { faLine } from "@fortawesome/free-brands-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { AppSettings, SectionDoc } from "@/lib/firestore/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/firestore/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { showDialog, showSpinner, hideSpinner, writeLog } from "@/lib/functions";
import { sendUpcomingEventsNoticeToGeneralLine } from "@/features/event/api/event-notification-server-actions";
import { saveAppSettings } from "../api/settings-client-service";
import { SettingsFormData } from "../types";
import { LineIntegrationModal } from "../components/LineIntegrationModal";
import styles from "./SettingsEditClient.module.css";

interface SettingsEditClientProps {
  initialSettings: AppSettings;
  sections: SectionDoc[];
}

const WEEKDAYS = [
  { value: 0, label: "日" },
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
];

export function SettingsEditClient({
  initialSettings,
  sections = [],
}: SettingsEditClientProps) {
  const router = useRouter();
  const { userData, isSystemAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  // システム管理者判定: アプリ設定はシステム管理者のみ編集可能
  const canEdit = Boolean(isSystemAdmin || userData?.isSystemAdmin);

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "アプリ設定", href: "" },
    ]);
  }, [setBreadcrumbs]);

  const [formData, setFormData] = useState<SettingsFormData>({
    generalLineGroupId: initialSettings.generalLineGroupId || "",
    generalLineGroupName: initialSettings.generalLineGroupName || "",
    generalLineGroupJoinedAt: initialSettings.generalLineGroupJoinedAt,
    sectionLineGroupIds: initialSettings.sectionLineGroupIds || {},
    sectionLineGroupNames: initialSettings.sectionLineGroupNames || {},
    sectionLineGroupJoinedAt: initialSettings.sectionLineGroupJoinedAt || {},
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
    enableEventNotice:
      initialSettings.enableEventNotice ?? DEFAULT_APP_SETTINGS.enableEventNotice ?? true,
    eventNoticeDaysOfWeek:
      initialSettings.eventNoticeDaysOfWeek ?? DEFAULT_APP_SETTINGS.eventNoticeDaysOfWeek ?? [1],
    eventNoticeTargetDays:
      initialSettings.eventNoticeTargetDays ?? DEFAULT_APP_SETTINGS.eventNoticeTargetDays ?? 7,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [origin, setOrigin] = useState("");
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // 日時フォーマット関数
  const formatJoinedAt = (ts?: number) => {
    if (!ts) return null;
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
  };

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

  // イベント予告通知の曜日トグル (0: 日 〜 6: 土)
  const toggleDayOfWeek = (day: number) => {
    if (!canEdit || isSaving) return;
    setFormData((prev) => {
      const current = prev.eventNoticeDaysOfWeek || [];
      const next = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day].sort();
      return { ...prev, eventNoticeDaysOfWeek: next };
    });
  };

  // イベント予告通知のテスト送信 (曜日条件をバイパスして即座に全体LINEへ送信)
  const handleTestSendNotice = async () => {
    if (!canEdit) return;
    const ok = await showDialog(
      "全体LINEグループへ、現在の設定に基づいたイベント予告のテスト通知を送信しますか？\n（※送信曜日に関わらず今すぐ全体LINEへ送信されます）"
    );
    if (!ok) return;

    showSpinner();
    try {
      const res = await sendUpcomingEventsNoticeToGeneralLine(true);
      hideSpinner();
      if (res.success && res.sent) {
        await showDialog(`送信成功🍀\n${res.message}`, true);
      } else {
        await showDialog(res.message, true);
      }
    } catch (err: any) {
      hideSpinner();
      console.error("[handleTestSendNotice] error:", err);
      await showDialog(`送信に失敗しました: ${err.message}`, true);
    }
  };

  // 初期値にリセット (システム管理者のみ実行可能)
  const handleResetToDefault = async () => {
    if (!canEdit) {
      await showDialog("表示設定の初期化にはシステム管理者権限が必要です。", true);
      return;
    }
    const ok = await showDialog(
      "ホーム表示設定などを初期設定に戻しますか？\n（入力中のLINEグループ情報は保持されます）"
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
      await showDialog("設定の変更権限がありません（システム管理者のみ編集可能）。", true);
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
            ホーム画面の表示件数・お知らせ設定、および全体・パート別のLINEグループIDを一元管理します。
          </p>
        </div>

        <form onSubmit={handleSave}>
          {/* 1. ホーム画面表示件数設定 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIcon} ${styles.displayIconBg}`}>
                <FontAwesomeIcon icon={faSliders} />
              </div>
              <div className={styles.cardHeaderInfo}>
                <div className={styles.cardTitleRow}>
                  <h2 className={styles.cardTitle}>ホーム画面表示設定</h2>
                  {canEdit ? (
                    <span className={styles.userStatusBadgeCan}>
                      <FontAwesomeIcon icon={faCircleCheck} /> 編集可能
                    </span>
                  ) : (
                    <span className={styles.userStatusBadgeCannot}>
                      <FontAwesomeIcon icon={faLock} /> 閲覧のみ
                    </span>
                  )}
                </div>
                <div className={styles.cardEligibleRoles}>
                  <span className={styles.eligibleLabel}>編集権限:</span>
                  <span className={styles.eligibleAdminTag}>システム管理者のみ</span>
                </div>
              </div>
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

          {/* 2. ホームお知らせ表示設定 */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIcon} ${styles.announcementIconBg}`}>
                <FontAwesomeIcon icon={faBullhorn} />
              </div>
              <div className={styles.cardHeaderInfo}>
                <div className={styles.cardTitleRow}>
                  <h2 className={styles.cardTitle}>ホームお知らせ表示設定</h2>
                  {canEdit ? (
                    <span className={styles.userStatusBadgeCan}>
                      <FontAwesomeIcon icon={faCircleCheck} /> 編集可能
                    </span>
                  ) : (
                    <span className={styles.userStatusBadgeCannot}>
                      <FontAwesomeIcon icon={faLock} /> 閲覧のみ
                    </span>
                  )}
                </div>
                <div className={styles.cardEligibleRoles}>
                  <span className={styles.eligibleLabel}>編集権限:</span>
                  <span className={styles.eligibleAdminTag}>システム管理者のみ</span>
                </div>
              </div>
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

          {/* 3. イベント予告・出欠催促通知設定 (全体LINE・GAS連携) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIcon} ${styles.noticeIconBg}`}>
                <FontAwesomeIcon icon={faBell} />
              </div>
              <div className={styles.cardHeaderInfo}>
                <div className={styles.cardTitleRow}>
                  <h2 className={styles.cardTitle}>イベント予告・出欠催促通知（全体LINE）</h2>
                  {canEdit ? (
                    <span className={styles.userStatusBadgeCan}>
                      <FontAwesomeIcon icon={faCircleCheck} /> 編集可能
                    </span>
                  ) : (
                    <span className={styles.userStatusBadgeCannot}>
                      <FontAwesomeIcon icon={faLock} /> 閲覧のみ
                    </span>
                  )}
                </div>
                <div className={styles.cardEligibleRoles}>
                  <span className={styles.eligibleLabel}>編集権限:</span>
                  <span className={styles.eligibleAdminTag}>システム管理者のみ</span>
                </div>
              </div>
            </div>
            <p className={styles.cardSubtitle}>
              Google Apps Script（GAS）から1日1回実行され、指定した曜日に対象期間内のイベント予告と出欠回答を促すメッセージを全体LINEグループへ自動送信します。
            </p>

            <div className={styles.checkboxList}>
              {/* 定期送信の有効/無効 */}
              <label className={styles.checkboxOptionRow}>
                <div className={styles.checkboxTextGroup}>
                  <div className={styles.checkboxTitle}>
                    <FontAwesomeIcon
                      icon={faBell}
                      className={styles.inlineOptionIcon}
                      style={{ color: "#0284c7" }}
                    />
                    <span>定期イベント予告通知を有効にする</span>
                  </div>
                  <div className={styles.checkboxDesc}>
                    有効にすると、指定曜日に全体LINEグループ宛てに向こうの予定と回答案内が送信されます。
                  </div>
                </div>
                <input
                  type="checkbox"
                  className={styles.checkboxInput}
                  checked={formData.enableEventNotice}
                  disabled={!canEdit || isSaving}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      enableEventNotice: e.target.checked,
                    }))
                  }
                />
              </label>
            </div>

            {/* 送信曜日設定 (N曜日) */}
            <div style={{ marginTop: "1.25rem" }}>
              <label className={styles.label}>
                <FontAwesomeIcon icon={faCalendarDays} style={{ marginRight: "6px", color: "#0284c7" }} />
                通知を送信する曜日（複数選択可）
              </label>
              <p className={styles.countSub} style={{ marginBottom: "0.5rem" }}>
                タップして送信したい曜日を選択してください（青色＝選択中）。
              </p>
              <div className={styles.daysGrid}>
                {WEEKDAYS.map((wd) => {
                  const isSelected = (formData.eventNoticeDaysOfWeek || []).includes(wd.value);
                  return (
                    <button
                      key={wd.value}
                      type="button"
                      className={`${styles.dayChip} ${isSelected ? styles.dayChipActive : ""}`}
                      onClick={() => toggleDayOfWeek(wd.value)}
                      disabled={!canEdit || isSaving || !formData.enableEventNotice}
                    >
                      {wd.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 対象日数設定 (向こうM日分) */}
            <div style={{ marginTop: "1.25rem" }}>
              <div className={styles.countCard}>
                <div>
                  <div className={styles.countLabel}>
                    <FontAwesomeIcon
                      icon={faClock}
                      className={styles.countIcon}
                      style={{ color: "#0284c7" }}
                    />
                    <span>イベント予告の対象期間</span>
                  </div>
                  <div className={styles.countSub}>
                    送信当日から向こう何日後までのイベントを予告・通知するか（推奨: 7〜14日分）
                  </div>
                </div>
                <div className={styles.numberInputWrapper}>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className={styles.numberInput}
                    value={formData.eventNoticeTargetDays}
                    disabled={!canEdit || isSaving || !formData.enableEventNotice}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        eventNoticeTargetDays: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                  />
                  <span className={styles.unitText}>日分</span>
                </div>
              </div>
            </div>

            <div className={styles.noticeInfoBox}>
              💡 <strong>GASとの連携について</strong>:
              Google Apps Script（GAS）のトリガーで日次タイマー（例: 毎朝8:00〜9:00）を1日1回実行するよう設定してください。GAS側が上記の「送信曜日」と「対象日数」をFirestoreから直接読み込み、合致した曜日に対象イベントを一括通知します。
            </div>

            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className={styles.testSendBtn}
                onClick={handleTestSendNotice}
                disabled={!canEdit || isSaving}
                title="全体LINEグループへ今すぐテスト通知を送信します"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
                <span>全体LINEへ今すぐテスト通知を送信</span>
              </button>
            </div>
          </div>

          {/* 4. LINEグループ設定 (一番下に配置 / グループID表示・編集に特化) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={`${styles.cardIcon} ${styles.lineIconBg}`}>
                <FontAwesomeIcon icon={faLine} />
              </div>
              <div className={styles.cardHeaderInfo}>
                <div className={styles.cardTitleRow}>
                  <h2 className={styles.cardTitle}>LINEグループID設定</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className={styles.guideModalTriggerBtn}
                      onClick={() => setIsGuideModalOpen(true)}
                      title="Webhook URLや環境変数などの連携手順を確認"
                    >
                      <FontAwesomeIcon icon={faCircleQuestion} /> 連携手順・Webhook
                    </button>
                    {canEdit ? (
                      <span className={styles.userStatusBadgeCan}>
                        <FontAwesomeIcon icon={faCircleCheck} /> 編集可能
                      </span>
                    ) : (
                      <span className={styles.userStatusBadgeCannot}>
                        <FontAwesomeIcon icon={faLock} /> 閲覧のみ
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.cardEligibleRoles}>
                  <span className={styles.eligibleLabel}>編集権限:</span>
                  <span className={styles.eligibleAdminTag}>システム管理者のみ</span>
                </div>
              </div>
            </div>
            <p className={styles.cardSubtitle}>
              各LINEグループのIDを表示・管理します。公式LINEをグループに招待すると自動で上書き登録されます。
            </p>

            {/* ① 全体LINEグループ */}
            <div className={styles.formGroup} style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="generalLineGroupId" className={styles.label}>
                全体LINEグループ
              </label>

              <div className={styles.groupMetaRow}>
                {formData.generalLineGroupName && (
                  <span className={styles.groupNameBadge}>
                    <FontAwesomeIcon icon={faUsers} />
                    <span>{formData.generalLineGroupName}</span>
                  </span>
                )}
                <span className={styles.joinedAtBadge}>
                  <FontAwesomeIcon icon={faClock} />
                  <span>
                    招待・登録日時:{" "}
                    {formatJoinedAt(formData.generalLineGroupJoinedAt) || (
                      <span className={styles.joinedAtEmpty}>未登録（招待待ち）</span>
                    )}
                  </span>
                </span>
              </div>

              <div style={{ marginTop: "0.5rem" }}>
                <input
                  id="generalLineGroupId"
                  type="text"
                  className={styles.input}
                  placeholder="公式LINE招待時に自動入力されます（手動入力も可）"
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
            </div>

            {/* ② パート別LINEグループ */}
            <div className={styles.formGroup}>
              <span className={styles.label}>パート別LINEグループ</span>
              <span className={styles.helpText}>
                各パートのLINEグループIDです。公式LINEを招待するとグループ名・招待日時とともに自動入力されます。
              </span>

              <div className={styles.sectionList}>
                {sections.map((sec) => {
                  const groupName = formData.sectionLineGroupNames?.[sec.id];
                  const joinedAt = formData.sectionLineGroupJoinedAt?.[sec.id];

                  return (
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

                      <div className={styles.groupMetaRow}>
                        {groupName && (
                          <span className={styles.groupNameBadge}>
                            <FontAwesomeIcon icon={faUsers} />
                            <span>{groupName}</span>
                          </span>
                        )}
                        <span className={styles.joinedAtBadge}>
                          <FontAwesomeIcon icon={faClock} />
                          <span>
                            招待・登録日時:{" "}
                            {formatJoinedAt(joinedAt) || (
                              <span className={styles.joinedAtEmpty}>未登録（招待待ち）</span>
                            )}
                          </span>
                        </span>
                      </div>

                      <div>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder={`${sec.name}グループに招待すると自動入力されます`}
                          value={formData.sectionLineGroupIds[sec.id] || ""}
                          disabled={!canEdit || isSaving}
                          onChange={(e) =>
                            handleSectionLineGroupChange(sec.id, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* アクションボタンバー (システム管理者のみ表示) */}
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

        {/* 詳しい連携手順・専用Webhook URL・環境変数案内モーダル */}
        <LineIntegrationModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
          sections={sections}
          origin={origin}
        />
      </div>
    </BaseLayout>
  );
}
