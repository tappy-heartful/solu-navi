"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { DisplayField } from "@/components/Form/DisplayField";
import { Fee, FeePayment, User } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { updateFeePaymentStatus } from "@/features/fee/api/fee-client-service";
import { sendFeeRemindAction } from "@/features/fee/api/fee-notification-server-actions";
import {
  showDialog,
  showSpinner,
  hideSpinner,
  archiveAndDeleteDoc,
  getGradeFromEnrollmentYear,
} from "@/lib/functions";
import { DEFAULT_SECTIONS } from "@/lib/firestore/constants";
import styles from "./FeeConfirmClient.module.css";

interface FeeConfirmClientProps {
  fee: Fee;
  initialPayments: FeePayment[];
  users: User[];
  feeId: string;
}

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
      { label: fee?.title ? `部費詳細 (${fee.title})` : "部費詳細" },
    ]);
  }, [setBreadcrumbs, fee?.title]);

  const [payments, setPayments] = useState<Record<string, FeePayment>>(() => {
    const map: Record<string, FeePayment> = {};
    initialPayments.forEach((p) => {
      map[p.uid] = p;
    });
    return map;
  });

  const [isSendingRemind, setIsSendingRemind] = useState(false);

  const myPayment = payments[uid || ""];
  const isMyPaid = myPayment?.status === "paid";
  const isMyExempt = myPayment?.status === "exempt";

  // 未払い部員の計算
  const unpaidUsers = users.filter((u) => {
    const userUid = u.uid || u.id;
    if (!userUid) return false;
    const p = payments[userUid];
    return !p || (p.status !== "paid" && p.status !== "exempt");
  });

  const handleStatusChange = async (
    targetUid: string,
    newStatus: "unpaid" | "paid" | "exempt"
  ) => {
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

  const handleSendRemind = async () => {
    if (unpaidUsers.length === 0) {
      showDialog("未払いの部員はいません（全員納入済み、または免除です）。", true);
      return;
    }

    const ok = await showDialog(
      `未納の部員（${unpaidUsers.length}名）にLINE催促通知を一括送信しますか？\n（未納者のみに届きます）`
    );
    if (!ok) return;

    try {
      setIsSendingRemind(true);
      showSpinner();
      const res = await sendFeeRemindAction(feeId);
      hideSpinner();
      setIsSendingRemind(false);
      await showDialog(res.message, true);
    } catch (err: any) {
      hideSpinner();
      setIsSendingRemind(false);
      showDialog(`送信に失敗しました: ${err.message}`, true);
    }
  };

  const handleDeleteFee = async () => {
    const ok = await showDialog(
      `「${fee.title}」を削除しますか？\n（履歴はアーカイブに保存されます）`
    );
    if (!ok) return;

    try {
      showSpinner();
      await archiveAndDeleteDoc("fees", feeId);
      hideSpinner();
      await showDialog("部費案件を削除しました。", true);
      router.push("/fee");
      router.refresh();
    } catch (err: any) {
      hideSpinner();
      showDialog(`削除に失敗しました: ${err.message}`, true);
    }
  };

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>
          <i className="fa-solid fa-coins" style={{ marginRight: "0.5rem" }} />
          部費・集金詳細
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
              }}
            >
              <i className="fa-solid fa-pen-to-square" style={{ marginRight: "4px" }} />
              編集
            </Link>
            <button
              type="button"
              onClick={handleDeleteFee}
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
        <div className={styles.myStatusCard}>
          <div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "4px" }}>
              あなたの支払状況
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
              {isMyPaid ? (
                <span style={{ color: "#10b981" }}>
                  <i className="fa-solid fa-circle-check" /> 納入済みです（ありがとうございます！）
                </span>
              ) : isMyExempt ? (
                <span style={{ color: "#64748b" }}>
                  <i className="fa-solid fa-circle-minus" /> 納入免除
                </span>
              ) : (
                <span style={{ color: "#ef4444" }}>
                  <i className="fa-solid fa-triangle-exclamation" /> 未納です（期日: {fee.dueDate}）
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 会計係・管理者向け: 部員別納入一覧 & LINE催促 */}
        {isAdmin && (
          <div style={{ marginTop: "2rem" }}>
            <div className={styles.adminActionBar}>
              <h3 style={{ margin: 0 }}>
                <i className="fa-solid fa-users" style={{ marginRight: "0.5rem" }} />
                部員の納入管理 ({users.length - unpaidUsers.length} / {users.length}名 納入済)
              </h3>
              <button
                type="button"
                className={styles.remindBtn}
                onClick={handleSendRemind}
                disabled={isSendingRemind || unpaidUsers.length === 0}
              >
                <i className="fa-brands fa-line" />
                未払い者へLINE催促通知を送る ({unpaidUsers.length}名)
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.paymentTable}>
                <thead>
                  <tr>
                    <th>部員名</th>
                    <th>パート</th>
                    <th>学年</th>
                    <th>納入状況</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const targetUid = u.uid || u.id;
                    if (!targetUid) return null;
                    const payment = payments[targetUid];
                    const status = payment?.status || "unpaid";
                    const sectionName =
                      DEFAULT_SECTIONS.find((s) => s.id === u.sectionId)?.shortName || "-";
                    const grade = u.enrollmentYear
                      ? getGradeFromEnrollmentYear(u.enrollmentYear)
                      : "-";

                    let selectClass = styles.unpaidSelect;
                    if (status === "paid") selectClass = styles.paidSelect;
                    if (status === "exempt") selectClass = styles.exemptSelect;

                    return (
                      <tr key={targetUid}>
                        <td style={{ fontWeight: 600 }}>{u.displayName || "名前未設定"}</td>
                        <td>{sectionName}</td>
                        <td>{grade}</td>
                        <td>
                          <select
                            className={`${styles.statusSelect} ${selectClass}`}
                            value={status}
                            onChange={(e) =>
                              handleStatusChange(
                                targetUid,
                                e.target.value as "unpaid" | "paid" | "exempt"
                              )
                            }
                          >
                            <option value="unpaid">❌ 未払い</option>
                            <option value="paid">✅ 支払済</option>
                            <option value="exempt">➖ 免除</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="page-footer" style={{ textAlign: "center", margin: "2rem 0" }}>
          <Link href="/fee" prefetch={false} className="back-link">
            ← 部費・集金一覧に戻る
          </Link>
        </div>
      </div>
    </BaseLayout>
  );
}
