"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarCheck,
  faCheck,
  faXmark,
  faCommentDots,
  faClock,
  faLocationDot,
  faCheckDouble,
  faSpinner,
  faPaperPlane,
  faArrowUpRightFromSquare,
} from "@fortawesome/free-solid-svg-icons";
import { Event, AttendanceStatus } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { submitAttendanceAnswer } from "@/features/event/api/event-client-service";
import { DEFAULT_ATTENDANCE_STATUSES } from "@/lib/firestore/constants";
import {
  getDayOfWeek,
  format,
  showDialog,
  writeLog,
} from "@/lib/functions";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { EventDetailModal } from "@/features/calendar/components/EventDetailModal";
import styles from "./QuickAttendanceSection.module.css";

interface QuickAttendanceSectionProps {
  events: Event[];
  onUpdated?: () => void;
}

interface EventAnswerState {
  status: string; // status ID (e.g. "1" or "2")
  comment: string;
  isCommentOpen: boolean;
}

type SaveStatus = "idle" | "saving" | "saved";

export const QuickAttendanceSection: React.FC<QuickAttendanceSectionProps> = ({
  events = [],
  onUpdated,
}) => {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.id;

  const [statuses, setStatuses] = useState<AttendanceStatus[]>(DEFAULT_ATTENDANCE_STATUSES);
  const [answersMap, setAnswersMap] = useState<Record<string, EventAnswerState>>({});
  const [savingMap, setSavingMap] = useState<Record<string, SaveStatus>>({});
  const [isAllSaving, setIsAllSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // 今日から今後1週間（今日〜7日後）の出欠イベントを件数制限なく全件抽出
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const today = format(now, "yyyy.MM.dd");
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const maxDate = format(nextWeek, "yyyy.MM.dd");

    return events
      .filter((e) => {
        const isAttendance = e.attendanceType === "attendance" || !e.attendanceType;
        const eDate = e.date || e.startDate || "";
        return isAttendance && eDate >= today && eDate <= maxDate;
      })
      .sort((a, b) => {
        const da = a.date || a.startDate || "";
        const dbDate = b.date || b.startDate || "";
        return da.localeCompare(dbDate);
      });
  }, [events]);

  // ステータスマスタおよび回答データの取得
  const loadData = useCallback(async () => {
    if (!uid || upcomingEvents.length === 0) return;
    setIsLoading(true);

    try {
      // 1. マスタ取得
      const masterSnap = await getDocs(collection(db, "attendanceStatuses"));
      if (!masterSnap.empty) {
        const loaded = masterSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AttendanceStatus[];
        loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
        setStatuses(loaded);
      }

      // 2. ユーザーの回答取得
      const answers: Record<string, EventAnswerState> = {};
      await Promise.all(
        upcomingEvents.map(async (ev) => {
          try {
            const ansDoc = await getDoc(doc(db, "eventAttendanceAnswers", `${ev.id}_${uid}`));
            if (ansDoc.exists()) {
              const data = ansDoc.data();
              const st = data.status || "";
              const cm = data.comment || "";
              answers[ev.id] = {
                status: st,
                comment: cm,
                isCommentOpen: !!cm,
              };
            } else {
              answers[ev.id] = {
                status: "",
                comment: "",
                isCommentOpen: false,
              };
            }
          } catch (e) {
            console.error(`Error loading answer for event ${ev.id}:`, e);
            answers[ev.id] = {
              status: "",
              comment: "",
              isCommentOpen: false,
            };
          }
        })
      );

      setAnswersMap(answers);
    } catch (err) {
      console.error("[QuickAttendanceSection] loadData error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [uid, upcomingEvents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 1件のステータスを選択し、その場で即座に回答完了（保存）
  const handleSelectStatus = async (eventId: string, statusId: string) => {
    if (!uid) {
      await showDialog("出欠を登録するにはログインしてください", true);
      return;
    }

    if (savingMap[eventId] === "saving" || isAllSaving) return;

    const current = answersMap[eventId] || {
      status: "",
      comment: "",
      isCommentOpen: false,
    };

    // 楽観的UI更新
    setAnswersMap((prev) => ({
      ...prev,
      [eventId]: {
        ...current,
        status: statusId,
      },
    }));

    setSavingMap((prev) => ({ ...prev, [eventId]: "saving" }));

    try {
      await submitAttendanceAnswer(eventId, uid, statusId, current.comment);
      await writeLog({
        action: `クイック出欠回答: eventId=${eventId}, status=${statusId}`,
      });

      setSavingMap((prev) => ({ ...prev, [eventId]: "saved" }));
      setTimeout(() => {
        setSavingMap((prev) => {
          const next = { ...prev };
          if (next[eventId] === "saved") {
            delete next[eventId];
          }
          return next;
        });
      }, 2000);

      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error("[QuickAttendanceSection] Save error:", err);
      // エラー時はロールバック
      setAnswersMap((prev) => ({
        ...prev,
        [eventId]: current,
      }));
      setSavingMap((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      await showDialog(`出欠の保存に失敗しました: ${err.message}`, true);
    }
  };

  // コメント入力
  const handleCommentChange = (eventId: string, val: string) => {
    setAnswersMap((prev) => {
      const current = prev[eventId] || {
        status: "",
        comment: "",
        isCommentOpen: true,
      };
      return {
        ...prev,
        [eventId]: {
          ...current,
          comment: val,
        },
      };
    });
  };

  // メモ（連絡事項）の送信保存
  const handleSaveComment = async (eventId: string) => {
    if (!uid) {
      await showDialog("メモを登録するにはログインしてください", true);
      return;
    }
    const current = answersMap[eventId];
    if (!current) return;

    if (!current.status) {
      await showDialog("出欠ステータス（出ます／おやすみ）を選択してからメモを送信してください", true);
      return;
    }

    if (savingMap[eventId] === "saving" || isAllSaving) return;

    setSavingMap((prev) => ({ ...prev, [eventId]: "saving" }));
    try {
      await submitAttendanceAnswer(eventId, uid, current.status, current.comment);
      await writeLog({
        action: `出欠メモ送信: eventId=${eventId}, status=${current.status}, comment=${current.comment}`,
      });

      setSavingMap((prev) => ({ ...prev, [eventId]: "saved" }));
      setTimeout(() => {
        setSavingMap((prev) => {
          const next = { ...prev };
          if (next[eventId] === "saved") {
            delete next[eventId];
          }
          return next;
        });
      }, 2000);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error("[QuickAttendanceSection] Comment save error:", err);
      setSavingMap((prev) => {
        const next = { ...prev };
        delete next[eventId];
        return next;
      });
      await showDialog(`メモの送信に失敗しました: ${err.message}`, true);
    }
  };

  // コメント入力欄のトグル
  const toggleCommentOpen = (eventId: string) => {
    setAnswersMap((prev) => {
      const current = prev[eventId] || {
        status: "",
        comment: "",
        isCommentOpen: false,
      };
      return {
        ...prev,
        [eventId]: {
          ...current,
          isCommentOpen: !current.isCommentOpen,
        },
      };
    });
  };

  // 一括ショートカット (表示中の全イベントを即座に回答完了)
  const handleSetAllStatusAndSave = async (targetStatusId: string) => {
    if (!uid || upcomingEvents.length === 0 || isAllSaving) return;

    setIsAllSaving(true);
    const nextSaving: Record<string, SaveStatus> = {};
    const nextAnswers = { ...answersMap };

    upcomingEvents.forEach((ev) => {
      nextSaving[ev.id] = "saving";
      nextAnswers[ev.id] = {
        ...(nextAnswers[ev.id] || { comment: "", isCommentOpen: false }),
        status: targetStatusId,
      };
    });

    setAnswersMap(nextAnswers);
    setSavingMap(nextSaving);

    try {
      await Promise.all(
        upcomingEvents.map((ev) => {
          const cur = nextAnswers[ev.id];
          return submitAttendanceAnswer(ev.id, uid, targetStatusId, cur?.comment);
        })
      );

      await writeLog({
        action: `クイック出欠一括回答(${upcomingEvents.length}件): status=${targetStatusId}`,
      });

      const savedMap: Record<string, SaveStatus> = {};
      upcomingEvents.forEach((ev) => {
        savedMap[ev.id] = "saved";
      });
      setSavingMap(savedMap);

      setTimeout(() => {
        setSavingMap({});
      }, 2000);

      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error("[QuickAttendanceSection] Set all error:", err);
      setSavingMap({});
      await showDialog(`出欠の一括保存に失敗しました: ${err.message}`, true);
    } finally {
      setIsAllSaving(false);
    }
  };

  // 表示すべきイベントがない場合
  if (upcomingEvents.length === 0) {
    return null;
  }

  // 出席ステータスID（通常 "1"）と欠席ステータスID（通常 "2"）
  const attendStatus = statuses[0];
  const absentStatus = statuses[1] || statuses[0];

  return (
    <section className={styles.container}>
      <div className={styles.card}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIconWrapper}>
              <FontAwesomeIcon icon={faCalendarCheck} className={styles.headerIcon} />
            </div>
            <div>
              <div className={styles.titleRow}>
                <h3 className={styles.title}>出欠クイック登録</h3>
                <span className={styles.countBadge}>今後1週間（{upcomingEvents.length}件）</span>
              </div>
              <p className={styles.subtitle}>ボタンをタップするとその場で即座に回答完了します</p>
            </div>
          </div>

          {/* 一括ショートカットボタン */}
          {attendStatus && (
            <div className={styles.quickShortcuts}>
              <button
                type="button"
                disabled={isAllSaving}
                className={`${styles.shortcutBtn} ${styles.shortcutAttend}`}
                onClick={() => handleSetAllStatusAndSave(attendStatus.id)}
                title="表示されているすべてのイベントを出席として即時登録します"
              >
                <FontAwesomeIcon icon={faCheckDouble} /> すべて{attendStatus.name.replace(/^[^\w\s\u3000-\u9fff]+/u, "") || "出席"}
              </button>
              {absentStatus && absentStatus.id !== attendStatus.id && (
                <button
                  type="button"
                  disabled={isAllSaving}
                  className={`${styles.shortcutBtn} ${styles.shortcutAbsent}`}
                  onClick={() => handleSetAllStatusAndSave(absentStatus.id)}
                  title="表示されているすべてのイベントを欠席として即時登録します"
                >
                  <FontAwesomeIcon icon={faXmark} /> すべて{absentStatus.name.replace(/^[^\w\s\u3000-\u9fff]+/u, "") || "欠席"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* イベント一覧（今後1週間） */}
        <div className={styles.eventList}>
          {upcomingEvents.map((ev) => {
            const dateStr = ev.date || ev.startDate || "";
            const dayOfWeek = dateStr ? getDayOfWeek(dateStr, true) : "";
            const currentAns = answersMap[ev.id] || {
              status: "",
              comment: "",
              isCommentOpen: false,
            };

            const timeDisplay = ev.isAllDay
              ? "終日"
              : ev.startTime && ev.endTime
              ? `${ev.startTime}〜${ev.endTime}`
              : ev.startTime
              ? `${ev.startTime}〜`
              : "時間未定";

            const isEventSaving = savingMap[ev.id] === "saving";
            const isEventSaved = savingMap[ev.id] === "saved";

            return (
              <div key={ev.id} className={styles.eventItem}>
                <div className={styles.eventMainRow}>
                  {/* 日時情報 */}
                  <div className={styles.dateCol}>
                    <div className={styles.dateBadge}>
                      <span className={styles.dateNum}>
                        {dateStr ? dateStr.substring(5) : "--.--"}
                      </span>
                      <span className={styles.dayOfWeek}>({dayOfWeek})</span>
                    </div>
                  </div>

                  {/* イベント情報 */}
                  <div className={styles.infoCol}>
                    <div className={styles.eventTitleRow}>
                      <button
                        type="button"
                        className={styles.eventTitleBtn}
                        onClick={() => setSelectedEventId(ev.id)}
                        title="イベント確認モーダルを開く"
                        aria-label={`${ev.title}のイベント詳細・確認を表示`}
                      >
                        <span className={styles.eventTitle}>{ev.title}</span>
                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className={styles.eventTitleIcon} />
                      </button>
                      {isEventSaved && (
                        <span className={styles.savedBadge}>
                          <FontAwesomeIcon icon={faCheck} /> 回答完了
                        </span>
                      )}
                      {isEventSaving && (
                        <span className={styles.savingBadge}>
                          <FontAwesomeIcon icon={faSpinner} spin /> 保存中
                        </span>
                      )}
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.timeMeta}>
                        <FontAwesomeIcon icon={faClock} className={styles.metaIcon} />
                        {timeDisplay}
                      </span>
                      {ev.placeName && (
                        <span className={styles.placeMeta}>
                          <FontAwesomeIcon icon={faLocationDot} className={styles.metaIcon} />
                          {ev.placeName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ステータス選択ボタングループ & メモボタン */}
                <div className={styles.actionRow}>
                  <div className={styles.statusButtonGroup}>
                    {statuses.map((st) => {
                      const isSelected = currentAns.status === st.id;
                      const isThisSaving = isEventSaving && isSelected;

                      return (
                        <button
                          key={st.id}
                          type="button"
                          disabled={isEventSaving || isAllSaving}
                          className={`${styles.statusBtn} ${
                            isSelected
                              ? styles.statusBtnSelected
                              : styles.statusBtnNormal
                          }`}
                          onClick={() => handleSelectStatus(ev.id, st.id)}
                        >
                          <span className={styles.statusBtnText}>{st.name}</span>
                          {isThisSaving ? (
                            <FontAwesomeIcon icon={faSpinner} spin className={styles.checkIcon} />
                          ) : isSelected ? (
                            <FontAwesomeIcon icon={faCheck} className={styles.checkIcon} />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  {/* コメントトグルボタン */}
                  <button
                    type="button"
                    className={`${styles.commentToggleBtn} ${
                      currentAns.comment ? styles.commentToggleBtnActive : ""
                    }`}
                    onClick={() => toggleCommentOpen(ev.id)}
                    title="連絡メモ（遅刻・早退等）を入力"
                  >
                    <FontAwesomeIcon icon={faCommentDots} />
                    <span>{currentAns.comment ? "メモあり" : "メモ"}</span>
                  </button>
                </div>

                {/* コメント入力欄 (アコーディオン展開) */}
                {currentAns.isCommentOpen && (
                  <div className={styles.commentContainer}>
                    <input
                      type="text"
                      className={styles.commentInput}
                      placeholder="連絡事項・備考（例: 19時合流予定、パート練のみ参加）"
                      value={currentAns.comment}
                      onChange={(e) => handleCommentChange(ev.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          handleSaveComment(ev.id);
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={isEventSaving || isAllSaving}
                      className={styles.commentSubmitBtn}
                      onClick={() => handleSaveComment(ev.id)}
                      title="メモを送信して登録"
                    >
                      {isEventSaving ? (
                        <FontAwesomeIcon icon={faSpinner} spin />
                      ) : (
                        <FontAwesomeIcon icon={faPaperPlane} />
                      )}
                      <span>送信</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* イベント確認モーダル */}
      {selectedEventId && (
        <EventDetailModal
          eventId={selectedEventId}
          initialMode="view"
          onClose={() => setSelectedEventId(null)}
          onSaveSuccess={() => {
            loadData();
            router.refresh();
            if (onUpdated) onUpdated();
          }}
          onDeleteSuccess={() => {
            loadData();
            router.refresh();
            if (onUpdated) onUpdated();
          }}
          onAnswerUpdated={() => {
            loadData();
            router.refresh();
            if (onUpdated) onUpdated();
          }}
        />
      )}
    </section>
  );
};
