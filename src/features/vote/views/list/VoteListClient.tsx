"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckToSlot, faClock, faCalendarCheck } from "@fortawesome/free-solid-svg-icons";
import { Vote } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { writeLog } from "@/lib/functions";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { ListBaseLayout } from "@/components/Layout/ListBaseLayout";
import { SimpleTable } from "@/components/Table/SimpleTable";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import styles from "./VoteList.module.css";

type Props = {
  votes: Vote[];
  participantCountMap: Record<string, number>;
};

const TABLE_HEADERS = ["曲投票名", "状況", "回答数", "受付期間", "曲投票項目"];

export function VoteListClient({ votes, participantCountMap }: Props) {
  const { isAdmin, userData } = useAuth();
  const uid = userData?.uid || userData?.id;

  const [answeredVoteIds, setAnsweredVoteIds] = useState<Record<string, boolean>>({});

  const { upcomingList, activeList, closedList } = useMemo(() => {
    const upcoming: Vote[] = [];
    const active: Vote[] = [];
    const closed: Vote[] = [];
    const now = Date.now();

    votes.forEach((v) => {
      const start = v.acceptStartDate
        ? new Date(`${v.acceptStartDate.replace(/\./g, "-")}T00:00:00+09:00`).getTime()
        : 0;
      const end = v.acceptEndDate
        ? new Date(`${v.acceptEndDate.replace(/\./g, "-")}T23:59:59+09:00`).getTime()
        : Infinity;

      if (now < start) {
        upcoming.push(v);
      } else if (now > end) {
        closed.push(v);
      } else {
        active.push(v);
      }
    });

    return { upcomingList: upcoming, activeList: active, closedList: closed };
  }, [votes]);

  useEffect(() => {
    if (!uid) return;
    const fetchAnswers = async () => {
      try {
        const q = query(collection(db, "voteAnswers"), where("uid", "==", uid));
        const snap = await getDocs(q);
        const results: Record<string, boolean> = {};
        snap.forEach((doc) => {
          results[doc.data().voteId] = true;
        });
        setAnsweredVoteIds(results);
      } catch (e) {
        console.error("Failed to fetch vote answers", e);
        await writeLog({
          dataId: uid || "unknown",
          action: "投票回答状況取得",
          status: "error",
          errorDetail: { message: (e as Error).message },
        });
      }
    };
    fetchAnswers();
  }, [uid]);

  const renderRow = (vote: Vote, defaultStatus?: string) => {
    const participantCount = participantCountMap[vote.id] || 0;
    const isAnswered = answeredVoteIds[vote.id];
    const statusText = defaultStatus || (isAnswered ? "回答済" : "未回答");
    const statusCls = defaultStatus ? "closed" : isAnswered ? "answered" : "pending";

    const itemsSummary = (vote.items || []).map((i) => i.name).join("、");

    return (
      <tr key={vote.id}>
        <td>
          <Link href={`/vote/confirm?voteId=${vote.id}`} prefetch={false} className={styles.rowTitle}>
            {vote.name}
          </Link>
        </td>
        <td>
          <span className={`${styles.statusBadge} ${styles[statusCls]}`}>
            {statusText}
          </span>
        </td>
        <td className={styles.countCol}>{participantCount}人</td>
        <td className={styles.termCol}>
          {vote.acceptStartDate} ～<br />
          {vote.acceptEndDate}
        </td>
        <td className={styles.itemsCol}>{itemsSummary || "-"}</td>
      </tr>
    );
  };

  return (
    <BaseLayout>
      <ListBaseLayout
        title="曲投票"
        icon="fa-solid fa-check-to-slot"
        basePath="/vote"
        hideAddButton={!isAdmin}
      >
        {/* 受付中 */}
        <div className={styles.sectionContainer}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faCheckToSlot} className={styles.sectionIcon} />
            受付中
          </h3>
          <SimpleTable
            headers={TABLE_HEADERS}
            hasData={activeList.length > 0}
            emptyMessage="受付中の曲投票はありません"
          >
            {activeList.map((v) => renderRow(v))}
          </SimpleTable>
        </div>

        {/* 開始前 */}
        {upcomingList.length > 0 && (
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <FontAwesomeIcon icon={faClock} className={styles.sectionIcon} />
              開始前
            </h3>
            <SimpleTable headers={TABLE_HEADERS} hasData={upcomingList.length > 0}>
              {upcomingList.map((v) => renderRow(v, "開始前"))}
            </SimpleTable>
          </div>
        )}

        {/* 終了 */}
        {closedList.length > 0 && (
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <FontAwesomeIcon icon={faCalendarCheck} className={styles.sectionIcon} />
              終了
            </h3>
            <SimpleTable headers={TABLE_HEADERS} hasData={closedList.length > 0}>
              {closedList.map((v) => renderRow(v, "終了"))}
            </SimpleTable>
          </div>
        )}
      </ListBaseLayout>
    </BaseLayout>
  );
}
