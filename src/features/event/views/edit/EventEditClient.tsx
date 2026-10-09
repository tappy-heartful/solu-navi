"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faPlus, faTrash, faClock } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { FormButtons } from "@/components/Form/FormButtons";
import { FormFooter } from "@/components/Form/FormFooter";
import {
  Event,
  Score,
  Section,
  Instrument,
  SetlistGroup,
  InstrumentPart,
  Prefecture,
  Municipality,
} from "@/lib/firestore/types";
import { addEvent, updateEvent } from "@/features/event/api/event-client-service";
import {
  showDialog,
  showSpinner,
  hideSpinner,
  dotDateToHyphen,
  hyphenDateToDot,
  format,
  writeLog,
} from "@/lib/functions";
import { SetlistEdit } from "@/components/Setlist/SetlistEdit";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./EventEdit.module.css";

type Props = {
  mode: "new" | "edit" | "copy";
  eventId?: string;
  initialEvent?: Event | null;
  initialType?: "schedule" | "attendance";
  scores: Score[];
  sections: Section[];
  instruments: Instrument[];
  prefectures: Prefecture[];
  initialDate?: string;
};

type InstrumentPartState = {
  partName: string;
  instrumentId: string;
};

function defaultDates() {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

export function EventEditClient({
  mode,
  eventId,
  initialEvent,
  initialType = "attendance",
  scores,
  sections,
  instruments,
  prefectures,
  initialDate,
}: Props) {
  const router = useRouter();
  const { userData, isAdmin, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const isEdit = mode === "edit";
  const { start: defaultStart, end: defaultEnd } = defaultDates();

  const [attendanceType, setAttendanceType] = useState<"schedule" | "attendance">(
    initialEvent?.attendanceType || initialType
  );
  const [date, setDate] = useState(dotDateToHyphen(initialEvent?.date || initialDate || ""));
  const [candidateDates, setCandidateDates] = useState<string[]>(
    initialEvent?.candidateDates?.map(dotDateToHyphen) || [""]
  );
  const [acceptStartDate, setAcceptStartDate] = useState(
    isEdit ? dotDateToHyphen(initialEvent?.acceptStartDate || "") : defaultStart
  );
  const [acceptEndDate, setAcceptEndDate] = useState(
    isEdit ? dotDateToHyphen(initialEvent?.acceptEndDate || "") : defaultEnd
  );
  const [title, setTitle] = useState(
    (initialEvent?.title || "") + (mode === "copy" ? "（コピー）" : "")
  );
  const [prefectureId, setPrefectureId] = useState(initialEvent?.prefectureId || "");
  const [municipalityId, setMunicipalityId] = useState(initialEvent?.municipalityId || "");
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [placeName, setPlaceName] = useState(initialEvent?.placeName || "");
  const [website, setWebsite] = useState(initialEvent?.website || "");
  const [access, setAccess] = useState(initialEvent?.access || "");
  const [googleMap, setGoogleMap] = useState(initialEvent?.googleMap || "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialEvent?.youtubeUrl || "");
  const [rentTimeRanges, setRentTimeRanges] = useState<{ startTime: string; endTime: string }[]>(
    initialEvent?.rentTimeRanges || []
  );
  const [schedule, setSchedule] = useState(initialEvent?.schedule || "");
  const [dress, setDress] = useState(initialEvent?.dress || "");
  const [bring, setBring] = useState(initialEvent?.bring || "");
  const [rent, setRent] = useState(initialEvent?.rent || "");
  const [other, setOther] = useState(initialEvent?.other || "");
  const [allowAssign, setAllowAssign] = useState(initialEvent?.allowAssign ?? false);
  const [isVenueReserved, setIsVenueReserved] = useState(initialEvent?.isVenueReserved ?? false);

  const [setlist, setSetlist] = useState<SetlistGroup[]>(initialEvent?.setlist || []);
  const [instrumentConfig, setInstrumentConfig] = useState<Record<string, InstrumentPartState[]>>(() => {
    if (initialEvent?.instrumentConfig) {
      const res: Record<string, InstrumentPartState[]> = {};
      for (const [secId, parts] of Object.entries(initialEvent.instrumentConfig)) {
        res[secId] = parts.map((p) => ({
          partName: p.partName,
          instrumentId: p.instrumentId || "",
        }));
      }
      return res;
    }
    return {};
  });

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => router.push("/event"));
      return;
    }

    const paths: { label: string; href?: string }[] = [{ label: "ホーム", href: "/" }, { label: "イベント一覧", href: "/event" }];
    if (isEdit || mode === "copy") {
      paths.push({ label: "イベント確認", href: `/event/confirm?eventId=${eventId}` });
      paths.push({ label: isEdit ? "イベント編集" : "イベント新規作成(コピー)" });
    } else {
      paths.push({ label: "イベント新規作成" });
    }
    setBreadcrumbs(paths);
  }, [isAdmin, loading, isEdit, mode, eventId, setBreadcrumbs, router]);

  // 都道府県変更時に市区町村を取得
  useEffect(() => {
    if (!prefectureId) {
      setMunicipalities([]);
      return;
    }
    const loadMun = async () => {
      const snap = await getDocs(
        query(collection(db, "municipalities"), where("prefectureCode", "==", prefectureId))
      );
      const list = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Municipality[];
      setMunicipalities(list);
    };
    loadMun().catch(console.error);
  }, [prefectureId]);

  const addCandidateDate = () => setCandidateDates((prev) => [...prev, ""]);
  const removeCandidateDate = (idx: number) =>
    setCandidateDates((prev) => prev.filter((_, i) => i !== idx));
  const updateCandidateDate = (idx: number, val: string) =>
    setCandidateDates((prev) => prev.map((d, i) => (i === idx ? val : d)));

  const addRentTimeRange = () =>
    setRentTimeRanges((prev) => [...prev, { startTime: "", endTime: "" }]);
  const removeRentTimeRange = (idx: number) =>
    setRentTimeRanges((prev) => prev.filter((_, i) => i !== idx));
  const updateRentTimeRange = (idx: number, field: "startTime" | "endTime", val: string) =>
    setRentTimeRanges((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    );

  const addPartToSection = (sectionId: string) => {
    setInstrumentConfig((prev) => {
      const current = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: [...current, { partName: "", instrumentId: "" }],
      };
    });
  };

  const removePartFromSection = (sectionId: string, partIdx: number) => {
    setInstrumentConfig((prev) => {
      const current = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: current.filter((_, i) => i !== partIdx),
      };
    });
  };

  const updatePart = (
    sectionId: string,
    partIdx: number,
    field: "partName" | "instrumentId",
    val: string
  ) => {
    setInstrumentConfig((prev) => {
      const current = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: current.map((p, i) => (i === partIdx ? { ...p, [field]: val } : p)),
      };
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      await showDialog("イベント名を入力してください", true);
      return;
    }

    if (attendanceType === "attendance" && !date) {
      await showDialog("イベント日を入力してください", true);
      return;
    }

    if (attendanceType === "schedule") {
      const validDates = candidateDates.filter((d) => d.trim() !== "");
      if (validDates.length === 0) {
        await showDialog("候補日程を1つ以上入力してください", true);
        return;
      }
    }

    if (!acceptStartDate || !acceptEndDate) {
      await showDialog("受付期間を入力してください", true);
      return;
    }

    if (acceptStartDate > acceptEndDate) {
      await showDialog("受付終了日は開始日以降にしてください", true);
      return;
    }

    const confirmed = await showDialog("イベントを保存しますか？");
    if (!confirmed) return;

    showSpinner();
    try {
      const cleanedConfig: Record<string, InstrumentPart[]> = {};
      for (const [secId, parts] of Object.entries(instrumentConfig)) {
        const validParts = parts
          .filter((p) => p.partName.trim() !== "")
          .map((p) => ({
            partName: p.partName.trim(),
            instrumentId: p.instrumentId || undefined,
          }));
        if (validParts.length > 0) {
          cleanedConfig[secId] = validParts;
        }
      }

      const payload: Partial<Event> = {
        title,
        attendanceType,
        date: attendanceType === "attendance" ? hyphenDateToDot(date) : undefined,
        candidateDates:
          attendanceType === "schedule"
            ? candidateDates.filter((d) => d.trim() !== "").map(hyphenDateToDot)
            : undefined,
        acceptStartDate: hyphenDateToDot(acceptStartDate),
        acceptEndDate: hyphenDateToDot(acceptEndDate),
        placeName,
        prefectureId,
        municipalityId,
        website,
        access,
        googleMap,
        youtubeUrl,
        rentTimeRanges: rentTimeRanges.filter((r) => r.startTime && r.endTime),
        schedule,
        dress,
        bring,
        rent,
        other,
        allowAssign,
        isVenueReserved,
        setlist,
        instrumentConfig: cleanedConfig,
      };

      let newId = eventId;
      if (isEdit && eventId) {
        await updateEvent(eventId, payload);
      } else {
        payload.createdBy = userData?.displayName || "";
        newId = await addEvent(payload as Omit<Event, "id">);
      }

      hideSpinner();
      await writeLog({
        dataId: newId || "event",
        action: `イベント${isEdit ? "更新" : "登録"}`,
      });
      await showDialog("保存しました", true);

      router.refresh();
      showSpinner();
      router.push(`/event/confirm?eventId=${newId}`);
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId: eventId || "event",
        action: `イベント${isEdit ? "更新" : "登録"}`,
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  if (loading || !isAdmin) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>権限を確認中...</div>;
  }

  return (
    <BaseLayout>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faCalendarDays} className={styles.headerIcon} />
            <span>
              {isEdit ? "イベント編集" : mode === "copy" ? "イベント新規作成(コピー)" : "イベント新規作成"}
            </span>
          </h1>
        </div>

        <div className={styles.card}>
          {/* 種別 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>イベント種別</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="attendanceType"
                  checked={attendanceType === "attendance"}
                  onChange={() => setAttendanceType("attendance")}
                  className={styles.radio}
                />
                <span>出欠確認（日程確定イベント）</span>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="attendanceType"
                  checked={attendanceType === "schedule"}
                  onChange={() => setAttendanceType("schedule")}
                  className={styles.radio}
                />
                <span>日程調整（複数候補日から調整）</span>
              </label>
            </div>
          </div>

          {/* イベント名 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              イベント名 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="例: 定期練習、合宿、学祭ライブ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 日付 / 候補日 */}
          {attendanceType === "attendance" ? (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                イベント日 <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                className={styles.input}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          ) : (
            <div className={styles.formGroup}>
              <label className={styles.label}>
                候補日程 <span className={styles.required}>*</span>
              </label>
              <div className={styles.candidateDatesList}>
                {candidateDates.map((d, idx) => (
                  <div key={idx} className={styles.candidateDateRow}>
                    <input
                      type="date"
                      className={styles.input}
                      value={d}
                      onChange={(e) => updateCandidateDate(idx, e.target.value)}
                    />
                    {candidateDates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCandidateDate(idx)}
                        className={styles.removeBtn}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addCandidateDate} className={styles.addBtn}>
                  <FontAwesomeIcon icon={faPlus} />
                  <span>候補日を追加</span>
                </button>
              </div>
            </div>
          )}

          {/* 受付期間 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              受付期間 <span className={styles.required}>*</span>
            </label>
            <div className={styles.dateRow}>
              <input
                type="date"
                className={styles.input}
                value={acceptStartDate}
                onChange={(e) => setAcceptStartDate(e.target.value)}
              />
              <span>～</span>
              <input
                type="date"
                className={styles.input}
                value={acceptEndDate}
                onChange={(e) => setAcceptEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* 開催地 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>開催場所・都道府県</label>
            <div className={styles.locationRow}>
              <select
                className={styles.select}
                value={prefectureId}
                onChange={(e) => {
                  setPrefectureId(e.target.value);
                  setMunicipalityId("");
                }}
              >
                <option value="">都道府県を選択</option>
                {prefectures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                className={styles.select}
                value={municipalityId}
                onChange={(e) => setMunicipalityId(e.target.value)}
                disabled={!prefectureId}
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

          <div className={styles.formGroup}>
            <label className={styles.label}>会場名・部屋名</label>
            <input
              type="text"
              className={styles.input}
              placeholder="例: 愛媛大学 課外活動棟 3F 音楽室"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>会場URL</label>
            <input
              type="url"
              className={styles.input}
              placeholder="https://..."
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Google Map リンク</label>
            <input
              type="url"
              className={styles.input}
              placeholder="https://maps.google.com/..."
              value={googleMap}
              onChange={(e) => setGoogleMap(e.target.value)}
            />
          </div>

          {/* タイムスケジュール・持ち物等 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>タイムスケジュール・当日の予定</label>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="例: 13:00 集合・セッティング / 14:00 合奏開始 / 17:00 完全撤収"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>衣装・服装</label>
            <input
              type="text"
              className={styles.input}
              placeholder="例: 黒スーツ、私服OKなど"
              value={dress}
              onChange={(e) => setDress(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>持ち物</label>
            <input
              type="text"
              className={styles.input}
              placeholder="例: 譜面、ミュート、筆記用具"
              value={bring}
              onChange={(e) => setBring(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>会場費・部費・参加費</label>
            <input
              type="text"
              className={styles.input}
              placeholder="例: 500円（当日徴収）"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>備考・特記事項</label>
            <textarea
              className={styles.textarea}
              rows={3}
              placeholder="遅刻・早退連絡やその他共有事項"
              value={other}
              onChange={(e) => setOther(e.target.value)}
            />
          </div>

          {/* 譜割り設定の許可 */}
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={allowAssign}
                onChange={(e) => setAllowAssign(e.target.checked)}
                className={styles.checkbox}
              />
              <span>譜割り（担当パート分け）機能を有効にする</span>
            </label>
          </div>

          {/* セットリスト編集 */}
          <div className={styles.formGroup}>
            <label className={styles.sectionTitleLabel}>セットリスト設定</label>
            <SetlistEdit setlist={setlist} scores={scores} onChange={setSetlist} />
          </div>

          <FormButtons mode={mode} onSave={handleSave} onClear={() => {}} />
        </div>

        <div className={styles.footer}>
          <FormFooter
            backHref={isEdit || mode === "copy" ? `/event/confirm?eventId=${eventId}` : "/event"}
            backText={isEdit || mode === "copy" ? "イベント確認に戻る" : "イベント一覧に戻る"}
          />
        </div>
      </div>
    </BaseLayout>
  );
}
