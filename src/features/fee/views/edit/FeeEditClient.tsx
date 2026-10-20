"use client";

import React from "react";
import { EditFormLayout } from "@/components/Layout/EditFormLayout";
import { AppInput } from "@/components/Form/AppInput";
import { saveFee, FeeFormData } from "@/features/fee/api/fee-client-service";
import { rules } from "@/lib/validation";
import { Fee } from "@/lib/firestore/types";
import { useAppForm } from "@/hooks/useAppForm";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  mode: "new" | "edit" | "copy";
  feeId?: string;
  initialFee: Fee | null;
};

export function FeeEditClient({ mode, feeId, initialFee }: Props) {
  const { userData } = useAuth();

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
    <EditFormLayout
      featureName="部費・集金"
        icon="fa-solid fa-coins"
        featureIdKey="feeId"
        basePath="/fee"
        dataId={feeId}
        mode={mode}
        form={form}
        onSaveApi={(data) =>
          saveFee(mode, data as FeeFormData, feeId, userData?.displayName || undefined)
        }
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
      </EditFormLayout>
  );
}
