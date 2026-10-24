"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./CalendarView.module.css";
import { DailyAgendaModal, AgendaItem } from "@/features/home/components/DailyAgendaModal";
import { EventDetailModal } from "./EventDetailModal";
import { Event, Vote, Call } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface CalendarViewProps {
  events: Event[];
  votes?: Vote[];
  calls?: Call[];
}

export function CalendarView({ events = [], votes = [], calls = [] }: CalendarViewProps) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.uid || userData?.id;

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const [year, setYear] = useState(todayYear);
  const [month, setMonth] = useState(todayMonth);
  const [scopeFilter, setScopeFilter] = useState<"all" | "my">("all");
  const [myAttendanceAnswers, setMyAttendanceAnswers] = useState<Record<string, string>>({});

  const [activeDateStr, setActiveDateStr] = useState<string>("");
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);

  // イベントのローカルステート (モーダルでの追加・編集・削除を画面遷移なしで即時反映)
  const [calendarEvents, setCalendarEvents] = useState<Event[]>(events);

  useEffect(() => {
    setCalendarEvents(events);
  }, [events]);

  // イベント統合モーダル (閲覧・出欠回答・編集・新規作成) のステート
  const [detailModalConfig, setDetailModalConfig] = useState<{
    eventId?: string | null;
    mode?: "view" | "edit" | "create";
    initialDate?: string;
  } | null>(null);

  // URLクエリパラメータ (?eventId=xxx, ?newEvent=true) による自動モーダル起動
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const evId = params.get("eventId");
      const isNew = params.get("newEvent");
      if (evId) {
        setDetailModalConfig({ eventId: evId, mode: "view" });
      } else if (isNew) {
        setDetailModalConfig({ eventId: null, mode: "create" });
      }
    }
  }, []);

  // 自分の出欠回答を取得
  const fetchAnswers = useCallback(async () => {
    if (!uid) return;
    try {
      const q = query(collection(db, "eventAttendanceAnswers"), where("uid", "==", uid));
      const snap = await getDocs(q);
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        map[d.data().eventId] = d.data().status;
      });
      setMyAttendanceAnswers(map);
    } catch (err) {
      console.error("fetchAnswers error:", err);
    }
  }, [uid]);

  useEffect(() => {
    fetchAnswers();
  }, [fetchAnswers]);

  const handlePrevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  };

  const handleGoToToday = () => {
    setYear(todayYear);
    setMonth(todayMonth);
  };

  // スワイプの閾値（ピクセル）(streak-navi準拠)
  const minSwipeDistance = 50;
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distanceX = touchStartX - touchEndX;
    const distanceY = touchStartY !== null && touchEndY !== null ? touchStartY - touchEndY : 0;

    // 縦スクロールと競合しないよう、横の移動量が縦の移動量より大きく、かつ閾値を超えている場合のみ判定
    if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
        // 左スワイプ（右から左へスワイプ）: 次月へ
        handleNextMonth();
      } else {
        // 右スワイプ（左から右へスワイプ）: 前月へ
        handlePrevMonth();
      }
    }
  };

  // カレンダーグリッドの日付セル生成
  const gridCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      year: number;
      month: number;
      dayNum: number;
      isCurrentMonth: boolean;
    }> = [];

    // 前月の余白
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        year: month === 0 ? year - 1 : year,
        month: month === 0 ? 11 : month - 1,
        dayNum: daysInPrevMonth - i,
        isCurrentMonth: false,
      });
    }

    // 当月
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        year,
        month,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // 次月の余白 (合計行が7の倍数になるよう調整)
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        year: month === 11 ? year + 1 : year,
        month: month === 11 ? 0 : month + 1,
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month]);

  // 特定の日のアイテムを取得
  const getItemsForDay = useCallback(
    (cellYear: number, cellMonth: number, dayNum: number): AgendaItem[] => {
      const dateStr = `${cellYear}.${String(cellMonth + 1).padStart(2, "0")}.${String(
        dayNum
      ).padStart(2, "0")}`;
      const items: AgendaItem[] = [];

      // 1. イベント (出欠タイプ / カレンダー予定)
      calendarEvents.forEach((ev) => {
        if (ev.attendanceType !== "schedule") {
          const evStart = ev.startDate || ev.date || "";
          const evEnd = ev.endDate || evStart;
          const isMatch = evStart <= dateStr && dateStr <= evEnd;

          if (isMatch) {
            const myStatus = myAttendanceAnswers[ev.id];
            if (scopeFilter === "my" && !myStatus && ev.createdBy !== uid) return;

            const timeText = ev.isAllDay
              ? "終日"
              : ev.startTime
              ? `${ev.startTime}〜${ev.endTime || ""}`
              : "終日";

            items.push({
              type: "event",
              iconClass: "fa-solid fa-calendar-check",
              label: ev.title,
              link: `/event/confirm?eventId=${ev.id}`,
              id: ev.id,
              status: myStatus,
              isAllDay: ev.isAllDay ?? true,
              timeText,
              createdBy: ev.createdBy,
            });
          }
        }

        // 2. 日程調整イベント
        if (ev.attendanceType === "schedule") {
          const isCandidate = (ev.candidateDates || []).includes(dateStr);
          if (isCandidate) {
            items.push({
              type: "schedule_adjust",
              iconClass: "fa-solid fa-calendar-days",
              label: `[日程調整] ${ev.title}`,
              link: `/event/confirm?eventId=${ev.id}`,
              id: ev.id,
              isAllDay: true,
              timeText: "調整中",
              createdBy: ev.createdBy,
            });
          }
        }
      });

      // 3. 曲投票 (期間内)
      votes.forEach((v) => {
        if (v.acceptStartDate && v.acceptEndDate) {
          if (v.acceptStartDate <= dateStr && dateStr <= v.acceptEndDate) {
            items.push({
              type: "vote",
              iconClass: "fa-solid fa-check-to-slot",
              label: `[投票] ${v.name}`,
              link: `/vote/confirm?voteId=${v.id}`,
              id: v.id,
              isAllDay: true,
              timeText: "投票期間",
              createdBy: v.createdBy,
            });
          }
        }
      });

      // 4. 曲募集 (期間内)
      calls.forEach((c) => {
        if (c.acceptStartDate && c.acceptEndDate) {
          if (c.acceptStartDate <= dateStr && dateStr <= c.acceptEndDate) {
            items.push({
              type: "call",
              iconClass: "fa-solid fa-music",
              label: `[募集] ${c.title}`,
              link: `/call/confirm?callId=${c.id}`,
              id: c.id,
              isAllDay: true,
              timeText: "募集期間",
              createdBy: c.createdBy,
            });
          }
        }
      });

      return items;
    },
    [calendarEvents, votes, calls, myAttendanceAnswers, scopeFilter, uid]
  );

  const handleCellClick = (cellYear: number, cellMonth: number, dayNum: number) => {
    const dateStr = `${cellYear}.${String(cellMonth + 1).padStart(2, "0")}.${String(
      dayNum
    ).padStart(2, "0")}`;
    setActiveDateStr(dateStr);
    setIsAgendaOpen(true);
  };

  // ===== イベントの追加・編集・削除ハンドラ (ホーム画面統合モーダル) =====

  const handleAddNewEvent = (dateStr: string) => {
    setIsAgendaOpen(false);
    setDetailModalConfig({
      eventId: null,
      mode: "create",
      initialDate: dateStr,
    });
  };

  const handleEditEvent = (eventId: string) => {
    setIsAgendaOpen(false);
    setDetailModalConfig({
      eventId,
      mode: "edit",
    });
  };



  return (
    <section className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <div className={styles.monthLabel}>
          <i className="fa-solid fa-calendar-days" />
          {year}年 {month + 1}月
        </div>
        <div className={styles.headerBtns}>
          <button type="button" className={styles.todayBtn} onClick={handleGoToToday}>
            今日
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={handlePrevMonth}
            aria-label="前月"
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <button
            type="button"
            className={styles.navBtn}
            onClick={handleNextMonth}
            aria-label="次月"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>表示:</span>
          <div className={styles.toggleButtonGroup}>
            <button
              type="button"
              className={`${styles.filterButton} ${scopeFilter === "all" ? styles.activeScope : ""
                }`}
              onClick={() => setScopeFilter("all")}
            >
              全体
            </button>
            <button
              type="button"
              className={`${styles.filterButton} ${scopeFilter === "my" ? styles.activeScope : ""
                }`}
              onClick={() => setScopeFilter("my")}
            >
              自分のみ
            </button>
          </div>
        </div>

        <div className={styles.legendGroup}>
          <span className={`${styles.legendItem} ${styles.legendEvent}`}>
            <i className="fa-solid fa-calendar-check" /> イベント
          </span>
          <span className={`${styles.legendItem} ${styles.legendScheduleAdjust}`}>
            <i className="fa-solid fa-calendar-days" /> 日程調整
          </span>
          <span className={`${styles.legendItem} ${styles.legendVote}`}>
            <i className="fa-solid fa-check-to-slot" /> 曲投票
          </span>
          <span className={`${styles.legendItem} ${styles.legendCall}`}>
            <i className="fa-solid fa-music" /> 曲募集
          </span>
        </div>
      </div>

      <div className={styles.weekdaysHeader}>
        <div className={`${styles.weekday} ${styles.weekdaySunday}`}>日</div>
        <div className={styles.weekday}>月</div>
        <div className={styles.weekday}>火</div>
        <div className={styles.weekday}>水</div>
        <div className={styles.weekday}>木</div>
        <div className={styles.weekday}>金</div>
        <div className={`${styles.weekday} ${styles.weekdaySaturday}`}>土</div>
      </div>

      <div
        className={styles.daysGrid}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {gridCells.map((cell, idx) => {
          const items = getItemsForDay(cell.year, cell.month, cell.dayNum);
          const isToday =
            todayYear === cell.year &&
            todayMonth === cell.month &&
            todayDay === cell.dayNum;
          const cellDayOfWeek = idx % 7;

          let dayNumberClass = styles.dayNumber;
          if (isToday) dayNumberClass += ` ${styles.todayCircle}`;
          else if (cellDayOfWeek === 0) dayNumberClass += ` ${styles.sundayNumber}`;
          else if (cellDayOfWeek === 6) dayNumberClass += ` ${styles.saturdayNumber}`;

          let dayContainerClass = styles.calendarDay;
          if (!cell.isCurrentMonth) dayContainerClass += ` ${styles.otherMonthDay}`;

          return (
            <div
              key={`${cell.year}-${cell.month}-${cell.dayNum}-${idx}`}
              className={dayContainerClass}
              onClick={() => handleCellClick(cell.year, cell.month, cell.dayNum)}
            >
              <div className={styles.dayHeader}>
                <span className={dayNumberClass}>{cell.dayNum}</span>
              </div>
              <div className={styles.eventsContainer}>
                {items.slice(0, 3).map((item, itemIdx) => {
                  let pillClass = styles.eventMeLight;
                  if (item.type === "schedule_adjust") {
                    pillClass = styles.eventScheduleAdjust;
                  } else if (item.type === "vote") {
                    pillClass = styles.eventCoupleLight;
                  } else if (item.type === "call") {
                    pillClass = styles.eventPartnerLight;
                  }

                  return (
                    <span
                      key={`${item.type}-${item.id}-${itemIdx}`}
                      className={`${styles.eventPill} ${pillClass}`}
                    >
                      <i className={item.iconClass || "fa-solid fa-circle"} />
                      {item.label}
                    </span>
                  );
                })}
                {items.length > 3 && (
                  <span
                    style={{
                      fontSize: "8px",
                      color: "#666",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    他 +{items.length - 3}件
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isAgendaOpen && (
        <DailyAgendaModal
          activeDateStr={activeDateStr}
          items={
            activeDateStr
              ? getItemsForDay(
                Number(activeDateStr.split(".")[0]),
                Number(activeDateStr.split(".")[1]) - 1,
                Number(activeDateStr.split(".")[2])
              )
              : []
          }
          onClose={() => setIsAgendaOpen(false)}
          onAddEvent={handleAddNewEvent}
          onEditEvent={handleEditEvent}
          onViewEventDetail={(id) => setDetailModalConfig({ eventId: id, mode: "view" })}
        />
      )}

      {detailModalConfig && (
        <EventDetailModal
          eventId={detailModalConfig.eventId}
          initialMode={detailModalConfig.mode}
          initialDate={detailModalConfig.initialDate}
          onClose={() => setDetailModalConfig(null)}
          onSaveSuccess={() => {
            fetchAnswers();
            router.refresh();
          }}
          onDeleteSuccess={() => {
            fetchAnswers();
            router.refresh();
          }}
          onAnswerUpdated={() => {
            fetchAnswers();
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
