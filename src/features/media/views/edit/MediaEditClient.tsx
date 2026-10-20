"use client";

import React, { useState } from "react";
import { EditFormLayout } from "@/components/Layout/EditFormLayout";
import { AppInput } from "@/components/Form/AppInput";
import { FormField } from "@/components/Form/FormField";
import { saveMedia, uploadMediaFile } from "@/features/media/api/media-client-service";
import { rules } from "@/lib/validation";
import { Media } from "@/lib/firestore/types";
import { useAppForm } from "@/hooks/useAppForm";
import { showSpinner, hideSpinner, showDialog } from "@/lib/functions";

type Props = {
  mode: "new" | "edit" | "copy";
  mediaId?: string;
  initialMedia: Media | null;
};

export function MediaEditClient({ mode, mediaId, initialMedia }: Props) {
  const [isUploading, setIsUploading] = useState(false);

  const form = useAppForm(
    {
      date: (initialMedia?.date ?? "").replace(/\./g, "-"),
      title:
        (mode === "copy" ? `${initialMedia?.title}（コピー）` : initialMedia?.title) ??
        "",
      instagramUrl: initialMedia?.instagramUrl ?? "",
      youtubeUrl: initialMedia?.youtubeUrl ?? "",
      driveUrl: initialMedia?.driveUrl ?? "",
      isDispTop: mode === "new" ? false : (initialMedia?.isDispTop ?? false),
    },
    {
      date: [rules.required],
      title: [rules.required],
      instagramUrl: [rules.instagramOptional],
      youtubeUrl: [rules.youtubeOptional],
    }
  );

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  // 音声・動画ファイル直接アップロード処理
  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      showSpinner();
      const downloadUrl = await uploadMediaFile(file, mediaId || "media");
      form.updateField("driveUrl", downloadUrl);
      hideSpinner();
      setIsUploading(false);
      showDialog("音声/動画ファイルのアップロードが完了しました！", true);
    } catch (err: any) {
      hideSpinner();
      setIsUploading(false);
      showDialog(`アップロードに失敗しました: ${err.message}`, true);
    }
  };

  return (
    <EditFormLayout
      featureName="メディア"
        icon="fa-solid fa-photo-film"
        featureIdKey="mediaId"
        basePath="/media"
        dataId={mediaId}
        mode={mode}
        form={form}
        onSaveApi={(data) => saveMedia(mode, data, mediaId)}
      >
        <AppInput label="日付" required type="date" {...inputProps("date")} />
        <AppInput
          label="タイトル"
          required
          placeholder="例: 2026.05.10 練習録音 / 定期演奏会"
          {...inputProps("title")}
        />
        <AppInput
          label="YouTube URL"
          placeholder="https://www.youtube.com/watch?v=..."
          {...inputProps("youtubeUrl")}
        />

        <div style={{ marginBottom: "1rem" }}>
          <FormField
            label="録音 / Google Drive / 音声ファイル"
            error={form.errors.driveUrl}
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
                  accept="audio/*,video/*"
                  onChange={handleMediaFileUpload}
                  disabled={isUploading}
                  id="media-file-input"
                  style={{ display: "none" }}
                />
                <label
                  htmlFor="media-file-input"
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
                  <i className="fa-solid fa-file-audio" />
                  {isUploading ? "アップロード中..." : "録音ファイルを選択してアップロード"}
                </label>
                <span style={{ fontSize: "0.8rem", color: "#666" }}>
                  {form.formData.driveUrl ? "ファイル設定済み" : "未選択"}
                </span>
              </div>

              <input
                type="text"
                className="form-control"
                placeholder="Google DriveのURLや外部ストレージURLを入力"
                value={form.formData.driveUrl}
                onChange={(e) => form.updateField("driveUrl", e.target.value)}
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
          label="Instagram URL"
          placeholder="https://www.instagram.com/p/..."
          {...inputProps("instagramUrl")}
        />

        <AppInput
          label="ホームに表示"
          type="checkbox"
          {...inputProps("isDispTop")}
        />
      </EditFormLayout>
  );
}
