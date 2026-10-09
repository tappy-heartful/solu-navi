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
import { DEFAULT_SECTIONS, DEFAULT_ROLES, DEFAULT_INSTRUMENTS, GRADES } from "@/lib/firestore/constants";
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
    displayName: "",
    kana: "",
    abbreviation: "",
    sectionId: "",
    roleId: "6", // デフォルトはメンバー
    instrumentIds: [],
    grade: "",
    phoneNumber: "",
    paypayId: "",
  });

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
        setFormData({
          displayName: data.displayName || "",
          kana: data.kana || "",
          abbreviation: data.abbreviation || "",
          sectionId: data.sectionId || "",
          roleId: data.roleId || "6",
          instrumentIds: data.instrumentIds || [],
          grade: data.grade || "",
          phoneNumber: data.phoneNumber || "",
          paypayId: data.paypayId || "",
        });
      }
      setLoading(false);
    }

    load();
  }, [targetUid, currentUser?.uid, currentUserData, isInitial, setBreadcrumbs]);

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

    if (!formData.displayName.trim()) {
      errs.displayName = "氏名を入力してください。";
    }
    if (!formData.abbreviation.trim()) {
      errs.abbreviation = "略称（譜割りや出席表で使う短い名前）を入力してください。";
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
    // サックスパート（sectionId === "1"）は PayPay ID 必須
    if (formData.sectionId === "1" && !formData.paypayId.trim()) {
      errs.paypayId = "サックスパートは会計清算の受取用にPayPay IDの入力が必須です。";
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
        displayName: formData.displayName.trim(),
        kana: formData.kana.trim(),
        abbreviation: formData.abbreviation.trim(),
        sectionId: formData.sectionId,
        roleId: formData.roleId,
        instrumentIds: formData.instrumentIds,
        grade: formData.grade,
        phoneNumber: formData.phoneNumber.trim(),
        paypayId: formData.paypayId.trim(),
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

      {/* 氏名 */}
      <FormField
        label="氏名"
        required
        error={errors.displayName}
        description="例: 愛大 太郎（漢字でフルネームを入力）"
      >
        <AppInput
          type="text"
          placeholder="愛大 太郎"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          error={Boolean(errors.displayName)}
        />
      </FormField>

      {/* ふりがな */}
      <FormField
        label="ふりがな"
        description="例: あいだ たろう（ひらがなで入力）"
      >
        <AppInput
          type="text"
          placeholder="あいだ たろう"
          value={formData.kana}
          onChange={(e) => setFormData({ ...formData, kana: e.target.value })}
        />
      </FormField>

      {/* 略称・短縮名 */}
      <FormField
        label="略称 (短縮名)"
        required
        error={errors.abbreviation}
        description="譜割りや出欠表で表示される短い名前（例: タロウ, ヤマダ, TP1）"
      >
        <AppInput
          type="text"
          placeholder="タロウ"
          value={formData.abbreviation}
          onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
          error={Boolean(errors.abbreviation)}
        />
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

      {/* 学年 */}
      <FormField label="学年 / 所属" description="例: 学部2年 (B2)">
        <select
          value={formData.grade}
          onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
          className={styles.select}
        >
          <option value="">選択してください</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </FormField>

      {/* 電話番号 */}
      <FormField
        label="電話番号"
        description="本番や緊急連絡用（例: 090-1234-5678）"
      >
        <AppInput
          type="tel"
          placeholder="090-1234-5678"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
        />
      </FormField>

      {/* PayPay ID */}
      <FormField
        label="PayPay ID"
        required={formData.sectionId === "1"}
        error={errors.paypayId}
        description="会計精算の受取用（※サックスパートは必須）"
      >
        <AppInput
          type="text"
          placeholder="paypay_id_example"
          value={formData.paypayId}
          onChange={(e) => setFormData({ ...formData, paypayId: e.target.value })}
          error={Boolean(errors.paypayId)}
        />
      </FormField>

      <FormFooter
        submitText="保存する"
        onCancel={() => router.back()}
        submitting={submitting}
      />
    </EditFormLayout>
  );
}
