"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildYouTubeHtml,
  archiveAndDeleteDoc,
  showDialog,
  showSpinner,
  hideSpinner,
} from "@/lib/functions";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { DisplayField } from "@/components/Form/DisplayField";
import { Genre, Score, SectionDoc, InstrumentDoc } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxArchive,
  faArrowUpRightFromSquare,
  faMusic,
  faPenToSquare,
  faCopy,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import styles from "./ScoreConfirmClient.module.css";

type Props = {
  scoreData: Score;
  allGenres: Genre[];
  allSections: SectionDoc[];
  allInstruments: InstrumentDoc[];
  scoreId: string;
};

export function ScoreConfirmClient({
  scoreData,
  allGenres,
  allSections,
  allInstruments,
  scoreId,
}: Props) {
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

  const instrumentConfig = scoreData.instrumentConfig || {};
  const hasInstruments = Object.values(instrumentConfig).some((parts) => parts.length > 0);

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>
          <FontAwesomeIcon icon={faMusic} style={{ marginRight: "0.5rem" }} />
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
              <FontAwesomeIcon icon={faPenToSquare} style={{ marginRight: "4px" }} />
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
              <FontAwesomeIcon icon={faCopy} style={{ marginRight: "4px" }} />
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
              <FontAwesomeIcon icon={faTrash} style={{ marginRight: "4px" }} />
              削除
            </button>
          </div>
        )}

        <div className="content-card" style={{ padding: "1.5rem" }}>
          <DisplayField label="タイトル">{scoreData.title}</DisplayField>

          {/* 保管場所・ボックス番号 */}
          <DisplayField label="保管場所・ボックス番号">
            {scoreData.storageLocation ? (
              <div className={styles.storageBadge}>
                <FontAwesomeIcon icon={faBoxArchive} className={styles.storageIcon} />
                <span>{scoreData.storageLocation}</span>
              </div>
            ) : (
              "未登録"
            )}
          </DisplayField>

          {/* 参考音源 */}
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

          {/* 楽器構成・パート譜 */}
          <DisplayField label="楽器構成・パート譜">
            {hasInstruments ? (
              <div className={styles.instrumentGrid}>
                {allSections.map((sec) => {
                  const parts = instrumentConfig[sec.id] || [];
                  if (parts.length === 0) return null;

                  return (
                    <div key={sec.id} className={styles.sectionCard}>
                      <div className={styles.sectionCardHeader}>
                        <div
                          className={styles.sectionColorIndicator}
                          style={{ backgroundColor: sec.color || "#146081" }}
                        />
                        <span className={styles.sectionName}>
                          {sec.name} ({parts.length})
                        </span>
                      </div>
                      <div className={styles.partPills}>
                        {parts.map((p, idx) => {
                          const inst = allInstruments.find((i) => i.id === p.instrumentId);
                          return (
                            <span key={idx} className={styles.partPill}>
                              <span className={styles.partPillName}>{p.partName || "パート"}</span>
                              {inst && (
                                <span className={styles.partPillInst}>({inst.name})</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              "パート構成未設定"
            )}
          </DisplayField>

          <DisplayField label="略称(譜割用)">{scoreData.abbreviation || "未設定"}</DisplayField>

          {/* 関連リンク */}
          <DisplayField label="関連リンク">
            {scoreData.scoreUrl ? (
              <div className={styles.scoreLinkContainer}>
                <a
                  href={scoreData.scoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.scoreLink}
                >
                  <div className={styles.iconWrapper}>
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                  </div>
                  <div className={styles.textContainer}>
                    <span className={styles.linkTitle}>関連リンクを開く</span>
                    <span className={styles.linkSub}>別タブで開きます</span>
                  </div>
                  <FontAwesomeIcon
                    icon={faArrowUpRightFromSquare}
                    className={styles.arrowIcon}
                  />
                </a>
              </div>
            ) : (
              "未設定"
            )}
          </DisplayField>

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
