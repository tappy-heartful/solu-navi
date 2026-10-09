"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPen, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { EditFormLayout } from "@/components/Layout/EditFormLayout";
import { FormField } from "@/components/Form/FormField";
import { AppInput } from "@/components/Form/AppInput";
import { FormFooter } from "@/components/Form/FormFooter";
import { showSpinner, hideSpinner } from "@/components/Common/Spinner";
import { showDialog } from "@/components/Common/CommonDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { fetchUserById, updateUserProfile } from "../api/user-client-service";
import { DEFAULT_SECTIONS, DEFAULT_ROLES, DEFAULT_INSTRUMENTS } from "@/lib/firestore/constants";
import { getEnrollmentYearOptions, getGradeFromEnrollmentYear } from "@/lib/functions";
import { UserFormData } from "../types";
import styles from "./UserEditClient.module.css";

export function UserEditClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryUid = searchParams.get("uid");
  const isInitial = searchParams.get("initial") === "1";

  const { user: currentUser, userData: currentUserData, isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const targetUid = (isAdmin && queryUid) ? queryUid : currentUser?.uid;

  const [formData, setFormData] = useState<UserFormData>({
    abbreviation: "",
    sectionId: "",
    roleId: "4", // デフォルトはメンバー (🎵メンバー)
    instrumentIds: [],
    enrollmentYear: "",
  });

  const [isOtherYear, setIsOtherYear] = useState(false);
  const [customYearInput, setCustomYearInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "部員名簿", href: "/user" },
      { label: isInitial ? "初期プロフィール登録" : "プロフィール編集" },
    ]);

    async function load() {
      if (!targetUid) {
        setLoading(false);
        return;
      }

      let data = currentUserData;
      if (targetUid !== currentUser?.uid || !data) {
        data = await fetchUserById(targetUid);
      }

      if (data) {
        const yr = data.enrollmentYear;
        const opts = getEnrollmentYearOptions();
        const isStandard = yr ? opts.some((opt) => opt.year === yr) : false;
        if (yr && !isStandard) {
          setIsOtherYear(true);
          setCustomYearInput(String(yr));
        } else {
          setIsOtherYear(false);
          setCustomYearInput("");
        }

        setFormData({
          abbreviation: data.abbreviation || "",
          sectionId: data.sectionId || "",
          roleId: data.roleId || "4",
          instrumentIds: data.instrumentIds || [],
          enrollmentYear: data.enrollmentYear ?? "",
        });
      }
      setLoading(false);
    }

    load();
  }, [targetUid, currentUser?.uid, currentUserData, isInitial, setBreadcrumbs]);

  const handleEnrollmentSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "other") {
      setIsOtherYear(true);
      if (customYearInput.trim()) {
        const parsed = parseInt(customYearInput.trim(), 10);
        setFormData((prev) => ({
          ...prev,
          enrollmentYear: isNaN(parsed) ? "" : parsed,
        }));
      } else {
        setFormData((prev) => ({ ...prev, enrollmentYear: "" }));
      }
    } else if (val === "") {
      setIsOtherYear(false);
      setCustomYearInput("");
      setFormData((prev) => ({ ...prev, enrollmentYear: "" }));
    } else {
      setIsOtherYear(false);
      setCustomYearInput("");
      setFormData((prev) => ({ ...prev, enrollmentYear: Number(val) }));
    }
  };

  const handleCustomYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomYearInput(val);
    const parsed = parseInt(val.trim(), 10);
    setFormData((prev) => ({
      ...prev,
      enrollmentYear: isNaN(parsed) ? "" : parsed,
    }));
  };

  // 担当楽器のトグル
  const handleToggleInstrument = (instId: string) => {
    setFormData((prev) => {
      const exists = prev.instrumentIds.includes(instId);
      const next = exists
        ? prev.instrumentIds.filter((id) => id !== instId)
        : [...prev.instrumentIds, instId];
      return { ...prev, instrumentIds: next };
    });
  };

  // バリデーション
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.abbreviation.trim()) {
      errs.abbreviation = "略称（サークル内での呼び名）を入力してください。";
    }
    if (!formData.sectionId) {
      errs.sectionId = "所属パートを選択してください。";
    }
    if (!formData.roleId) {
      errs.roleId = "役職を選択してください。";
    }
    if (formData.instrumentIds.length === 0) {
      errs.instrumentIds = "担当楽器を1つ以上選択してください。";
    }
    if (!formData.enrollmentYear) {
      errs.enrollmentYear = "入学年度を選択または直接入力してください。";
    } else {
      const yearNum = Number(formData.enrollmentYear);
      const currentYear = new Date().getFullYear();
      if (isNaN(yearNum) || yearNum < 1950 || yearNum > currentYear + 1) {
        errs.enrollmentYear = `正しい入学年度（1950年〜${currentYear + 1}年）を入力してください。`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUid) return;

    if (!validate()) {
      await showDialog({
        title: "入力エラー",
        message: "必須項目を確認してください。",
        type: "danger",
      });
      return;
    }

    try {
      setSubmitting(true);
      showSpinner("プロフィールを保存しています...");

      await updateUserProfile(targetUid, {
        displayName: formData.abbreviation.trim(),
        abbreviation: formData.abbreviation.trim(),
        sectionId: formData.sectionId,
        roleId: formData.roleId,
        instrumentIds: formData.instrumentIds,
        enrollmentYear: formData.enrollmentYear === "" ? undefined : Number(formData.enrollmentYear),
      });

      hideSpinner();
      await showDialog({
        title: "完了",
        message: "プロフィールを保存しました。",
        type: "success",
      });

      router.push(`/user/detail?uid=${targetUid}`);
    } catch (err: unknown) {
      hideSpinner();
      console.error("Save profile error:", err);
      await showDialog({
        title: "エラー",
        message: "プロフィールの更新に失敗しました。",
        type: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <EditFormLayout title="プロフィール編集" onSubmit={() => {}}>
        <div className={styles.loading}>読み込み中...</div>
      </EditFormLayout>
    );
  }

  // 選択されたパートに属する楽器を上位に表示
  const relevantInstruments = DEFAULT_INSTRUMENTS.filter(
    (i) => !formData.sectionId || i.sectionId === formData.sectionId
  );
  const otherInstruments = DEFAULT_INSTRUMENTS.filter(
    (i) => formData.sectionId && i.sectionId !== formData.sectionId
  );

  const enrollmentOptions = getEnrollmentYearOptions();

  return (
    <EditFormLayout
      title={isInitial ? "初回プロフィール登録" : "プロフィール編集"}
      icon={<FontAwesomeIcon icon={faUserPen} />}
      onSubmit={handleSubmit}
    >
      {isInitial && (
        <div className={styles.noticeAlert}>
          <FontAwesomeIcon icon={faInfoCircle} className={styles.alertIcon} />
          <div>
            <strong>ようこそ Sound Solition Orchestra へ！</strong>
            <p>
              円滑な活動と出欠・譜割り管理のため、初回プロフィールの登録をお願いします。
            </p>
          </div>
        </div>
      )}

      {/* 略称・呼び名 */}
      <FormField
        label="略称 (呼び名)"
        required
        error={errors.abbreviation}
        description="譜割りや出欠表、部内で呼び合う名前（例: タロウ, ヤマダ, TP1）"
      >
        <AppInput
          type="text"
          placeholder="例: タロウ（タップして入力）"
          value={formData.abbreviation}
          onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
          error={Boolean(errors.abbreviation)}
        />
      </FormField>

      {/* 役職選択 */}
      <FormField
        label="役職"
        required
        error={errors.roleId}
        description="サークル内での役職を選択してください"
      >
        <select
          value={formData.roleId}
          onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
          className={styles.select}
        >
          {DEFAULT_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} {r.description ? `(${r.description})` : ""}
            </option>
          ))}
        </select>
      </FormField>

      {/* パート選択 */}
      <FormField
        label="所属パート"
        required
        error={errors.sectionId}
        description="メインで所属しているセクションを選択してください"
      >
        <div className={styles.radioGrid}>
          {DEFAULT_SECTIONS.map((sec) => (
            <label
              key={sec.id}
              className={`${styles.radioCard} ${formData.sectionId === sec.id ? styles.radioSelected : ""}`}
            >
              <input
                type="radio"
                name="sectionId"
                value={sec.id}
                checked={formData.sectionId === sec.id}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                className={styles.hiddenRadio}
              />
              <span
                className={styles.colorDot}
                style={{ backgroundColor: sec.color || "#3b82f6" }}
              />
              <span className={styles.radioLabel}>{sec.name}</span>
            </label>
          ))}
        </div>
      </FormField>

      {/* 担当楽器 (複数選択) */}
      <FormField
        label="担当楽器 (複数選択可)"
        required
        error={errors.instrumentIds}
        description="演奏を担当する楽器をタップして選択してください"
      >
        <div className={styles.chipGrid}>
          {relevantInstruments.map((inst) => {
            const isSelected = formData.instrumentIds.includes(inst.id);
            return (
              <button
                key={inst.id}
                type="button"
                className={`${styles.chip} ${isSelected ? styles.chipSelected : ""}`}
                onClick={() => handleToggleInstrument(inst.id)}
              >
                {inst.name}
              </button>
            );
          })}
        </div>

        {otherInstruments.length > 0 && (
          <details className={styles.otherInstDetails}>
            <summary className={styles.otherInstSummary}>その他のパートの楽器を展開</summary>
            <div className={styles.chipGrid} style={{ marginTop: "0.5rem" }}>
              {otherInstruments.map((inst) => {
                const isSelected = formData.instrumentIds.includes(inst.id);
                return (
                  <button
                    key={inst.id}
                    type="button"
                    className={`${styles.chip} ${isSelected ? styles.chipSelected : ""}`}
                    onClick={() => handleToggleInstrument(inst.id)}
                  >
                    {inst.name}
                  </button>
                );
              })}
            </div>
          </details>
        )}
      </FormField>

      {/* 入学年度 */}
      <FormField
        label="入学年度"
        required
        error={errors.enrollmentYear}
        description="入学年度を選択してください（4回生まで選択可。それ以前のOB/OGは「その他」から直接入力）"
      >
        <select
          value={isOtherYear ? "other" : (formData.enrollmentYear || "")}
          onChange={handleEnrollmentSelectChange}
          className={styles.select}
        >
          <option value="">選択してください</option>
          {enrollmentOptions.map((opt) => (
            <option key={opt.year} value={opt.year}>
              {opt.label}
            </option>
          ))}
          <option value="other">その他 (OB/OG・入学年度を直接入力)</option>
        </select>

        {isOtherYear && (
          <div className={styles.customYearContainer}>
            <AppInput
              type="number"
              placeholder="入学年度を西暦で入力 (例: 2020)"
              value={customYearInput}
              onChange={handleCustomYearChange}
              min={1950}
              max={new Date().getFullYear() + 1}
            />
            {Boolean(formData.enrollmentYear) && (
              <div className={styles.gradePreview}>
                判定: {getGradeFromEnrollmentYear(Number(formData.enrollmentYear))} ({formData.enrollmentYear}年度入学)
              </div>
            )}
          </div>
        )}
      </FormField>

      <FormFooter
        submitText="保存する"
        onCancel={() => router.back()}
        submitting={submitting}
      />
    </EditFormLayout>
  );
}
