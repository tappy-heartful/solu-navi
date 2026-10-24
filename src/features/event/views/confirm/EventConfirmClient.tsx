"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { AnswerConfirmLayout } from "@/components/Layout/AnswerConfirmLayout";
import { DisplayField } from "@/components/Form/DisplayField";
import { Modal } from "@/components/Modal";
import {
  Event,
  EventAttendanceAnswer,
  EventAdjustAnswer,
  EventRecording,
  User,
} from "@/lib/firestore/types";
import { EventConfirmData } from "@/features/event/api/event-server-actions";
import { useAuth } from "@/contexts/AuthContext";
import {
  isInTerm,
  getDayOfWeek,
  showDialog,
  showSpinner,
  hideSpinner,
  globalLineDefaultImage,
  extractYouTubeId,
  buildYouTubeHtml,
  timestampToSeconds,
  writeLog,
  format,
} from "@/lib/functions";
import {
  deleteEventWithAnswers,
  deleteMyAttendanceAnswer,
  deleteMyAdjustAnswer,
  addRecording,
  deleteRecording,
} from "@/features/event/api/event-client-service";
import { SetlistConfirm } from "@/components/Setlist/SetlistConfirm";
import { canEditEvent } from "@/features/event/lib/event-utils";
import { DEFAULT_SECTIONS } from "@/lib/firestore/constants";
import styles from "./EventConfirm.module.css";

type Props = {
  eventId: string;
  data: EventConfirmData;
};

function isEventPast(event: Event): boolean {
  if (!event.date) return false;
  const todayStr = format(new Date(), "yyyy.MM.dd");
  return event.date < todayStr;
}

