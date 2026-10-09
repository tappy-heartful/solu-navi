"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckToSlot, faListOl, faGaugeHigh } from "@fortawesome/free-solid-svg-icons";
import { Vote } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { AnswerEditLayout } from "@/components/Layout/AnswerEditLayout";
import { buildYouTubeHtml, showDialog, showSpinner, hideSpinner, writeLog } from "@/lib/functions";
import { submitVoteAnswer } from "@/features/vote/api/vote-client-service";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Modal } from "@/components/Common/Modal";
import styles from "./VoteAnswer.module.css";

type Props = {
  vote: Vote;
  voteId: string;
};

export function VoteAnswerClient({ vote, voteId }: Props) {
  const router = useRouter();
  const { userData } = useAuth();
  const uid = userData?.uid || userData?.id;

  const [answers, setAnswers] = useState<Record<string, string | string[] | null>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const fetchExisting = async () => {
      const snap = await getDoc(doc(db, "voteAnswers", `${voteId}_${uid}`));
      if (snap.exists()) {
        const data = snap.data();
        const loadedAnswers = data.answers || {};

        vote.items.forEach((item) => {
          const ans = loadedAnswers[item.name];
          if (vote.type === "borda" && typeof ans === "string") {
            loadedAnswers[item.name] = [ans];
          } else if (vote.type !== "borda" && Array.isArray(ans)) {
            loadedAnswers[item.name] = ans[0] || null;
          }
        });

        setAnswers(loadedAnswers);
        setIsEdit(true);
      }
      setIsLoading(false);
    };
    fetchExisting();
  }, [uid, voteId, vote]);

  const handleChange = (itemName: string, choiceName: string) => {
    setAnswers((prev) => ({ ...prev, [itemName]: choiceName }));
  };

  const handleBordaClick = (itemName: string, choiceName: string, maxRanks: number) => {
    const current = (answers[itemName] as string[]) || [];
    if (current.includes(choiceName)) return;
    if (current.length >= maxRanks) return;

    setAnswers((prev) => ({ ...prev, [itemName]: [...current, choiceName] }));
  };

  const handleClearBorda = (itemName: string) => {
    setAnswers((prev) => ({ ...prev, [itemName]: [] }));
  };

  const handleYoutubeModal = (url: string, title: string) => {
    const html = buildYouTubeHtml(url, true, false);
    setModalTitle(title);
    setModalContent(<div dangerouslySetInnerHTML={{ __html: html }} />);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const errorItems: string[] = [];
    vote.items.forEach((item) => {
      const ans = answers[item.name];
      if (vote.type === "borda") {
        if (!ans || (ans as string[]).length === 0) errorItems.push(item.name);
      } else {
        if (!ans) errorItems.push(item.name);
      }
    });

    if (errorItems.length > 0) {
      await showDialog("すべての質問に回答してください。", true);
      return;
    }

    const confirmed = await showDialog(`回答を${isEdit ? "修正" : "登録"}しますか？`);
    if (!confirmed) return;

    showSpinner();
    try {
      await submitVoteAnswer(voteId, uid!, answers, userData?.displayName || "");
      hideSpinner();
      await writeLog({
        dataId: voteId,
        action: `曲投票回答${isEdit ? "修正" : "登録"}`,
      });
      await showDialog("回答を保存しました", true);
      router.refresh();
      showSpinner();
      router.push(`/vote/confirm?voteId=${voteId}`);
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId: voteId,
        action: `曲投票回答${isEdit ? "修正" : "登録"}`,
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("回答の保存に失敗しました", true);
    }
  };

  return (
    <BaseLayout>
      <AnswerEditLayout
        featureName="曲投票"
        icon="fa-solid fa-check-to-slot"
        basePath="/vote"
        featureIdKey="voteId"
        dataId={voteId}
        mode={isEdit ? "edit" : "new"}
        onSave={handleSave}
        isLoading={isLoading}
      >
        <div className={styles.voteHeader}>
          <h2 className={styles.voteTitle}>{vote.name}</h2>
          <p className={styles.voteDesc}>{vote.description}</p>
        </div>

        {vote.items.map((item, idx) => {
          const isBorda = vote.type === "borda";
          const maxRanks = vote.bordaConfig?.maxRanks || 3;
          const currentBordaList = (answers[item.name] as string[]) || [];

          return (
            <div key={item.name} className={styles.itemCard}>
              <div className={styles.itemHeader}>
                <span className={styles.itemIndex}>Q{idx + 1}</span>
                <span className={styles.itemName}>{item.name}</span>
                {item.link && (
                  <button
                    type="button"
                    onClick={() => handleYoutubeModal(item.link!, item.name)}
                    className={styles.ytLinkBtn}
                  >
                    参考音源
                  </button>
                )}
              </div>

              {isBorda && (
                <div className={styles.bordaHeader}>
                  <div className={styles.bordaGuide}>
                    <FontAwesomeIcon icon={faListOl} />
                    <span>希望順に最大 {maxRanks} 曲選択してください</span>
                  </div>
                  {currentBordaList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleClearBorda(item.name)}
                      className={styles.clearBordaBtn}
                    >
                      選択をリセット
                    </button>
                  )}
                </div>
              )}

              <div className={styles.choicesList}>
                {item.choices.map((choice) => {
                  const isChecked = isBorda
                    ? currentBordaList.includes(choice.name)
                    : answers[item.name] === choice.name;
                  const rankIndex = isBorda ? currentBordaList.indexOf(choice.name) : -1;

                  return (
                    <div
                      key={choice.name}
                      onClick={() => {
                        if (isBorda) {
                          handleBordaClick(item.name, choice.name, maxRanks);
                        } else {
                          handleChange(item.name, choice.name);
                        }
                      }}
                      className={`${styles.choiceRow} ${isChecked ? styles.selectedRow : ""}`}
                    >
                      <div className={styles.checkCol}>
                        {isBorda ? (
                          isChecked ? (
                            <span className={styles.rankBadge}>第{rankIndex + 1}希望</span>
                          ) : (
                            <div className={styles.emptyCircle} />
                          )
                        ) : (
                          <input
                            type="radio"
                            name={`choice_${idx}`}
                            checked={isChecked}
                            onChange={() => handleChange(item.name, choice.name)}
                            className={styles.radio}
                          />
                        )}
                      </div>

                      <div className={styles.choiceInfo}>
                        <div className={styles.choiceName}>{choice.name}</div>
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

                      {choice.link && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleYoutubeModal(choice.link!, choice.name);
                          }}
                          className={styles.choiceYtBtn}
                        >
                          試聴
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </AnswerEditLayout>

      {modalOpen && (
        <Modal title={modalTitle} onClose={() => setModalOpen(false)}>
          {modalContent}
        </Modal>
      )}
    </BaseLayout>
  );
}
