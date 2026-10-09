"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { AnswerEditLayout } from "@/components/Layout/AnswerEditLayout";
import { DisplayField } from "@/components/Form/DisplayField";
import { Call, ScoreStatus } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { showDialog } from "@/lib/functions";
import { getMyCallAnswer, saveCallAnswer } from "@/features/call/api/call-client-service";
import styles from "./CallAnswer.module.css";

type SongInput = {
  title: string;
  url: string;
  scorestatus: string;
  purchase: string;
  note: string;
};

type AnswersState = Record<string, SongInput[]>;

const emptySong = (): SongInput => ({
  title: "",
  url: "",
  scorestatus: "",
  purchase: "",
  note: "",
});

type Props = {
  callData: Call;
  callId: string;
  scoreStatuses: ScoreStatus[];
};

export function CallAnswerClient({ callData, callId, scoreStatuses }: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.uid || userData?.id;

  const [mode, setMode] = useState<"new" | "edit">("new");
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<AnswersState>(() =>
    Object.fromEntries((callData.items || []).map((genre) => [genre, []]))
  );

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const existing = await getMyCallAnswer(callId, uid);
        if (existing) {
          setMode("edit");
          const loaded: AnswersState = {};
          for (const genre of callData.items || []) {
            const songs = existing.answers[genre];
            loaded[genre] =
              songs && songs.length > 0
                ? songs.map((s) => ({
                    title: s.title || "",
                    url: s.url || "",
                    scorestatus: s.scorestatus || "",
                    purchase: s.purchase || "",
                    note: s.note || "",
                  }))
                : [];
          }
          setAnswers(loaded);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [uid, callId, callData.items]);

  const updateSong = (genre: string, idx: number, field: keyof SongInput, value: string) => {
    setAnswers((prev) => {
      const songs = [...(prev[genre] || [])];
      songs[idx] = { ...songs[idx], [field]: value };
      return { ...prev, [genre]: songs };
    });
  };

  const addSong = (genre: string) => {
    const max = Number(callData.maxSongsPerGenre || 0);
    if (max > 0 && (answers[genre]?.length || 0) >= max) {
      showDialog(`1ジャンルあたり最大 ${max} 曲までです`, true);
      return;
    }
    setAnswers((prev) => ({ ...prev, [genre]: [...(prev[genre] || []), emptySong()] }));
  };

  const removeSong = (genre: string, idx: number) => {
    setAnswers((prev) => {
      const songs = (prev[genre] || []).filter((_, i) => i !== idx);
      return { ...prev, [genre]: songs };
    });
  };

  const handleSave = async () => {
    if (!uid) return;

    // バリデーション
    let hasAnyInput = false;
    let hasError = false;

    for (const genre of callData.items || []) {
      for (const song of answers[genre] || []) {
        const hasInput = song.title || song.url || song.purchase || song.note || song.scorestatus;
        if (hasInput) {
          hasAnyInput = true;
          if (!song.title.trim()) {
            await showDialog(`【${genre}】曲名を入力してください`, true);
            hasError = true;
            return;
          }
        }
      }
    }

    if (!hasAnyInput) {
      await showDialog("1曲以上応募してください", true);
      return;
    }

    if (hasError) return;

    // 空の曲を除外して保存
    const cleanAnswers: Record<string, SongInput[]> = {};
    for (const genre of callData.items || []) {
      const songs = (answers[genre] || []).filter((s) => s.title.trim() !== "");
      if (songs.length > 0) {
        cleanAnswers[genre] = songs;
      }
    }

    await saveCallAnswer(callId, uid, cleanAnswers);
    await showDialog("回答を保存しました", true);
    router.refresh();
    router.push(`/call/confirm?callId=${callId}`);
  };

  return (
    <BaseLayout>
      <AnswerEditLayout
        featureName="曲募集"
        icon="fa-solid fa-bullhorn"
        basePath="/call"
        featureIdKey="callId"
        dataId={callId}
        mode={mode}
        onSave={handleSave}
        isLoading={isLoading}
      >
        <DisplayField label="曲募集名">{callData.title}</DisplayField>
        {callData.description && (
          <DisplayField label="説明" preWrap>{callData.description}</DisplayField>
        )}
        <DisplayField label="受付期間">
          {callData.acceptStartDate} ～ {callData.acceptEndDate}
        </DisplayField>

        <div className={styles.genresContainer}>
          {(callData.items || []).map((genre) => {
            const songs = answers[genre] || [];
            return (
              <div key={genre} className={styles.genreCard}>
                <div className={styles.genreHeader}>
                  <h3 className={styles.genreTitle}>{genre}</h3>
                  <button
                    type="button"
                    onClick={() => addSong(genre)}
                    className={styles.addSongBtn}
                  >
                    ＋ 曲を追加
                  </button>
                </div>

                {songs.length === 0 ? (
                  <p className={styles.noSongNotice}>曲が追加されていません</p>
                ) : (
                  <div className={styles.songList}>
                    {songs.map((song, idx) => (
                      <div key={idx} className={styles.songCard}>
                        <div className={styles.songCardHeader}>
                          <span className={styles.songIndex}>曲 {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeSong(genre, idx)}
                            className={styles.removeSongBtn}
                          >
                            削除
                          </button>
                        </div>

                        <div className={styles.inputGroup}>
                          <label className={styles.label}>
                            曲名 <span className={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            value={song.title}
                            onChange={(e) => updateSong(genre, idx, "title", e.target.value)}
                            placeholder="例: Sing, Sing, Sing"
                            className={styles.input}
                          />
                        </div>

                        <div className={styles.inputGroup}>
                          <label className={styles.label}>参考音源URL (YouTubeなど)</label>
                          <input
                            type="url"
                            value={song.url}
                            onChange={(e) => updateSong(genre, idx, "url", e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className={styles.input}
                          />
                        </div>

                        <div className={styles.inputGroup}>
                          <label className={styles.label}>楽譜状況</label>
                          <select
                            value={song.scorestatus}
                            onChange={(e) => updateSong(genre, idx, "scorestatus", e.target.value)}
                            className={styles.select}
                          >
                            <option value="">選択してください</option>
                            {scoreStatuses.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.inputGroup}>
                          <label className={styles.label}>購入先・出版元</label>
                          <input
                            type="text"
                            value={song.purchase}
                            onChange={(e) => updateSong(genre, idx, "purchase", e.target.value)}
                            placeholder="例: ATN, ロケットミュージック, 自作"
                            className={styles.input}
                          />
                        </div>

                        <div className={styles.inputGroup}>
                          <label className={styles.label}>備考・おすすめポイント</label>
                          <textarea
                            value={song.note}
                            onChange={(e) => updateSong(genre, idx, "note", e.target.value)}
                            placeholder="ソロ担当パートやアピールポイントなど"
                            rows={2}
                            className={styles.textarea}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AnswerEditLayout>
    </BaseLayout>
  );
}
