"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { BlueNote } from "@/lib/firestore/types";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useAuth } from "@/contexts/AuthContext";
import * as utils from "@/lib/functions";
import { showSpinner, hideSpinner, showDialog, writeLog } from "@/lib/functions";
import { saveBlueNote, deleteBlueNote, fetchBlueNotes } from "../api/blue-note-client-service";
import styles from "./blue-note.module.css";

type Props = {
  initialBlueNotes: BlueNote[];
};

export function BlueNoteClient({ initialBlueNotes }: Props) {
  const { setBreadcrumbs } = useBreadcrumb();
  const { user, isAdmin } = useAuth();
  const [blueNotes, setBlueNotes] = useState<BlueNote[]>(initialBlueNotes);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [currentIdx, setCurrentIdx] = useState(0);

  // 1. パンくず設定
  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "今日の一曲" },
    ]);
  }, [setBreadcrumbs]);

  // 現在の月のデータ
  const monthPrefix = useMemo(() => String(selectedMonth).padStart(2, "0"), [selectedMonth]);
  const monthBlueNotes = useMemo(() => {
    return blueNotes.filter((n) => n.id.startsWith(monthPrefix));
  }, [blueNotes, monthPrefix]);

  // 2. 初期インデックス設定（優先順位：1. 今日の曲、2. 表示月の01日の曲、3. 表示月の最初の曲）
  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    // 1. 表示されている月が「現在の月」なら、今日の曲を最優先
    if (selectedMonth === currentMonth) {
      const todayId = String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
      const todayIdx = blueNotes.findIndex((n) => n.id === todayId);
      if (todayIdx !== -1) {
        setCurrentIdx(todayIdx);
        return;
      }
    }

    // 2. 表示月の01日の曲があるかチェック
    const firstDayId = `${monthPrefix}01`;
    const firstDayIdx = blueNotes.findIndex((n) => n.id === firstDayId);
    if (firstDayIdx !== -1) {
      setCurrentIdx(firstDayIdx);
      return;
    }

    // 3. なければ表示月の登録されている最初の曲
    if (monthBlueNotes.length > 0) {
      const fallbackId = monthBlueNotes[0].id;
      const fallbackIdx = blueNotes.findIndex((n) => n.id === fallbackId);
      if (fallbackIdx !== -1) {
        setCurrentIdx(fallbackIdx);
      }
    }
  }, [selectedMonth, blueNotes, monthBlueNotes, monthPrefix]);

  // 日数計算
  const daysInMonth = useMemo(() => {
    return new Date(2024, selectedMonth, 0).getDate();
  }, [selectedMonth]);

  // 再読み込み
  const reloadData = useCallback(async () => {
    const data = await fetchBlueNotes();
    setBlueNotes(data);
  }, []);

  // 保存処理
  const handleSave = async (dateId: string, title: string, youtubeUrl: string) => {
    // 既存データの編集時は権限チェック
    const existingNote = blueNotes.find((n) => n.id === dateId);
    const isOwner = !!user && existingNote?.createdBy === user.uid;
    if (existingNote && !isAdmin && !isOwner) {
      await showDialog({ title: "警告", message: "編集権限がありません", type: "warning" });
      return;
    }

    if (!title.trim() || !youtubeUrl.trim()) {
      await showDialog({ title: "入力エラー", message: "タイトルとURLを入力してください", type: "warning" });
      return;
    }

    const videoId = utils.extractYouTubeId(youtubeUrl);
    if (!videoId || videoId.length !== 11) {
      await showDialog({ title: "入力エラー", message: "YouTubeのURLを正しく入力してください", type: "warning" });
      return;
    }

    // 重複チェック
    const isDuplicate = blueNotes.some((n) => n.youtubeId === videoId && n.id !== dateId);
    if (isDuplicate) {
      const dup = blueNotes.find((n) => n.youtubeId === videoId);
      const m = parseInt(dup!.id.substring(0, 2));
      const d = parseInt(dup!.id.substring(2));
      await showDialog({
        title: "重複",
        message: `この動画は既に登録されています：${m}月${d}日`,
        type: "warning",
      });
      return;
    }

    const ok = await showDialog({
      title: "確認",
      message: "保存しますか？",
      type: "info",
      isConfirm: true,
    });
    if (!ok) return;

    showSpinner();
    try {
      await saveBlueNote(dateId, {
        title,
        youtubeId: videoId,
        createdBy: existingNote?.createdBy || user?.uid || "unknown", // 既存なら維持
      });
      await writeLog({ dataId: dateId, action: "BlueNote保存" });
      await showDialog({ title: "完了", message: "保存しました", type: "success" });
      await reloadData();
    } catch (e) {
      console.error(e);
      await writeLog({
        dataId: dateId,
        action: "BlueNote保存",
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog({ title: "エラー", message: "保存に失敗しました", type: "danger" });
    } finally {
      hideSpinner();
    }
  };

  // 削除処理
  const handleDelete = async (dateId: string) => {
    const existingNote = blueNotes.find((n) => n.id === dateId);
    const isOwner = !!user && existingNote?.createdBy === user.uid;
    if (!isAdmin && !isOwner) {
      await showDialog({ title: "警告", message: "削除権限がありません", type: "warning" });
      return;
    }

    const ok = await showDialog({
      title: "確認",
      message: "削除しますか？",
      type: "danger",
      isConfirm: true,
    });
    if (!ok) return;

    showSpinner();
    try {
      await deleteBlueNote(dateId);
      await writeLog({ dataId: dateId, action: "BlueNote削除" });
      await showDialog({ title: "完了", message: "削除しました", type: "success" });
      await reloadData();
    } catch (e) {
      console.error(e);
      await writeLog({
        dataId: dateId,
        action: "BlueNote削除",
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog({ title: "エラー", message: "削除に失敗しました", type: "danger" });
    } finally {
      hideSpinner();
    }
  };

  // プレイリストURL
  const playlistIds = useMemo(() => {
    return monthBlueNotes.map((n) => n.youtubeId).filter(Boolean).join(",");
  }, [monthBlueNotes]);

  // YouTubeモーダル表示
  const handleYoutubeModal = async (note: BlueNote) => {
    const { showModal } = await import("@/components/CommonModal");
    const html = utils.buildYouTubeHtml(note.youtubeId);
    await showModal(note.title, html);
  };

  return (
    <BaseLayout>
      <div className={styles.container}>
        <div className="page-header">
          <h1><i className="fa-solid fa-record-vinyl" /> 今日の一曲</h1>
        </div>

        <div className="container">
          <h3><i className="fa-solid fa-circle-info" style={{ marginRight: "0.5rem" }} />今日の一曲について</h3>
          <p className={styles.pageDescription}>
            あなたのお気に入りのジャズを登録してください🌸<br />
            匿名・日替わりでホーム画面に表示されるようになります！<br />
            (季節に合った曲だとなお良きです)
          </p>
        </div>

        {/* プレイヤーセクション */}
        {blueNotes.length > 0 && (
          <div className={styles.playerWrapper}>
            <div className={styles.playerTitle}>
              <div style={{ fontSize: "14px", color: "#4caf50", marginBottom: "4px" }}>
                {blueNotes[currentIdx]?.id ? (
                  `${parseInt(blueNotes[currentIdx].id.substring(0, 2))}月${parseInt(blueNotes[currentIdx].id.substring(2))}日の曲`
                ) : ""}
              </div>
              {blueNotes[currentIdx]?.title || "Now Playing"}
            </div>
            <div dangerouslySetInnerHTML={{
              __html: utils.buildYouTubeHtml(utils.getWatchVideosOrder(currentIdx, blueNotes), false)
            }} />
            <div className={styles.playerControls}>
              <button
                className={styles.controlButton}
                onClick={() => setCurrentIdx((currentIdx - 1 + blueNotes.length) % blueNotes.length)}
              >
                <i className="fa-solid fa-backward-step" /> 前へ
              </button>
              <button
                className={`${styles.controlButton} ${styles.activeButton}`}
                onClick={() => setCurrentIdx(utils.getRandomIndex(currentIdx, blueNotes.length))}
              >
                ランダム <i className="fa-solid fa-arrows-rotate" />
              </button>
              <button
                className={styles.controlButton}
                onClick={() => setCurrentIdx((currentIdx + 1) % blueNotes.length)}
              >
                次へ <i className="fa-solid fa-forward-step" />
              </button>
            </div>
          </div>
        )}

        {/* 月切り替えタブ */}
        <div className={styles.monthTabs}>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`${styles.monthTab} ${selectedMonth === i + 1 ? styles.active : ""}`}
              onClick={() => setSelectedMonth(i + 1)}
            >
              {i + 1}月
            </div>
          ))}
        </div>

        <div className="container">
          <div className={styles.playlistHeader}>
            <h3><i className="fa-solid fa-record-vinyl" style={{ marginRight: "0.5rem" }} />{selectedMonth}月のプレイリスト</h3>
            {playlistIds && (
              <a
                href={`https://www.youtube.com/watch_videos?video_ids=${playlistIds}`}
                target="_blank"
                rel="noreferrer"
                className={styles.playlistButton}
              >
                <i className="fa-brands fa-youtube" /> 月間再生
              </a>
            )}
          </div>

          <div className={styles.songList}>
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const dateId = `${monthPrefix}${String(day).padStart(2, "0")}`;
              const note = blueNotes.find((n) => n.id === dateId);
              return (
                <SongItem
                  key={dateId}
                  day={day}
                  dateId={dateId}
                  note={note}
                  onSave={handleSave}
                  onDelete={handleDelete}
                  onShowModal={() => note && handleYoutubeModal(note)}
                  isAllowedToDelete={isAdmin || (!!user && note?.createdBy === user.uid)}
                />
              );
            })}
          </div>
        </div>

        <div className="page-footer">
          <Link href="/" className="back-link">← ホームに戻る</Link>
        </div>
      </div>
    </BaseLayout>
  );
}

