"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckToSlot, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { AppInput } from "@/components/Form/AppInput";
import { FormButtons } from "@/components/Form/FormButtons";
import { FormFooter } from "@/components/Form/FormFooter";
import { Vote, Call, VoteItem, CallAnswerSong } from "@/lib/firestore/types";
import { addVote, updateVote } from "@/features/vote/api/vote-client-service";
import { showSpinner, hideSpinner, showDialog, writeLog, format } from "@/lib/functions";
import styles from "./VoteEdit.module.css";

type Mode = "new" | "edit" | "copy" | "createFromCall";

type Props = {
  mode: Mode;
  voteId?: string;
  initialVote?: Vote | null;
  callData?: Call | null;
  callAnswers?: Array<Record<string, CallAnswerSong[]>>;
};

export function VoteEditClient({ mode, voteId, initialVote, callData, callAnswers }: Props) {
  const router = useRouter();
  const { userData, isAdmin, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const isEdit = mode === "edit";

  const [items, setItems] = useState<VoteItem[]>([]);

  const [values, setValues] = useState({
    name: "",
    description: "",
    acceptStartDate: "",
    acceptEndDate: "",
    isAnonymous: false,
    hideVotes: false,
    type: "single" as "single" | "borda",
    maxRanks: 3,
    scoring: "linear" as "linear" | "weighted",
  });

  const handleChange = (k: string, v: string | boolean) => setValues((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => router.push("/vote"));
      return;
    }
    setIsAuthorized(true);

    const paths: { label: string; href?: string }[] = [{ label: "ホーム", href: "/" }, { label: "曲投票一覧", href: "/vote" }];
    if (isEdit || mode === "copy") {
      paths.push({ label: "曲投票確認", href: `/vote/confirm?voteId=${voteId}` });
      paths.push({ label: isEdit ? "曲投票編集" : "曲投票新規作成(コピー)" });
    } else if (mode === "createFromCall") {
      paths.push({ label: "曲募集から曲投票作成" });
    } else {
      paths.push({ label: "曲投票新規作成" });
    }
    setBreadcrumbs(paths);

    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000);
    const ymdStart = format(start, "yyyy-MM-dd");
    const ymdEnd = format(end, "yyyy-MM-dd");

    if ((mode === "edit" || mode === "copy") && initialVote) {
      setValues({
        name: initialVote.name + (mode === "copy" ? "（コピー）" : ""),
        description: initialVote.description || "",
        acceptStartDate: initialVote.acceptStartDate?.replace(/\./g, "-") || ymdStart,
        acceptEndDate: initialVote.acceptEndDate?.replace(/\./g, "-") || ymdEnd,
        isAnonymous: initialVote.isAnonymous || false,
        hideVotes: initialVote.hideVotes || false,
        type: initialVote.type || "single",
        maxRanks: initialVote.bordaConfig?.maxRanks || 3,
        scoring: initialVote.bordaConfig?.scoring || "linear",
      });
      setItems(initialVote.items || []);
    } else if (mode === "createFromCall" && callData) {
      setValues({
        name: (callData.title || "") + " の曲投票",
        description: callData.description || "",
        acceptStartDate: ymdStart,
        acceptEndDate: ymdEnd,
        isAnonymous: false,
        hideVotes: false,
        type: "single",
        maxRanks: 3,
        scoring: "linear",
      });

      const newItems: VoteItem[] = [];
      const genres = callData.items || [];
      genres.forEach((genre) => {
        const itemObj: VoteItem = { name: genre, choices: [] };
        const allSongs = (callAnswers || []).flatMap((ans) => ans[genre] || []);
        const seen = new Set<string>();
        const songs = allSongs.filter((s) => {
          if (!s.title || seen.has(s.title)) return false;
          seen.add(s.title);
          return true;
        });
        if (songs.length > 0) {
          itemObj.choices = songs.map((s) => ({ name: s.title, link: s.url || "" }));
          if (songs.length === 1) itemObj.choices.push({ name: "" });
        } else {
          itemObj.choices = [{ name: "" }, { name: "" }];
        }
        newItems.push(itemObj);
      });
      setItems(newItems);
    } else {
      setValues({
        name: "",
        description: "",
        acceptStartDate: ymdStart,
        acceptEndDate: ymdEnd,
        isAnonymous: false,
        hideVotes: false,
        type: "single",
        maxRanks: 3,
        scoring: "linear",
      });
      setItems([{ name: "", choices: [{ name: "" }, { name: "" }] }]);
    }
  }, [isAdmin, loading, mode, voteId, initialVote, callData, callAnswers, setBreadcrumbs, router]);

  const updateItem = (index: number, newName: string) => {
    const next = [...items];
    next[index].name = newName;
    setItems(next);
  };
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  const addItem = () => {
    setItems([...items, { name: "", choices: [{ name: "" }, { name: "" }] }]);
  };

  const updateChoice = (itemIdx: number, choiceIdx: number, newName: string) => {
    const next = [...items];
    next[itemIdx].choices[choiceIdx].name = newName;
    setItems(next);
  };
  const addChoice = (itemIdx: number) => {
    const next = [...items];
    next[itemIdx].choices.push({ name: "" });
    setItems(next);
  };
  const removeChoice = (itemIdx: number, choiceIdx: number) => {
    const next = [...items];
    next[itemIdx].choices = next[itemIdx].choices.filter((_, i) => i !== choiceIdx);
    setItems(next);
  };
  const updateDifficulty = (itemIdx: number, choiceIdx: number, difficulty: number) => {
    const next = [...items];
    next[itemIdx].choices[choiceIdx].difficulty = difficulty;
    setItems(next);
  };

  const handleSave = async () => {
    let valid = true;
    if (!values.name) {
      await showDialog("曲投票名を入力してください", true);
      valid = false;
    }
    if (!values.description) {
      await showDialog("曲投票説明を入力してください", true);
      valid = false;
    }
    if (!values.acceptStartDate || !values.acceptEndDate) {
      await showDialog("受付期間を入力してください", true);
      valid = false;
    }

    if (values.acceptStartDate && values.acceptEndDate) {
      if (values.acceptStartDate > values.acceptEndDate) {
        await showDialog("終了日は開始日以降にしてください", true);
        valid = false;
      }
      if (mode !== "edit") {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        if (values.acceptStartDate <= todayStr) {
          await showDialog("開始日は明日以降にしてください", true);
          valid = false;
        }
      }
    }

    if (items.length === 0) {
      await showDialog("曲投票項目を１つ以上追加してください", true);
      valid = false;
    }
    const itemNames = new Set<string>();
    for (const item of items) {
      if (!item.name) {
        await showDialog("全ての項目名を入力してください", true);
        valid = false;
        break;
      }
      if (itemNames.has(item.name)) {
        await showDialog("項目名が重複しています", true);
        valid = false;
        break;
      }
      itemNames.add(item.name);

      let hasChoice = false;
      const cNames = new Set<string>();
      for (const choice of item.choices) {
        if (choice.name) {
          hasChoice = true;
          if (cNames.has(choice.name)) {
            await showDialog("選択肢が重複しています", true);
            valid = false;
            break;
          }
          cNames.add(choice.name);
        }
      }
      if (!valid) break;

      if (!hasChoice) {
        await showDialog("各項目に選択肢を１つ以上入力してください", true);
        valid = false;
        break;
      }
    }

    if (!valid) return;

    if (!(await showDialog("保存しますか？"))) return;

    showSpinner();
    try {
      const dbItems = items.map((item) => ({
        name: item.name,
        link: mode === "copy" ? initialVote?.items?.find((i) => i.name === item.name)?.link || "" : item.link || "",
        choices: item.choices
          .filter((c) => Boolean(c.name))
          .map((c) => {
            const existingItem = initialVote?.items?.find((i) => i.name === item.name);
            const existingChoice = existingItem?.choices?.find((oc) => oc.name === c.name);
            const preservedLink = existingChoice?.link || c.link || "";

            return {
              name: c.name,
              link: preservedLink,
              difficulty: c.difficulty || 0,
            };
          }),
      }));

      const payload: Partial<Vote> = {
        name: values.name,
        description: values.description,
        descriptionLink:
          mode === "copy" && values.description === initialVote?.description
            ? initialVote?.descriptionLink || ""
            : "",
        acceptStartDate: values.acceptStartDate.replace(/-/g, "."),
        acceptEndDate: values.acceptEndDate.replace(/-/g, "."),
        isAnonymous: values.isAnonymous,
        hideVotes: values.hideVotes,
        items: dbItems,
        type: values.type,
        bordaConfig:
          values.type === "borda"
            ? {
                maxRanks: Number(values.maxRanks),
                scoring: values.scoring,
              }
            : undefined,
      };

      let newVoteId = voteId;

      if (isEdit && voteId) {
        await updateVote(voteId, payload);
      } else {
        payload.createdBy = userData?.displayName || "";
        newVoteId = await addVote(payload as Omit<Vote, "id">);
      }

      hideSpinner();
      await writeLog({ dataId: newVoteId || "new", action: `曲投票${isEdit ? "更新" : "登録"}` });
      await showDialog("保存しました", true);

      router.refresh();
      if (await showDialog("続いて選択肢のリンクを設定しますか？")) {
        router.push(`/vote/link-edit?voteId=${newVoteId}`);
      } else {
        router.push(`/vote/confirm?voteId=${newVoteId}`);
      }
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId: voteId || "new",
        action: `曲投票${isEdit ? "更新" : "登録"}`,
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  if (loading || !isAuthorized) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>権限を確認中...</div>;
  }

  return (
    <BaseLayout>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faCheckToSlot} className={styles.headerIcon} />
            <span>
              {isEdit
                ? "曲投票編集"
                : mode === "copy"
                ? "曲投票新規作成(コピー)"
                : mode === "createFromCall"
                ? "曲募集から曲投票作成"
                : "曲投票新規作成"}
            </span>
          </h1>
        </div>

        <div className={styles.card}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              曲投票名 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="曲投票名を入力してください"
              value={values.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              曲投票説明 <span className={styles.required}>*</span>
            </label>
            <textarea
              className={styles.textarea}
              rows={4}
              placeholder="曲投票の説明を入力してください"
              value={values.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          {/* 投票形式 */}
          <div className={styles.voteTypeCard}>
            <label className={styles.voteTypeLabel}>曲投票形式</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="voteType"
                  checked={values.type === "single"}
                  onChange={() => handleChange("type", "single")}
                  className={styles.radio}
                />
                <span>シンプル（1人1票）</span>
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="voteType"
                  checked={values.type === "borda"}
                  onChange={() => handleChange("type", "borda")}
                  className={styles.radio}
                />
                <span>ボルダルール（順位付け投票）</span>
              </label>
            </div>

            {values.type === "borda" && (
              <div className={styles.bordaBox}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>何位まで選べるか</label>
                  <input
                    type="number"
                    className={styles.numberInput}
                    value={values.maxRanks}
                    onChange={(e) => handleChange("maxRanks", e.target.value)}
                    min={2}
                    max={10}
                  />
                </div>
                <div>
                  <label className={styles.label}>配点方式</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="scoring"
                        checked={values.scoring === "linear"}
                        onChange={() => handleChange("scoring", "linear")}
                        className={styles.radio}
                      />
                      <span>線形（3位なら 3, 2, 1点）</span>
                    </label>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        name="scoring"
                        checked={values.scoring === "weighted"}
                        onChange={() => handleChange("scoring", "weighted")}
                        className={styles.radio}
                      />
                      <span>傾斜（3位なら 5, 3, 1点）</span>
                    </label>
                  </div>
                  <div className={styles.scorePreview}>
                    <FontAwesomeIcon icon={faInfoCircle} style={{ color: "#146081", marginRight: "6px" }} />
                    <strong>配点のプレビュー:</strong>
                    <div className={styles.ptsList}>
                      {(() => {
                        const max = Number(values.maxRanks);
                        const scoring = values.scoring;
                        const pts = [];
                        for (let i = 0; i < max; i++) {
                          let p = 0;
                          if (scoring === "linear") p = max - i;
                          else {
                            const weights = [10, 6, 4, 3, 2, 1];
                            if (max === 3) p = [5, 3, 1][i];
                            else p = weights[i] || 1;
                          }
                          pts.push(
                            <span key={i} className={styles.ptBadge}>
                              {i + 1}位: {p}pt
                            </span>
                          );
                        }
                        return pts;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              受付期間 <span className={styles.required}>*</span>
            </label>
            <div className={styles.dateRow}>
              <input
                type="date"
                className={styles.input}
                value={values.acceptStartDate}
                onChange={(e) => handleChange("acceptStartDate", e.target.value)}
              />
              <span>～</span>
              <input
                type="date"
                className={styles.input}
                value={values.acceptEndDate}
                onChange={(e) => handleChange("acceptEndDate", e.target.value)}
              />
            </div>
          </div>

          {/* 曲投票項目 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              曲投票項目 <span className={styles.required}>*</span>
            </label>
            <div className={styles.itemsList}>
              {items.map((item, i) => (
                <div key={i} className={styles.itemBox}>
                  <input
                    type="text"
                    className={styles.itemTitleInput}
                    placeholder="項目名（例：オープニング候補）"
                    value={item.name}
                    onChange={(e) => updateItem(i, e.target.value)}
                  />
                  <div className={styles.choicesList}>
                    {item.choices.map((choice, j) => (
                      <div key={j} className={styles.choiceRow}>
                        <span>・</span>
                        <input
                          type="text"
                          className={styles.choiceInput}
                          placeholder={`選択肢${j + 1}`}
                          value={choice.name}
                          onChange={(e) => updateChoice(i, j, e.target.value)}
                        />
                        <select
                          className={styles.diffSelect}
                          value={choice.difficulty || ""}
                          onChange={(e) =>
                            updateDifficulty(i, j, e.target.value ? Number(e.target.value) : 0)
                          }
                        >
                          <option value="">難</option>
                          {[...Array(10)].map((_, idx) => (
                            <option key={idx + 1} value={idx + 1}>
                              {idx + 1}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeChoice(i, j)}
                          className={styles.removeChoiceBtn}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className={styles.itemActionButtons}>
                    <button
                      type="button"
                      onClick={() => addChoice(i)}
                      className={styles.addChoiceBtn}
                    >
                      ＋ 選択肢を追加
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className={styles.removeItemBtn}
                    >
                      × 項目を削除
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addItem} className={styles.addItemBtn}>
                ＋ 曲投票項目を追加
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={values.isAnonymous}
                onChange={(e) => handleChange("isAnonymous", e.target.checked)}
                className={styles.checkbox}
              />
              <span>匿名投票（誰がどこに投票したかわからなくする）</span>
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={values.hideVotes}
                onChange={(e) => handleChange("hideVotes", e.target.checked)}
                className={styles.checkbox}
              />
              <span>票数を非公開（管理者以外には、途中経過や終了結果の票数が見えなくなります）</span>
            </label>
          </div>

          <FormButtons
            mode={mode === "createFromCall" ? "new" : mode}
            onSave={handleSave}
            onClear={() => {}}
          />
        </div>

        <div className={styles.footer}>
          <FormFooter
            backHref={isEdit || mode === "copy" ? `/vote/confirm?voteId=${voteId}` : "/vote"}
            backText={isEdit || mode === "copy" ? "投票確認に戻る" : "投票一覧に戻る"}
          />
        </div>
      </div>
    </BaseLayout>
  );
}
