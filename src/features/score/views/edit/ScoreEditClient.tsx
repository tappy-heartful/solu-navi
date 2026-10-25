"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FormField } from "@/components/Form/FormField";
import { EditFormLayout } from "@/components/Layout/EditFormLayout";
import { GenreInput } from "../../components/GenreInput";
import { AppInput } from "@/components/Form/AppInput";
import { saveScore } from "@/features/score/api/score-client-service";
import { rules } from "@/lib/validation";
import { Genre, Score, SectionDoc, InstrumentDoc, InstrumentPart } from "@/lib/firestore/types";
import { useAppForm } from "@/hooks/useAppForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import styles from "./ScoreEdit.module.css";

type Props = {
  mode: "new" | "edit" | "copy";
  scoreId?: string;
  initialScore: Score | null;
  allGenres: Genre[];
  allSections: SectionDoc[];
  allInstruments: InstrumentDoc[];
  medias?: { id: string; title: string; date: string }[];
};

export function ScoreEditClient({
  mode,
  scoreId,
  initialScore,
  allGenres,
  allSections,
  allInstruments,
  medias = [],
}: Props) {
  const { userData } = useAuth();

  // 1. 楽器編成ステート（セクションIDキーのオブジェクト）
  const [instrumentConfig, setInstrumentConfig] = useState<Record<string, InstrumentPart[]>>(() => {
    if (initialScore?.instrumentConfig && Object.keys(initialScore.instrumentConfig).length > 0) {
      return initialScore.instrumentConfig;
    }
    return {};
  });

  // 2. フォーム初期値とバリデーション
  const form = useAppForm(
    {
      title:
        (mode === "copy" ? `${initialScore?.title}（コピー）` : initialScore?.title) || "",
      storageLocation: initialScore?.storageLocation || "",
      scoreUrl: initialScore?.scoreUrl || "",
      mediaId: initialScore?.mediaId || "",
      referenceTrack: initialScore?.referenceTrack || "",
      genres: (initialScore?.genres as string[]) || [""],
      abbreviation: initialScore?.abbreviation || "",
      note: initialScore?.note || "",
    },
    {
      title: [rules.required],
      storageLocation: [rules.required],
      scoreUrl: [rules.urlOptional],
      referenceTrack: [rules.required, rules.youtube],
      abbreviation: [rules.required, rules.max8],
      genres: [(v) => (v && v[0] ? true : "最低1つ選択してください")],
    }
  );

  const inputProps = (field: keyof typeof form.formData) => ({
    field,
    value: form.formData[field],
    error: form.errors[field],
    updateField: form.updateField,
  });

  // ---- 楽器編成ヘルパー ----
  const addPart = (sectionId: string) => {
    setInstrumentConfig((prev) => {
      const current = prev[sectionId] || [];
      return {
        ...prev,
        [sectionId]: [...current, { partName: "", instrumentId: "" }],
      };
    });
  };

  const removePart = (sectionId: string, partIdx: number) => {
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

  // 標準編成セット（セクション別）
  const setStandardSectionParts = (sectionId: string) => {
    const sec = allSections.find((s) => s.id === sectionId);
    if (!sec) return;

    let parts: InstrumentPart[] = [];
    if (sec.name.includes("サックス") || sec.name.includes("Sax")) {
      parts = [
        { partName: "A1", instrumentId: allInstruments.find((i) => i.id === "as")?.id || "" },
        { partName: "A2", instrumentId: allInstruments.find((i) => i.id === "as")?.id || "" },
        { partName: "T1", instrumentId: allInstruments.find((i) => i.id === "ts")?.id || "" },
        { partName: "T2", instrumentId: allInstruments.find((i) => i.id === "ts")?.id || "" },
        { partName: "B", instrumentId: allInstruments.find((i) => i.id === "bs")?.id || "" },
      ];
    } else if (sec.name.includes("トランペット") || sec.name.includes("Trumpet")) {
      parts = [
        { partName: "1", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
        { partName: "2", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
        { partName: "3", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
        { partName: "4", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
      ];
    } else if (sec.name.includes("トロンボーン") || sec.name.includes("Trombone")) {
      parts = [
        { partName: "1", instrumentId: allInstruments.find((i) => i.id === "tb")?.id || "" },
        { partName: "2", instrumentId: allInstruments.find((i) => i.id === "tb")?.id || "" },
        { partName: "3", instrumentId: allInstruments.find((i) => i.id === "tb")?.id || "" },
        { partName: "4 (B)", instrumentId: allInstruments.find((i) => i.id === "btb")?.id || allInstruments.find((i) => i.id === "tb")?.id || "" },
      ];
    } else if (sec.name.includes("リズム") || sec.name.includes("Rhythm")) {
      parts = [
        { partName: "Pf", instrumentId: allInstruments.find((i) => i.id === "pf")?.id || "" },
        { partName: "Gt", instrumentId: allInstruments.find((i) => i.id === "gt")?.id || "" },
        { partName: "Ba", instrumentId: allInstruments.find((i) => i.id === "ba")?.id || "" },
        { partName: "Dr", instrumentId: allInstruments.find((i) => i.id === "dr")?.id || "" },
      ];
    }

    if (parts.length > 0) {
      setInstrumentConfig((prev) => ({
        ...prev,
        [sectionId]: parts,
      }));
    }
  };

  // 全セクション一括で標準17人編成をセット
  const setAllStandardParts = () => {
    const newConfig: Record<string, InstrumentPart[]> = {};
    allSections.forEach((sec) => {
      if (sec.name.includes("サックス") || sec.name.includes("Sax")) {
        newConfig[sec.id] = [
          { partName: "A1", instrumentId: allInstruments.find((i) => i.id === "as")?.id || "" },
          { partName: "A2", instrumentId: allInstruments.find((i) => i.id === "as")?.id || "" },
          { partName: "T1", instrumentId: allInstruments.find((i) => i.id === "ts")?.id || "" },
          { partName: "T2", instrumentId: allInstruments.find((i) => i.id === "ts")?.id || "" },
          { partName: "B", instrumentId: allInstruments.find((i) => i.id === "bs")?.id || "" },
        ];
      } else if (sec.name.includes("トランペット") || sec.name.includes("Trumpet")) {
        newConfig[sec.id] = [
          { partName: "1", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
          { partName: "2", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
          { partName: "3", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
          { partName: "4", instrumentId: allInstruments.find((i) => i.id === "tp")?.id || "" },
        ];
      } else if (sec.name.includes("トロンボーン") || sec.name.includes("Trombone")) {
        newConfig[sec.id] = [
          { partName: "1", instrumentId: allInstruments.find((i) => i.id === "tb")?.id || "" },
          { partName: "2", instrumentId: allInstruments.find((i) => i.id === "tb")?.id || "" },
          { partName: "3", instrumentId: allInstruments.find((i) => i.id === "tb")?.id || "" },
          { partName: "4 (B)", instrumentId: allInstruments.find((i) => i.id === "btb")?.id || allInstruments.find((i) => i.id === "tb")?.id || "" },
        ];
      } else if (sec.name.includes("リズム") || sec.name.includes("Rhythm")) {
        newConfig[sec.id] = [
          { partName: "Pf", instrumentId: allInstruments.find((i) => i.id === "pf")?.id || "" },
          { partName: "Gt", instrumentId: allInstruments.find((i) => i.id === "gt")?.id || "" },
          { partName: "Ba", instrumentId: allInstruments.find((i) => i.id === "ba")?.id || "" },
          { partName: "Dr", instrumentId: allInstruments.find((i) => i.id === "dr")?.id || "" },
        ];
      }
    });
    setInstrumentConfig(newConfig);
  };

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
        saveScore(
          mode,
          {
            ...data,
            instrumentConfig,
          },
          scoreId,
          userData?.displayName || undefined
        )
      }
    >
      <AppInput
        label="タイトル"
        required
        placeholder="例: Sing, Sing, Sing"
        {...inputProps("title")}
      />

      <AppInput
        label="保管場所・ボックス番号"
        required
        placeholder="例: ボックスA-3、部室 第3共用施設 棚2、青ファイルNo.12"
        {...inputProps("storageLocation")}
      />

      <AppInput
        label="参考音源（YouTube URL）"
        required
        placeholder="https://www.youtube.com/..."
        {...inputProps("referenceTrack")}
      />

      {/* 関連録音・メディア選択プルダウン */}
      <div style={{ marginBottom: "1rem" }}>
        <FormField label="関連録音・メディア" error={form.errors.mediaId}>
          <select
            className="form-control"
            value={form.formData.mediaId}
            onChange={(e) => form.updateField("mediaId", e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1.5px solid #cbd5e1",
              backgroundColor: "#ffffff",
              fontSize: "0.9rem",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          >
            <option value="">未選択（紐づけない）</option>
            {medias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.date} {m.title}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="ジャンル" required error={form.errors.genres}>
        <GenreInput
          genres={form.formData.genres}
          allGenres={allGenres}
          onChange={(val) => form.updateField("genres", val)}
        />
      </FormField>

      {/* 楽器編成（streak-naviイベント準拠） */}
      <FormField label="楽器構成・パート譜の有無">
        <button
          type="button"
          className={styles.allStandardBtn}
          onClick={setAllStandardParts}
        >
          <FontAwesomeIcon icon={faWandMagicSparkles} />
          ビッグバンド標準編成 (17パート) を一括セット
        </button>

        {allSections.map((sec) => {
          const parts = instrumentConfig[sec.id] || [];
          const sectionInstruments = allInstruments.filter((inst) => inst.sectionId === sec.id);

          return (
            <div key={sec.id} className={styles.instrumentSectionBlock}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleGroup}>
                  <div
                    className={styles.sectionColorBar}
                    style={{ backgroundColor: sec.color || "#146081" }}
                  />
                  <h4 className={styles.sectionTitle}>{sec.name}</h4>
                  <span className={styles.partCountBadge}>{parts.length}パート</span>
                </div>

                <button
                  type="button"
                  className={styles.setStandardBtn}
                  onClick={() => setStandardSectionParts(sec.id)}
                >
                  標準パート入力
                </button>
              </div>

              {parts.map((part, partIdx) => (
                <div key={partIdx} className={styles.partRow}>
                  <input
                    type="text"
                    value={part.partName}
                    onChange={(e) => updatePart(sec.id, partIdx, "partName", e.target.value)}
                    placeholder="パート名 (例: 1st, Lead, Solo)"
                    className={styles.partInput}
                    maxLength={10}
                  />
                  <select
                    value={part.instrumentId || ""}
                    onChange={(e) => updatePart(sec.id, partIdx, "instrumentId", e.target.value)}
                    className={styles.partSelect}
                  >
                    <option value="">楽器を選択</option>
                    {sectionInstruments.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.removePartBtn}
                    onClick={() => removePart(sec.id, partIdx)}
                    title="削除"
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                className={styles.addPartBtn}
                onClick={() => addPart(sec.id)}
              >
                <FontAwesomeIcon icon={faPlus} />
                {sec.name}のパートを追加
              </button>
            </div>
          );
        })}
      </FormField>

      <AppInput
        label="略称(譜割用)"
        required
        placeholder="例: SSS (8文字以内)"
        {...inputProps("abbreviation")}
      />

      <AppInput
        label="関連リンク"
        placeholder="https://...（Google Driveや共有URLなど）"
        {...inputProps("scoreUrl")}
      />

      <AppInput
        label="備考"
        type="textarea"
        placeholder="保管状態、欠譜情報、演奏上の注意点など"
        {...inputProps("note")}
      />
    </EditFormLayout>
  );
}
