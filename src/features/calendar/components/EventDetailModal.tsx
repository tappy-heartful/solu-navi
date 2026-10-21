"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EventConfirmData } from "@/features/event/api/event-server-actions";
import { getEventConfirmDataAction } from "@/features/event/api/event-detail-server-actions";
import {
  submitAttendanceAnswer,
  submitAdjustAnswer,
  deleteMyAttendanceAnswer,
  deleteMyAdjustAnswer,
} from "@/features/event/api/event-client-service";
import { canEditEvent } from "@/features/event/lib/event-utils";
import {
  isInTerm,
  getDayOfWeek,
  showDialog,
  showSpinner,
  hideSpinner,
  writeLog,
  globalLineDefaultImage,
  extractYouTubeId,
  format,
} from "@/lib/functions";
import { SetlistConfirm } from "@/components/Setlist/SetlistConfirm";
import styles from "./EventDetailModal.module.css";

interface EventDetailModalProps {
  eventId: string;
  onClose: () => void;
  onEditEvent?: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => Promise<void>;
  onAnswerUpdated?: () => void;
}

export function EventDetailModal({
  eventId,
  onClose,
  onEditEvent,
  onDeleteEvent,
  onAnswerUpdated,
}: EventDetailModalProps) {
  const { userData } = useAuth();
  const uid = userData?.id || userData?.uid;

  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<EventConfirmData | null>(null);
  const [loading, setLoading] = useState(true);

  // 出欠確認（通常）用ステート
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  // 日程調整用ステート
  const [adjustAnswers, setAdjustAnswers] = useState<Record<string, string>>({});
  const [adjustComment, setAdjustComment] = useState<string>("");

  // 集計表示用タブ
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [showUnansweredList, setShowUnansweredList] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEventConfirmDataAction(eventId);
      setData(res);
      if (res?.attendanceStatuses && res.attendanceStatuses.length > 0) {
        setSelectedStatusId(res.attendanceStatuses[0].id);
      }

      // 自分の回答をフォームにセット
      if (res && uid) {
        if (res.event?.attendanceType === "schedule") {
          const myAns = (res.adjustAnswers || []).find((a) => a.uid === uid);
          if (myAns) {
            setAdjustAnswers(myAns.answers || {});
            setAdjustComment(myAns.comment || "");
          } else {
            setAdjustAnswers({});
            setAdjustComment("");
          }
        } else {
          const myAns = (res.attendanceAnswers || []).find((a) => a.uid === uid);
          if (myAns) {
            setSelectedStatus(myAns.status || "");
            setComment(myAns.comment || "");
          } else {
            setSelectedStatus("");
            setComment("");
          }
        }
      }
    } catch (err) {
      console.error("[EventDetailModal] 読み込みエラー:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const event = data?.event;
  const isSchedule = event?.attendanceType === "schedule";
  const inTerm = event ? isInTerm(event.acceptStartDate, event.acceptEndDate) : false;
  const todayStr = format(new Date(), "yyyy.MM.dd");
  const isPast = event?.date ? event.date < todayStr : false;

  // 自分の回答
  const myAnswer = useMemo(() => {
    if (!data || !uid) return null;
    if (isSchedule) {
      return (data.adjustAnswers || []).find((a) => a.uid === uid);
    } else {
      return (data.attendanceAnswers || []).find((a) => a.uid === uid);
    }
  }, [data, uid, isSchedule]);

  const myStatusObj = useMemo(() => {
    if (!myAnswer || isSchedule || !data?.attendanceStatuses) return null;
    const att = myAnswer as { status?: string };
    return data.attendanceStatuses.find((s) => s.id === att.status);
  }, [myAnswer, isSchedule, data]);

  // 編集・削除権限
  const canManage = event ? canEditEvent(event, userData) : false;

  // 出欠回答保存 (通常イベント)
  const handleSaveAttendance = async () => {
    if (!uid || !event) return;
    if (!selectedStatus) {
      await showDialog("出欠を選択してください", true);
      return;
    }

    const isEdit = !!myAnswer;
    const confirmed = await showDialog(`出欠回答を${isEdit ? "更新" : "登録"}しますか？`);
    if (!confirmed) return;

    setIsSubmittingAnswer(true);
    showSpinner();
    try {
      await submitAttendanceAnswer(eventId, uid, selectedStatus, comment);
      await writeLog({
        dataId: eventId,
        action: `イベント回答（出欠）${isEdit ? "更新" : "登録"}`,
      });
      hideSpinner();
      await showDialog(`出欠回答を${isEdit ? "更新" : "登録"}しました`, true);
      await loadData();
      if (onAnswerUpdated) onAnswerUpdated();
    } catch (e: any) {
      hideSpinner();
      console.error("[EventDetailModal] 出欠回答エラー:", e);
      await showDialog(`保存に失敗しました: ${e.message}`, true);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // 日程調整回答保存
  const handleSaveAdjust = async () => {
    if (!uid || !event) return;
    const candidateDates = event.candidateDates || [];
    const unanswered = candidateDates.filter((d) => !adjustAnswers[d]);
    if (unanswered.length > 0) {
      await showDialog("すべての候補日に回答を選択してください", true);
      return;
    }

    const isEdit = !!myAnswer;
    const confirmed = await showDialog(`日程調整の回答を${isEdit ? "更新" : "登録"}しますか？`);
    if (!confirmed) return;

    setIsSubmittingAnswer(true);
    showSpinner();
    try {
      await submitAdjustAnswer(eventId, uid, adjustAnswers, adjustComment);
      await writeLog({
        dataId: eventId,
        action: `イベント回答（日程調整）${isEdit ? "更新" : "登録"}`,
      });
      hideSpinner();
      await showDialog(`日程調整の回答を${isEdit ? "更新" : "登録"}しました`, true);
      await loadData();
      if (onAnswerUpdated) onAnswerUpdated();
    } catch (e: any) {
      hideSpinner();
      console.error("[EventDetailModal] 日程調整回答エラー:", e);
      await showDialog(`保存に失敗しました: ${e.message}`, true);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // 回答取消
  const handleDeleteMyAnswer = async () => {
    if (!uid || !event) return;
    const confirmed = await showDialog("出欠の回答を取り消しますか？");
    if (!confirmed) return;

    setIsSubmittingAnswer(true);
    showSpinner();
    try {
      if (isSchedule) {
        await deleteMyAdjustAnswer(eventId, uid);
      } else {
        await deleteMyAttendanceAnswer(eventId, uid);
      }
      hideSpinner();
      await showDialog("出欠の回答を取り消しました", true);
      setSelectedStatus("");
      setComment("");
      setAdjustAnswers({});
      setAdjustComment("");
      await loadData();
      if (onAnswerUpdated) onAnswerUpdated();
    } catch (e: any) {
      hideSpinner();
      console.error("[EventDetailModal] 回答取消エラー:", e);
      await showDialog(`削除に失敗しました: ${e.message}`, true);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // イベント削除
  const handleDeleteEventClick = async () => {
    if (!canManage || !onDeleteEvent) {
      showDialog("イベントを削除する権限がありません", true);
      return;
    }
    const confirmed = await showDialog("このイベントを削除しますか？\n関連する出欠回答もすべて削除されます。");
    if (!confirmed) return;

    onClose();
    await onDeleteEvent(eventId);
  };

  if (!mounted) return null;

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.eventDetailModal} onClick={(e) => e.stopPropagation()}>
        {/* モーダルヘッダー (CANDY 準拠のモダンなデザイン) */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleCol}>
            <div className={styles.badgeRow}>
              <span
                className={`${styles.typeBadge} ${
                  isSchedule ? styles.typeBadgeSchedule : ""
                }`}
              >
                {isSchedule ? "日程調整" : "イベント出欠"}
              </span>

              {isPast ? (
                <span className={`${styles.statusBadge} ${styles.statusClosed}`}>終了</span>
              ) : !inTerm ? (
                <span className={`${styles.statusBadge} ${styles.statusClosed}`}>受付時間外</span>
              ) : myAnswer ? (
                <span className={`${styles.statusBadge} ${styles.statusAnswered}`}>
                  回答済{myStatusObj ? `: ${myStatusObj.name}` : ""}
                </span>
              ) : (
                <span className={`${styles.statusBadge} ${styles.statusPending}`}>未回答</span>
              )}

              {event?.date && (
                <span className={styles.dateLabel}>
                  {event.date} ({getDayOfWeek(event.date)})
                </span>
              )}
            </div>

            <h2 className={styles.modalTitle}>
              <i className="fa-solid fa-calendar-check" />
              {event?.title || "イベント確認"}
            </h2>
          </div>

          <div className={styles.headerActions}>
            {canManage && (
              <>
                {onEditEvent && (
                  <button
                    type="button"
                    className={styles.btnActionIcon}
                    onClick={() => {
                      onClose();
                      onEditEvent(eventId);
                    }}
                    title="予定を編集"
                  >
                    <i className="fa-solid fa-pen-to-square" />
                  </button>
                )}
                {onDeleteEvent && (
                  <button
                    type="button"
                    className={`${styles.btnActionIcon} ${styles.btnDeleteIcon}`}
                    onClick={handleDeleteEventClick}
                    title="予定を削除"
                  >
                    <i className="fa-solid fa-trash-can" />
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              className={styles.modalClose}
              onClick={onClose}
              aria-label="閉じる"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* スクロール本文エリア */}
        <div className={styles.modalScrollArea}>
          {loading ? (
            <div className={styles.loadingBox}>
              <i className={`fa-solid fa-spinner ${styles.spinnerIcon}`} />
              <span>イベント情報を読み込み中...</span>
            </div>
          ) : !data || !event ? (
            <div className={styles.loadingBox}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: "#ef4444", fontSize: "24px" }} />
              <span>イベント情報の取得に失敗しました</span>
            </div>
          ) : (
            <>
              {/* 1. 出欠回答・回答編集インラインセクション (ホーム画面で完結) */}
              <div className={styles.answerSectionCard}>
                <div className={styles.answerSectionHeader}>
                  <div className={styles.answerTitleRow}>
                    <i className="fa-solid fa-user-check" style={{ color: "#146081", fontSize: "16px" }} />
                    <span className={styles.answerSectionTitle}>あなたの出欠回答</span>
                  </div>
                  {myAnswer && !isPast && inTerm && (
                    <button
                      type="button"
                      className={styles.btnCancelAnswer}
                      onClick={handleDeleteMyAnswer}
                      disabled={isSubmittingAnswer}
                    >
                      <i className="fa-solid fa-rotate-left" /> 回答取消
                    </button>
                  )}
                </div>

                {!isPast && inTerm ? (
                  /* 受付期間中: その場でワンタップ回答・回答変更が可能 */
                  <div className={styles.answerFormContainer}>
                    {!isSchedule ? (
                      /* 通常イベント: 出欠ステータス選択 */
                      <>
                        <div className={styles.statusOptionGrid}>
                          {(data.attendanceStatuses || []).map((st) => {
                            const isSelected = selectedStatus === st.id;
                            let statusColor = "#146081";
                            let iconName = "fa-circle-check";
                            if (st.name.includes("欠席") || st.name.includes("不参加")) {
                              statusColor = "#ef4444";
                              iconName = "fa-circle-xmark";
                            } else if (st.name.includes("遅刻") || st.name.includes("早退") || st.name.includes("未定")) {
                              statusColor = "#f59e0b";
                              iconName = "fa-circle-question";
                            }

                            return (
                              <button
                                key={st.id}
                                type="button"
                                className={`${styles.statusOptionBtn} ${
                                  isSelected ? styles.statusOptionBtnSelected : ""
                                }`}
                                style={
                                  isSelected
                                    ? { backgroundColor: statusColor, borderColor: statusColor, color: "#fff" }
                                    : { borderColor: "#cbd5e1" }
                                }
                                onClick={() => setSelectedStatus(st.id)}
                              >
                                <i className={`fa-solid ${isSelected ? iconName : "fa-circle"}`} />
                                <span>{st.name}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className={styles.commentInputRow}>
                          <input
                            type="text"
                            className={styles.commentInput}
                            placeholder="コメント・遅刻早退の理由等（任意）"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            maxLength={100}
                          />
                        </div>

                        <button
                          type="button"
                          className={styles.btnSubmitAnswer}
                          onClick={handleSaveAttendance}
                          disabled={isSubmittingAnswer || !selectedStatus}
                        >
                          <i className="fa-solid fa-paper-plane" />
                          <span>{myAnswer ? "回答を更新する" : "出欠を登録する"}</span>
                        </button>
                      </>
                    ) : (
                      /* 日程調整イベント: 候補日ごとの◯・△・✕選択 */
                      <>
                        <div className={styles.adjustCandidateList}>
                          {(event.candidateDates || []).map((dateStr) => {
                            const parts = dateStr.split(".");
                            const dateLabel = parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
                            const dayOfWeek = getDayOfWeek(dateStr);
                            const currentVal = adjustAnswers[dateStr] || "";

                            return (
                              <div key={dateStr} className={styles.adjustCandidateRow}>
                                <div className={styles.adjustDateBadge}>
                                  <span className={styles.adjustDateNum}>{dateLabel}</span>
                                  <span className={styles.adjustDateDay}>({dayOfWeek})</span>
                                </div>

                                <div className={styles.adjustOptionGroup}>
                                  {[
                                    { id: "1", label: "◯", color: "#16a34a", title: "参加可" },
                                    { id: "2", label: "△", color: "#d97706", title: "未定" },
                                    { id: "3", label: "✕", color: "#dc2626", title: "不参加" },
                                  ].map((opt) => {
                                    const isSelected = currentVal === opt.id;
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        title={opt.title}
                                        className={`${styles.adjustChoiceBtn} ${
                                          isSelected ? styles.adjustChoiceBtnSelected : ""
                                        }`}
                                        style={
                                          isSelected
                                            ? { backgroundColor: opt.color, borderColor: opt.color, color: "#fff" }
                                            : {}
                                        }
                                        onClick={() =>
                                          setAdjustAnswers((prev) => ({ ...prev, [dateStr]: opt.id }))
                                        }
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className={styles.commentInputRow}>
                          <input
                            type="text"
                            className={styles.commentInput}
                            placeholder="日程に関する連絡事項等（任意）"
                            value={adjustComment}
                            onChange={(e) => setAdjustComment(e.target.value)}
                            maxLength={100}
                          />
                        </div>

                        <button
                          type="button"
                          className={styles.btnSubmitAnswer}
                          onClick={handleSaveAdjust}
                          disabled={isSubmittingAnswer}
                        >
                          <i className="fa-solid fa-paper-plane" />
                          <span>{myAnswer ? "日程回答を更新する" : "日程回答を登録する"}</span>
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  /* 受付時間外または終了時 */
                  <div className={styles.closedAnswerBanner}>
                    <div className={styles.closedStatusRow}>
                      <span className={styles.closedStatusLabel}>現在の回答:</span>
                      <strong className={styles.closedStatusValue}>
                        {myAnswer ? (
                          myStatusObj?.name || "回答済み"
                        ) : (
                          <span style={{ color: "#94a3b8" }}>未回答</span>
                        )}
                      </strong>
                    </div>
                    <span className={styles.closedNote}>
                      {isPast ? "このイベントは終了しました" : "現在は回答受付時間外です"}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. 基本情報カード */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <i className="fa-solid fa-circle-info" />
                    <span>基本情報・開催概要</span>
                  </h3>
                </div>

                {/* 日時 */}
                <div className={styles.infoRow}>
                  <i className={`fa-regular fa-clock ${styles.infoIcon}`} />
                  <div className={styles.infoContent}>
                    <strong>日時: </strong>
                    {event.date ? (
                      <span>
                        {event.date} ({getDayOfWeek(event.date)})
                        {event.rentTimeRanges && event.rentTimeRanges.length > 0 ? (
                          <span>
                            {" "}
                            {event.rentTimeRanges
                              .map((r) => `${r.startTime}〜${r.endTime}`)
                              .join(", ")}
                          </span>
                        ) : (
                          event.startTime && <span> {event.startTime}〜{event.endTime || ""}</span>
                        )}
                      </span>
                    ) : (
                      <span>日程調整中（複数候補日あり）</span>
                    )}
                  </div>
                </div>

                {/* 場所・施設名 */}
                {(event.placeName || data.prefectureName || data.municipalityName) && (
                  <div className={styles.infoRow}>
                    <i className={`fa-solid fa-location-dot ${styles.infoIcon}`} />
                    <div className={styles.infoContent}>
                      <strong>場所: </strong>
                      {[data.prefectureName, data.municipalityName, event.placeName]
                        .filter(Boolean)
                        .join(" ")}
                      {event.googleMap && (
                        <a
                          href={event.googleMap}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.linkBanner}
                          style={{ marginLeft: "6px", display: "inline-flex" }}
                        >
                          <i className="fa-solid fa-map" /> マップ
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* アクセス情報 */}
                {event.access && (
                  <div className={styles.infoRow}>
                    <i className={`fa-solid fa-train ${styles.infoIcon}`} />
                    <div className={styles.infoContent}>
                      <strong>アクセス: </strong>
                      {event.access}
                    </div>
                  </div>
                )}

                {/* 回答受付期間 */}
                {(event.acceptStartDate || event.acceptEndDate) && (
                  <div className={styles.infoRow}>
                    <i className={`fa-solid fa-stopwatch ${styles.infoIcon}`} />
                    <div className={styles.infoContent}>
                      <strong>回答受付: </strong>
                      {event.acceptStartDate || "未設定"} 〜 {event.acceptEndDate || "未設定"}
                    </div>
                  </div>
                )}

                {/* 案内・備考 */}
                {(event.note || event.schedule) && (
                  <div className={styles.infoRow}>
                    <i className={`fa-solid fa-align-left ${styles.infoIcon}`} />
                    <div className={styles.infoContent} style={{ whiteSpace: "pre-wrap" }}>
                      <strong>案内・備考: </strong>
                      {event.note || event.schedule}
                    </div>
                  </div>
                )}

                {/* 持ち物 */}
                {event.bring && (
                  <div className={styles.infoRow}>
                    <i className={`fa-solid fa-suitcase ${styles.infoIcon}`} />
                    <div className={styles.infoContent}>
                      <strong>持ち物: </strong>
                      {event.bring}
                    </div>
                  </div>
                )}

                {/* 服装 */}
                {event.dress && (
                  <div className={styles.infoRow}>
                    <i className={`fa-solid fa-shirt ${styles.infoIcon}`} />
                    <div className={styles.infoContent}>
                      <strong>服装: </strong>
                      {event.dress}
                    </div>
                  </div>
                )}

                {/* 費用 */}
                {event.rent && (
                  <div className={styles.infoRow}>
                    <i className={`fa-solid fa-coins ${styles.infoIcon}`} />
                    <div className={styles.infoContent}>
                      <strong>費用・部費負担: </strong>
                      {event.rent}
                    </div>
                  </div>
                )}

                {/* 関連リンク */}
                {(event.link || event.website) && (
                  <div className={styles.infoRow}>
                    <i className={`fa-solid fa-link ${styles.infoIcon}`} />
                    <div className={styles.infoContent}>
                      <a
                        href={event.link || event.website}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.linkBanner}
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square" />
                        関連リンクを開く
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. 出欠状況 / 日程調整集計カード */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>
                    <i className="fa-solid fa-users" />
                    <span>{isSchedule ? "日程調整 回答集計" : "出欠・参加部員状況"}</span>
                  </h3>
                </div>

                {!isSchedule ? (
                  /* --- 出欠確認タイプ --- */
                  <>
                    <div className={styles.statusSummaryGrid}>
                      {(data.attendanceStatuses || []).map((status) => {
                        const count = (data.attendanceAnswers || []).filter(
                          (a) => a.status === status.id
                        ).length;
                        const isSelected = selectedStatusId === status.id && !showUnansweredList;

                        return (
                          <button
                            key={status.id}
                            type="button"
                            className={`${styles.statusSummaryPill} ${
                              isSelected ? styles.statusSummaryPillActive : ""
                            }`}
                            onClick={() => {
                              setSelectedStatusId(status.id);
                              setShowUnansweredList(false);
                            }}
                          >
                            <span>{status.name}</span>
                            <strong>{count}名</strong>
                          </button>
                        );
                      })}

                      {/* 未回答 */}
                      {(() => {
                        const answeredUids = (data.attendanceAnswers || []).map((a) => a.uid);
                        const unansweredUids = (data.allUserUids || []).filter(
                          (u) => !answeredUids.includes(u)
                        );
                        const isSelected = showUnansweredList;

                        return (
                          <button
                            type="button"
                            className={`${styles.statusSummaryPill} ${
                              isSelected ? styles.statusSummaryPillActive : ""
                            }`}
                            onClick={() => setShowUnansweredList(true)}
                          >
                            <span>未回答</span>
                            <strong style={{ color: isSelected ? "#fff" : "#ef4444" }}>
                              {unansweredUids.length}名
                            </strong>
                          </button>
                        );
                      })()}
                    </div>

                    {/* 選択されたステータスのパート別部員一覧 */}
                    {showUnansweredList ? (
                      <div className={styles.sectionGroup}>
                        <div className={styles.sectionGroupTitle}>
                          <i className="fa-solid fa-circle-question" style={{ color: "#ef4444" }} />
                          <span>未回答の部員一覧</span>
                        </div>
                        <div className={styles.userGrid}>
                          {(() => {
                            const answeredUids = (data.attendanceAnswers || []).map((a) => a.uid);
                            const unansweredUsers = (data.allUserUids || [])
                              .filter((u) => !answeredUids.includes(u))
                              .map((u) => data.usersMap[u])
                              .filter(Boolean);

                            if (unansweredUsers.length === 0) {
                              return (
                                <span style={{ fontSize: "12px", color: "#64748b" }}>
                                  全員回答済みです✨
                                </span>
                              );
                            }

                            return unansweredUsers.map((u) => (
                              <div key={u.id} className={styles.userChip}>
                                <img
                                  src={u.pictureUrl || globalLineDefaultImage}
                                  alt={u.displayName || ""}
                                  className={styles.userAvatar}
                                  onError={(e) => {
                                    e.currentTarget.src = globalLineDefaultImage;
                                  }}
                                />
                                <span>{u.displayName || "名前未設定"}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    ) : (
                      (() => {
                        const targetAnswers = (data.attendanceAnswers || []).filter(
                          (a) => a.status === selectedStatusId
                        );

                        if (targetAnswers.length === 0) {
                          return (
                            <div style={{ fontSize: "12px", color: "#64748b", padding: "8px 0" }}>
                              該当する部員はいません
                            </div>
                          );
                        }

                        // パートごとにグループ分け
                        const groupedBySection: Record<string, typeof targetAnswers> = {};
                        targetAnswers.forEach((ans) => {
                          const user = data.usersMap[ans.uid];
                          const secId = user?.sectionId || "other";
                          if (!groupedBySection[secId]) groupedBySection[secId] = [];
                          groupedBySection[secId].push(ans);
                        });

                        return Object.entries(groupedBySection).map(([secId, answers]) => {
                          const sectionName = data.sectionsMap[secId] || "その他";

                          return (
                            <div key={secId} className={styles.sectionGroup}>
                              <div className={styles.sectionGroupTitle}>
                                <i className="fa-solid fa-tag" style={{ fontSize: "11px" }} />
                                <span>
                                  {sectionName} ({answers.length}名)
                                </span>
                              </div>
                              <div className={styles.userGrid}>
                                {answers.map((ans) => {
                                  const u = data.usersMap[ans.uid];
                                  return (
                                    <div key={ans.id} className={styles.userChip}>
                                      <img
                                        src={u?.pictureUrl || globalLineDefaultImage}
                                        alt={u?.displayName || ""}
                                        className={styles.userAvatar}
                                        onError={(e) => {
                                          e.currentTarget.src = globalLineDefaultImage;
                                        }}
                                      />
                                      <span>{u?.displayName || "名前未設定"}</span>
                                      {ans.comment && (
                                        <span className={styles.userCommentBubble} title={ans.comment}>
                                          💬
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()
                    )}
                  </>
                ) : (
                  /* --- 日程調整タイプ --- */
                  <div style={{ overflowX: "auto" }}>
                    <table className={styles.adjustTable}>
                      <thead>
                        <tr>
                          <th className={styles.adjustDateCol}>候補日</th>
                          <th>◯ 参加可</th>
                          <th>△ 未定</th>
                          <th>✕ 不参加</th>
                          <th>未回答</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(event.candidateDates || []).map((dateStr) => {
                          let circleCount = 0;
                          let triangleCount = 0;
                          let crossCount = 0;

                          (data.adjustAnswers || []).forEach((ans) => {
                            const val = ans.answers?.[dateStr];
                            if (val === "1") circleCount++;
                            else if (val === "2") triangleCount++;
                            else if (val === "3") crossCount++;
                          });

                          const answeredCount = circleCount + triangleCount + crossCount;
                          const unansweredCount =
                            (data.allUserUids || []).length - answeredCount;

                          const parts = dateStr.split(".");
                          const label =
                            parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;

                          return (
                            <tr key={dateStr}>
                              <td className={styles.adjustDateCol}>
                                {label} ({getDayOfWeek(dateStr)})
                              </td>
                              <td style={{ color: "#16a34a", fontWeight: 700 }}>
                                {circleCount}
                              </td>
                              <td style={{ color: "#d97706", fontWeight: 700 }}>
                                {triangleCount}
                              </td>
                              <td style={{ color: "#dc2626", fontWeight: 700 }}>
                                {crossCount}
                              </td>
                              <td style={{ color: "#64748b" }}>{unansweredCount}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 4. セットリスト（譜割り） */}
              {event.setlist && event.setlist.length > 0 && (
                <div className={styles.sectionCard}>
                  <SetlistConfirm
                    setlist={event.setlist}
                    scoresMap={data.scoresMap || {}}
                  />
                </div>
              )}

              {/* 5. 録音・参考音源 */}
              {data.recordings && data.recordings.length > 0 && (
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                      <i className="fa-solid fa-headphones" />
                      <span>録音・参考音源 ({data.recordings.length}件)</span>
                    </h3>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {data.recordings.map((rec) => {
                      const ytId = extractYouTubeId(rec.url);

                      return (
                        <div key={rec.id} className={styles.recordingItem}>
                          <div className={styles.recordingHeader}>
                            <span className={styles.recordingTitle}>{rec.title}</span>
                            <a
                              href={rec.url}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.linkBanner}
                              style={{ margin: 0, padding: "3px 8px" }}
                            >
                              <i className="fa-solid fa-arrow-up-right-from-square" /> 開く
                            </a>
                          </div>

                          {ytId && (
                            <div className={styles.youtubeContainer}>
                              <iframe
                                src={`https://www.youtube-nocookie.com/embed/${ytId}`}
                                title={rec.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* モーダルフッター: 確認画面への遷移をなくし、スッキリ閉じるボタンを配置 */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCloseFooter} onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
