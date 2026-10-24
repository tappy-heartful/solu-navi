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
  faFloppyDisk,
  faCheckDouble,
} from "@fortawesome/free-solid-svg-icons";
import { Event, AttendanceStatus } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { submitAttendanceAnswer } from "@/features/event/api/event-client-service";
import { DEFAULT_ATTENDANCE_STATUSES } from "@/lib/firestore/constants";
import {
  getDayOfWeek,
  format,
  showDialog,
  showSpinner,
  hideSpinner,
  writeLog,
} from "@/lib/functions";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import styles from "./QuickAttendanceSection.module.css";

interface QuickAttendanceSectionProps {
  events: Event[];
  onUpdated?: () => void;
}

interface EventAnswerState {
  status: string; // status ID (e.g. "1" or "2")
  comment: string;
  isCommentOpen: boolean;
  initialStatus: string;
  initialComment: string;
}

export const QuickAttendanceSection: React.FC<QuickAttendanceSectionProps> = ({
  events = [],
  onUpdated,
}) => {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.id;

  const [statuses, setStatuses] = useState<AttendanceStatus[]>(DEFAULT_ATTENDANCE_STATUSES);
  const [answersMap, setAnswersMap] = useState<Record<string, EventAnswerState>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 今日以降の直近3件の出欠イベントを抽出
  const upcomingEvents = useMemo(() => {
    const today = format(new Date(), "yyyy.MM.dd");
    return events
      .filter((e) => {
        const isAttendance = e.attendanceType === "attendance" || !e.attendanceType;
        const eDate = e.date || e.startDate || "";
        return isAttendance && eDate >= today;
      })
      .sort((a, b) => {
        const da = a.date || a.startDate || "";
        const dbDate = b.date || b.startDate || "";
        return da.localeCompare(dbDate);
      })
      .slice(0, 3);
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
                initialStatus: st,
                initialComment: cm,
              };
            } else {
              answers[ev.id] = {
                status: "",
                comment: "",
                isCommentOpen: false,
                initialStatus: "",
                initialComment: "",
              };
            }
          } catch (e) {
            console.error(`Error loading answer for event ${ev.id}:`, e);
            answers[ev.id] = {
              status: "",
              comment: "",
              isCommentOpen: false,
              initialStatus: "",
              initialComment: "",
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

  // 1件のステータス切り替え
  const handleSelectStatus = (eventId: string, statusId: string) => {
    setAnswersMap((prev) => {
      const current = prev[eventId] || {
        status: "",
        comment: "",
        isCommentOpen: false,
        initialStatus: "",
        initialComment: "",
      };
      // 同じステータスをもう一度タップした場合は選択解除（未選択）
      const newStatus = current.status === statusId ? "" : statusId;
      return {
        ...prev,
        [eventId]: {
          ...current,
          status: newStatus,
        },
      };
    });
  };

  // コメント入力
  const handleCommentChange = (eventId: string, val: string) => {
    setAnswersMap((prev) => {
      const current = prev[eventId] || {
        status: "",
        comment: "",
        isCommentOpen: true,
        initialStatus: "",
        initialComment: "",
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

  // コメント入力欄のトグル
  const toggleCommentOpen = (eventId: string) => {
    setAnswersMap((prev) => {
      const current = prev[eventId] || {
        status: "",
        comment: "",
        isCommentOpen: false,
        initialStatus: "",
        initialComment: "",
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

  // 一括出席 (全て「出ます！」にセット)
  const handleSetAllStatus = (targetStatusId: string) => {
    setAnswersMap((prev) => {
      const next = { ...prev };
      upcomingEvents.forEach((ev) => {
        const cur = next[ev.id] || {
          status: "",
          comment: "",
          isCommentOpen: false,
          initialStatus: "",
          initialComment: "",
        };
        next[ev.id] = {
          ...cur,
          status: targetStatusId,
        };
      });
      return next;
    });
  };

  // 変更があるかどうかの判定
  const hasChanges = useMemo(() => {
    return upcomingEvents.some((ev) => {
      const state = answersMap[ev.id];
      if (!state) return false;
      return (
        state.status !== state.initialStatus ||
        state.comment.trim() !== state.initialComment.trim()
      );
    });
  }, [upcomingEvents, answersMap]);

  // 一括登録の実行
  const handleSaveAll = async () => {
    if (!uid) {
      await showDialog("出欠を登録するにはログインしてください", true);
      return;
    }

    // 1件もステータスが選択されていない場合は確認
    const anySelected = upcomingEvents.some((ev) => answersMap[ev.id]?.status);
    if (!anySelected) {
      await showDialog("出欠ステータスを選択してください", true);
      return;
    }

    setIsSaving(true);
    showSpinner();

    try {
      const promises = upcomingEvents.map(async (ev) => {
        const state = answersMap[ev.id];
        if (!state) return;
        // ステータスが選択されているもの、または元々回答があったものは更新
        if (state.status || state.initialStatus) {
          await submitAttendanceAnswer(ev.id, uid, state.status, state.comment);
        }
      });

      await Promise.all(promises);
      await writeLog({
        action: `出欠一括登録(${upcomingEvents.length}件)`,
      });

      hideSpinner();
      await showDialog(`直近${upcomingEvents.length}件の出欠を一括登録しました`, true);

      // 初期値を更新して変更フラグを解消
      setAnswersMap((prev) => {
        const next = { ...prev };
        upcomingEvents.forEach((ev) => {
          if (next[ev.id]) {
            next[ev.id] = {
              ...next[ev.id],
              initialStatus: next[ev.id].status,
              initialComment: next[ev.id].comment,
            };
          }
        });
        return next;
      });

      if (onUpdated) onUpdated();
      router.refresh();
    } catch (err: any) {
      hideSpinner();
      console.error("[QuickAttendanceSection] Save error:", err);
      await showDialog(`出欠の一括登録に失敗しました: ${err.message}`, true);
    } finally {
      setIsSaving(false);
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
                <h3 className={styles.title}>出欠一括登録</h3>
                <span className={styles.countBadge}>直近{upcomingEvents.length}件</span>
              </div>
              <p className={styles.subtitle}>先の練習・イベントの出欠をまとめて登録できます</p>
            </div>
          </div>

          {/* 一括ショートカットボタン */}
          {attendStatus && (
            <div className={styles.quickShortcuts}>
              <button
                type="button"
                className={`${styles.shortcutBtn} ${styles.shortcutAttend}`}
                onClick={() => handleSetAllStatus(attendStatus.id)}
                title="表示されているすべてのイベントを出席にします"
              >
                <FontAwesomeIcon icon={faCheckDouble} /> すべて{attendStatus.name.replace(/^[^\w\s\u3000-\u9fff]+/u, "") || "出席"}
              </button>
              {absentStatus && absentStatus.id !== attendStatus.id && (
                <button
                  type="button"
                  className={`${styles.shortcutBtn} ${styles.shortcutAbsent}`}
                  onClick={() => handleSetAllStatus(absentStatus.id)}
                  title="表示されているすべてのイベントを欠席にします"
                >
                  <FontAwesomeIcon icon={faXmark} /> すべて{absentStatus.name.replace(/^[^\w\s\u3000-\u9fff]+/u, "") || "欠席"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* イベント一覧（3件） */}
        <div className={styles.eventList}>
          {upcomingEvents.map((ev, idx) => {
            const dateStr = ev.date || ev.startDate || "";
            const dayOfWeek = dateStr ? getDayOfWeek(dateStr, true) : "";
            const currentAns = answersMap[ev.id] || {
              status: "",
              comment: "",
              isCommentOpen: false,
              initialStatus: "",
              initialComment: "",
            };

            const timeDisplay = ev.isAllDay
              ? "終日"
              : ev.startTime && ev.endTime
              ? `${ev.startTime}〜${ev.endTime}`
              : ev.startTime
              ? `${ev.startTime}〜`
              : "時間未定";

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
                      <span className={styles.eventTitle}>{ev.title}</span>
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

                      return (
                        <button
                          key={st.id}
                          type="button"
                          className={`${styles.statusBtn} ${
                            isSelected
                              ? styles.statusBtnSelected
                              : styles.statusBtnNormal
                          }`}
                          onClick={() => handleSelectStatus(ev.id, st.id)}
                        >
                          <span className={styles.statusBtnText}>{st.name}</span>
                          {isSelected && (
                            <FontAwesomeIcon icon={faCheck} className={styles.checkIcon} />
                          )}
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
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* フッター: 一括保存ボタン */}
        <div className={styles.footer}>
          <button
            type="button"
            className={`${styles.saveButton} ${hasChanges ? styles.saveButtonActive : ""}`}
            onClick={handleSaveAll}
            disabled={isSaving}
          >
            <FontAwesomeIcon icon={faFloppyDisk} className={styles.saveIcon} />
            <span>
              {isSaving
                ? "登録中..."
                : hasChanges
                ? `変更内容を一括登録する`
                : `出欠を一括登録する`}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
