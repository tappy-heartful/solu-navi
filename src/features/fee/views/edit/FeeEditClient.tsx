"use client";

import React, { useState, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCoins,
  faUsers,
  faUserGear,
} from "@fortawesome/free-solid-svg-icons";
import { EditFormLayout } from "@/components/Layout/EditFormLayout";
import { AppInput } from "@/components/Form/AppInput";
import { saveFee, FeeFormData } from "@/features/fee/api/fee-client-service";
import { rules } from "@/lib/validation";
import { Fee, User } from "@/lib/firestore/types";
import { useAppForm } from "@/hooks/useAppForm";
import { useAuth } from "@/contexts/AuthContext";
import { FeeTargetUsersModal } from "@/features/fee/components/FeeTargetUsersModal";
import { getGradeFromEnrollmentYear } from "@/lib/functions";
import styles from "./FeeEditClient.module.css";

type Props = {
  mode: "new" | "edit" | "copy";
  feeId?: string;
  initialFee: Fee | null;
  users?: User[];
};

export function FeeEditClient({ mode, feeId, initialFee, users = [] }: Props) {
  const { userData } = useAuth();

  // 対象部員UID配列の初期値（新規作成・未設定時は現在 1, 2, 3回生の現役生部員をデフォルトとする）
  const allUserUids = useMemo(
    () => users.map((u) => u.uid || u.id).filter(Boolean) as string[],
    [users]
  );

  const initialTargetUids = useMemo(() => {
    if (initialFee?.targetUserIds && initialFee.targetUserIds.length > 0) {
      return initialFee.targetUserIds;
    }

    // 新規作成時または未設定時は、1回生・2回生・3回生（現役生）をデフォルト選択
    const currentStudentUids = users
      .filter((u) => {
        if (!u.enrollmentYear) return false;
        const grade = getGradeFromEnrollmentYear(u.enrollmentYear);
        return grade === "1回生" || grade === "2回生" || grade === "3回生" || grade === "新入生";
      })
      .map((u) => u.uid || u.id)
      .filter(Boolean) as string[];

    return currentStudentUids.length > 0 ? currentStudentUids : allUserUids;
  }, [initialFee?.targetUserIds, users, allUserUids]);

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initialTargetUids);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const form = useAppForm(
    {
      title:
        (mode === "copy" ? `${initialFee?.title}（コピー）` : initialFee?.title) ?? "",
      amount: initialFee?.amount ?? 2000,
      dueDate: (initialFee?.dueDate ?? "").replace(/\./g, "-"),
      description: initialFee?.description ?? "",
    },
    {
      title: [rules.required],
      dueDate: [rules.required],
    }
  );

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  return (
    <>
      <EditFormLayout
        featureName="部費・集金"
        icon={<FontAwesomeIcon icon={faCoins} />}
        featureIdKey="feeId"
        basePath="/fee"
        dataId={feeId}
        mode={mode}
        form={form}
        onSaveApi={(data) => {
          const payload: FeeFormData = {
            ...(data as FeeFormData),
            targetUserIds: selectedUserIds,
          };
          return saveFee(mode, payload, feeId, userData?.displayName || undefined);
        }}
      >
        <AppInput
          label="タイトル"
          required
          placeholder="例: 2026年5月度 部費 / 夏合宿集金"
          {...inputProps("title")}
        />
        <AppInput
          label="金額 (円)"
          required
          type="number"
          placeholder="例: 2000"
          {...inputProps("amount")}
        />
        <AppInput
          label="支払期日"
          required
          type="date"
          {...inputProps("dueDate")}
        />
        <AppInput
          label="案内・備考"
          type="textarea"
          placeholder="振込口座やPayPay ID、手渡しの集金場所などがあれば入力してください"
          {...inputProps("description")}
        />

        {/* 集金対象者設定エリア（モーダル起動ボタン） */}
        <div className={styles.targetSection}>
          <label className={styles.targetLabel}>集金対象者</label>
          <div className={styles.targetRow}>
            <div className={styles.targetCountInfo}>
              <span className={styles.targetBadge}>
                <FontAwesomeIcon icon={faUsers} />
                {selectedUserIds.length} / {users.length}名 選択中
              </span>
              <span className={styles.targetHint}>
                {selectedUserIds.length === users.length
                  ? "（全員が対象）"
                  : selectedUserIds.length === 0
                  ? "（対象者未選択）"
                  : "（一部の部員が対象）"}
              </span>
            </div>

            <button
              type="button"
              className={styles.openModalBtn}
              onClick={() => setIsModalOpen(true)}
            >
              <FontAwesomeIcon icon={faUserGear} />
              集金対象者を設定する
            </button>
          </div>
        </div>
      </EditFormLayout>

      {/* 対象者設定モーダル */}
      <FeeTargetUsersModal
        isOpen={isModalOpen}
        initialTargetUserIds={selectedUserIds}
        users={users}
        onClose={() => setIsModalOpen(false)}
        onSave={(newIds) => setSelectedUserIds(newIds)}
      />
    </>
  );
}