function SongItem({
  day,
  dateId,
  note,
  onSave,
  onDelete,
  onShowModal,
  isAllowedToDelete,
}: {
  day: number;
  dateId: string;
  note?: BlueNote;
  onSave: (dateId: string, title: string, youtubeUrl: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onShowModal: () => void;
  isAllowedToDelete: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note?.title || "");
  const [url, setUrl] = useState(note?.youtubeId ? `https://youtu.be/${note.youtubeId}` : "");

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setUrl(`https://youtu.be/${note.youtubeId}`);
    } else {
      setTitle("");
      setUrl("");
    }
  }, [note]);

  return (
    <div className={styles.songItem}>
      <div className={styles.dayLabel}>{day}日</div>

      {note && !isEditing ? (
        <>
          <div className={styles.songContent}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onShowModal();
              }}
              className={styles.songTitle}
            >
              <i className="fa-brands fa-youtube" style={{ marginRight: "8px", color: "#ff0000" }} />
              {note.title}
            </a>
          </div>
          {isAllowedToDelete && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className={styles.deleteButton}
                style={{ borderColor: "#4caf50", color: "#4caf50" }}
                onClick={() => setIsEditing(true)}
              >
                編集
              </button>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => onDelete(dateId)}
              >
                削除
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.editForm}>
          {(!note || isAllowedToDelete) && (
            <>
              <input
                className={styles.inputField}
                placeholder="曲名"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                className={styles.inputField}
                placeholder="YouTube URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                {note && (
                  <button
                    type="button"
                    className={styles.deleteButton}
                    style={{ borderColor: "#999", color: "#999" }}
                    onClick={() => setIsEditing(false)}
                  >
                    キャンセル
                  </button>
                )}
                <button
                  type="button"
                  className={styles.saveButton}
                  onClick={() => {
                    onSave(dateId, title, url);
                    if (note) setIsEditing(false);
                  }}
                >
                  保存
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
