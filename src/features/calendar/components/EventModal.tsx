"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Event } from "@/lib/firestore/types";
import { showDialog } from "@/components/Common/CommonDialog";
import {
  toHyphenDate,
  toDotDate,
  calculateDefaultEndDate,
  RecurrenceConfig,
} from "../lib/recurrence-utils";
import { DEFAULT_EVENT_COLOR, PRESET_EVENT_COLORS } from "../lib/color-constants";
import styles from "./EventModal.module.css";

interface EventModalProps {
  event: Partial<Event> | null; // null または id がない場合は新規追加
  currentUserId: string;
  canEdit?: boolean;
  onClose: () => void;
  onSave: (
    eventData: Partial<Event> & { recurrenceConfig?: RecurrenceConfig },
    targetRange?: "only" | "all"
  ) => Promise<void>;
  onDelete?: (id: string, targetRange?: "only" | "all") => Promise<void>;
  onCopy?: (eventData: Partial<Event>) => void;
}

export default function EventModal({
  event,
  currentUserId,
  canEdit = true,
  onClose,
  onSave,
  onDelete,
  onCopy,
}: EventModalProps) {
  const [isCopyMode, setIsCopyMode] = useState(false);
  const isEdit = !!event?.id && !isCopyMode;

  const [title, setTitle] = useState("");
  const [color, setColor] = useState(event?.color || DEFAULT_EVENT_COLOR);
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState(""); // "YYYY-MM-DD"
  const [startTime, setStartTime] = useState("18:00");
  const [endDate, setEndDate] = useState(""); // "YYYY-MM-DD"
  const [endTime, setEndTime] = useState("21:00");
  const [placeName, setPlaceName] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");

  // 繰り返し用ステート (新規登録時のみ)
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<"day" | "week" | "month" | "year">("week");
  const [monthlyOption, setMonthlyOption] = useState<"dayOfMonth" | "dayOfWeek">("dayOfMonth");
  const [yearlyOption, setYearlyOption] = useState<"dayOfYear" | "dayOfWeekOfYear">("dayOfYear");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // 保存・削除時の繰り返し適用範囲確認ポップアップの表示制御
  const [confirmMode, setConfirmMode] = useState<"save" | "delete" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsCopyMode(false);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

    const rawStart = event?.startDate || event?.date || todayStr;
    const rawEnd = event?.endDate || rawStart;

    const startHyphen = toHyphenDate(rawStart);
    const endHyphen = toHyphenDate(rawEnd);

    setTitle(event?.title || "");
    setColor(event?.color || DEFAULT_EVENT_COLOR);
    setIsAllDay(event?.isAllDay ?? true);
    setStartDate(startHyphen);
    setStartTime(event?.startTime || "18:00");
    setEndDate(endHyphen);
    setEndTime(event?.endTime || "21:00");
    setPlaceName(event?.placeName || "");
    setNote(event?.note || event?.schedule || "");
    setLink(event?.link || event?.website || "");

    setIsRecurring(false);
    setRecurrenceInterval(1);
    setRecurrenceUnit("week");
    setMonthlyOption("dayOfMonth");
    setYearlyOption("dayOfYear");
    setRecurrenceEndDate(calculateDefaultEndDate(startHyphen, "week"));
    setConfirmMode(null);
  }, [event]);

  useEffect(() => {
    if (startDate && recurrenceUnit) {
      setRecurrenceEndDate(calculateDefaultEndDate(startDate, recurrenceUnit));
    }
  }, [startDate, recurrenceUnit]);

  // 開始日が終了日を追い越した場合は終了日を開始日に合わせる
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (endDate < val) {
      setEndDate(val);
    }
  };

  const executeSave = async (targetRange?: "only" | "all") => {
    if (!canEdit) {
      showDialog("予定を編集する権限がありません", true);
      return;
    }
    setIsSubmitting(true);
    try {
      const dotStart = toDotDate(startDate);
      const dotEnd = toDotDate(endDate);

      const eventData: Partial<Event> & { recurrenceConfig?: RecurrenceConfig } = {
        title: title.trim(),
        color: color || DEFAULT_EVENT_COLOR,
        date: dotStart,
        startDate: dotStart,
        endDate: dotEnd,
        isAllDay,
        startTime: isAllDay ? "" : startTime,
        endTime: isAllDay ? "" : endTime,
        placeName: placeName.trim(),
        note: note.trim(),
        link: link.trim(),
        attendanceType: event?.attendanceType || "attendance",
      };

      if (!isEdit && isRecurring && startDate === endDate) {
        eventData.isRecurring = true;
        eventData.recurrenceConfig = {
          interval: recurrenceInterval,
          unit: recurrenceUnit,
          monthlyOption,
          yearlyOption,
          endDate: recurrenceEndDate,
        };
      }

      await onSave(eventData, targetRange);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showDialog("タイトルを入力してください", true);
      return;
    }

    if (endDate < startDate) {
      showDialog("終了日は開始日以降に設定してください", true);
      return;
    }

    if (startDate === endDate && !isAllDay && endTime < startTime) {
      showDialog("終了時間は開始時間以降に設定してください", true);
      return;
    }

    if (isEdit && event?.isRecurring && event?.recurrenceId) {
      setConfirmMode("save");
      return;
    }

    await executeSave();
  };

  const handleDeleteClick = async () => {
    if (!canEdit) {
      showDialog("予定を削除する権限がありません", true);
      return;
    }
    if (!event?.id || !onDelete) return;

    if (event.isRecurring && event.recurrenceId) {
      setConfirmMode("delete");
      return;
    }

    const confirmed = await showDialog("本当にこの予定を削除しますか？");
    if (confirmed) {
      setIsSubmitting(true);
      try {
        await onDelete(event.id);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleCopyClick = () => {
    if (!title.trim()) {
      showDialog("タイトルを入力してください", true);
      return;
    }
    setIsCopyMode(true);
    setIsRecurring(false);

    if (onCopy) {
      onCopy({
        title: title.trim(),
        color,
        isAllDay,
        startDate: toDotDate(startDate),
        endDate: toDotDate(isAllDay ? startDate : endDate),
        startTime: isAllDay ? "" : startTime,
        endTime: isAllDay ? "" : endTime,
        placeName: placeName.trim(),
        note: note.trim(),
        link: link.trim(),
        isRecurring: false,
      });
    }
  };

  const handleConfirmAction = async (targetRange: "only" | "all") => {
    setConfirmMode(null);
    if (confirmMode === "save") {
      await executeSave(targetRange);
    } else if (confirmMode === "delete" && event?.id && onDelete) {
      setIsSubmitting(true);
      try {
        await onDelete(event.id, targetRange);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getRecurrenceOptionTexts = () => {
    if (!startDate) return { dayOfMonth: "", dayOfWeek: "", dayOfYear: "", dayOfWeekOfYear: "" };
    const [y, m, d] = startDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const weekNum = Math.ceil(day / 7);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const dayOfWeekStr = days[date.getDay()];

    return {
      dayOfMonth: `毎月${day}日`,
      dayOfWeek: `毎月第${weekNum}${dayOfWeekStr}曜日`,
      dayOfYear: `毎年${month}月${day}日`,
      dayOfWeekOfYear: `毎年${month}月第${weekNum}${dayOfWeekStr}曜日`,
    };
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.eventModal} onClick={(e) => e.stopPropagation()}>
        {/* 繰り返し確認ダイアログ (CANDY 準拠) */}
        {confirmMode && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmBox}>
              <div className={styles.confirmMessage}>
                この予定は繰り返し予定の一部です。
                <br />
                {confirmMode === "save" ? "変更" : "削除"}の適用範囲を選択してください。
              </div>
              <div className={styles.confirmButtons}>
                <button
                  type="button"
                  className={`${styles.confirmBtn} ${styles.btnConfirmOnly}`}
                  onClick={() => handleConfirmAction("only")}
                >
                  この予定のみ{confirmMode === "save" ? "変更" : "削除"}
                </button>
                <button
                  type="button"
                  className={`${styles.confirmBtn} ${styles.btnConfirmAll}`}
                  onClick={() => handleConfirmAction("all")}
                >
                  すべての繰り返し予定を一括{confirmMode === "save" ? "変更" : "削除"}
                </button>
                <button
                  type="button"
                  className={`${styles.confirmBtn} ${styles.btnConfirmCancel}`}
                  onClick={() => setConfirmMode(null)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        <button className={styles.modalClose} onClick={onClose} aria-label="閉じる">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className={styles.modalTitle}>
          <i className="fa-solid fa-calendar-days"></i>
          <span>{isEdit ? "予定の編集" : "予定の追加"}</span>
          {isEdit && !canEdit && (
            <span className={styles.readonlyBadge}>
              <i className="fa-solid fa-lock" /> 閲覧のみ
            </span>
          )}
        </div>

        {isEdit && event?.id && (
          <Link
            href={`/event/confirm?eventId=${event.id}`}
            prefetch={false}
            className={styles.detailLinkBanner}
            onClick={onClose}
          >
            <span>
              <i className="fa-solid fa-circle-info" style={{ marginRight: "6px" }} />
              出欠・譜割り等の詳細確認画面を開く
            </span>
            <i className="fa-solid fa-chevron-right" />
          </Link>
        )}

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.modalScrollArea}>
            {/* タイトル */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="event-title">
                <i className="fa-solid fa-heading" /> タイトル
                <span className={styles.requiredBadge}>必須</span>
              </label>
              <input
                type="text"
                id="event-title"
                className={`${styles.inputField} ${styles.titleInput}`}
                placeholder="予定のタイトルを入力 (例: 合奏練習、合宿、ライブ)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit}
                required
              />
            </div>

            {/* カレンダー表示ラベルカラー */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <i className="fa-solid fa-palette" /> カレンダー表示色 (ラベルカラー)
              </label>
              <div className={styles.colorPaletteRow}>
                {PRESET_EVENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`${styles.colorSwatch} ${
                      color === c.value ? styles.colorSwatchActive : ""
                    }`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setColor(c.value)}
                    disabled={!canEdit}
                    title={c.label}
                  />
                ))}
                <div className={styles.colorPickerBox}>
                  <input
                    type="color"
                    className={styles.nativeColorInput}
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={!canEdit}
                    title="カスタムカラーを選択"
                  />
                </div>
              </div>
              <div style={{ marginTop: "2px" }}>
                <span
                  className={styles.colorPreviewPill}
                  style={{ backgroundColor: color }}
                >
                  <i className="fa-solid fa-calendar-check" />
                  {title.trim() || "プレビュー: 予定タイトル"}
                </span>
              </div>
            </div>

            {/* 終日トグル */}
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>
                <i className="fa-regular fa-clock" /> 終日
              </span>
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  disabled={!canEdit}
                />
                <span className={styles.slider}></span>
              </label>
            </div>

            {/* 開始日時 */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <i className="fa-solid fa-arrow-right-to-bracket" /> 開始日時
              </label>
              <div className={styles.timeRow}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  disabled={!canEdit}
                  required
                />
                {!isAllDay && (
                  <input
                    type="time"
                    step="300"
                    className={styles.timeInput}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={!canEdit}
                    required
                  />
                )}
              </div>
            </div>

            {/* 終了日時 */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <i className="fa-solid fa-arrow-right-from-bracket" /> 終了日時
              </label>
              <div className={styles.timeRow}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={!canEdit}
                  required
                />
                {!isAllDay && (
                  <input
                    type="time"
                    step="300"
                    className={styles.timeInput}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={!canEdit}
                    required
                  />
                )}
              </div>
            </div>

            {/* 繰り返し登録設定 (新規かつ開始日=終了日のみ) */}
            {!isEdit && startDate === endDate && (
              <>
                <div className={styles.toggleRow}>
                  <span className={styles.toggleLabel}>
                    <i className="fa-solid fa-repeat" /> 繰り返し登録する
                  </span>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>

                {isRecurring && (
                  <div className={styles.recurrenceSettings}>
                    <div className={styles.recurrenceRow}>
                      <select
                        className={styles.recurrenceSelect}
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                      >
                        {[...Array(30)].map((_, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {idx + 1}
                          </option>
                        ))}
                      </select>
                      <select
                        className={styles.recurrenceSelect}
                        value={recurrenceUnit}
                        onChange={(e) => setRecurrenceUnit(e.target.value as any)}
                      >
                        <option value="day">日</option>
                        <option value="week">週</option>
                        <option value="month">月</option>
                        <option value="year">年</option>
                      </select>
                      <span>ごと</span>
                    </div>

                    {recurrenceUnit === "month" && (
                      <div className={styles.recurrenceRadioGroup}>
                        <label className={styles.recurrenceRadioLabel}>
                          <input
                            type="radio"
                            name="monthlyOption"
                            value="dayOfMonth"
                            checked={monthlyOption === "dayOfMonth"}
                            onChange={() => setMonthlyOption("dayOfMonth")}
                          />
                          {getRecurrenceOptionTexts().dayOfMonth}
                        </label>
                        <label className={styles.recurrenceRadioLabel}>
                          <input
                            type="radio"
                            name="monthlyOption"
                            value="dayOfWeek"
                            checked={monthlyOption === "dayOfWeek"}
                            onChange={() => setMonthlyOption("dayOfWeek")}
                          />
                          {getRecurrenceOptionTexts().dayOfWeek}
                        </label>
                      </div>
                    )}

                    {recurrenceUnit === "year" && (
                      <div className={styles.recurrenceRadioGroup}>
                        <label className={styles.recurrenceRadioLabel}>
                          <input
                            type="radio"
                            name="yearlyOption"
                            value="dayOfYear"
                            checked={yearlyOption === "dayOfYear"}
                            onChange={() => setYearlyOption("dayOfYear")}
                          />
                          {getRecurrenceOptionTexts().dayOfYear}
                        </label>
                        <label className={styles.recurrenceRadioLabel}>
                          <input
                            type="radio"
                            name="yearlyOption"
                            value="dayOfWeekOfYear"
                            checked={yearlyOption === "dayOfWeekOfYear"}
                            onChange={() => setYearlyOption("dayOfWeekOfYear")}
                          />
                          {getRecurrenceOptionTexts().dayOfWeekOfYear}
                        </label>
                      </div>
                    )}

                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>繰り返し終了日</label>
                      <input
                        type="date"
                        className={styles.dateInput}
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                        min={startDate}
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 場所・施設名 */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="event-place">
                <i className="fa-solid fa-location-dot" /> 場所・施設名
              </label>
              <input
                type="text"
                id="event-place"
                className={styles.inputField}
                placeholder="例: 第3共用施設 防音室1, 2"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            {/* メモ */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="event-note">
                <i className="fa-solid fa-note-sticky" /> メモ・備考
              </label>
              <textarea
                id="event-note"
                className={`${styles.inputField} ${styles.notesArea}`}
                placeholder="持ち物、注意事項、曲順などのメモ"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            {/* 関連リンク */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="event-link">
                <i className="fa-solid fa-link" /> 関連リンク (URL)
              </label>
              <div className={styles.linkInputWrapper}>
                <input
                  type="url"
                  id="event-link"
                  className={styles.inputField}
                  placeholder="https://drive.google.com/..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  disabled={!canEdit}
                />
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkOpenButton}
                    title="リンクを開く"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* フッターアクション */}
          <div className={styles.modalFooter}>
            {canEdit ? (
              <>
                <div className={styles.footerRow}>
                  {isEdit && onCopy && (
                    <button
                      type="button"
                      className={styles.btnCopy}
                      onClick={handleCopyClick}
                      disabled={isSubmitting}
                      title="予定をコピーして新規作成"
                    >
                      <i className="fa-solid fa-copy"></i> コピー
                    </button>
                  )}
                  <button type="submit" className={styles.btnSave} disabled={isSubmitting}>
                    <i className="fa-solid fa-floppy-disk"></i> 保存
                  </button>
                </div>
                <div className={styles.footerRow}>
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    閉じる
                  </button>
                  {isEdit && onDelete && (
                    <button
                      type="button"
                      className={styles.btnDelete}
                      onClick={handleDeleteClick}
                      disabled={isSubmitting}
                      title="予定を削除"
                    >
                      <i className="fa-solid fa-trash-can"></i> 削除
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.footerRow}>
                <button
                  type="button"
                  className={styles.btnCancel}
                  onClick={onClose}
                  style={{ width: "100%" }}
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
