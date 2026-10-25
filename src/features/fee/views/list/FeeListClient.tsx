"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { Fee, FeePayment } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import styles from "./FeeListClient.module.css";

interface FeeListClientProps {
  initialFees: Fee[];
  totalUserCount: number;
}

export function FeeListClient({ initialFees, totalUserCount }: FeeListClientProps) {
  const { userData, isAdmin } = useAuth();
  const uid = userData?.uid || userData?.id;
  const { setBreadcrumbs } = useBreadcrumb();

  const [paymentsMap, setPaymentsMap] = useState<Record<string, FeePayment[]>>({});
  const [loadingPayments, setLoadingPayments] = useState(true);

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "部費・会計管理" },
    ]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    const fetchAllPayments = async () => {
      try {
        const snap = await getDocs(collection(db, "feePayments"));
        const map: Record<string, FeePayment[]> = {};
        snap.docs.forEach((doc) => {
          const p = { id: doc.id, ...doc.data() } as FeePayment;
          if (!map[p.feeId]) map[p.feeId] = [];
          map[p.feeId].push(p);
        });
        setPaymentsMap(map);
      } catch (err) {
        console.error("fetchAllPayments error:", err);
      } finally {
        setLoadingPayments(false);
      }
    };
    fetchAllPayments();
  }, []);

  // 集金中・集金済みの分類
  const { activeFees, completedFees } = React.useMemo(() => {
    const active: Fee[] = [];
    const completed: Fee[] = [];

    initialFees.forEach((fee) => {
      const payments = paymentsMap[fee.id] || [];
      const targetCount =
        fee.targetUserIds && fee.targetUserIds.length > 0
          ? fee.targetUserIds.length
          : totalUserCount;

      const paidCount = payments.filter((p) => {
        if (fee.targetUserIds && fee.targetUserIds.length > 0) {
          return (
            fee.targetUserIds.includes(p.uid) &&
            (p.status === "paid" || p.status === "exempt")
          );
        }
        return p.status === "paid" || p.status === "exempt";
      }).length;

      const isCompleted = targetCount > 0 && paidCount >= targetCount;
      if (isCompleted) {
        completed.push(fee);
      } else {
        active.push(fee);
      }
    });

    return { activeFees: active, completedFees: completed };
  }, [initialFees, paymentsMap, totalUserCount]);

  const renderFeeCard = (fee: Fee) => {
    const payments = paymentsMap[fee.id] || [];
    const isTargetUser =
      fee.targetUserIds && fee.targetUserIds.length > 0
        ? fee.targetUserIds.includes(uid || "")
        : true;

    const targetCount =
      fee.targetUserIds && fee.targetUserIds.length > 0
        ? fee.targetUserIds.length
        : totalUserCount;

    const paidCount = payments.filter((p) => {
      if (fee.targetUserIds && fee.targetUserIds.length > 0) {
        return (
          fee.targetUserIds.includes(p.uid) &&
          (p.status === "paid" || p.status === "exempt")
        );
      }
      return p.status === "paid" || p.status === "exempt";
    }).length;

    const percent = targetCount > 0 ? Math.round((paidCount / targetCount) * 100) : 0;

    const myPayment = payments.find((p) => p.uid === uid);
    const isPaid = myPayment?.status === "paid";
    const isExempt = myPayment?.status === "exempt";

    return (
      <Link
        key={fee.id}
        href={`/fee/confirm?feeId=${fee.id}`}
        prefetch={false}
        className={styles.feeCard}
      >
        <div className={styles.cardHeader}>
          <div className={styles.titleGroup}>
            <h3 className={styles.feeTitle}>{fee.title}</h3>
            <div className={styles.dueDate}>
              <i className="fa-regular fa-calendar-check" />
              支払期日: {fee.dueDate}
            </div>
          </div>
          <div className={styles.amountBadge}>¥{fee.amount.toLocaleString()}</div>
        </div>

        <div className={styles.myStatusRow}>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>あなたの納入状況:</span>
          {!isTargetUser ? (
            <span style={{ color: "#64748b", fontWeight: 600, fontSize: "0.85rem" }}>
              ➖ 対象外
            </span>
          ) : isPaid ? (
            <span className={styles.statusPaid}>
              <i className="fa-solid fa-circle-check" /> 納入済み
            </span>
          ) : isExempt ? (
            <span className={styles.statusExempt}>
              <i className="fa-solid fa-circle-minus" /> 免除
            </span>
          ) : (
            <span className={styles.statusUnpaid}>
              <i className="fa-solid fa-triangle-exclamation" /> 未納
            </span>
          )}
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressLabelRow}>
            <span>全体の納入進捗</span>
            <span>
              {paidCount} / {targetCount} 人 ({percent}%)
            </span>
          </div>
          <div className={styles.progressBarBg}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>
      </Link>
    );
  };

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>
          <i className="fa-solid fa-coins" style={{ marginRight: "0.5rem" }} />
          部費・集金管理
        </h1>
      </div>

      <div className="container">
        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <Link
              href="/fee/edit?mode=new"
              prefetch={false}
              className="save-button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
                padding: "10px 18px",
                borderRadius: "8px",
                backgroundColor: "var(--primary-color, #146081)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              <i className="fa-solid fa-plus" />
              新しい集金・部費を登録
            </Link>
          </div>
        )}

        {initialFees.length === 0 ? (
          <div className={styles.emptyState}>
            <i
              className="fa-solid fa-coins"
              style={{ fontSize: "2.5rem", marginBottom: "12px", display: "block", opacity: 0.5 }}
            />
            現在募集中の部費・集金はありません🍀
          </div>
        ) : (
          <div className={styles.sectionsContainer}>
            {/* 1. 集金中エリア */}
            <section className={styles.sectionArea}>
              <div className={styles.sectionHeader}>
                <h2 className={`${styles.sectionTitle} ${styles.activeTitle}`}>
                  <i className="fa-solid fa-hourglass-half" style={{ color: "#0284c7" }} />
                  集金中
                  <span className={styles.countBadge}>{activeFees.length}</span>
                </h2>
              </div>

              {activeFees.length === 0 ? (
                <div className={styles.sectionEmptyState}>
                  現在集金中の部費・集金はありません🍀
                </div>
              ) : (
                <div className={styles.cardList}>
                  {activeFees.map((fee) => renderFeeCard(fee))}
                </div>
              )}
            </section>

            {/* 2. 集金済みエリア */}
            <section className={styles.sectionArea}>
              <div className={styles.sectionHeader}>
                <h2 className={`${styles.sectionTitle} ${styles.completedTitle}`}>
                  <i className="fa-solid fa-circle-check" style={{ color: "#10b981" }} />
                  集金済み
                  <span className={styles.countBadge}>{completedFees.length}</span>
                </h2>
              </div>

              {completedFees.length === 0 ? (
                <div className={styles.sectionEmptyState}>
                  集金済みの履歴はありません
                </div>
              ) : (
                <div className={styles.cardList}>
                  {completedFees.map((fee) => renderFeeCard(fee))}
                </div>
              )}
            </section>
          </div>
        )}

        <div className="page-footer" style={{ textAlign: "center", margin: "2rem 0" }}>
          <Link href="/" prefetch={false} className="back-link">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </BaseLayout>
  );
}
