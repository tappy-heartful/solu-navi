"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildYouTubeHtml, archiveAndDeleteDoc, showDialog, showSpinner, hideSpinner } from "@/lib/functions";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { DisplayField } from "@/components/Form/DisplayField";
import { Genre, Score } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import styles from "./ScoreConfirmClient.module.css";

type Props = {
  scoreData: Score;
  allGenres: Genre[];
  scoreId: string;
};

export function ScoreConfirmClient({ scoreData, allGenres, scoreId }: Props) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "譜面一覧", href: "/score" },
      { label: scoreData?.title ? `譜面詳細 (${scoreData.title})` : "譜面詳細" },
    ]);
  }, [setBreadcrumbs, scoreData?.title]);

  const genreNames = scoreData.genres
    ?.map((gid) => allGenres.find((g) => g.id === gid)?.name)
    .filter(Boolean)
    .join("、");

  const handleDelete = async () => {
    const ok = await showDialog(
      `「${scoreData.title}」の譜面データを削除しますか？\n（履歴はアーカイブに保存されます）`
    );
    if (!ok) return;

    try {
      setIsDeleting(true);
      showSpinner();
      await archiveAndDeleteDoc("scores", scoreId);
      hideSpinner();
      await showDialog("譜面データを削除しました。", true);
      router.push("/score");
      router.refresh();
    } catch (err: any) {
      hideSpinner();
      setIsDeleting(false);
      showDialog(`削除に失敗しました: ${err.message}`, true);
    }
  };

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>
          <i className="fa-solid fa-music" style={{ marginRight: "0.5rem" }} />
          譜面詳細
        </h1>
      </div>

      <div className="container">
        {isAdmin && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Link
              href={`/score/edit?mode=edit&scoreId=${scoreId}`}
              prefetch={false}
              className="save-button"
              style={{
                textDecoration: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                backgroundColor: "var(--primary-color, #146081)",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              <i className="fa-solid fa-pen-to-square" style={{ marginRight: "4px" }} />
              編集
            </Link>
            <Link
              href={`/score/edit?mode=copy&scoreId=${scoreId}`}
              prefetch={false}
              style={{
                textDecoration: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                backgroundColor: "#546e7a",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              <i className="fa-solid fa-copy" style={{ marginRight: "4px" }} />
              コピー
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#d32f2f",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <i className="fa-solid fa-trash" style={{ marginRight: "4px" }} />
              削除
            </button>
          </div>
        )}

        <div className="content-card" style={{ padding: "1.5rem" }}>
          <DisplayField label="タイトル">{scoreData.title}</DisplayField>

          <DisplayField label="譜面">
            {scoreData.scoreUrl ? (
              <div className={styles.scoreLinkContainer}>
                <a
                  href={scoreData.scoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.scoreLink}
                >
                  <div className={styles.iconWrapper}>
                    <i className="fa-solid fa-music"></i>
                  </div>
                  <div className={styles.textContainer}>
                    <span className={styles.linkTitle}>譜面を見る ♪</span>
                    <span className={styles.linkSub}>別タブで開きます</span>
                  </div>
                  <i className={`fa-solid fa-arrow-up-right-from-square ${styles.arrowIcon}`}></i>
                </a>
              </div>
            ) : (
              "未設定"
            )}
          </DisplayField>

          <DisplayField label="参考音源">
            {scoreData.referenceTrack ? (
              <div
                className="youtube-display-area"
                dangerouslySetInnerHTML={{
                  __html: buildYouTubeHtml(scoreData.referenceTrack),
                }}
              />
            ) : (
              "未設定"
            )}
          </DisplayField>

          <DisplayField label="ジャンル">{genreNames || "未設定"}</DisplayField>

          <DisplayField label="略称(譜割用)">{scoreData.abbreviation || "未設定"}</DisplayField>

          <DisplayField label="備考" preWrap>
            {scoreData.note || "特になし"}
          </DisplayField>

          <DisplayField label="ホームに表示">
            {scoreData.isDispTop ? "表示する" : "表示しない"}
          </DisplayField>
        </div>

        <div className="page-footer" style={{ textAlign: "center", margin: "2rem 0" }}>
          <Link href="/score" prefetch={false} className="back-link">
            ← 譜面一覧に戻る
          </Link>
        </div>
      </div>
    </BaseLayout>
  );
}
