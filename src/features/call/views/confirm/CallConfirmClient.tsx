"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { AnswerConfirmLayout } from "@/components/Layout/AnswerConfirmLayout";
import { DisplayField } from "@/components/Form/DisplayField";
import { Call, CallAnswer, CallAnswerSong } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  isInTerm,
  extractYouTubeId,
  showDialog,
  showSpinner,
  hideSpinner,
  writeLog,
} from "@/lib/functions";
import { deleteCallWithAnswers, deleteMyCallAnswer } from "@/features/call/api/call-client-service";
import styles from "./CallConfirm.module.css";

type Props = {
  callData: Call;
  callId: string;
  callAnswers: CallAnswer[];
  usersMap: Record<string, { displayName: string; pictureUrl?: string }>;
  scoreStatusMap: Record<string, string>;
};

export function CallConfirmClient({
  callData,
  callId,
  callAnswers,
  usersMap,
  scoreStatusMap,
}: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.uid || userData?.id;

  // 全回答からYouTube IDを収集
  const allVideoIds = useMemo(() => {
    const ids = new Set<string>();
    (callData.items || []).forEach((genre) => {
      callAnswers.forEach((ans) => {
        const songs = ans.answers?.[genre] || [];
        songs.forEach((song: CallAnswerSong) => {
          if (song.url) {
            const id = extractYouTubeId(song.url);
            if (id && id.length === 11) ids.add(id);
          }
        });
      });
    });
    return Array.from(ids);
  }, [callData.items, callAnswers]);

  const playlistUrl =
    allVideoIds.length > 0
      ? allVideoIds.length === 1
        ? `https://www.youtube.com/watch?v=${allVideoIds[0]}`
        : `https://www.youtube.com/watch_videos?video_ids=${allVideoIds.join(",")}`
      : "";

  const totalSongs = useMemo(() => {
    let count = 0;
    callAnswers.forEach((ans) => {
      Object.values(ans.answers || {}).forEach((songs) => {
        count += (songs as any[]).length;
      });
    });
    return count;
  }, [callAnswers]);

  const isActive = isInTerm(callData.acceptStartDate, callData.acceptEndDate);
  const myAnswer = callAnswers.find((a) => a.uid === uid);
  const hasAnswered = !!myAnswer && Object.keys(myAnswer.answers).length > 0;
  const participantCount = callAnswers.length;

  const statusClass = !isActive ? "closed" : hasAnswered ? "answered" : "pending";
  const statusText = !isActive ? "終了" : hasAnswered ? "回答済" : "未回答";

  const handleAdminDelete = async () => {
    const confirmed = await showDialog("募集と全員の回答を削除しますか？\nこの操作は元に戻せません");
    if (!confirmed) return;
    const confirmedAgain = await showDialog("本当に削除しますか？");
    if (!confirmedAgain) return;

    showSpinner();
    try {
      await deleteCallWithAnswers(callId);
      hideSpinner();
      await writeLog({ dataId: callId, action: "曲募集削除" });
      await showDialog("削除しました", true);

      router.refresh();
      showSpinner();
      router.push("/call");
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId: callId,
        action: "曲募集削除",
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  const handleDeleteMyAnswer = async () => {
    if (!uid) return;
    const confirmed = await showDialog("自分の回答を取り消しますか？");
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteMyCallAnswer(callId, uid);
      hideSpinner();
      await writeLog({ dataId: callId, action: "曲募集回答取消" });
      await showDialog("回答を取り消しました", true);
      router.refresh();
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId: callId,
        action: "曲募集回答取消",
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("取り消しに失敗しました", true);
    }
  };

  return (
    <BaseLayout>
      <AnswerConfirmLayout
        name="曲募集"
        icon="fa-solid fa-bullhorn"
        basePath="/call"
        dataId={callId}
        featureIdKey="callId"
        collectionName="calls"
        answerStatus={statusClass}
        answerStatusText={statusText}
        isActive={isActive}
        onDelete={handleAdminDelete}
        answerMenuSlot={
          isActive ? (
            <div className={styles.answerMenuButtons}>
              <Link
                href={`/call/answer?callId=${callId}`}
                prefetch={false}
                className={styles.primaryBtn}
              >
                {hasAnswered ? "回答を修正する" : "回答を登録する"}
              </Link>
              {hasAnswered && (
                <button
                  type="button"
                  className={styles.deleteAnswerBtn}
                  onClick={handleDeleteMyAnswer}
                >
                  回答を取り消す
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        <DisplayField label="曲募集名">{callData.title}</DisplayField>
        <DisplayField label="説明" preWrap>{callData.description}</DisplayField>
        <DisplayField label="受付期間">
          {callData.acceptStartDate} ～ {callData.acceptEndDate}
        </DisplayField>
        <DisplayField label="募集ジャンル">
          <div className={styles.genreChips}>
            {(callData.items || []).map((genre, idx) => (
              <span key={idx} className={styles.genreChip}>
                {genre}
              </span>
            ))}
          </div>
        </DisplayField>
        <DisplayField label="回答状況">
          参加者数: <strong>{participantCount}</strong> 人 / 総応募曲数: <strong>{totalSongs}</strong> 曲
        </DisplayField>

        {playlistUrl && (
          <div className={styles.playlistSection}>
            <a
              href={playlistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.playlistBtn}
            >
              ▶ 応募されたYouTube全曲をプレイリストで聴く ({allVideoIds.length}曲)
            </a>
          </div>
        )}

        {/* ジャンル別応募結果一覧 */}
        <div className={styles.resultsSection}>
          <h2 className={styles.resultsTitle}>応募結果一覧</h2>

          {(callData.items || []).map((genre) => {
            // このジャンルに応募された曲を回答者ごとに収集
            const genreAnswers = callAnswers
              .map((ans) => {
                const songs = ans.answers?.[genre] || [];
                return {
                  uid: ans.uid,
                  userName: callData.isAnonymous
                    ? "匿名"
                    : usersMap[ans.uid]?.displayName || "不明",
                  songs,
                };
              })
              .filter((a) => a.songs.length > 0);

            return (
              <div key={genre} className={styles.genreResultCard}>
                <h3 className={styles.genreResultTitle}>
                  {genre} ({genreAnswers.reduce((sum, a) => sum + a.songs.length, 0)}曲)
                </h3>

                {genreAnswers.length === 0 ? (
                  <p className={styles.emptyNotice}>このジャンルの応募はまだありません</p>
                ) : (
                  <div className={styles.songTableWrapper}>
                    <table className="list-table">
                      <thead>
                        <tr>
                          <th>曲名</th>
                          <th>応募者</th>
                          <th>楽譜状況</th>
                          <th>参考音源 / リンク</th>
                          <th>購入先・備考</th>
                        </tr>
                      </thead>
                      <tbody>
                        {genreAnswers.flatMap((ans) =>
                          ans.songs.map((song, sIdx) => {
                            const ytId = song.url ? extractYouTubeId(song.url) : "";
                            const statusName =
                              (song.scorestatus && scoreStatusMap[song.scorestatus]) ||
                              song.scorestatus ||
                              "-";

                            return (
                              <tr key={`${ans.uid}_${sIdx}`}>
                                <td style={{ fontWeight: 600 }}>{song.title}</td>
                                <td>{ans.userName}</td>
                                <td>{statusName}</td>
                                <td>
                                  {song.url ? (
                                    <a
                                      href={song.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: "#146081", textDecoration: "underline" }}
                                    >
                                      {ytId ? "YouTubeで開く" : "リンクを開く"}
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td>
                                  {song.purchase && (
                                    <div style={{ fontSize: "0.85rem" }}>
                                      <strong>購入:</strong> {song.purchase}
                                    </div>
                                  )}
                                  {song.note && (
                                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                                      {song.note}
                                    </div>
                                  )}
                                  {!song.purchase && !song.note && "-"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AnswerConfirmLayout>
    </BaseLayout>
  );
}
