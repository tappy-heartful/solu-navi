"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import styles from "./CalendarView.module.css";
import { DailyAgendaModal, AgendaItem } from "@/features/home/components/DailyAgendaModal";
import EventModal from "./EventModal";
import { Event, Vote, Call } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  addEvent,
  updateEvent,
  deleteEventWithAnswers,
} from "@/features/event/api/event-client-service";
import {
  toHyphenDate,
  toDotDate,
  getDaysDiff,
  shiftDateString,
  generateRecurrenceDates,
  RecurrenceConfig,
} from "../lib/recurrence-utils";
import { showSpinner, hideSpinner } from "@/components/Common/Spinner";
import { showDialog } from "@/components/Common/CommonDialog";
import { canEditEvent } from "@/features/event/lib/event-utils";

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

  // イベント追加・編集用モーダルのステート
  const [activeModalEvent, setActiveModalEvent] = useState<Partial<Event> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 自分の出欠回答を取得
  useEffect(() => {
    if (!uid) return;
    const fetchAnswers = async () => {
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
    };
    fetchAnswers();
  }, [uid]);

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

            items.push({
              type: "event",
              iconClass: "fa-solid fa-calendar-check",
              label: ev.title,
              link: `/event/confirm?eventId=${ev.id}`,
              id: ev.id,
              status: myStatus,
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

  // ===== イベントの追加・編集・削除ハンドラ (CANDY 準拠) =====

  const handleAddNewEvent = (dateStr: string) => {
    const dotDate = toDotDate(dateStr);
    setActiveModalEvent({
      date: dotDate,
      startDate: dotDate,
      endDate: dotDate,
      isAllDay: true,
      attendanceType: "attendance",
    });
    setIsAgendaOpen(false);
    setIsModalOpen(true);
  };

  const handleEditEvent = (eventId: string) => {
    const target = calendarEvents.find((e) => e.id === eventId);
    if (target) {
      setActiveModalEvent(target);
      setIsAgendaOpen(false);
      setIsModalOpen(true);
    }
  };

  const handleCopyEvent = (eventData: Partial<Event>) => {
    setActiveModalEvent({
      ...eventData,
      id: undefined,
    });
  };

  const handleSaveEvent = async (
    eventData: Partial<Event> & { recurrenceConfig?: RecurrenceConfig },
    targetRange?: "only" | "all"
  ) => {
    showSpinner();
    try {
      if (activeModalEvent?.id) {
        // --- 編集モード ---
        if (!canEditEvent(activeModalEvent, userData)) {
          showDialog("この予定を編集する権限がありません", true);
          return;
        }
        if (activeModalEvent.isRecurring && targetRange === "only") {
          // この予定のみ変更 -> 繰り返しから外して単体化
          const updatedData: Partial<Event> = {
            ...eventData,
            isRecurring: false,
            recurrenceId: "",
          };
          delete (updatedData as any).recurrenceConfig;

          await updateEvent(activeModalEvent.id, updatedData);
          setCalendarEvents((prev) =>
            prev.map((e) =>
              e.id === activeModalEvent.id ? ({ ...e, ...updatedData } as Event) : e
            )
          );
        } else if (
          activeModalEvent.isRecurring &&
          targetRange === "all" &&
          activeModalEvent.recurrenceId
        ) {
          // すべての繰り返し予定を一括変更 (日付差分シフト)
          const oldStart = activeModalEvent.startDate || activeModalEvent.date || "";
          const oldEnd = activeModalEvent.endDate || oldStart;
          const newStart = eventData.startDate || eventData.date || oldStart;
          const newEnd = eventData.endDate || newStart;

          const diffStart = getDaysDiff(oldStart, newStart);
          const diffEnd = getDaysDiff(oldEnd, newEnd);

          const recurringEvents = calendarEvents.filter(
            (e) => e.recurrenceId === activeModalEvent.recurrenceId
          );

          const updates = recurringEvents.map(async (e) => {
            const eStart = e.startDate || e.date || "";
            const eEnd = e.endDate || eStart;
            const nextStartDate = shiftDateString(eStart, diffStart);
            const nextEndDate = shiftDateString(eEnd, diffEnd);

            const dataToUpdate: Partial<Event> = {
              ...eventData,
              date: nextStartDate,
              startDate: nextStartDate,
              endDate: nextEndDate,
            };
            delete (dataToUpdate as any).recurrenceConfig;

            await updateEvent(e.id, dataToUpdate);
            return { id: e.id, data: dataToUpdate };
          });

          const results = await Promise.all(updates);
          setCalendarEvents((prev) =>
            prev.map((e) => {
              const res = results.find((r) => r.id === e.id);
              return res ? ({ ...e, ...res.data } as Event) : e;
            })
          );
        } else {
          // 通常編集
          const dataToUpdate = { ...eventData };
          delete (dataToUpdate as any).recurrenceConfig;

          await updateEvent(activeModalEvent.id, dataToUpdate);
          setCalendarEvents((prev) =>
            prev.map((e) =>
              e.id === activeModalEvent.id ? ({ ...e, ...dataToUpdate } as Event) : e
            )
          );
        }
      } else {
        // --- 新規登録モード ---
        const recurrenceConfig = eventData.recurrenceConfig;
        if (eventData.isRecurring && recurrenceConfig) {
          // 繰り返し予定の一括生成登録
          const recId =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
          const targetDates = generateRecurrenceDates(
            eventData.startDate || eventData.date!,
            recurrenceConfig
          );

          const baseData = { ...eventData };
          delete baseData.recurrenceConfig;

          const creations = targetDates.map(async (dHyphen) => {
            const dDot = toDotDate(dHyphen);
            const dateDiff = getDaysDiff(eventData.startDate || eventData.date!, dDot);
            const nextEndDate = shiftDateString(
              eventData.endDate || eventData.startDate || eventData.date!,
              dateDiff
            );

            const itemData: Omit<Event, "id"> = {
              title: baseData.title || "",
              attendanceType: baseData.attendanceType || "attendance",
              date: dDot,
              startDate: dDot,
              endDate: nextEndDate,
              acceptStartDate: baseData.acceptStartDate || "",
              acceptEndDate: baseData.acceptEndDate || "",
              isAllDay: baseData.isAllDay ?? true,
              startTime: baseData.startTime || "",
              endTime: baseData.endTime || "",
              placeName: baseData.placeName || "",
              note: baseData.note || "",
              link: baseData.link || "",
              isRecurring: true,
              recurrenceId: recId,
              createdUid: uid || "",
              createdBy: userData?.displayName || uid || "",
            };

            const newId = await addEvent(itemData);
            return {
              id: newId,
              ...itemData,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            } as Event;
          });

          const addedEvents = await Promise.all(creations);
          setCalendarEvents((prev) => [...prev, ...addedEvents]);
        } else {
          // 通常登録
          const baseData = { ...eventData };
          delete (baseData as any).recurrenceConfig;

          const itemData: Omit<Event, "id"> = {
            title: baseData.title || "",
            attendanceType: baseData.attendanceType || "attendance",
            date: baseData.date || baseData.startDate || "",
            startDate: baseData.startDate || baseData.date || "",
            endDate: baseData.endDate || baseData.startDate || baseData.date || "",
            acceptStartDate: baseData.acceptStartDate || "",
            acceptEndDate: baseData.acceptEndDate || "",
            isAllDay: baseData.isAllDay ?? true,
            startTime: baseData.startTime || "",
            endTime: baseData.endTime || "",
            placeName: baseData.placeName || "",
            note: baseData.note || "",
            link: baseData.link || "",
            createdUid: uid || "",
            createdBy: userData?.displayName || uid || "",
          };

          const newId = await addEvent(itemData);
          const newEventItem: Event = {
            id: newId,
            ...itemData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setCalendarEvents((prev) => [...prev, newEventItem]);
        }
      }

      setIsModalOpen(false);
      setActiveModalEvent(null);
      showDialog("予定を保存しました", true);
      router.refresh();
    } catch (err) {
      console.error("Save event error:", err);
      showDialog("予定の保存に失敗しました", true);
    } finally {
      hideSpinner();
    }
  };

  const handleDeleteEvent = async (id: string, targetRange?: "only" | "all") => {
    if (!canEditEvent(activeModalEvent, userData)) {
      showDialog("この予定を削除する権限がありません", true);
      return;
    }
    showSpinner();
    try {
      if (activeModalEvent?.isRecurring && targetRange === "all" && activeModalEvent.recurrenceId) {
        // すべての繰り返し予定を一括削除
        const recurringEvents = calendarEvents.filter(
          (e) => e.recurrenceId === activeModalEvent.recurrenceId
        );
        await Promise.all(recurringEvents.map((e) => deleteEventWithAnswers(e.id)));
        setCalendarEvents((prev) =>
          prev.filter((e) => e.recurrenceId !== activeModalEvent.recurrenceId)
        );
      } else {
        // この予定のみ削除 (または通常削除)
        await deleteEventWithAnswers(id);
        setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
      }

      setIsModalOpen(false);
      setActiveModalEvent(null);
      showDialog("予定を削除しました", true);
      router.refresh();
    } catch (err) {
      console.error("Delete event error:", err);
      showDialog("予定の削除に失敗しました", true);
    } finally {
      hideSpinner();
    }
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

      <div className={styles.daysGrid}>
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
        />
      )}

      {isModalOpen && (
        <EventModal
          event={activeModalEvent}
          currentUserId={uid || ""}
          canEdit={canEditEvent(activeModalEvent, userData)}
          onClose={() => {
            setIsModalOpen(false);
            setActiveModalEvent(null);
          }}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
          onCopy={handleCopyEvent}
        />
      )}
    </section>
  );
}
