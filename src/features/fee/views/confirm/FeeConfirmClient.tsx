"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCoins,
  faPenToSquare,
  faTrash,
  faCircleCheck,
  faCircleMinus,
  faTriangleExclamation,
  faUsers,
  faUserGear,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { DisplayField } from "@/components/Form/DisplayField";
import { Fee, FeePayment, User, SectionDoc } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import {
  updateFeePaymentStatus,
  updateFeeTargetUsers,
} from "@/features/fee/api/fee-client-service";
import { FeeTargetUsersModal } from "@/features/fee/components/FeeTargetUsersModal";
import {
  showDialog,
  showSpinner,
  hideSpinner,
} from "@/lib/functions";
import { DEFAULT_SECTIONS } from "@/lib/firestore/constants";
import styles from "./FeeConfirmClient.module.css";

interface FeeConfirmClientProps {
  fee: Fee;
  initialPayments: FeePayment[];
  users: User[];
  feeId: string;
}

// パートごとの絵文字
const SECTION_ICONS: Record<string, string> = {
  "1": "🎷",
  "2": "🎺",
  "3": "📯",
  "4": "🥁",
};

export function FeeConfirmClient({
  fee,
  initialPayments,
  users,
  feeId,
}: FeeConfirmClientProps) {
  const router = useRouter();
  const { userData, isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const uid = userData?.uid || userData?.id;

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "部費・集金管理", href: "/fee" },
      { label: fee?.title ? `部費・集金確認 (${fee.title})` : "部費・集金確認" },
    ]);
  }, [setBreadcrumbs, fee?.title]);

  const [payments, setPayments] = useState<Record<string, FeePayment>>(() => {
    const map: Record<string, FeePayment> = {};
    initialPayments.forEach((p) => {
      map[p.uid] = p;
    });
    return map;
  });

  // 対象者リストのステート（モーダルで変更時に即反映）
  const [targetUserIds, setTargetUserIds] = useState<string[] | null>(() => {
    if (fee.targetUserIds && Array.isArray(fee.targetUserIds) && fee.targetUserIds.length > 0) {
      return fee.targetUserIds;
    }
    return null;
  });

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  // 集金対象者の特定
  const targetUsers = useMemo(() => {
    return users.filter((u) => {
      const uUid = u.uid || u.id;
      if (!uUid) return false;
      if (targetUserIds) {
        return targetUserIds.includes(uUid);
      }
      return true;
    });
  }, [users, targetUserIds]);

  // 自分の支払状況と対象可否
  const isTargetUser = targetUserIds ? targetUserIds.includes(uid || "") : true;
  const myPayment = payments[uid || ""];
  const isMyPaid = myPayment?.status === "paid";
  const isMyExempt = myPayment?.status === "exempt";

  // 全体集金サマリー
  const totalTargetCount = targetUsers.length;
  const totalPaidCount = targetUsers.filter((u) => {
    const p = payments[u.uid || u.id || ""];
    return p?.status === "paid" || p?.status === "exempt";
  }).length;
  const totalUnpaidCount = totalTargetCount - totalPaidCount;

  // パートごとに集金対象者をグループ化
  const groupedBySection = useMemo(() => {
    const groups: {
      section: SectionDoc;
      sectionUsers: User[];
    }[] = [];

    DEFAULT_SECTIONS.forEach((sec) => {
      const secUsers = targetUsers
        .filter((u) => u.sectionId === sec.id)
        .sort((a, b) => {
          const rA = a.roleId || "99";
          const rB = b.roleId || "99";
          if (rA !== rB) return rA.localeCompare(rB);
          return (a.displayName || "").localeCompare(b.displayName || "");
        });

      if (secUsers.length > 0) {
        groups.push({
          section: sec,
          sectionUsers: secUsers,
        });
      }
    });

    // パート未設定の部員
    const otherUsers = targetUsers.filter(
      (u) => !DEFAULT_SECTIONS.some((sec) => sec.id === u.sectionId)
    );
    if (otherUsers.length > 0) {
      groups.push({
        section: {
          id: "other",
          name: "その他・未設定",
          shortName: "他",
          order: 999,
          color: "#64748b",
        },
        sectionUsers: otherUsers,
      });
    }

    return groups;
  }, [targetUsers]);

  // チェックボックスによる支払ステータス即時トグル（管理者用）
  const handleTogglePaymentStatus = async (targetUid: string) => {
    if (!isAdmin) return;

    const currentStatus = payments[targetUid]?.status || "unpaid";
    const newStatus: "unpaid" | "paid" = currentStatus === "paid" ? "unpaid" : "paid";

    try {
      showSpinner();
      await updateFeePaymentStatus(feeId, targetUid, newStatus);
      setPayments((prev) => ({
        ...prev,
        [targetUid]: {
          ...prev[targetUid],
          id: `${feeId}_${targetUid}`,
          feeId,
          uid: targetUid,
          status: newStatus,
          paidAt: newStatus === "paid" ? Date.now() : undefined,
        },
      }));
      hideSpinner();
    } catch (err: any) {
      hideSpinner();
      showDialog(`更新に失敗しました: ${err.message}`, true);
    }
  };

  // 集金対象者の更新（モーダルから保存）
  const handleSaveTargetUsers = async (newSelectedIds: string[]) => {
    try {
      showSpinner();
      await updateFeeTargetUsers(feeId, newSelectedIds);
      setTargetUserIds(newSelectedIds);
      hideSpinner();
      await showDialog("集金対象者を更新しました。", true);
    } catch (err: any) {
      hideSpinner();
      showDialog(`対象者の更新に失敗しました: ${err.message}`, true);
    }
  };

  // 案件削除（管理者用）
  const handleDeleteFee = async () => {
    const ok = await showDialog(
      `「${fee.title}」を削除しますか？\n（履歴はアーカイブに保存されます）`
    );
    if (!ok) return;

    try {
      showSpinner();
      const { archiveAndDeleteDoc } = await import("@/lib/functions");
      await archiveAndDeleteDoc("fees", feeId);
      hideSpinner();
      await showDialog("部費案件を削除しました", true);
      router.push("/fee");
    } catch (err: any) {
      hideSpinner();
      showDialog(`削除に失敗しました: ${err.message}`, true);
    }
  };

  return (
    <BaseLayout>
      <div className="container">
        {/* 管理者用操作ボタン */}
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
              href={`/fee/edit?mode=edit&feeId=${feeId}`}
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
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FontAwesomeIcon icon={faPenToSquare} />
              編集
            </Link>
            <button
              type="button"
              onClick={handleDeleteFee}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#dc2626",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FontAwesomeIcon icon={faTrash} />
              削除
            </button>
          </div>
        )}

        {/* 案件概要カード */}
        <div className={styles.infoCard}>
          <div className={styles.titleRow}>
            <h2 className={styles.feeTitle}>{fee.title}</h2>
            <div className={styles.amount}>¥{fee.amount.toLocaleString()}</div>
          </div>

          <DisplayField label="支払期日">{fee.dueDate}</DisplayField>

          {fee.description && (
            <DisplayField label="案内・備考" preWrap>
              {fee.description}
            </DisplayField>
          )}
        </div>

        {/* 自分の支払状況案内 */}
        {isTargetUser ? (
          <div className={styles.myStatusCard}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>
                あなたの支払状況
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                {isMyPaid ? (
                  <span style={{ color: "#10b981", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <FontAwesomeIcon icon={faCircleCheck} /> 納入済みです（ありがとうございます！）
                  </span>
                ) : isMyExempt ? (
                  <span style={{ color: "#64748b", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <FontAwesomeIcon icon={faCircleMinus} /> 納入免除
                  </span>
                ) : (
                  <span style={{ color: "#ef4444", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <FontAwesomeIcon icon={faTriangleExclamation} /> 未納です（期日: {fee.dueDate}）
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.notTargetCard}>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>
              あなたの支払状況
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700 }}>
              <span>ℹ️ あなたはこの集金案件の対象外です（納入の必要はありません）</span>
            </div>
          </div>
        )}

        {/* 全体サマリー統計カード */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryBox}>
            <span className={styles.summaryLabel}>対象人数</span>
            <span className={styles.summaryValue}>{totalTargetCount}名</span>
          </div>
          <div className={styles.summaryBox}>
            <span className={styles.summaryLabel}>納入済</span>
            <span className={`${styles.summaryValue} ${styles.summaryPaid}`}>
              {totalPaidCount}名
            </span>
          </div>
          <div className={styles.summaryBox}>
            <span className={styles.summaryLabel}>未納者数</span>
            <span className={`${styles.summaryValue} ${styles.summaryUnpaid}`}>
              {totalUnpaidCount}名
            </span>
          </div>
          <div className={styles.summaryBox}>
            <span className={styles.summaryLabel}>集金進捗</span>
            <span className={styles.summaryValue}>
              {totalTargetCount > 0
                ? `${Math.round((totalPaidCount / totalTargetCount) * 100)}%`
                : "0%"}
            </span>
          </div>
        </div>

        {/* 集金状況（パート別） - モーダル同様のシンプル構成 */}
        <div style={{ marginTop: "2rem" }}>
          <div className={styles.adminActionBar}>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
              <FontAwesomeIcon icon={faUsers} style={{ marginRight: "0.5rem", color: "#146081" }} />
              集金状況（パート別）
            </h3>

            {/* streak-navi 準拠の「集金対象者を設定」ボタン */}
            {isAdmin && (
              <button
                type="button"
                className={styles.memberManageBtn}
                onClick={() => setIsTargetModalOpen(true)}
                title="集金対象者を設定する"
              >
                <FontAwesomeIcon icon={faUserGear} />
                集金対象者を設定
              </button>
            )}
          </div>

          {/* モーダル完全準拠のシンプルリストカード */}
          <div className={styles.statusContainer}>
            {groupedBySection.map(({ section, sectionUsers }) => {
              const icon = SECTION_ICONS[section.id] || "🎵";

              return (
                <div key={section.id} className={styles.sectionBlock}>
                  {/* パート見出し */}
                  <h4 className={styles.sectionHeader}>
                    <span>{icon}</span> {section.name}
                  </h4>

                  {/* パート内メンバー（チェックボックス、アバター、名前のみ） */}
                  <div className={styles.memberList}>
                    {sectionUsers.map((u) => {
                      const targetUid = u.uid || u.id;
                      if (!targetUid) return null;
                      const isPaid = payments[targetUid]?.status === "paid";

                      return (
                        <label
                          key={targetUid}
                          className={`${styles.memberItem} ${isAdmin ? styles.clickable : ""}`}
                          onClick={(e) => {
                            if (isAdmin) {
                              e.preventDefault();
                              handleTogglePaymentStatus(targetUid);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={isPaid}
                            disabled={!isAdmin}
                            onChange={() => {}}
                            id={`payment-${targetUid}`}
                          />
                          {u.pictureUrl ? (
                            <img
                              src={u.pictureUrl}
                              alt=""
                              className={styles.avatar}
                            />
                          ) : (
                            <div className={styles.defaultAvatar}>
                              <FontAwesomeIcon icon={faUser} />
                            </div>
                          )}
                          <span className={styles.memberName}>
                            {u.displayName || "不明なユーザー"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="page-footer" style={{ textAlign: "center", margin: "2.5rem 0" }}>
          <Link href="/fee" prefetch={false} className="back-link">
            ← 部費・集金一覧に戻る
          </Link>
        </div>
      </div>

      {/* 集金対象者設定モーダル */}
      <FeeTargetUsersModal
        isOpen={isTargetModalOpen}
        initialTargetUserIds={targetUserIds || undefined}
        users={users}
        onClose={() => setIsTargetModalOpen(false)}
        onSave={handleSaveTargetUsers}
      />
    </BaseLayout>
  );
}