export function EventConfirmClient({ eventId, data }: Props) {
  const router = useRouter();
  const { userData, isAdmin } = useAuth();
  const uid = userData?.id;

  const {
    event,
    answers,
    attendanceAnswers: attendanceAnswersProp,
    adjustAnswers: adjustAnswersProp,
    usersMap,
    sectionsMap,
    scoresMap,
    attendanceStatuses,
    adjustStatuses,
    recordings: initialRecordings,
    allUserUids,
    prefectureName,
    municipalityName,
    linkedMedia,
  } = data;

  const [recordings, setRecordings] = useState<EventRecording[]>(initialRecordings);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [recordingForm, setRecordingForm] = useState({ title: "", url: "" });
  const [recordingModalOpen, setRecordingModalOpen] = useState(false);

  // マウント時にスピナーを確実に非表示
  useEffect(() => {
    hideSpinner();
  }, []);

  const isSchedule = event.attendanceType === "schedule";
  const isPast = isEventPast(event);
  const inTerm = isInTerm(event.acceptStartDate || "", event.acceptEndDate || "");
  const isActive = !isPast && inTerm;

  const myAnswerExists = answers.some((a) => a.uid === uid);

  let answerStatus: "answered" | "pending" | "closed";
  let answerStatusText: string;
  if (isPast) {
    answerStatus = "closed";
    answerStatusText = "終了";
  } else if (!inTerm) {
    answerStatus = "closed";
    answerStatusText = "回答を受け付けてません";
  } else if (myAnswerExists) {
    answerStatus = "answered";
    answerStatusText = "回答済";
  } else {
    answerStatus = "pending";
    answerStatusText = "未回答";
  }

  const answeredUids = answers.map((a) => a.uid);
  const unansweredUids = allUserUids.filter((u) => !answeredUids.includes(u));

  // 編集・削除権限: イベント管理者、システム管理者、または作成者本人
  const canManage = canEditEvent(event, userData);

  // ---- Handlers ----

  const handleDelete = async () => {
    if (!canManage) {
      await showDialog("イベントを削除する権限がありません", true);
      return;
    }

    const confirmed = await showDialog("イベントと全員の回答を削除しますか？\nこの操作は元に戻せません");
    if (!confirmed) return;
    const confirmed2 = await showDialog("本当に削除しますか？");
    if (!confirmed2) return;

    showSpinner();
    try {
      await deleteEventWithAnswers(eventId);
      hideSpinner();
      await writeLog({ dataId: eventId, action: "イベント削除" });
      await showDialog("削除しました", true);
      router.refresh();
      router.push("/event");
    } catch (e) {
      hideSpinner();
      console.error("[EventConfirmClient] イベント削除エラー:", e);
      await writeLog({
        dataId: eventId,
        action: "イベント削除",
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  const handleDeleteMyAnswer = async () => {
    if (!uid) return;
    const confirmed = await showDialog("自分の回答を取り消しますか？");
    if (!confirmed) return;

    showSpinner();
    try {
      if (isSchedule) {
        await deleteMyAdjustAnswer(eventId, uid);
      } else {
        await deleteMyAttendanceAnswer(eventId, uid);
      }
      hideSpinner();
      await writeLog({ dataId: eventId, action: `イベント回答${isSchedule ? "（調整）" : "（出欠）"}取消` });
      await showDialog("回答を取り消しました", true);
      router.refresh();
    } catch (e) {
      hideSpinner();
      console.error("[EventConfirmClient] 回答取消エラー:", e);
      await writeLog({
        dataId: eventId,
        action: `イベント回答${isSchedule ? "（調整）" : "（出欠）"}取消`,
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  const handleAddRecording = () => {
    setRecordingForm({ title: "", url: "" });
    setRecordingModalOpen(true);
  };

  const handleSaveRecording = async () => {
    if (!uid) return;
    if (!recordingForm.title || !recordingForm.url) {
      await showDialog("タイトルとURLは必須です", true);
      return;
    }
    setRecordingModalOpen(false);
    showSpinner();
    try {
      const newRec = await addRecording(eventId, uid, recordingForm.title, recordingForm.url);
      hideSpinner();
      await writeLog({ dataId: eventId, action: "イベント録音リンク追加" });
      await showDialog("リンクを追加しました", true);
      setRecordings((prev) => [...prev, newRec]);
    } catch (e) {
      hideSpinner();
      console.error("[EventConfirmClient] 録音リンク追加エラー:", e);
      await writeLog({
        dataId: eventId,
        action: "イベント録音リンク追加",
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("追加に失敗しました", true);
    }
  };

  const handleDeleteRecording = async (rec: EventRecording) => {
    if (!uid) return;
    if (!isAdmin && rec.uid !== uid) {
      await showDialog("このリンクを削除する権限がありません", true);
      return;
    }
    const confirmed = await showDialog(`リンク「${rec.title}」を削除しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteRecording(rec.id);
      hideSpinner();
      await writeLog({ dataId: rec.id, action: "イベント録音リンク削除" });
      await showDialog("リンクを削除しました", true);
      setRecordings((prev) => prev.filter((r) => r.id !== rec.id));
    } catch (e) {
      hideSpinner();
      console.error("[EventConfirmClient] 録音リンク削除エラー:", e);
      await writeLog({
        dataId: rec.id,
        action: "イベント録音リンク削除",
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  // ---- Modal helpers ----

  const showUsersModal = (title: string, uids: string[]) => {
    const grouped: Record<string, User[]> = {};
    uids.forEach((u) => {
      const user = usersMap[u];
      const sectionId = user?.sectionId || "unknown";
      if (!grouped[sectionId]) grouped[sectionId] = [];
      grouped[sectionId].push(user || { id: u, displayName: "退会済みユーザ", pictureUrl: "" });
    });

    const sortedSectionIds = Object.keys(sectionsMap).sort().filter((sid) => grouped[sid]);
    const unknownIds = ["unknown"].filter((id) => grouped[id]);

    const content = (
      <div>
        {[...sortedSectionIds, ...unknownIds].map((sectionId) => {
          const users = grouped[sectionId];
          if (!users) return null;
          const sectionName = sectionsMap[sectionId] || "❓未設定";
          return (
            <div key={sectionId} className={styles.attendanceSectionGroup}>
              <h4>{sectionName}</h4>
              <div className={styles.attendanceUsers}>
                {users.map((u, i) => (
                  <div key={u.id || i} className={styles.attendanceUser}>
                    <img
                      src={u.pictureUrl || globalLineDefaultImage}
                      alt={u.displayName || ""}
                      onError={(e) => {
                        e.currentTarget.src = globalLineDefaultImage;
                      }}
                    />
                    <span>{u.displayName || "退会済み"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {uids.length === 0 && <p className={styles.noUser}>該当者はいません</p>}
      </div>
    );
    setModalTitle(title);
    setModalContent(content);
    setModalOpen(true);
  };

  // ---- Adjust table (schedule type) ----

  const renderAdjustTable = (customAnswers?: EventAdjustAnswer[]) => {
    const adjustAnswers = customAnswers || (adjustAnswersProp || []);

    let candidateDates = event.candidateDates || [];
    if (candidateDates.length === 0) {
      const dateSet = new Set<string>();
      adjustAnswers.forEach((ans) => {
        Object.keys(ans.answers || {}).forEach((date) => {
          dateSet.add(date);
        });
      });
      candidateDates = Array.from(dateSet).sort();
    }

    const answeredAdjustUids = adjustAnswers.map((a) => a.uid);
    const localUnansweredUids = allUserUids.filter((u) => !answeredAdjustUids.includes(u));

    const dateCounts: Record<string, Record<string, number>> = {};
    adjustAnswers.forEach((ans) => {
      Object.entries(ans.answers || {}).forEach(([date, statusId]) => {
        if (!dateCounts[date]) dateCounts[date] = {};
        dateCounts[date][statusId] = (dateCounts[date][statusId] || 0) + 1;
      });
    });

    return (
      <div className={styles.adjustTable}>
        <div className={`${styles.adjustRow} ${styles.headerRow}`}>
          <div className={styles.dateCell}>日程</div>
          <div className={styles.statusSummaryCell}>回答</div>
        </div>
        {candidateDates.map((date) => {
          const parts = date.split(".");
          const monthDay = parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
          const dayStr = getDayOfWeek(date, true);
          const counts = dateCounts[date] || {};

          return (
            <div key={date} className={styles.adjustRow}>
              <div className={styles.dateCell}>
                <span className={styles.datePart}>{monthDay}</span>
                <span className={styles.dayPart}>({dayStr})</span>
              </div>
              <div className={styles.statusSummaryCell}>
                {adjustStatuses.map((status) => {
                  const count = counts[status.id] || 0;
                  return count > 0 ? (
                    <a
                      key={status.id}
                      href="#"
                      className={styles.statusCount}
                      onClick={(e) => {
                        e.preventDefault();
                        const uids = adjustAnswers
                          .filter((a) => (a.answers || {})[date] === status.id)
                          .map((a) => a.uid);
                        const [, m, d] = date.split(".");
                        showUsersModal(`${m}/${d}(${dayStr}) ${status.name}の人`, uids);
                      }}
                    >
                      {status.name} {count}
                    </a>
                  ) : (
                    <span key={status.id} className={`${styles.statusCount} ${styles.statusCountZero}`}>
                      {status.name} {count}
                    </span>
                  );
                })}
                {localUnansweredUids.length > 0 ? (
                  <a
                    href="#"
                    className={`${styles.statusCount} ${styles.statusUnanswered}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const [, m, d] = date.split(".");
                      showUsersModal(`${m}/${d}(${dayStr}) 未回答の人`, localUnansweredUids);
                    }}
                  >
                    未 {localUnansweredUids.length}
                  </a>
                ) : (
                  <span className={`${styles.statusCount} ${styles.statusCountZero} ${styles.statusUnanswered}`}>
                    未 {localUnansweredUids.length}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ---- Attendance blocks (attendance type) ----

  const renderAttendanceBlocks = (customAnswers?: EventAttendanceAnswer[]) => {
    const attAnswers = customAnswers || (attendanceAnswersProp || []);
    const answerMap: Record<string, EventAttendanceAnswer> = {};
    attAnswers.forEach((a) => {
      answerMap[a.uid] = a;
    });

    const statusMap: Record<string, (typeof attendanceStatuses)[0]> = {};
    attendanceStatuses.forEach((st) => {
      statusMap[st.id] = st;
    });

    // パート一覧の構築 (DEFAULT_SECTIONS + sectionsMapの追加分)
    const sections = [...DEFAULT_SECTIONS];
    Object.keys(sectionsMap).forEach((id) => {
      if (!sections.some((s) => s.id === id)) {
        sections.push({
          id,
          name: sectionsMap[id] || "その他",
          shortName: sectionsMap[id] || "他",
          order: 99,
          color: "#64748b",
        });
      }
    });
    sections.sort((a, b) => (a.order || 0) - (b.order || 0));

    // パートごとの部員グループ化
    const sectionUsersMap: Record<string, { user: User; answer?: EventAttendanceAnswer }[]> = {};
    sections.forEach((sec) => {
      sectionUsersMap[sec.id] = [];
    });
    sectionUsersMap["unknown"] = [];

    allUserUids.forEach((uid) => {
      const user = usersMap[uid] || { id: uid, displayName: "退会済みユーザ", pictureUrl: "" };
      const secId = user.sectionId && sectionUsersMap[user.sectionId] ? user.sectionId : "unknown";
      sectionUsersMap[secId].push({
        user,
        answer: answerMap[uid],
      });
    });

    const answeredCount = attAnswers.length;
    const unansweredCount = allUserUids.length - answeredCount;

    return (
      <div className={styles.attendanceBySectionWrapper}>
        {/* 全体サマリーピル */}
        <div className={styles.overallStatusSummary}>
          {attendanceStatuses.map((st) => {
            const count = attAnswers.filter((a) => a.status === st.id).length;
            return (
              <span key={st.id} className={styles.summaryPill}>
                {st.name} <strong>{count}名</strong>
              </span>
            );
          })}
          <span className={`${styles.summaryPill} ${styles.summaryPillUnanswered}`}>
            未回答 <strong>{unansweredCount > 0 ? unansweredCount : 0}名</strong>
          </span>
        </div>

        {/* パートごとの出欠表示ブロック */}
        {sections
          .filter((sec) => (sectionUsersMap[sec.id] || []).length > 0)
          .map((sec) => {
            const members = sectionUsersMap[sec.id] || [];
            const attendCount = members.filter((m) => {
              const st = m.answer ? statusMap[m.answer.status] : null;
              return st && (st.name.includes("出ます") || st.name.includes("出席") || st.order === 1);
            }).length;

            return (
              <div key={sec.id} className={styles.sectionAttendanceCard}>
                <div className={styles.sectionCardHeader} style={{ borderLeftColor: sec.color || "#146081" }}>
                  <div className={styles.sectionCardTitleRow}>
                    <h3 className={styles.sectionCardTitle}>
                      <span className={styles.sectionColorDot} style={{ backgroundColor: sec.color || "#146081" }} />
                      {sec.name}パート
                    </h3>
                    <span className={styles.sectionCardCountBadge}>
                      出席 {attendCount} / {members.length}名
                    </span>
                  </div>
                </div>

                <div className={styles.sectionMembersGrid}>
                  {members.map(({ user, answer }, idx) => {
                    const st = answer ? statusMap[answer.status] : null;
                    const isAttending =
                      st && (st.name.includes("出ます") || st.name.includes("出席") || st.order === 1);
                    const isAbsent =
                      st && (st.name.includes("おやすみ") || st.name.includes("欠席") || st.name.includes("不参加"));

                    let badgeClass = styles.statusBadgeUnanswered;
                    let badgeLabel = "未回答";
                    if (st) {
                      badgeLabel = st.name;
                      if (isAttending) badgeClass = styles.statusBadgeAttending;
                      else if (isAbsent) badgeClass = styles.statusBadgeAbsent;
                      else badgeClass = styles.statusBadgePending;
                    }

                    return (
                      <div key={user.id || idx} className={styles.memberAttendanceItem}>
                        <img
                          src={user.pictureUrl || globalLineDefaultImage}
                          alt={user.displayName || ""}
                          className={styles.memberAvatar}
                          onError={(e) => {
                            e.currentTarget.src = globalLineDefaultImage;
                          }}
                        />
                        <div className={styles.memberInfo}>
                          <span className={styles.memberName}>{user.displayName || "退会済み"}</span>
                          <span className={`${styles.statusBadge} ${badgeClass}`}>
                            {badgeLabel}
                          </span>
                          {answer?.comment && (
                            <div className={styles.memberComment} title={answer.comment}>
                              💬 {answer.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {/* パート未設定メンバー */}
        {(sectionUsersMap["unknown"] || []).length > 0 && (
          <div className={styles.sectionAttendanceCard}>
            <div className={styles.sectionCardHeader} style={{ borderLeftColor: "#94a3b8" }}>
              <div className={styles.sectionCardTitleRow}>
                <h3 className={styles.sectionCardTitle}>❓ パート未設定</h3>
                <span className={styles.sectionCardCountBadge}>
                  {sectionUsersMap["unknown"].length}名
                </span>
              </div>
            </div>
            <div className={styles.sectionMembersGrid}>
              {sectionUsersMap["unknown"].map(({ user, answer }, idx) => {
                const st = answer ? statusMap[answer.status] : null;
                const isAttending =
                  st && (st.name.includes("出ます") || st.name.includes("出席") || st.order === 1);
                const isAbsent =
                  st && (st.name.includes("おやすみ") || st.name.includes("欠席") || st.name.includes("不参加"));

                let badgeClass = styles.statusBadgeUnanswered;
                let badgeLabel = "未回答";
                if (st) {
                  badgeLabel = st.name;
                  if (isAttending) badgeClass = styles.statusBadgeAttending;
                  else if (isAbsent) badgeClass = styles.statusBadgeAbsent;
                  else badgeClass = styles.statusBadgePending;
                }

                return (
                  <div key={user.id || idx} className={styles.memberAttendanceItem}>
                    <img
                      src={user.pictureUrl || globalLineDefaultImage}
                      alt={user.displayName || ""}
                      className={styles.memberAvatar}
                      onError={(e) => {
                        e.currentTarget.src = globalLineDefaultImage;
                      }}
                    />
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{user.displayName || "退会済み"}</span>
                      <span className={`${styles.statusBadge} ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                      {answer?.comment && (
                        <div className={styles.memberComment} title={answer.comment}>
                          💬 {answer.comment}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---- Answer menu slot ----

  const answerMenuSlot = (
    <>
      <button
        type="button"
        className={styles.answerBtnPrimary}
        onClick={() => {
          showSpinner();
          const path = isSchedule
            ? `/event/adjust-answer?eventId=${eventId}`
            : `/event/attendance-answer?eventId=${eventId}`;
          router.push(path);
        }}
      >
        <i className="fa-solid fa-pen-to-square" />
        <span>{myAnswerExists ? "回答を修正する" : "回答する"}</span>
      </button>
      {myAnswerExists && (
        <button
          type="button"
          className={styles.answerBtnDanger}
          onClick={handleDeleteMyAnswer}
        >
          <i className="fa-solid fa-trash-can" />
          <span>回答を取り消す</span>
        </button>
      )}
    </>
  );

  return (
    <BaseLayout>
      <AnswerConfirmLayout
        name="イベント"
        icon="fa-solid fa-calendar-days"
        basePath="/event"
        dataId={eventId}
        featureIdKey="eventId"
        answerStatus={answerStatus}
        answerStatusText={answerStatusText}
        isActive={isActive}
        onDelete={handleDelete}
        answerMenuSlot={answerMenuSlot}
        canManage={canManage}
      >
        {/* 日付 / 候補日 */}
        <DisplayField label={isSchedule ? "候補日" : "日付"}>
          {isSchedule ? (
            <div>
              {(event.candidateDates || []).map((d) => (
                <div key={d}>{getDayOfWeek(d)}</div>
              ))}
            </div>
          ) : (
            event.date ? getDayOfWeek(event.date) : "未設定"
          )}
        </DisplayField>

        {/* 受付期間 */}
        <DisplayField label={isSchedule ? "日程調整受付期間" : "出欠受付期間"}>
          {event.acceptStartDate || event.acceptEndDate
            ? `${getDayOfWeek(event.acceptStartDate || "")} ～ ${getDayOfWeek(event.acceptEndDate || "")}`
            : "未設定"}
        </DisplayField>

        {/* タイトル */}
        <DisplayField label="タイトル">{event.title}</DisplayField>

        {/* 場所・アクセス情報ブロック */}
        <div className={styles.locationBlock}>
          <div className={styles.locationHeader}>
            <span className={styles.locationTitle}>
              <i className="fa-solid fa-map-location-dot" /> 場所・アクセス情報
            </span>
          </div>

          <div className={styles.locationFields}>
            {/* 都道府県 & 市区町村 */}
            <div className={styles.row}>
              <div className={styles.locationField} style={{ flex: 1 }}>
                <label className={styles.locationLabel}>都道府県</label>
                <div className={styles.locationValue}>
                  {prefectureName || <span className={styles.unsetText}>未設定</span>}
                </div>
              </div>

              <div className={styles.locationField} style={{ flex: 1 }}>
                <label className={styles.locationLabel}>市区町村</label>
                <div className={styles.locationValue}>
                  {municipalityName || <span className={styles.unsetText}>未設定</span>}
                </div>
              </div>
            </div>

            {/* 場所名 */}
            <div className={styles.locationField}>
              <label className={styles.locationLabel}>場所名</label>
              <div className={styles.locationValue}>
                {event.website ? (
                  <a href={event.website} target="_blank" rel="noopener noreferrer" className={styles.linkText}>
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                    {event.placeName || event.website}
                  </a>
                ) : (
                  event.placeName || <span className={styles.unsetText}>未設定</span>
                )}
              </div>
            </div>

            {/* 施設利用時間 */}
            <div className={styles.locationField}>
              <label className={styles.locationLabel}>施設利用時間</label>
              <div className={styles.locationValue}>
                {event.rentTimeRanges && event.rentTimeRanges.length > 0 ? (
                  <div className={styles.rentTimeList}>
                    {event.rentTimeRanges.map((range, idx) => (
                      <span key={idx} className={styles.rentTimeBadge}>
                        <i className="fa-solid fa-clock" />
                        {range.startTime} ～ {range.endTime}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className={styles.unsetText}>未設定</span>
                )}
              </div>
            </div>

            {/* Google Map */}
            <div className={styles.locationField}>
              <label className={styles.locationLabel}>Google Map</label>
              <div className={styles.locationValue}>
                {event.googleMap ? (
                  <a href={event.googleMap} target="_blank" rel="noopener noreferrer" className={styles.linkText}>
                    <i className="fa-solid fa-map-pin" />
                    Google Mapで見る
                  </a>
                ) : (
                  <span className={styles.unsetText}>未設定</span>
                )}
              </div>
            </div>



            {/* 会場押さえ状況 */}
            <div className={styles.locationField}>
              <label className={styles.locationLabel}>会場押さえ状況</label>
              <div className={styles.locationValue}>
                {event.isVenueReserved ? (
                  <span className={styles.reservedBadge}>
                    <i className="fa-solid fa-circle-check" /> 押さえ済み
                  </span>
                ) : (
                  <span className={styles.notReservedBadge}>
                    <i className="fa-solid fa-circle-minus" /> 未押さえ
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* セットリスト */}
        <div className="form-group">
          <SetlistConfirm setlist={event.setlist || []} scoresMap={scoresMap} />
        </div>

        {/* 譜割 */}
        {event.allowAssign && (
          <DisplayField label="譜割">
            <a
              href={`/assign/confirm?eventId=${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.assignLink}
            >
              <i className="fa-solid fa-music" style={{ marginRight: "6px" }} />
              譜割りを見る
            </a>
          </DisplayField>
        )}

        {/* 録音・メディア */}
        {event.mediaId && (
          <DisplayField label="録音・メディア">
            <Link
              href={`/media/confirm?mediaId=${event.mediaId}`}
              prefetch={false}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--primary-color, #146081)",
                fontWeight: 600,
                textDecoration: "underline",
                fontSize: "0.925rem",
              }}
            >
              <i className="fa-solid fa-photo-film" />
              <span>
                {linkedMedia?.title ? `${linkedMedia.date} ${linkedMedia.title}` : "メディア確認を開く"}
              </span>
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.75rem" }} />
            </Link>
          </DisplayField>
        )}

        {/* タイムスケジュール */}
        <DisplayField label="タイムスケジュール" preWrap>
          {event.schedule || ""}
        </DisplayField>

        {/* 服装 */}
        <DisplayField label="服装" preWrap>
          {event.dress || ""}
        </DisplayField>

        {/* 個人で持ってくるもの */}
        <DisplayField label="個人で持ってくるもの" preWrap>
          {event.bring || ""}
        </DisplayField>



        {/* 楽器構成 */}
        {event.instrumentConfig && Object.keys(event.instrumentConfig).length > 0 && (
          <DisplayField label="楽器構成">
            <div className={styles.instrumentConfigList}>
              {Object.keys(event.instrumentConfig)
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map((sectionId) => {
                  const parts = event.instrumentConfig![sectionId];
                  const sectionName = sectionsMap[sectionId];
                  const partNames = parts
                    .map((p) => p.partName)
                    .filter(Boolean)
                    .join("、");
                  if (!sectionName || !partNames) return null;
                  return (
                    <div key={sectionId} className={styles.instrumentConfigItem}>
                      <span className={styles.instrumentSectionName}>{sectionName}</span>
                      <span className={styles.instrumentPartNames}>{partNames}</span>
                    </div>
                  );
                })}
            </div>
          </DisplayField>
        )}

        {/* 回答状況 */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label className={styles.fieldTitle}>{isSchedule ? "日程調整" : "出欠"}</label>
          <div>
            <span className={styles.answerCountSummary}>
              回答{answers.length}人 (未回答{unansweredUids.length}人)
            </span>
            {isSchedule ? renderAdjustTable() : renderAttendanceBlocks()}

            {/* サブ回答状況の表示 */}
            {isSchedule && attendanceAnswersProp && attendanceAnswersProp.length > 0 && (
              <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px dashed #cbd5e1" }}>
                <h4 style={{ fontSize: "0.95rem", color: "#475569", marginBottom: "8px", fontWeight: "bold" }}>
                  <i className="fa-solid fa-users" style={{ marginRight: "0.5rem" }} />
                  出欠回答（登録済みデータ）
                </h4>
                <span className={styles.answerCountSummary}>
                  回答{attendanceAnswersProp.length}人 (未回答{allUserUids.length - attendanceAnswersProp.length}人)
                </span>
                {renderAttendanceBlocks(attendanceAnswersProp)}
              </div>
            )}
            {!isSchedule && adjustAnswersProp && adjustAnswersProp.length > 0 && (
              <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px dashed #cbd5e1" }}>
                <h4 style={{ fontSize: "0.95rem", color: "#475569", marginBottom: "8px", fontWeight: "bold" }}>
                  <i className="fa-solid fa-calendar-days" style={{ marginRight: "0.5rem" }} />
                  日程調整回答（登録済みデータ）
                </h4>
                <span className={styles.answerCountSummary}>
                  回答{adjustAnswersProp.length}人 (未回答{allUserUids.length - adjustAnswersProp.length}人)
                </span>
                {renderAdjustTable(adjustAnswersProp)}
              </div>
            )}
          </div>
        </div>

        {/* 回答時コメント */}
        {(() => {
          const allComments = [
            ...attendanceAnswersProp.map((a) => ({ ...a, type: "attendance" as const })),
            ...adjustAnswersProp.map((a) => ({ ...a, type: "adjust" as const })),
          ].filter((a) => a.comment && a.comment.trim() !== "");

          if (allComments.length === 0) return null;

          return (
            <div className="form-group" style={{ marginTop: "1.5rem" }}>
              <label className="label-title">回答時コメント</label>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  maxHeight: "300px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {allComments.map((a) => {
                  const user = usersMap[a.uid];
                  const userName = user?.displayName || "不明";
                  const userPic = user?.pictureUrl || globalLineDefaultImage;
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        gap: "12px",
                        borderBottom: "1px solid #f1f5f9",
                        paddingBottom: "12px",
                      }}
                    >
                      <img
                        src={userPic}
                        alt={userName}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          e.currentTarget.src = globalLineDefaultImage;
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: "bold",
                            fontSize: "14px",
                            color: "#334155",
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <span>{userName}</span>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: "#f1f5f9",
                              color: "#475569",
                              fontWeight: "normal",
                            }}
                          >
                            {a.type === "attendance" ? "出欠回答" : "日程調整"}
                          </span>
                          {a.type === "attendance" &&
                            (() => {
                              const attAns = a as EventAttendanceAnswer;
                              const status = attendanceStatuses.find((s) => s.id === attAns.status);
                              return status ? (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    backgroundColor: "#e2e8f0",
                                    color: "#1e293b",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {status.name}
                                </span>
                              ) : null;
                            })()}
                        </div>
                        <div
                          style={{
                            fontSize: "14px",
                            color: "#475569",
                            marginTop: "4px",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {a.comment}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 録音・録画リンク */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label className={styles.fieldTitle}>録音・録画リンク</label>
          <div className={styles.recordingsCard}>
            {recordings.length === 0 ? (
              <p className={styles.noUser}>登録されたリンクはありません。</p>
            ) : (
              <ul className={styles.recordingListUl}>
                {recordings.map((rec) => {
                  const registeredUser = usersMap[rec.uid]?.displayName || "退会済み";
                  const canDelete = isAdmin || rec.uid === uid;
                  return (
                    <li key={rec.id}>
                      <a href={rec.url} target="_blank" rel="noopener noreferrer" className={styles.recordingLink}>
                        {rec.title}
                      </a>
                      <span className={styles.registeredBy}>by {registeredUser}</span>
                      {canDelete && (
                        <button
                          type="button"
                          className={styles.deleteRecordingBtn}
                          onClick={() => handleDeleteRecording(rec)}
                          title="削除"
                        >
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div>
              <button type="button" className={styles.addRecordingBtn} onClick={handleAddRecording}>
                <i className="fa-solid fa-plus" /> リンクを追加する
              </button>
            </div>
          </div>
        </div>

        <DisplayField label="その他" preWrap>
          {event.other || ""}
        </DisplayField>

        {modalOpen && (
          <Modal onClose={() => setModalOpen(false)} title={modalTitle}>
            {modalContent}
          </Modal>
        )}

        {recordingModalOpen && (
          <Modal onClose={() => setRecordingModalOpen(false)} title="録音・録画リンクの追加">
            <div className={styles.recordingForm}>
              <div className="form-group">
                <label className="label-title">タイトル</label>
                <input
                  type="text"
                  value={recordingForm.title}
                  onChange={(e) => setRecordingForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="例: 第1練習 録音"
                />
              </div>
              <div className="form-group">
                <label className="label-title">URL</label>
                <input
                  type="url"
                  value={recordingForm.url}
                  onChange={(e) => setRecordingForm((prev) => ({ ...prev, url: e.target.value }))}
                  placeholder="Google DriveやYouTubeのURL"
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className="save-button" onClick={handleSaveRecording}>
                  保存
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnswerConfirmLayout>
    </BaseLayout>
  );
}
