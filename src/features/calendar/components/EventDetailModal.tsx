"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EventConfirmData } from "@/features/event/api/event-server-actions";
import { getEventConfirmDataAction } from "@/features/event/api/event-detail-server-actions";
import {
  submitAttendanceAnswer,
  submitAdjustAnswer,
  deleteMyAttendanceAnswer,
  deleteMyAdjustAnswer,
  addEvent,
  updateEvent,
  deleteEventWithAnswers,
} from "@/features/event/api/event-client-service";
import { canEditEvent } from "@/features/event/lib/event-utils";
import {
  getDayOfWeek,
  showDialog,
  showSpinner,
  hideSpinner,
  writeLog,
  globalLineDefaultImage,
  extractYouTubeId,
  dotDateToHyphen,
  hyphenDateToDot,
  format,
} from "@/lib/functions";
import { DEFAULT_PREFECTURES } from "@/lib/firestore/constants";
import { DEFAULT_EVENT_COLOR, PRESET_EVENT_COLORS } from "@/features/calendar/lib/color-constants";
import { SetlistConfirm } from "@/components/Setlist/SetlistConfirm";
import { SetlistEdit } from "@/components/Setlist/SetlistEdit";
import { Event, Municipality, Score, SetlistGroup } from "@/lib/firestore/types";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { removeUndefined } from "@/lib/firestore/utils";
import {
  toHyphenDate,
  toDotDate,
  getDaysDiff,
  shiftDateString,
  generateRecurrenceDates,
  calculateDefaultEndDate,
  RecurrenceConfig,
} from "@/features/calendar/lib/recurrence-utils";
import styles from "./EventDetailModal.module.css";

interface EventDetailModalProps {
  eventId?: string | null;
  initialMode?: "view" | "edit" | "create";
  initialDate?: string; // "yyyy.MM.dd" or "yyyy-MM-dd"
  onClose: () => void;
  onEditEvent?: (eventId: string) => void;
  onDeleteEvent?: (eventId: string) => Promise<void>;
  onDeleteSuccess?: (eventId: string) => void;
  onAnswerUpdated?: () => void;
  onSaveSuccess?: (eventId: string) => void;
}

