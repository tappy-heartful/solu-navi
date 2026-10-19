"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FormField } from "@/components/Form/FormField";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { EditFormLayout } from "@/components/Layout/EditFormLayout";
import { GenreInput } from "../../components/GenreInput";
import { AppInput } from "@/components/Form/AppInput";
import { saveScore, uploadScorePdf } from "@/features/score/api/score-client-service";
import { rules } from "@/lib/validation";
import { Genre, Score } from "@/lib/firestore/types";
import { useAppForm } from "@/hooks/useAppForm";
import { showSpinner, hideSpinner, showDialog } from "@/lib/functions";

type Props = {
  mode: "new" | "edit" | "copy";
  scoreId?: string;
  initialScore: Score | null;
  allGenres: Genre[];
};

export function ScoreEditClient({ mode, scoreId, initialScore, allGenres }: Props) {
  const { userData } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  // 1. 初期値とバリデーション
  const form = useAppForm(
    {
      title:
        (mode === "copy" ? `${initialScore?.title}（コピー）` : initialScore?.title) || "",
      scoreUrl: initialScore?.scoreUrl || "",
      referenceTrack: initialScore?.referenceTrack || "",
      genres: (initialScore?.genres as string[]) || [""],
      abbreviation: initialScore?.abbreviation || "",
      note: initialScore?.note || "",
      isDispTop: mode === "new" ? true : (initialScore?.isDispTop ?? false),
    },
    {
      title: [rules.required],
      scoreUrl: [rules.required],
      referenceTrack: [rules.required, rules.youtube],
      abbreviation: [rules.required, rules.max8],
      genres: [(v) => (v && v[0] ? true : "ジャンルを最低1つ選択してください")],
    }
  );

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  // PDFファイルアップロード処理
  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showDialog("PDFファイルを選択してください。", true);
      return;
    }

    try {
      setIsUploading(true);
      showSpinner();
      const downloadUrl = await uploadScorePdf(file, scoreId || "score");
      form.updateField("scoreUrl", downloadUrl);
      hideSpinner();
      setIsUploading(false);
      showDialog("PDFのアップロードが完了しました！", true);
    } catch (err: any) {
      hideSpinner();
      setIsUploading(false);
      showDialog(`アップロードに失敗しました: ${err.message}`, true);
    }
  };

  return (
    <BaseLayout>
      <EditFormLayout
        featureName="譜面"
        icon="fa-solid fa-music"
        featureIdKey="scoreId"
        basePath="/score"
        dataId={scoreId}
        mode={mode}
        form={form}
        onSaveApi={(data) =>
          saveScore(mode, data, scoreId, userData?.displayName || undefined)
        }
      >
        <AppInput
          label="タイトル"
          required
          placeholder="例: Sing, Sing, Sing"
          {...inputProps("title")}
        />

        <div style={{ marginBottom: "1rem" }}>
          <FormField
            label="譜面（PDFファイルまたはURL）"
            required
            error={form.errors.scoreUrl}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  border: "2px dashed #b0bec5",
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                }}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfFileChange}
                  disabled={isUploading}
                  id="score-pdf-input"
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="score-pdf-input"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    backgroundColor: "var(--primary-color, #146081)",
                    color: "#fff",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: isUploading ? "not-allowed" : "pointer",
                  }}
                >
                  <i className="fa-solid fa-cloud-arrow-up" />
                  {isUploading ? "アップロード中..." : "PDFファイルを選択してアップロード"}
                </label>
                <span style={{ fontSize: "0.8rem", color: "#666" }}>
                  {form.formData.scoreUrl ? "アップロード済み または URL設定中" : "未選択"}
                </span>
              </div>

              <input
                type="text"
                className="form-control"
                placeholder="Google Drive URLまたは外部PDFのURLを入力"
                value={form.formData.scoreUrl}
                onChange={(e) => form.updateField("scoreUrl", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  fontSize: "0.9rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </FormField>
        </div>

        <AppInput
          label="参考音源（YouTube URL）"
          required
          placeholder="https://www.youtube.com/..."
          {...inputProps("referenceTrack")}
        />

        <FormField label="ジャンル" required error={form.errors.genres}>
          <GenreInput
            genres={form.formData.genres}
            allGenres={allGenres}
            onChange={(val) => form.updateField("genres", val)}
          />
        </FormField>

        <AppInput
          label="略称(譜割用)"
          required
          placeholder="例: SSS (8文字以内)"
          {...inputProps("abbreviation")}
        />

        <AppInput
          label="備考"
          type="textarea"
          placeholder="演奏上の注意点や備考があれば入力してください"
          {...inputProps("note")}
        />

        <AppInput
          label="ホームに表示"
          type="checkbox"
          {...inputProps("isDispTop")}
        />
      </EditFormLayout>
    </BaseLayout>
  );
}
