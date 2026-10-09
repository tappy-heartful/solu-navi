"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faCalendarCheck, faHistory, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Event } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { isInTerm, getDayOfWeek, format } from "@/lib/functions";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./EventList.module.css";

type Props = {
  events: Event[];
  prefNamesMap?: Record<string, string>;
  munNamesMap?: Record<string, string>;
};

function isEventPast(event: Event): boolean {
  if (!event.date) return false;
  const todayStr = format(new Date(), "yyyy.MM.dd");
  return event.date < todayStr;
}

export function EventListClient({ events, prefNamesMap = {}, munNamesMap = {} }: Props) {
  const { userData, isAdmin } = useAuth();
  const uid = userData?.uid || userData?.id;
  const { setBreadcrumbs } = useBreadcrumb();

  const [myAttendanceAnswers, setMyAttendanceAnswers] = useState<Record<string, string>>({});
  const [myAdjustAnswers, setMyAdjustAnswers] = useState<Record<string, Record<string, string>>>({});
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, string>>({});
  const [adjustStatuses, setAdjustStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    setBreadcrumbs([{ label: "ホーム", href: "/" }, { label: "イベント一覧" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (!uid) return;

    const loadMyAnswers = async () => {
      const attStatusSnap = await getDocs(collection(db, "attendanceStatuses"));
      const attStatusMap: Record<string, string> = {};
      attStatusSnap.forEach((doc) => {
        attStatusMap[doc.id] = doc.data().name || "";
      });
      setAttendanceStatuses(attStatusMap);

      const adjStatusSnap = await getDocs(collection(db, "eventAdjustStatus"));
      const adjStatusMap: Record<string, string> = {};
      adjStatusSnap.forEach((doc) => {
        adjStatusMap[doc.id] = doc.data().name || "";
      });
      setAdjustStatuses(adjStatusMap);

      const attAnswersSnap = await getDocs(
        query(collection(db, "eventAttendanceAnswers"), where("uid", "==", uid))
      );
      const attMap: Record<string, string> = {};
      attAnswersSnap.forEach((doc) => {
        const data = doc.data();
        if (data.eventId) {
          attMap[data.eventId] = data.status || "";
        }
      });
      setMyAttendanceAnswers(attMap);

      const adjAnswersSnap = await getDocs(
        query(collection(db, "eventAdjustAnswers"), where("uid", "==", uid))
      );
      const adjMap: Record<string, Record<string, string>> = {};
      adjAnswersSnap.forEach((doc) => {
        const data = doc.data();
        if (data.eventId) {
          adjMap[data.eventId] = data.answers || {};
        }
      });
      setMyAdjustAnswers(adjMap);
    };

    loadMyAnswers().catch(console.error);
  }, [uid]);

  const scheduleList = events.filter((e) => !isEventPast(e) && e.attendanceType === "schedule");
  const futureList = events.filter((e) => !isEventPast(e) && e.attendanceType !== "schedule");
  const closedList = events
    .filter((e) => isEventPast(e))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const renderTermDisplay = (e: Event) => {
    if (!e.acceptStartDate && !e.acceptEndDate) return "-";
    return (
      <span className={styles.termText}>
        {e.acceptStartDate || ""}
        <br />
        ～ {e.acceptEndDate || ""}
      </span>
    );
  };

  const renderStatusCell = (e: Event, type: "schedule" | "future" | "closed") => {
    const isSchedule = e.attendanceType === "schedule";
    const hasAttended = myAttendanceAnswers[e.id];
    const hasAdjusted = myAdjustAnswers[e.id] && Object.keys(myAdjustAnswers[e.id]).length > 0;

    const inTerm = isInTerm(e.acceptStartDate, e.acceptEndDate);
    const isPast = type === "closed";

    let displayAnswer: "attendance" | "adjust" | null = null;
    if (isSchedule) {
      if (hasAdjusted) {
        displayAnswer = "adjust";
      } else if (hasAttended) {
        displayAnswer = "attendance";
      }
    } else {
      if (hasAttended) {
        displayAnswer = "attendance";
      } else if (hasAdjusted) {
        displayAnswer = "adjust";
      }
    }

    if (displayAnswer === "attendance") {
      const statusName = attendanceStatuses[hasAttended] || "回答済";
      return (
        <div className={styles.statusCol}>
          <span className={`${styles.statusBadge} ${styles.answeredBadge}`}>回答済</span>
          <span className={styles.statusSubText}>{statusName}</span>
        </div>
      );
    }

    if (displayAnswer === "adjust") {
      const answersMap = myAdjustAnswers[e.id] || {};
      let candidateDates = e.candidateDates || [];
      if (candidateDates.length === 0) {
        candidateDates = Object.keys(answersMap).sort();
      }

      const summaryList = candidateDates.map((d) => {
        const parts = d.split(".");
        const monthDay = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
        const statusId = answersMap[d];
        const statusName = adjustStatuses[statusId] || "-";
        return `${monthDay}: ${statusName}`;
      });

      return (
        <div className={styles.statusCol}>
          <span className={`${styles.statusBadge} ${styles.answeredBadge}`}>回答済</span>
          <div className={styles.adjustSummary}>
            {summaryList.map((str, idx) => (
              <div key={idx}>{str}</div>
            ))}
          </div>
        </div>
      );
    }

    if (isPast) {
      return <span className={`${styles.statusBadge} ${styles.closedBadge}`}>終了</span>;
    }
    if (!inTerm) {
      return <span className={`${styles.statusBadge} ${styles.closedBadge}`}>期間外</span>;
    }
    return <span className={`${styles.statusBadge} ${styles.pendingBadge}`}>受付中</span>;
  };

  return (
    <BaseLayout>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faCalendarDays} className={styles.headerIcon} />
            <span>イベント一覧</span>
          </h1>

          {isAdmin && (
            <div className={styles.headerActions}>
              <Link href="/event/edit?mode=new" prefetch={false} className={styles.addBtn}>
                <FontAwesomeIcon icon={faPlus} />
                <span>新規イベント作成</span>
              </Link>
            </div>
          )}
        </div>

        {/* 日程調整中 */}
        {scheduleList.length > 0 && (
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <FontAwesomeIcon icon={faCalendarDays} className={styles.sectionIcon} />
              日程調整中
            </h3>
            <div className="table-wrapper">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>イベント名</th>
                    <th>回答</th>
                    <th>
                      日程調整
                      <br />
                      受付期間
                    </th>
                    <th>
                      都道府県
                      <br />
                      市区町村
                    </th>
                    <th>場所</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleList.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className={styles.eventDateSub}>
                          {(e.candidateDates || []).map((d) => (
                            <span key={d} className={styles.dateItem}>
                              {d}({getDayOfWeek(d, true)})
                            </span>
                          ))}
                        </div>
                        <Link href={`/event/confirm?eventId=${e.id}`} prefetch={false} className={styles.rowTitle}>
                          {e.title}
                        </Link>
                      </td>
                      <td>{renderStatusCell(e, "schedule")}</td>
                      <td>{renderTermDisplay(e)}</td>
                      <td>
                        {e.prefectureId ? prefNamesMap[e.prefectureId] || "不明" : "-"}
                        <br />
                        {e.municipalityId ? munNamesMap[e.municipalityId] || "不明" : "-"}
                      </td>
                      <td>
                        {e.website ? (
                          <a href={e.website} target="_blank" rel="noopener noreferrer" style={{ color: "#146081" }}>
                            {e.placeName || "リンク"}
                          </a>
                        ) : (
                          e.placeName || "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 今後の予定 */}
        <div className={styles.sectionContainer}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faCalendarCheck} className={styles.sectionIcon} />
            今後の予定
          </h3>
          <div className="table-wrapper">
            <table className="list-table">
              <thead>
                <tr>
                  <th>イベント名</th>
                  <th>回答</th>
                  <th>
                    出欠確認
                    <br />
                    受付期間
                  </th>
                  <th>
                    都道府県
                    <br />
                    市区町村
                  </th>
                  <th>場所</th>
                </tr>
              </thead>
              <tbody>
                {futureList.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      予定されているイベントはありません
                    </td>
                  </tr>
                ) : (
                  futureList.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {e.date && (
                          <div className={styles.eventDateSub}>
                            <span className={styles.dateItem}>
                              {e.date}({getDayOfWeek(e.date, true)})
                            </span>
                          </div>
                        )}
                        <Link href={`/event/confirm?eventId=${e.id}`} prefetch={false} className={styles.rowTitle}>
                          {e.title}
                        </Link>
                      </td>
                      <td>{renderStatusCell(e, "future")}</td>
                      <td>{renderTermDisplay(e)}</td>
                      <td>
                        {e.prefectureId ? prefNamesMap[e.prefectureId] || "不明" : "-"}
                        <br />
                        {e.municipalityId ? munNamesMap[e.municipalityId] || "不明" : "-"}
                      </td>
                      <td>
                        {e.website ? (
                          <a href={e.website} target="_blank" rel="noopener noreferrer" style={{ color: "#146081" }}>
                            {e.placeName || "リンク"}
                          </a>
                        ) : (
                          e.placeName || "-"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 終了したイベント */}
        {closedList.length > 0 && (
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <FontAwesomeIcon icon={faHistory} className={styles.sectionIcon} />
              過去のイベント
            </h3>
            <div className="table-wrapper">
              <table className="list-table">
                <thead>
                  <tr>
                    <th>イベント名</th>
                    <th>回答</th>
                    <th>日付</th>
                    <th>場所</th>
                  </tr>
                </thead>
                <tbody>
                  {closedList.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <Link href={`/event/confirm?eventId=${e.id}`} prefetch={false} className={styles.rowTitle}>
                          {e.title}
                        </Link>
                      </td>
                      <td>{renderStatusCell(e, "closed")}</td>
                      <td>
                        {e.date ? `${e.date}(${getDayOfWeek(e.date, true)})` : "-"}
                      </td>
                      <td>{e.placeName || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
}
