"use client";

import { BaseLayout } from "@/components/Layout/BaseLayout";
import { EditFormLayout } from "@/components/Layout/EditFormLayout";
import { AppInput } from "@/components/Form/AppInput";
import { FormField } from "@/components/Form/FormField";
import { saveCall } from "@/features/call/api/call-client-service";
import { rules } from "@/lib/validation";
import { Call } from "@/lib/firestore/types";
import { useAppForm } from "@/hooks/useAppForm";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "@/lib/functions";
import styles from "./CallEdit.module.css";

type Props = {
  mode: "new" | "edit" | "copy";
  callId?: string;
  initialCall: Call | null;
};

function getDefaultStartDate() {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return format(d, "yyyy-MM-dd");
}

function getDefaultEndDate() {
  const d = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000);
  return format(d, "yyyy-MM-dd");
}

export function CallEditClient({ mode, callId, initialCall }: Props) {
  const { userData } = useAuth();

  const isNewOrCopy = mode === "new" || mode === "copy";

  const form = useAppForm(
    {
      title: (mode === "copy" ? `${initialCall?.title}（コピー）` : initialCall?.title) ?? "",
      description: initialCall?.description ?? "",
      acceptStartDate: isNewOrCopy
        ? getDefaultStartDate()
        : (initialCall?.acceptStartDate ?? "").replace(/\./g, "-"),
      acceptEndDate: isNewOrCopy
        ? getDefaultEndDate()
        : (initialCall?.acceptEndDate ?? "").replace(/\./g, "-"),
      items: initialCall?.items ?? [""],
      maxSongsPerGenre: initialCall?.maxSongsPerGenre ?? 0,
      isAnonymous: initialCall?.isAnonymous ?? false,
    },
    {
      title: [rules.required],
      description: [rules.required],
      acceptStartDate: [rules.required],
      acceptEndDate: [rules.required],
      items: [
        (v: string[]) => v.filter((i) => i.trim()).length > 0 || "募集ジャンルを1つ以上入力してください",
        (v: string[]) => {
          const valid = v.filter((i) => i.trim());
          return new Set(valid).size === valid.length || "募集ジャンルが重複しています";
        },
      ],
    }
  );

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  const addItem = () => form.updateField("items", [...form.formData.items, ""]);

  const removeItem = (index: number) => {
    const updated = form.formData.items.filter((_, i) => i !== index);
    form.updateField("items", updated.length > 0 ? updated : [""]);
  };

  const updateItem = (index: number, value: string) => {
    form.updateField("items", form.formData.items.map((v, i) => (i === index ? value : v)));
  };

  const handleSave = async (data: typeof form.formData): Promise<string> => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (isNewOrCopy && data.acceptStartDate <= todayStr) {
      throw new Error("validation:開始日は明日以降の日付を指定してください");
    }
    if (data.acceptStartDate > data.acceptEndDate) {
      throw new Error("validation:終了日は開始日以降にしてください");
    }

    return saveCall(mode, data, callId, userData?.displayName || undefined);
  };

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="曲募集"
        icon="fa-solid fa-bullhorn"
        featureIdKey="callId"
        basePath="/call"
        dataId={callId}
        mode={mode}
        form={form}
        onSaveApi={handleSave}
      >
        <FormField label="曲募集名" required error={form.errors.title}>
          <AppInput
            {...inputProps("title")}
            placeholder="例: 第25回定期演奏会 選曲募集"
          />
        </FormField>

        <FormField label="説明" required error={form.errors.description}>
          <textarea
            value={form.formData.description}
            onChange={(e) => form.updateField("description", e.target.value)}
            placeholder="募集の趣旨や注意事項を入力してください"
            rows={4}
            className={styles.textarea}
          />
        </FormField>

        <FormField label="受付期間（開始）" required error={form.errors.acceptStartDate}>
          <AppInput
            {...inputProps("acceptStartDate")}
            type="date"
          />
        </FormField>

        <FormField label="受付期間（終了）" required error={form.errors.acceptEndDate}>
          <AppInput
            {...inputProps("acceptEndDate")}
            type="date"
          />
        </FormField>

        <FormField label="募集ジャンル" required error={form.errors.items as string}>
          <div className={styles.itemList}>
            {form.formData.items.map((item, index) => (
              <div key={index} className={styles.itemRow}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  placeholder={`ジャンル ${index + 1} (例: Swing, Latin, Ballad)`}
                  className={styles.itemInput}
                />
                {form.formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className={styles.removeBtn}
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addItem} className={styles.addBtn}>
              ＋ ジャンルを追加
            </button>
          </div>
        </FormField>

        <FormField label="1人あたりの上限曲数 (0で無制限)">
          <AppInput
            {...inputProps("maxSongsPerGenre")}
            type="number"
            min={0}
          />
        </FormField>

        <FormField label="匿名回答にする">
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.formData.isAnonymous}
              onChange={(e) => form.updateField("isAnonymous", e.target.checked)}
              className={styles.checkbox}
            />
            <span>回答者名を他のメンバーに非公開にする（管理者のみ閲覧可能）</span>
          </label>
        </FormField>
      </EditFormLayout>
    </BaseLayout>
  );
}
