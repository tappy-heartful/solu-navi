"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckToSlot,
  faListOl,
  faCheckCircle,
  faPoll,
  faInfoCircle,
  faQuestionCircle,
  faGaugeHigh,
} from "@fortawesome/free-solid-svg-icons";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { AnswerConfirmLayout } from "@/components/Layout/AnswerConfirmLayout";
import { DisplayField } from "@/components/Form/DisplayField";
import { Vote, VoteAnswer } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  isInTerm,
  buildYouTubeHtml,
  extractYouTubeId,
  showDialog,
  showSpinner,
  hideSpinner,
  globalLineDefaultImage,
  writeLog,
} from "@/lib/functions";
import { deleteVoteWithAnswers, deleteMyVoteAnswer } from "@/features/vote/api/vote-client-service";
import { Modal } from "@/components/Common/Modal";
import styles from "./VoteConfirm.module.css";

type Props = {
  voteData: Vote;
  voteId: string;
  voteAnswers: VoteAnswer[];
  usersMap: Record<string, { name: string; pictureUrl: string }>;
};

export function VoteConfirmClient({ voteData, voteId, voteAnswers, usersMap }: Props) {
  const router = useRouter();
  const { userData, isAdmin } = useAuth();
  const uid = userData?.uid || userData?.id;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);

  const allVideoIds = useMemo(() => {
    const ids = new Set<string>();
    (voteData.items || []).forEach((item) => {
      if (item.link) {
        const id = extractYouTubeId(item.link);
        if (id && id.length === 11) ids.add(id);
      }
      item.choices.forEach((c) => {
        if (c.link) {
          const id = extractYouTubeId(c.link);
          if (id && id.length === 11) ids.add(id);
        }
      });
    });
    return Array.from(ids);
  }, [voteData.items]);

  const playlistUrl =
    allVideoIds.length > 0
      ? allVideoIds.length === 1
        ? `https://www.youtube.com/watch?v=${allVideoIds[0]}`
        : `https://www.youtube.com/watch_videos?video_ids=${allVideoIds.join(",")}`
      : "";

  const isActive = isInTerm(voteData.acceptStartDate, voteData.acceptEndDate);
  const myAnswer = voteAnswers.find((a) => a.uid === uid)?.answers || {};
  const hasAnswered = Object.keys(myAnswer).length > 0;
  const participantCount = voteAnswers.length;

  const statusClass = !isActive ? "closed" : hasAnswered ? "answered" : "pending";
  const statusText = !isActive ? "期間外" : hasAnswered ? "回答済" : "未回答";

  const handleAdminDelete = async () => {
    const confirmed = await showDialog("曲投票と全員の回答を削除しますか？\nこの操作は元に戻せません");
    if (!confirmed) return;
    const confirmedAgain = await showDialog("本当に削除しますか？");
    if (!confirmedAgain) return;

    showSpinner();
    try {
      await deleteVoteWithAnswers(voteId);
      hideSpinner();
      await writeLog({ dataId: voteId, action: "曲投票削除" });
      await showDialog("削除しました", true);
      router.refresh();
      showSpinner();
      router.push("/vote");
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId: voteId,
        action: "曲投票削除",
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
      await deleteMyVoteAnswer(voteId, uid);
      hideSpinner();
      await writeLog({ dataId: voteId, action: "曲投票回答取消" });
      await showDialog("回答を取り消しました", true);
      router.refresh();
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId: voteId,
        action: "曲投票回答取消",
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  const handleVoterModal = (itemTitle: string, choiceName: string) => {
    const voterUids = voteAnswers
      .filter((ans) => {
        const val = ans.answers[itemTitle];
        return Array.isArray(val) ? val.includes(choiceName) : val === choiceName;
      })
      .map((ans) => ans.uid);

    const votersContent = voterUids.map((vid) => {
      const user = usersMap[vid];
      const name = user ? user.name : "部員";
      const pic = user?.pictureUrl || globalLineDefaultImage;
      return (
        <div key={vid} className={styles.voterRow}>
          <img
            src={pic}
            alt={name}
            className={styles.voterAvatar}
            onError={(e) => {
              e.currentTarget.src = globalLineDefaultImage;
            }}
          />
          <span>{name}</span>
        </div>
      );
    });

    setModalTitle(`${choiceName} に投票した人`);
    setModalContent(<div>{votersContent}</div>);
    setModalOpen(true);
  };

  const handleYoutubeModal = (url: string, title: string) => {
    setModalTitle(title);
    setModalContent(
      <div dangerouslySetInnerHTML={{ __html: buildYouTubeHtml(url, true, false) }} />
    );
    setModalOpen(true);
  };

  const renderLink = (linkUrl: string | undefined, text: string) => {
    if (!linkUrl) return <>{text}</>;
    try {
      const u = new URL(linkUrl);
      if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
        return (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handleYoutubeModal(linkUrl, text);
            }}
            className={styles.itemLink}
          >
            {text}
          </a>
        );
      }
    } catch {}
    return (
      <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={styles.itemLink}>
        {text}
      </a>
    );
  };

  const answerMenuSlot = (
    <>
      <button
        type="button"
        className={styles.primaryBtn}
        onClick={() => {
          showSpinner();
          router.push(`/vote/answer?voteId=${voteId}`);
        }}
      >
        {hasAnswered ? "回答を修正する" : "回答する"}
      </button>
      {hasAnswered && (
        <button type="button" className={styles.deleteAnswerBtn} onClick={handleDeleteMyAnswer}>
          回答を取り消す
        </button>
      )}
    </>
  );

  const adminExtraSlot = (
    <button
      type="button"
      className={styles.linkEditBtn}
      onClick={() => {
        showSpinner();
        router.push(`/vote/link-edit?voteId=${voteId}`);
      }}
    >
      曲投票リンク設定
    </button>
  );

  const myPic = usersMap[uid || ""]?.pictureUrl || globalLineDefaultImage;
  const canViewResults = isAdmin || !voteData.hideVotes;
  const showVoterLink = canViewResults && !voteData.isAnonymous;

  return (
    <BaseLayout>
      <AnswerConfirmLayout
        name="曲投票"
        icon="fa-solid fa-check-to-slot"
        basePath="/vote"
        dataId={voteId}
        featureIdKey="voteId"
        answerStatus={statusClass}
        answerStatusText={statusText}
        isActive={isActive}
        onDelete={handleAdminDelete}
        answerMenuSlot={answerMenuSlot}
        adminExtraSlot={adminExtraSlot}
      >
        <DisplayField label="タイトル">{voteData.name}</DisplayField>
        <DisplayField label="説明" preWrap>
          {renderLink(voteData.descriptionLink, voteData.description)}
        </DisplayField>
        <DisplayField label="受付期間">
          {voteData.acceptStartDate} ～ {voteData.acceptEndDate}
        </DisplayField>
        <DisplayField label="作成者">{voteData.createdBy || "-"}</DisplayField>
        <DisplayField label="回答数">
          {isActive ? "受付中" : "期間外"}（{participantCount}人が回答済）
        </DisplayField>
        <DisplayField label="曲投票形式">
          {voteData.type === "borda" ? (
            <span style={{ color: "#146081", fontWeight: "bold" }}>
              <FontAwesomeIcon icon={faListOl} style={{ marginRight: "6px" }} />
              ボルダルール（最大{voteData.bordaConfig?.maxRanks}希望まで /{" "}
              {voteData.bordaConfig?.scoring === "weighted" ? "傾斜" : "線形"}配点）
            </span>
          ) : (
            <span>
              <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: "6px", color: "#10b981" }} />
              シンプル（1人1票）
            </span>
          )}
        </DisplayField>

        {isAdmin && voteData.hideVotes && (
          <p className={styles.adminNotice}>※「票数を非公開」のため曲投票結果は一般メンバーには見えていません</p>
        )}

        {/* 投票結果 */}
        <div className={styles.resultsContainer}>
          <div className={styles.resultsHeader}>
            <h3 className={styles.resultsTitle}>
              <FontAwesomeIcon icon={faPoll} style={{ color: "#146081", marginRight: "8px" }} />
              曲投票項目と結果
            </h3>
            {playlistUrl && (
              <a href={playlistUrl} target="_blank" rel="noreferrer" className={styles.playlistBadge}>
                <FontAwesomeIcon icon={faYoutube} />
                <span>全曲プレイリスト</span>
              </a>
            )}
          </div>

          <div className={styles.difficultyNotice}>
            <FontAwesomeIcon icon={faInfoCircle} style={{ color: "#146081" }} />
            <span>
              <strong>難易度 (Lv) について:</strong> 1（易）〜 10（難）の10段階で評価されています。
            </span>
          </div>

          {(voteData.items || []).map((item, idx) => {
            const isBorda = voteData.type === "borda";
            const maxRanks = voteData.bordaConfig?.maxRanks || 3;
            const scoring = voteData.bordaConfig?.scoring || "linear";

            const results: Record<string, number> = {};
            item.choices.forEach((c) => {
              results[c.name] = 0;
            });

            voteAnswers.forEach((ans) => {
              const answer = ans.answers[item.name];
              if (isBorda && Array.isArray(answer)) {
                answer.forEach((choiceName, rankIdx) => {
                  if (results[choiceName] !== undefined) {
                    let pts = 0;
                    if (scoring === "linear") {
                      pts = maxRanks - rankIdx;
                    } else {
                      const weights = [10, 6, 4, 3, 2, 1];
                      if (maxRanks === 3) pts = [5, 3, 1][rankIdx];
                      else pts = weights[rankIdx] || 1;
                    }
                    results[choiceName] += pts;
                  }
                });
              } else if (!isBorda && typeof answer === "string") {
                if (answer && results[answer] !== undefined) results[answer]++;
              }
            });

            const itemChoicesResults = item.choices.map((c) => results[c.name] || 0);
            const itemMaxVal = Math.max(...itemChoicesResults, 1);

            return (
              <div key={item.name} className={styles.itemCard}>
                <div className={styles.itemHeader}>
                  <FontAwesomeIcon icon={faQuestionCircle} />
                  <span>{renderLink(item.link, item.name)}</span>
                </div>
                <div className={styles.choicesBody}>
                  {item.choices.map((choice) => {
                    const val = results[choice.name] || 0;
                    const percent = canViewResults ? (val / itemMaxVal) * 100 : 0;
                    const isMyChoice = isBorda
                      ? ((myAnswer[item.name] as string[]) || []).includes(choice.name)
                      : myAnswer[item.name] === choice.name;
                    const myRank = isBorda
                      ? ((myAnswer[item.name] as string[]) || []).indexOf(choice.name)
                      : -1;
                    const canVoterLink = !isBorda && showVoterLink && val > 0;

                    return (
                      <div
                        key={choice.name}
                        className={`${styles.choiceRow} ${isMyChoice ? styles.myChoice : ""}`}
                      >
                        {/* Gauge */}
                        {canViewResults && (
                          <div
                            className={styles.gauge}
                            style={{ width: `${percent}%` }}
                          />
                        )}

                        {/* Status Icon */}
                        <div className={styles.statusCol}>
                          {isMyChoice ? (
                            <>
                              <img
                                src={myPic}
                                alt="あなた"
                                className={styles.myAvatar}
                                onError={(e) => {
                                  e.currentTarget.src = globalLineDefaultImage;
                                }}
                              />
                              {isBorda && myRank !== -1 && (
                                <span className={styles.rankBadge}>第{myRank + 1}希望</span>
                              )}
                            </>
                          ) : (
                            <div className={styles.emptyCircle} />
                          )}
                        </div>

                        {/* Info */}
                        <div className={styles.infoCol}>
                          <div className={styles.choiceTitle}>
                            {renderLink(choice.link, choice.name)}
                          </div>
                          {choice.difficulty !== undefined && choice.difficulty > 0 && (
                            <div className={styles.diffRow}>
                              <span className={styles.diffBadge}>
                                <FontAwesomeIcon icon={faGaugeHigh} style={{ fontSize: "0.6rem" }} />
                                Lv.{choice.difficulty}
                              </span>
                              <div className={styles.diffBar}>
                                <div
                                  className={styles.diffFill}
                                  style={{
                                    width: `${choice.difficulty * 10}%`,
                                    backgroundColor:
                                      choice.difficulty >= 8
                                        ? "#ef4444"
                                        : choice.difficulty >= 5
                                        ? "#f59e0b"
                                        : "#10b981",
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Points / Votes */}
                        {canViewResults && (
                          <div className={styles.scoreCol}>
                            {canVoterLink ? (
                              <button
                                type="button"
                                className={styles.voterBtn}
                                onClick={() => handleVoterModal(item.name, choice.name)}
                              >
                                {val}票
                              </button>
                            ) : (
                              <span className={styles.scoreText}>
                                {val} {isBorda ? "pt" : "票"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </AnswerConfirmLayout>

      {modalOpen && (
        <Modal title={modalTitle} onClose={() => setModalOpen(false)}>
          {modalContent}
        </Modal>
      )}
    </BaseLayout>
  );
}
