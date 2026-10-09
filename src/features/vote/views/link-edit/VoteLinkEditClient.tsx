"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import { Vote, VoteItem, VoteChoice } from "@/lib/firestore/types";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { FormButtons } from "@/components/Form/FormButtons";
import { FormFooter } from "@/components/Form/FormFooter";
import { updateVote } from "@/features/vote/api/vote-client-service";
import { showDialog, showSpinner, hideSpinner, writeLog } from "@/lib/functions";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./VoteLinkEdit.module.css";

type Props = {
  vote: Vote;
  voteId: string;
};

export function VoteLinkEditClient({ vote, voteId }: Props) {
  const router = useRouter();
  const { setBreadcrumbs } = useBreadcrumb();
  const { isAdmin, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [descriptionLink, setDescriptionLink] = useState(vote.descriptionLink || "");
  const [items, setItems] = useState<VoteItem[]>(vote.items || []);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => router.push("/vote"));
      return;
    }
    setIsAuthorized(true);

    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "曲投票一覧", href: "/vote" },
      { label: "曲投票確認", href: `/vote/confirm?voteId=${voteId}` },
      { label: "曲投票リンク設定" },
    ]);
  }, [setBreadcrumbs, voteId, isAdmin, loading, router]);

  const handleItemChange = (idx: number, val: string) => {
    const newItems = [...items];
    newItems[idx].link = val;
    setItems(newItems);
  };

  const handleChoiceChange = (itemIdx: number, choiceIdx: number, val: string) => {
    const newItems = [...items];
    newItems[itemIdx].choices[choiceIdx].link = val;
    setItems(newItems);
  };

  const validateUrls = () => {
    const urlPattern = /^(https?:\/\/|mailto:|tel:)/i;
    let isValid = true;

    if (descriptionLink && !urlPattern.test(descriptionLink)) isValid = false;

    items.forEach((item) => {
      if (item.link && !urlPattern.test(item.link)) isValid = false;
      item.choices.forEach((choice: VoteChoice) => {
        if (choice.link && !urlPattern.test(choice.link)) isValid = false;
      });
    });

    return isValid;
  };

  const handleSave = async () => {
    if (!validateUrls()) {
      await showDialog("正しいリンク形式(http://, https://)で入力してください", true);
      return;
    }

    const confirmed = await showDialog("保存しますか？");
    if (!confirmed) return;

    showSpinner();
    try {
      await updateVote(voteId, {
        descriptionLink,
        items,
      });
      hideSpinner();
      await writeLog({ dataId: voteId, action: "曲投票リンク更新" });
      await showDialog("保存しました", true);
      router.refresh();
      showSpinner();
      router.push(`/vote/confirm?voteId=${voteId}`);
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId: voteId,
        action: "曲投票リンク更新",
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
            <FontAwesomeIcon icon={faLink} className={styles.headerIcon} />
            <span>曲投票リンク設定</span>
          </h1>
        </div>

        <div className={styles.card}>
          <div className={styles.formGroup}>
            <label className={styles.label}>説明文のリンク (任意)</label>
            <input
              type="url"
              className={styles.input}
              placeholder="https://..."
              value={descriptionLink}
              onChange={(e) => setDescriptionLink(e.target.value)}
            />
          </div>

          <div className={styles.itemsSection}>
            <h3 className={styles.sectionTitle}>各項目および選択肢の参考リンク (YouTube等)</h3>

            {items.map((item, i) => (
              <div key={i} className={styles.itemBox}>
                <div className={styles.itemTitleRow}>
                  <strong className={styles.itemTitle}>{item.name}</strong>
                  <input
                    type="url"
                    className={styles.input}
                    placeholder="項目全体のリンク (任意)"
                    value={item.link || ""}
                    onChange={(e) => handleItemChange(i, e.target.value)}
                  />
                </div>

                <div className={styles.choicesList}>
                  {item.choices.map((choice, j) => (
                    <div key={j} className={styles.choiceRow}>
                      <span className={styles.choiceName}>・{choice.name}</span>
                      <input
                        type="url"
                        className={styles.choiceInput}
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={choice.link || ""}
                        onChange={(e) => handleChoiceChange(i, j, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <FormButtons mode="edit" onSave={handleSave} onClear={() => {}} />
        </div>

        <div className={styles.footer}>
          <FormFooter
            backHref={`/vote/confirm?voteId=${voteId}`}
            backText="曲投票確認に戻る"
          />
        </div>
      </div>
    </BaseLayout>
  );
}
