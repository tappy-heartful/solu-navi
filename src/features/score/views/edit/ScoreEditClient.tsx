"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FormField } from "@/components/Form/FormField";
import { EditFormLayout } from "@/components/Layout/EditFormLayout";
import { GenreInput } from "../../components/GenreInput";
import { AppInput } from "@/components/Form/AppInput";
import { saveScore } from "@/features/score/api/score-client-service";
import { rules } from "@/lib/validation";
import { Genre, Score } from "@/lib/firestore/types";
import { useAppForm } from "@/hooks/useAppForm";

type Props = {
  mode: "new" | "edit" | "copy";
  scoreId?: string;
  initialScore: Score | null;
  allGenres: Genre[];
};

export function ScoreEditClient({ mode, scoreId, initialScore, allGenres }: Props) {
  const { userData } = useAuth();

  // 1. 設定：初期値とバリデーション (streak-navi準拠)
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
      scoreUrl: [rules.required, rules.googleDrive],
      referenceTrack: [rules.required, rules.youtube],
      abbreviation: [rules.required, rules.max8],
      genres: [(v) => (v && v[0] ? true : "最低1つ選択してください")],
    }
  );

  // 2. 設定：各部品への流し込み用ヘルパー
  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  return (
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

      <AppInput
        label="譜面（Google Drive URL）"
        required
        placeholder="https://drive.google.com/..."
        {...inputProps("scoreUrl")}
      />

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
  );
}
