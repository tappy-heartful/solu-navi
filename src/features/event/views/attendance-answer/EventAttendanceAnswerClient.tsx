"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Event, AttendanceStatus } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { AnswerEditLayout } from "@/components/Layout/AnswerEditLayout";
import { getDayOfWeek, showDialog, showSpinner, hideSpinner, writeLog } from "@/lib/functions";
import { submitAttendanceAnswer } from "@/features/event/api/event-client-service";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import styles from "./EventAttendanceAnswer.module.css";

type Props = {
  eventId: string;
  event: Event;
  attendanceStatuses: AttendanceStatus[];
};

export function EventAttendanceAnswerClient({ eventId, event, attendanceStatuses }: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.id;

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, "eventAttendanceAnswers", `${eventId}_${uid}`));
        if (snap.exists()) {
          setSelectedStatus(snap.data().status || "");
          setComment(snap.data().comment || "");
          setIsEdit(true);
        }
      } catch (err) {
        console.error("Failed to fetch attendance answer:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [uid, eventId]);

  const handleSave = async () => {
    if (!uid) return;
    if (!selectedStatus) {
      await showDialog("出欠を選択してください", true);
      return;
    }
    const confirmed = await showDialog(`回答を${isEdit ? "修正" : "登録"}しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await submitAttendanceAnswer(eventId, uid, selectedStatus, comment);
      hideSpinner();
      await writeLog({ dataId: eventId, action: `イベント回答（出欠）${isEdit ? "修正" : "登録"}` });
      await showDialog(`回答を${isEdit ? "修正" : "登録"}しました`, true);
      router.refresh();
      showSpinner();
      router.push(`/event/confirm?eventId=${eventId}`);
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId: eventId,
        action: `イベント回答（出欠）${isEdit ? "修正" : "登録"}`,
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("登録に失敗しました", true);
    }
  };

  return (
    <BaseLayout>
      <AnswerEditLayout
        featureName="イベント"
        icon="fa-solid fa-calendar-days"
        basePath="/event"
        featureIdKey="eventId"
        dataId={eventId}
        mode={isEdit ? "edit" : "new"}
        onSave={handleSave}
        isLoading={isLoading}
      >
        <div className="form-group">
          <label className="label-title">日付</label>
          <div className="label-value">
            {event.date ? getDayOfWeek(event.date) : "未設定"}
          </div>
        </div>

        <div className="form-group">
          <label className="label-title">タイトル</label>
          <div className="label-value">{event.title}</div>
        </div>

        <div className="form-group">
          <label className="label-title">出欠回答</label>
          <div className={styles.radioGroup}>
            {attendanceStatuses.map((status) => {
              const isSelected = selectedStatus === status.id;
              return (
                <label
                  key={status.id}
                  className={`${styles.radioOption} ${isSelected ? styles.radioOptionSelected : ""}`}
                >
                  <input
                    type="radio"
                    id={`status-${status.id}`}
                    name="attendance-status"
                    value={status.id}
                    checked={isSelected}
                    onChange={() => setSelectedStatus(status.id)}
                    className={styles.radioInput}
                  />
                  <span>{status.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-group" style={{ marginTop: "1.5rem" }}>
          <label className="label-title">コメント</label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="連絡事項やコメントがあれば入力してください..."
          />
        </div>
      </AnswerEditLayout>
    </BaseLayout>
  );
}