export function EventDetailModal({
  eventId,
  initialMode,
  initialDate,
  onClose,
  onDeleteEvent,
  onDeleteSuccess,
  onAnswerUpdated,
  onSaveSuccess,
}: EventDetailModalProps) {
  const { userData } = useAuth();
  const uid = userData?.id || userData?.uid;

  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "create">(
    initialMode || (eventId ? "view" : "create")
  );
  const [data, setData] = useState<EventConfirmData | null>(null);
  const [loading, setLoading] = useState(mode !== "create");

  // 出欠確認（通常）用ステート (閲覧モードでの即時回答)
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  // 日程調整用ステート (閲覧モードでの即時回答)
  const [adjustAnswers, setAdjustAnswers] = useState<Record<string, string>>({});
  const [adjustComment, setAdjustComment] = useState<string>("");

  // 集計表示用タブ
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [showUnansweredList, setShowUnansweredList] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

  // ===== 編集・新規作成用フォームステート =====
  const [formTitle, setFormTitle] = useState("");
  const [formColor, setFormColor] = useState(DEFAULT_EVENT_COLOR);
  const [formAttendanceType, setFormAttendanceType] = useState<"attendance" | "schedule">("attendance");
  const [formDate, setFormDate] = useState("");
  const [formCandidateDates, setFormCandidateDates] = useState<string[]>([""]);
  const [formIsAllDay, setFormIsAllDay] = useState(true);
  const [formStartTime, setFormStartTime] = useState("18:00");
  const [formEndTime, setFormEndTime] = useState("21:00");
  const [formPrefectureId, setFormPrefectureId] = useState("");
  const [formMunicipalityId, setFormMunicipalityId] = useState("");
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [formPlaceName, setFormPlaceName] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formGoogleMap, setFormGoogleMap] = useState("");
  const [formAccess, setFormAccess] = useState("");
  const [formIsVenueReserved, setFormIsVenueReserved] = useState(false);
  const [formRentTimeRanges, setFormRentTimeRanges] = useState<{ startTime: string; endTime: string }[]>([]);
  const [formSchedule, setFormSchedule] = useState("");
  const [formDress, setFormDress] = useState("");
  const [formBring, setFormBring] = useState("");
  const [formRent, setFormRent] = useState("");
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formSetlist, setFormSetlist] = useState<SetlistGroup[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [isSetlistAccordionOpen, setIsSetlistAccordionOpen] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  // 繰り返し設定・確認用ステート (CANDY準拠)
  const [confirmMode, setConfirmMode] = useState<"save" | "delete" | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<"day" | "week" | "month" | "year">("week");
  const [monthlyOption, setMonthlyOption] = useState<"dayOfMonth" | "dayOfWeek">("dayOfMonth");
  const [yearlyOption, setYearlyOption] = useState<"dayOfYear" | "dayOfWeekOfYear">("dayOfYear");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  useEffect(() => {
    if (formDate && recurrenceUnit) {
      setRecurrenceEndDate(calculateDefaultEndDate(formDate, recurrenceUnit));
    }
  }, [formDate, recurrenceUnit]);

  const getRecurrenceOptionTexts = useCallback(() => {
    if (!formDate) return { dayOfMonth: "", dayOfWeek: "", dayOfYear: "", dayOfWeekOfYear: "" };
    const [y, m, d] = formDate.split("-").map(Number);
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
  }, [formDate]);

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // フォームの初期化ヘルパー
  const initFormFromEvent = useCallback((ev: Event) => {
    setFormTitle(ev.title || "");
    setFormColor(ev.color || DEFAULT_EVENT_COLOR);
    setFormAttendanceType(ev.attendanceType || "attendance");
    setFormDate(dotDateToHyphen(ev.date || ev.startDate || ""));
    setFormCandidateDates(
      ev.candidateDates && ev.candidateDates.length > 0
        ? ev.candidateDates.map(dotDateToHyphen)
        : [""]
    );
    setFormIsAllDay(ev.isAllDay ?? true);
    setFormStartTime(ev.startTime || "18:00");
    setFormEndTime(ev.endTime || "21:00");
    setFormPrefectureId(ev.prefectureId || "");
    setFormMunicipalityId(ev.municipalityId || "");
    setFormPlaceName(ev.placeName || "");
    setFormWebsite(ev.website || "");
    setFormGoogleMap(ev.googleMap || "");
    setFormAccess(ev.access || "");
    setFormIsVenueReserved(ev.isVenueReserved ?? false);
    setFormRentTimeRanges(ev.rentTimeRanges || []);
    setFormSchedule(ev.schedule || ev.note || "");
    setFormDress(ev.dress || "");
    setFormBring(ev.bring || "");
    setFormRent(ev.rent || "");
    setFormYoutubeUrl(ev.youtubeUrl || "");
    setFormSetlist(ev.setlist || []);
    setIsRecurring(false);
    setRecurrenceInterval(1);
    setRecurrenceUnit("week");
    setMonthlyOption("dayOfMonth");
    setYearlyOption("dayOfYear");
    setRecurrenceEndDate(
      calculateDefaultEndDate(dotDateToHyphen(ev.date || ev.startDate || ""), "week")
    );
    setConfirmMode(null);
  }, []);

  const loadData = useCallback(async () => {
    if (!eventId) return;
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

      // 編集用フォームの初期化
      if (res?.event) {
        initFormFromEvent(res.event);
      }
    } catch (err) {
      console.error("[EventDetailModal] 読み込みエラー:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId, uid, initFormFromEvent]);

  useEffect(() => {
    if (eventId) {
      loadData();
    } else if (mode === "create") {
      setLoading(false);
      const parsedDate = initialDate ? dotDateToHyphen(initialDate) : "";
      setFormDate(parsedDate);
      setFormCandidateDates(parsedDate ? [parsedDate] : [""]);
      setFormColor(DEFAULT_EVENT_COLOR);
      setIsRecurring(false);
      setRecurrenceInterval(1);
      setRecurrenceUnit("week");
      setMonthlyOption("dayOfMonth");
      setYearlyOption("dayOfYear");
      setRecurrenceEndDate(calculateDefaultEndDate(parsedDate || "", "week"));
      setConfirmMode(null);
    }
  }, [eventId, mode, initialDate, loadData]);

  // 市区町村一覧の動的取得 (都道府県変更時)
  useEffect(() => {
    if (!formPrefectureId) {
      setMunicipalities([]);
      return;
    }
    const loadMun = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "municipalities"), where("prefectureCode", "==", formPrefectureId))
        );
        const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Municipality[];
        setMunicipalities(list);
      } catch (err) {
        console.error("Municipalities load error:", err);
      }
    };
    loadMun();
  }, [formPrefectureId]);

  // 譜面一覧の取得 (セットリスト編集用)
  useEffect(() => {
    if (mode === "edit" || mode === "create") {
      getDocs(collection(db, "scores"))
        .then((snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Score[];
          setScores(list);
        })
        .catch(console.error);
    }
  }, [mode]);

  const event = data?.event;
  const isSchedule = event?.attendanceType === "schedule";
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
  const canManage = event ? canEditEvent(event, userData) : true;

  // 出欠回答保存 (通常イベント - 閲覧モード)
  const handleSaveAttendance = async () => {
    if (!uid || !event || !eventId) return;
    if (!selectedStatus) {
      await showDialog("出欠を選択してください", true);
      return;
    }

    const isEditAnswer = !!myAnswer;
    const confirmed = await showDialog(`出欠回答を${isEditAnswer ? "更新" : "登録"}しますか？`);
    if (!confirmed) return;

    setIsSubmittingAnswer(true);
    showSpinner();
    try {
      await submitAttendanceAnswer(eventId, uid, selectedStatus, comment);
      await writeLog({
        dataId: eventId,
        action: `イベント回答（出欠）${isEditAnswer ? "更新" : "登録"}`,
      });
      hideSpinner();
      await showDialog(`出欠回答を${isEditAnswer ? "更新" : "登録"}しました`, true);
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

  // 日程調整回答保存 (閲覧モード)
  const handleSaveAdjust = async () => {
    if (!uid || !event || !eventId) return;
    const candidateDates = event.candidateDates || [];
    const unanswered = candidateDates.filter((d) => !adjustAnswers[d]);
    if (unanswered.length > 0) {
      await showDialog("すべての候補日に回答を選択してください", true);
      return;
    }

    const isEditAnswer = !!myAnswer;
    const confirmed = await showDialog(`日程調整の回答を${isEditAnswer ? "更新" : "登録"}しますか？`);
    if (!confirmed) return;

    setIsSubmittingAnswer(true);
    showSpinner();
    try {
      await submitAdjustAnswer(eventId, uid, adjustAnswers, adjustComment);
      await writeLog({
        dataId: eventId,
        action: `イベント回答（日程調整）${isEditAnswer ? "更新" : "登録"}`,
      });
      hideSpinner();
      await showDialog(`日程調整の回答を${isEditAnswer ? "更新" : "登録"}しました`, true);
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

  // 回答取消 (閲覧モード)
  const handleDeleteMyAnswer = async () => {
    if (!uid || !event || !eventId) return;
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

  // ===== イベント本体の保存処理 (編集・新規作成) =====
  const executeSaveEvent = async (targetRange?: "only" | "all") => {
    setIsSavingEvent(true);
    showSpinner();
    try {
      const isAttendance = formAttendanceType === "attendance";
      const dotDate = isAttendance ? hyphenDateToDot(formDate) : "";
      const dotCandidateDates =
        !isAttendance
          ? formCandidateDates.filter((d) => d.trim() !== "").map(hyphenDateToDot)
          : [];

      const payload: Omit<Event, "id"> = removeUndefined({
        title: formTitle.trim(),
        color: formColor || DEFAULT_EVENT_COLOR,
        attendanceType: formAttendanceType,
        date: dotDate,
        startDate: dotDate,
        endDate: dotDate,
        candidateDates: dotCandidateDates,
        isAllDay: formIsAllDay,
        startTime: formIsAllDay ? "" : formStartTime,
        endTime: formIsAllDay ? "" : formEndTime,
        acceptStartDate: "",
        acceptEndDate: "",
        prefectureId: formPrefectureId,
        municipalityId: formMunicipalityId,
        placeName: formPlaceName.trim(),
        website: formWebsite.trim(),
        googleMap: formGoogleMap.trim(),
        access: formAccess.trim(),
        isVenueReserved: formIsVenueReserved,
        rentTimeRanges: formRentTimeRanges.filter((r) => r.startTime && r.endTime),
        schedule: formSchedule.trim(),
        note: formSchedule.trim(),
        dress: formDress.trim(),
        bring: formBring.trim(),
        rent: formRent.trim(),
        youtubeUrl: formYoutubeUrl.trim(),
        setlist: formSetlist,
        createdUid: event?.createdUid || uid || "",
        createdBy: event?.createdBy || userData?.displayName || uid || "",
      });

      if (mode === "create") {
        if (isRecurring && isAttendance && formDate) {
          // 繰り返し予定の一括生成登録 (CANDY準拠) - ※出欠イベントのみ
          const recId =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
          const targetDates = generateRecurrenceDates(formDate, {
            interval: recurrenceInterval,
            unit: recurrenceUnit,
            monthlyOption,
            yearlyOption,
            endDate: recurrenceEndDate,
          });

          const creations = targetDates.map((dHyphen) => {
            const dDot = hyphenDateToDot(dHyphen);
            return addEvent({
              ...payload,
              date: dDot,
              startDate: dDot,
              endDate: dDot,
              isRecurring: true,
              recurrenceId: recId,
            });
          });

          const createdIds = await Promise.all(creations);
          await writeLog({
            dataId: createdIds[0],
            action: `イベント新規作成(繰り返し ${createdIds.length}件)`,
          });
          hideSpinner();
          await showDialog(`繰り返しイベント（${createdIds.length}件）を作成しました`, true);
          if (onSaveSuccess) onSaveSuccess(createdIds[0]);
          onClose();
        } else {
          // 通常の単一イベント新規作成
          const newId = await addEvent(payload);
          await writeLog({ dataId: newId, action: "イベント新規作成(モーダル)" });
          hideSpinner();
          await showDialog("イベントを作成しました", true);
          if (onSaveSuccess) onSaveSuccess(newId);
          onClose();
        }
      } else if (mode === "edit" && eventId) {
        if (isAttendance && (event?.isRecurring || event?.recurrenceId) && targetRange === "only") {
          // 個別編集: このイベントのみ編集し、繰り返しIDを削除して単体化 (CANDY準拠)
          const updatedPayload: Partial<Event> = {
            ...payload,
            isRecurring: false,
            recurrenceId: "",
          };
          await updateEvent(eventId, updatedPayload);
          await writeLog({ dataId: eventId, action: "イベント個別更新(繰り返しID削除)" });
          hideSpinner();
          await showDialog("このイベントのみ更新しました（繰り返しから除外されました）", true);
          await loadData();
          setMode("view");
          if (onSaveSuccess) onSaveSuccess(eventId);
        } else if (
          isAttendance &&
          (event?.isRecurring || event?.recurrenceId) &&
          targetRange === "all" &&
          event?.recurrenceId
        ) {
          // 一括編集: 繰り返しIDで検索して全件を一括更新 (日付差分シフト) (CANDY準拠)
          const recId = event.recurrenceId;
          const oldStart = event.date || event.startDate || "";
          const newStart = isAttendance ? hyphenDateToDot(formDate) : oldStart;
          const diffDays = getDaysDiff(oldStart, newStart);

          const q = query(collection(db, "events"), where("recurrenceId", "==", recId));
          const snap = await getDocs(q);

          const updates = snap.docs.map(async (docSnap) => {
            const eData = docSnap.data() as Event;
            const eDate = eData.date || eData.startDate || "";
            const shiftedDate = eDate ? shiftDateString(eDate, diffDays) : eDate;
            const itemUpdate: Partial<Event> = {
              ...payload,
              date: shiftedDate,
              startDate: shiftedDate,
              endDate: shiftedDate,
              isRecurring: true,
              recurrenceId: recId,
            };
            await updateEvent(docSnap.id, itemUpdate);
          });

          await Promise.all(updates);
          await writeLog({
            dataId: eventId,
            action: `繰り返しイベント一括更新(${snap.docs.length}件)`,
          });
          hideSpinner();
          await showDialog(
            `すべての繰り返し予定（${snap.docs.length}件）を一括更新しました`,
            true
          );
          await loadData();
          setMode("view");
          if (onSaveSuccess) onSaveSuccess(eventId);
        } else {
          // 通常の編集 (日程調整イベント、または単独出欠イベント)
          const updatedPayload: Partial<Event> = {
            ...payload,
            // 日程調整の場合は繰り返しの概念を用いないため、isRecurring/recurrenceIdを排除
            ...(!isAttendance ? { isRecurring: false, recurrenceId: "" } : {}),
          };
          await updateEvent(eventId, updatedPayload);
          await writeLog({ dataId: eventId, action: "イベント更新(モーダル)" });
          hideSpinner();
          await showDialog("イベントを更新しました", true);
          await loadData();
          setMode("view");
          if (onSaveSuccess) onSaveSuccess(eventId);
        }
      }
    } catch (err: any) {
      hideSpinner();
      console.error("[EventDetailModal] イベント保存エラー:", err);
      await showDialog(`保存に失敗しました: ${err.message}`, true);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!formTitle.trim()) {
      await showDialog("イベント名を入力してください", true);
      return;
    }

    if (formAttendanceType === "attendance" && !formDate) {
      await showDialog("開催日を選択してください", true);
      return;
    }

    if (formAttendanceType === "schedule") {
      const validDates = formCandidateDates.filter((d) => d.trim() !== "");
      if (validDates.length === 0) {
        await showDialog("日程調整の候補日を少なくとも1つ入力してください", true);
        return;
      }
    }

    // 編集時かつ繰り返しイベントの場合は適用範囲を確認 (CANDY準拠) - ※日程調整は対象外
    if (
      mode === "edit" &&
      formAttendanceType === "attendance" &&
      (event?.isRecurring || event?.recurrenceId)
    ) {
      setConfirmMode("save");
      return;
    }

    await executeSaveEvent();
  };

  // イベント本体の削除処理
  const executeDeleteEvent = async (targetRange?: "only" | "all") => {
    if (!eventId) return;
    showSpinner();
    try {
      if (
        event?.attendanceType === "attendance" &&
        (event?.isRecurring || event?.recurrenceId) &&
        targetRange === "all" &&
        event?.recurrenceId
      ) {
        // 一括削除: 繰り返しIDで検索して全件一括削除 (回答も完全削除)
        const recId = event.recurrenceId;
        const q = query(collection(db, "events"), where("recurrenceId", "==", recId));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((docSnap) => deleteEventWithAnswers(docSnap.id)));
        await writeLog({
          dataId: eventId,
          action: `繰り返しイベント一括削除(${snap.docs.length}件)`,
        });
        hideSpinner();
        await showDialog(
          `すべての繰り返し予定（${snap.docs.length}件）を一括削除しました`,
          true
        );
        if (onDeleteSuccess) onDeleteSuccess(eventId);
        onClose();
      } else {
        // 個別削除 (または通常削除)
        if (onDeleteEvent) {
          await onDeleteEvent(eventId);
        } else {
          await deleteEventWithAnswers(eventId);
        }
        await writeLog({ dataId: eventId, action: "イベント削除(モーダル)" });
        hideSpinner();
        await showDialog("イベントを削除しました", true);
        if (onDeleteSuccess) onDeleteSuccess(eventId);
        onClose();
      }
    } catch (err: any) {
      hideSpinner();
      console.error("[EventDetailModal] イベント削除エラー:", err);
      await showDialog(`削除に失敗しました: ${err.message}`, true);
    }
  };

  const handleDeleteEventClick = async () => {
    if (!eventId || !canManage) {
      showDialog("イベントを削除する権限がありません", true);
      return;
    }

    // 繰り返しイベントの場合は適用範囲を確認 (CANDY準拠) - ※日程調整は対象外
    if (
      event?.attendanceType === "attendance" &&
      (event?.isRecurring || event?.recurrenceId)
    ) {
      setConfirmMode("delete");
      return;
    }

    const confirmed = await showDialog(
      "このイベントを削除しますか？\n関連する出欠回答もすべて完全に削除されます。"
    );
    if (!confirmed) return;

    await executeDeleteEvent();
  };

  // 繰り返し確認ダイアログのアクションハンドラ (CANDY準拠)
  const handleConfirmAction = async (targetRange: "only" | "all") => {
    const currentMode = confirmMode;
    setConfirmMode(null);
    if (currentMode === "save") {
      await executeSaveEvent(targetRange);
    } else if (currentMode === "delete") {
      await executeDeleteEvent(targetRange);
    }
  };

  if (!mounted) return null;

  const isFormMode = mode === "edit" || mode === "create";

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.eventDetailModal} onClick={(e) => e.stopPropagation()}>
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

        {/* モーダルヘッダー */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleCol}>
            {!isFormMode ? (
              <>
                <div className={styles.badgeRow}>
                  <span
                    className={`${styles.typeBadge} ${
                      isSchedule ? styles.typeBadgeSchedule : ""
                    }`}
                  >
                    {isSchedule ? "日程調整" : "イベント出欠"}
                  </span>

                  {!isSchedule && (event?.isRecurring || event?.recurrenceId) && (
                    <span
                      className={styles.typeBadge}
                      style={{ background: "#f3e8ff", color: "#7e22ce", borderColor: "#d8b4fe" }}
                    >
                      <i className="fa-solid fa-arrows-rotate" /> 繰り返し
                    </span>
                  )}

                  {isPast ? (
                    <span className={`${styles.statusBadge} ${styles.statusClosed}`}>終了</span>
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
              </>
            ) : (
              <h2 className={styles.modalTitle}>
                <i className={mode === "create" ? "fa-solid fa-calendar-plus" : "fa-solid fa-calendar-days"} />
                {mode === "create" ? "新規イベント作成" : "イベント編集"}
              </h2>
            )}
          </div>

          <div className={styles.headerActions}>
            {!isFormMode && canManage && (
              <>
                <button
                  type="button"
                  className={styles.btnActionIcon}
                  onClick={() => {
                    if (event) initFormFromEvent(event);
                    setMode("edit");
                  }}
                  title="イベントを編集"
                >
                  <i className="fa-solid fa-pen-to-square" />
                </button>
                <button
                  type="button"
                  className={`${styles.btnActionIcon} ${styles.btnDeleteIcon}`}
                  onClick={handleDeleteEventClick}
                  title="イベントを削除"
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </>
            )}

            {isFormMode && mode === "edit" && (
              <button
                type="button"
                className={styles.btnActionIcon}
                onClick={() => setMode("view")}
                title="確認表示に戻る"
              >
                <i className="fa-solid fa-arrow-left" />
              </button>
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
              <span>読み込み中...</span>
            </div>
          ) : isFormMode ? (
            /* ===== 編集・新規作成フォーム (低認知負荷デザイン) ===== */
            <div className={styles.formContainer}>
              {/* 1. 基本情報カード */}
              <div className={styles.formCard}>
                <div className={styles.formSectionHeader}>
                  <h3 className={styles.formSectionTitle}>
                    <i className="fa-solid fa-calendar-check" />
                    <span>基本情報</span>
                  </h3>
                </div>

                {/* 繰り返しイベント案内バナー (編集時) - ※日程調整は除外 */}
                {mode === "edit" &&
                  formAttendanceType === "attendance" &&
                  (event?.isRecurring || event?.recurrenceId) && (
                    <div className={styles.recurringNoticeBox}>
                      <i className="fa-solid fa-arrows-rotate" style={{ fontSize: "18px" }} />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontWeight: 800 }}>繰り返しイベント</div>
                        <div style={{ fontSize: "12px", marginTop: "2px" }}>
                          繰り返しID: <code className={styles.recurrenceIdBadge}>{event.recurrenceId || "未設定"}</code>
                        </div>
                      </div>
                    </div>
                  )}

                {/* イベント名 */}
                <div className={styles.formField}>
                  <div className={styles.fieldLabelRow}>
                    <span className={styles.fieldLabel}>イベント名</span>
                    <span className={styles.reqBadge}>必須</span>
                  </div>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="例: 合同合奏練習、定期演奏会リハ"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>

                {/* 出欠種別切り替え (編集時は固定) */}
                <div className={styles.formField}>
                  <div className={styles.fieldLabelRow}>
                    <span className={styles.fieldLabel}>回答種別</span>
                    {mode === "create" && <span className={styles.reqBadge}>必須</span>}
                  </div>
                  {mode === "create" ? (
                    <div className={styles.typeToggleContainer}>
                      <button
                        type="button"
                        className={`${styles.typeToggleBtn} ${
                          formAttendanceType === "attendance" ? styles.typeToggleBtnActive : ""
                        }`}
                        onClick={() => setFormAttendanceType("attendance")}
                      >
                        <i className="fa-solid fa-calendar-check" />
                        <span>イベント出欠 (特定日)</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.typeToggleBtn} ${
                          formAttendanceType === "schedule" ? styles.typeToggleBtnActive : ""
                        }`}
                        onClick={() => setFormAttendanceType("schedule")}
                      >
                        <i className="fa-solid fa-calendar-days" />
                        <span>日程調整 (候補日)</span>
                      </button>
                    </div>
                  ) : (
                    <div className={styles.fixedTypeContainer}>
                      <span
                        className={`${styles.typeBadge} ${
                          formAttendanceType === "schedule" ? styles.typeBadgeSchedule : ""
                        }`}
                      >
                        <i
                          className={
                            formAttendanceType === "schedule"
                              ? "fa-solid fa-calendar-days"
                              : "fa-solid fa-calendar-check"
                          }
                        />{" "}
                        {formAttendanceType === "schedule" ? "日程調整 (候補日)" : "イベント出欠 (特定日)"}
                      </span>
                      <span className={styles.fixedTypeNote}>※作成後に回答種別を変更することはできません</span>
                    </div>
                  )}
                </div>

                {/* 日程設定 */}
                {formAttendanceType === "attendance" ? (
                  <>
                    <div className={styles.formField}>
                      <div className={styles.fieldLabelRow}>
                        <span className={styles.fieldLabel}>開催日</span>
                        <span className={styles.reqBadge}>必須</span>
                      </div>
                      <input
                        type="date"
                        className={styles.formInput}
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                      />
                    </div>

                    <div className={styles.checkboxCenterRow}>
                      <input
                        type="checkbox"
                        id="modalEventIsAllDay"
                        checked={formIsAllDay}
                        onChange={(e) => setFormIsAllDay(e.target.checked)}
                      />
                      <label htmlFor="modalEventIsAllDay" className={styles.checkboxLabel}>
                        終日イベント
                      </label>
                    </div>

                    {!formIsAllDay && (
                      <div className={styles.formGrid2}>
                        <div className={styles.formField}>
                          <span className={styles.fieldLabel}>開始時間</span>
                          <input
                            type="time"
                            className={styles.formInput}
                            value={formStartTime}
                            onChange={(e) => setFormStartTime(e.target.value)}
                          />
                        </div>
                        <div className={styles.formField}>
                          <span className={styles.fieldLabel}>終了時間</span>
                          <input
                            type="time"
                            className={styles.formInput}
                            value={formEndTime}
                            onChange={(e) => setFormEndTime(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {/* 繰り返し登録設定 (新規作成 - CANDY準拠) */}
                    {mode === "create" && (
                      <>
                        <div className={styles.checkboxCenterRow} style={{ marginTop: "12px" }}>
                          <input
                            type="checkbox"
                            id="modalEventIsRecurring"
                            checked={isRecurring}
                            onChange={(e) => setIsRecurring(e.target.checked)}
                          />
                          <label htmlFor="modalEventIsRecurring" className={styles.checkboxLabel}>
                            繰り返し登録する
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
                                    name="modalMonthlyOption"
                                    value="dayOfMonth"
                                    checked={monthlyOption === "dayOfMonth"}
                                    onChange={() => setMonthlyOption("dayOfMonth")}
                                  />
                                  {getRecurrenceOptionTexts().dayOfMonth}
                                </label>
                                <label className={styles.recurrenceRadioLabel}>
                                  <input
                                    type="radio"
                                    name="modalMonthlyOption"
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
                                    name="modalYearlyOption"
                                    value="dayOfYear"
                                    checked={yearlyOption === "dayOfYear"}
                                    onChange={() => setYearlyOption("dayOfYear")}
                                  />
                                  {getRecurrenceOptionTexts().dayOfYear}
                                </label>
                                <label className={styles.recurrenceRadioLabel}>
                                  <input
                                    type="radio"
                                    name="modalYearlyOption"
                                    value="dayOfWeekOfYear"
                                    checked={yearlyOption === "dayOfWeekOfYear"}
                                    onChange={() => setYearlyOption("dayOfWeekOfYear")}
                                  />
                                  {getRecurrenceOptionTexts().dayOfWeekOfYear}
                                </label>
                              </div>
                            )}

                            <div style={{ marginTop: "6px" }}>
                              <span className={styles.fieldLabel}>繰り返し終了日</span>
                              <input
                                type="date"
                                className={styles.formInput}
                                value={recurrenceEndDate}
                                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                min={formDate}
                                required
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  /* 日程調整: 候補日リスト */
                  <div className={styles.formField}>
                    <div className={styles.fieldLabelRow}>
                      <span className={styles.fieldLabel}>日程調整の候補日</span>
                      <span className={styles.reqBadge}>必須</span>
                    </div>
                    <div className={styles.candidateDateList}>
                      {formCandidateDates.map((dateVal, idx) => (
                        <div key={idx} className={styles.candidateDateRow}>
                          <input
                            type="date"
                            className={styles.formInput}
                            value={dateVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormCandidateDates((prev) =>
                                prev.map((d, i) => (i === idx ? val : d))
                              );
                            }}
                          />
                          {formCandidateDates.length > 1 && (
                            <button
                              type="button"
                              className={styles.btnRemoveDate}
                              onClick={() =>
                                setFormCandidateDates((prev) => prev.filter((_, i) => i !== idx))
                              }
                              title="候補日を削除"
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={styles.btnAddCandidate}
                      onClick={() => setFormCandidateDates((prev) => [...prev, ""])}
                    >
                      <i className="fa-solid fa-plus" />
                      <span>候補日を追加</span>
                    </button>
                  </div>
                )}

                {/* カレンダー表示色 */}
                <div className={styles.formField}>
                  <div className={styles.fieldLabelRow}>
                    <span className={styles.fieldLabel}>カレンダー表示色</span>
                  </div>
                  <div className={styles.colorPaletteRow}>
                    {PRESET_EVENT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={`${styles.colorSwatch} ${
                          formColor === c.value ? styles.colorSwatchActive : ""
                        }`}
                        style={{ backgroundColor: c.value }}
                        onClick={() => setFormColor(c.value)}
                        title={c.label}
                      >
                        {formColor === c.value && <i className="fa-solid fa-check" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      className={styles.customColorPicker}
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      title="自由指定カラー"
                    />
                  </div>
                </div>
              </div>

              {/* 2. 場所・アクセスカード */}
              <div className={styles.formCard}>
                <div className={styles.formSectionHeader}>
                  <h3 className={styles.formSectionTitle}>
                    <i className="fa-solid fa-location-dot" />
                    <span>場所・アクセス</span>
                  </h3>
                </div>

                <div className={styles.formGrid2}>
                  <div className={styles.formField}>
                    <span className={styles.fieldLabel}>都道府県</span>
                    <select
                      className={styles.formSelect}
                      value={formPrefectureId}
                      onChange={(e) => {
                        setFormPrefectureId(e.target.value);
                        setFormMunicipalityId("");
                      }}
                    >
                      <option value="">都道府県を選択</option>
                      {DEFAULT_PREFECTURES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <span className={styles.fieldLabel}>市区町村</span>
                    <select
                      className={styles.formSelect}
                      value={formMunicipalityId}
                      onChange={(e) => setFormMunicipalityId(e.target.value)}
                      disabled={!formPrefectureId}
                    >
                      <option value="">市区町村を選択</option>
                      {municipalities.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formField}>
                  <span className={styles.fieldLabel}>施設名・会場場所</span>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="例: 第3共用施設 2階 防音室1, 2"
                    value={formPlaceName}
                    onChange={(e) => setFormPlaceName(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <span className={styles.fieldLabel}>GoogleマップURL</span>
                  <input
                    type="url"
                    className={styles.formInput}
                    placeholder="https://maps.app.goo.gl/..."
                    value={formGoogleMap}
                    onChange={(e) => setFormGoogleMap(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <span className={styles.fieldLabel}>アクセス・行き方案内</span>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="例: 伊予鉄市内電車 赤十字病院前駅より徒歩5分"
                    value={formAccess}
                    onChange={(e) => setFormAccess(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <span className={styles.fieldLabel}>施設WebサイトURL</span>
                  <input
                    type="url"
                    className={styles.formInput}
                    placeholder="https://..."
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                  />
                </div>

                <div className={styles.checkboxCenterRow}>
                  <input
                    type="checkbox"
                    id="modalEventIsVenueReserved"
                    checked={formIsVenueReserved}
                    onChange={(e) => setFormIsVenueReserved(e.target.checked)}
                  />
                  <label htmlFor="modalEventIsVenueReserved" className={styles.checkboxLabel}>
                    会場予約・押さえ済み
                  </label>
                </div>
              </div>

              {/* 3. 詳細・連絡事項カード */}
              <div className={styles.formCard}>
                <div className={styles.formSectionHeader}>
                  <h3 className={styles.formSectionTitle}>
                    <i className="fa-solid fa-align-left" />
                    <span>連絡事項・詳細</span>
                  </h3>
                </div>

                <div className={styles.formField}>
                  <span className={styles.fieldLabel}>タイムテーブル・案内メモ</span>
                  <textarea
                    className={styles.formTextarea}
                    placeholder="当日のスケジュール、連絡事項、注意事項など"
                    value={formSchedule}
                    onChange={(e) => setFormSchedule(e.target.value)}
                  />
                </div>

                <div className={styles.formGrid2}>
                  <div className={styles.formField}>
                    <span className={styles.fieldLabel}>持ち物</span>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="例: 譜面、スタンド、チューナー"
                      value={formBring}
                      onChange={(e) => setFormBring(e.target.value)}
                    />
                  </div>

                  <div className={styles.formField}>
                    <span className={styles.fieldLabel}>服装</span>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="例: 黒シャツ・スラックス"
                      value={formDress}
                      onChange={(e) => setFormDress(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formField}>
                  <span className={styles.fieldLabel}>費用・部費負担</span>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="例: 会場費 500円 / 人"
                    value={formRent}
                    onChange={(e) => setFormRent(e.target.value)}
                  />
                </div>

                <div className={styles.formField}>
                  <span className={styles.fieldLabel}>参考音源 (YouTube URL)</span>
                  <input
                    type="url"
                    className={styles.formInput}
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={formYoutubeUrl}
                    onChange={(e) => setFormYoutubeUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* 4. セットリスト・演奏曲 (折りたたみ式アコーディオン) */}
              <div className={styles.formCard}>
                <div
                  className={styles.accordionHeader}
                  onClick={() => setIsSetlistAccordionOpen((prev) => !prev)}
                >
                  <span className={styles.accordionTitle}>
                    <i className="fa-solid fa-music" />
                    <span>セットリスト・演奏曲を設定する（任意）</span>
                  </span>
                  <i
                    className={`fa-solid ${
                      isSetlistAccordionOpen ? "fa-chevron-up" : "fa-chevron-down"
                    }`}
                  />
                </div>

                {isSetlistAccordionOpen && (
                  <div className={styles.accordionContent}>
                    <SetlistEdit
                      setlist={formSetlist}
                      scores={scores}
                      onChange={setFormSetlist}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : !data || !event ? (
            <div className={styles.loadingBox}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color: "#ef4444", fontSize: "24px" }} />
              <span>イベント情報の取得に失敗しました</span>
            </div>
          ) : (
            /* ===== 閲覧・出欠回答表示モード ===== */
            <>
              {/* 1. 出欠回答・回答編集インラインセクション */}
              <div className={styles.answerSectionCard}>
                <div className={styles.answerSectionHeader}>
                  <div className={styles.answerTitleRow}>
                    <i className="fa-solid fa-user-check" style={{ color: "#146081", fontSize: "16px" }} />
                    <span className={styles.answerSectionTitle}>あなたの出欠回答</span>
                  </div>
                  {myAnswer && !isPast && (
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

                {!isPast ? (
                  <div className={styles.answerFormContainer}>
                    {!isSchedule ? (
                      <>
                        <div className={styles.statusOptionGrid}>
                          {(data.attendanceStatuses || []).map((st) => {
                            const isSelected = selectedStatus === st.id;
                            let statusColor = "#146081";
                            let iconName = "fa-circle-check";
                            if (st.name.includes("欠席") || st.name.includes("不参加")) {
                              statusColor = "#ef4444";
                              iconName = "fa-circle-xmark";
                            } else if (
                              st.name.includes("遅刻") ||
                              st.name.includes("早退") ||
                              st.name.includes("未定")
                            ) {
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
                    <span className={styles.closedNote}>このイベントは終了しました</span>
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

                {/* 会場予約状況バッジ */}
                {event.isVenueReserved && (
                  <div style={{ marginBottom: "8px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 9px",
                        borderRadius: "6px",
                        background: "#dcfce7",
                        color: "#15803d",
                      }}
                    >
                      <i className="fa-solid fa-check" /> 会場予約・押さえ済み
                    </span>
                  </div>
                )}

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

                {/* 繰り返しID - ※日程調整は除外 */}
                {!isSchedule && (event.isRecurring || event.recurrenceId) && (
                  <div className={styles.infoRow}>
                    <i className={`fa-solid fa-arrows-rotate ${styles.infoIcon}`} style={{ color: "#7e22ce" }} />
                    <div className={styles.infoContent}>
                      <strong>繰り返しID: </strong>
                      <code className={styles.recurrenceIdBadge}>{event.recurrenceId || "未設定"}</code>
                    </div>
                  </div>
                )}

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

                        const groupedBySection: Record<string, typeof targetAnswers> = {};
                        targetAnswers.forEach((ans) => {
                          const user = data.usersMap[ans.uid];
                          const secId = user?.sectionId || "other";
                          if (!groupedBySection[secId]) groupedBySection[secId] = [];
                          groupedBySection[secId].push(ans);
                        });

                        return Object.entries(groupedBySection).map(([secId, sAnswers]) => {
                          const sectionName = data.sectionsMap[secId] || "その他";

                          return (
                            <div key={secId} className={styles.sectionGroup}>
                              <div className={styles.sectionGroupTitle}>
                                <i className="fa-solid fa-tag" style={{ fontSize: "11px" }} />
                                <span>
                                  {sectionName} ({sAnswers.length}名)
                                </span>
                              </div>

                              <div className={styles.userGrid}>
                                {sAnswers.map((ans) => {
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
                  /* 日程調整マトリクス集計 */
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

              {/* 4. セットリスト */}
              {event.setlist && event.setlist.length > 0 && (
                <div className={styles.sectionCard}>
                  <SetlistConfirm
                    setlist={event.setlist}
                    scoresMap={data.scoresMap || {}}
                  />
                </div>
              )}

              {/* 5. 録音・参考音源 */}
              {((data.recordings && data.recordings.length > 0) || event.youtubeUrl) && (
                <div className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>
                      <i className="fa-solid fa-headphones" />
                      <span>音源・参考動画</span>
                    </h3>
                  </div>

                  {event.youtubeUrl && (
                    <div style={{ marginBottom: "12px" }}>
                      <div className={styles.recordingHeader} style={{ marginBottom: "6px" }}>
                        <span className={styles.recordingTitle}>参考音源</span>
                        <a
                          href={event.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.linkBanner}
                          style={{ margin: 0, padding: "3px 8px" }}
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square" /> YouTubeで開く
                        </a>
                      </div>
                      {extractYouTubeId(event.youtubeUrl) && (
                        <div className={styles.youtubeContainer}>
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(event.youtubeUrl)}`}
                            title="参考音源"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {data.recordings && data.recordings.length > 0 && (
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
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* モーダルフッター */}
        <div className={styles.modalFooter}>
          {isFormMode ? (
            <div className={styles.formFooterActions}>
              <div className={styles.footerLeftActions}>
                {mode === "edit" && canManage && (
                  <button
                    type="button"
                    className={styles.btnDeleteForm}
                    onClick={handleDeleteEventClick}
                    title="イベントを削除"
                  >
                    <i className="fa-solid fa-trash-can" />
                    <span>削除</span>
                  </button>
                )}
              </div>
              <div className={styles.footerRightActions}>
                <button
                  type="button"
                  className={styles.btnCancelForm}
                  onClick={() => {
                    if (mode === "edit") {
                      setMode("view");
                    } else {
                      onClose();
                    }
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className={styles.btnSaveForm}
                  onClick={handleSaveEvent}
                  disabled={isSavingEvent}
                >
                  <i className="fa-solid fa-check" />
                  <span>{mode === "create" ? "作成する" : "保存する"}</span>
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className={styles.btnCloseFooter} onClick={onClose}>
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
