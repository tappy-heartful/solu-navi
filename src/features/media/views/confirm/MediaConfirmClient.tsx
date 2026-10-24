"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildYouTubeHtml,
  buildGoogleDriveHtml,
  archiveAndDeleteDoc,
  showDialog,
  showSpinner,
  hideSpinner,
} from "@/lib/functions";
import { InstagramEmbed } from "@/components/InstagramEmbed";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { DisplayField } from "@/components/Form/DisplayField";
import { Media } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";

type Props = {
  mediaData: Media;
  mediaId: string;
  linkedEvent?: { id: string; title: string; date: string } | null;
  linkedScore?: { id: string; title: string; storageLocation?: string } | null;
};

export function MediaConfirmClient({
  mediaData,
  mediaId,
  linkedEvent,
  linkedScore,
}: Props) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "メディア・音源一覧", href: "/media" },
      { label: mediaData?.title ? `メディア確認 (${mediaData.title})` : "メディア確認" },
    ]);
  }, [setBreadcrumbs, mediaData?.title]);

  const handleDelete = async () => {
    const ok = await showDialog(
      `「${mediaData.title}」を削除しますか？\n（履歴はアーカイブに保存されます）`
    );
    if (!ok) return;

    try {
      setIsDeleting(true);
      showSpinner();
      await archiveAndDeleteDoc("medias", mediaId);
      hideSpinner();
      await showDialog("メディアを削除しました。", true);
      router.push("/media");
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
          <i className="fa-solid fa-photo-film" style={{ marginRight: "0.5rem" }} />
          メディア確認
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
              href={`/media/edit?mode=edit&mediaId=${mediaId}`}
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
              href={`/media/edit?mode=copy&mediaId=${mediaId}`}
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
          <DisplayField label="日付">{mediaData.date}</DisplayField>

          <DisplayField label="タイトル">{mediaData.title}</DisplayField>

          <DisplayField label="関連イベント">
            {linkedEvent ? (
              <Link
                href={`/event/confirm?eventId=${linkedEvent.id}`}
                prefetch={false}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "var(--primary-color, #146081)",
                  fontWeight: 600,
                  textDecoration: "underline",
                  fontSize: "0.925rem",
                }}
              >
                <i className="fa-solid fa-calendar-days" />
                <span>{linkedEvent.date} {linkedEvent.title}</span>
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.75rem" }} />
              </Link>
            ) : (
              "未設定"
            )}
          </DisplayField>

          <DisplayField label="関連譜面">
            {linkedScore ? (
              <Link
                href={`/score/confirm?scoreId=${linkedScore.id}`}
                prefetch={false}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "var(--primary-color, #146081)",
                  fontWeight: 600,
                  textDecoration: "underline",
                  fontSize: "0.925rem",
                }}
              >
                <i className="fa-solid fa-music" />
                <span>{linkedScore.title}{linkedScore.storageLocation ? ` (${linkedScore.storageLocation})` : ""}</span>
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.75rem" }} />
              </Link>
            ) : (
              "未設定"
            )}
          </DisplayField>

          <DisplayField label="Instagram">
            {mediaData.instagramUrl ? (
              <InstagramEmbed url={mediaData.instagramUrl} />
            ) : (
              "未設定"
            )}
          </DisplayField>

          <DisplayField label="YouTube">
            {mediaData.youtubeUrl ? (
              <div
                className="youtube-display-area"
                dangerouslySetInnerHTML={{
                  __html: buildYouTubeHtml(mediaData.youtubeUrl),
                }}
              />
            ) : (
              "未設定"
            )}
          </DisplayField>

          <DisplayField label="録音 / Google Drive">
            {mediaData.driveUrl ? (
              <div>
                <div
                  className="drive-display-area"
                  dangerouslySetInnerHTML={{
                    __html: buildGoogleDriveHtml(mediaData.driveUrl),
                  }}
                />
                <div style={{ marginTop: "8px" }}>
                  <a
                    href={mediaData.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      color: "var(--primary-color, #146081)",
                      fontWeight: 600,
                      textDecoration: "underline",
                      fontSize: "0.9rem",
                    }}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                    音源・ファイルを直接開く
                  </a>
                </div>
              </div>
            ) : (
              "未設定"
            )}
          </DisplayField>

          <DisplayField label="ホームに表示">
            {mediaData.isDispTop ? "表示する" : "表示しない"}
          </DisplayField>
        </div>

        <div className="page-footer" style={{ textAlign: "center", margin: "2rem 0" }}>
          <Link href="/media" prefetch={false} className="back-link">
            ← メディア一覧に戻る
          </Link>
        </div>
      </div>
    </BaseLayout>
  );
}
