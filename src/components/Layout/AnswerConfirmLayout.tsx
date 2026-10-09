"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormFooter } from "../Form/FormFooter";
import { DetailActionButtons } from "../Form/DetailActionButtons";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { showDialog, archiveAndDeleteDoc, writeLog, showSpinner, hideSpinner } from "@/lib/functions";
import styles from "./AnswerConfirmLayout.module.css";

export type AnswerStatusType = "answered" | "pending" | "closed";

type Props = {
  name: string;
  icon?: string;
  basePath: string;
  dataId: string;
  featureIdKey: string;
  collectionName?: string;
  answerStatus: AnswerStatusType;
  answerStatusText: string;
  isActive: boolean;
  onDelete?: () => Promise<void>;
  afterDeletePath?: string;
  hideCopy?: boolean;
  answerMenuSlot?: React.ReactNode;
  adminExtraSlot?: React.ReactNode;
  children: React.ReactNode;
};

export const AnswerConfirmLayout = ({
  name,
  icon,
  basePath,
  dataId,
  featureIdKey,
  collectionName,
  answerStatus,
  answerStatusText,
  isActive,
  onDelete,
  afterDeletePath,
  hideCopy,
  answerMenuSlot,
  adminExtraSlot,
  children,
}: Props) => {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: `${name}一覧`, href: basePath },
      { label: `${name}確認` },
    ]);
  }, [setBreadcrumbs, name, basePath]);

  const handleDelete = async () => {
    try {
      if (onDelete) {
        showSpinner();
        await onDelete();
        hideSpinner();
        return;
      }
      if (!collectionName) return;
      const confirmed = await showDialog(`この${name}を削除しますか？\nこの操作は元に戻せません。`);
      if (!confirmed) return;

      showSpinner();
      await archiveAndDeleteDoc(collectionName, dataId);
      hideSpinner();
      await writeLog({ dataId, action: `${name}削除` });
      await showDialog("削除しました", true);

      showSpinner();
      router.push(afterDeletePath ?? basePath);
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId,
        action: `${name}削除`,
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("削除に失敗しました", true);
    }
  };

  const onEdit = () => {
    showSpinner();
    router.push(`${basePath}/edit?mode=edit&${featureIdKey}=${dataId}`);
  };

  const onCopy = () => {
    showSpinner();
    router.push(`${basePath}/edit?mode=copy&${featureIdKey}=${dataId}`);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {icon && <i className={`${icon} ${styles.icon}`} />}
          <span>{name}確認</span>
        </h1>
      </div>

      <div className={styles.container}>
        {/* 回答ステータスバッジ */}
        <div className={styles.statusContainer}>
          <span className={`${styles.statusBadge} ${styles[answerStatus]}`}>
            {answerStatusText}
          </span>
        </div>

        {children}

        {/* 回答メニュー（受付中のみ） */}
        {isActive && answerMenuSlot && (
          <div className={styles.answerMenuSection}>
            <h2 className={styles.menuTitle}>回答メニュー</h2>
            <div className={styles.buttonRow}>{answerMenuSlot}</div>
          </div>
        )}

        {/* 管理者メニュー */}
        {isAdmin && (
          <>
            <DetailActionButtons
              show={isAdmin}
              onEdit={onEdit}
              onCopy={onCopy}
              onDelete={handleDelete}
              hideCopy={hideCopy}
            />
            {adminExtraSlot && (
              <div className={styles.adminExtraSection}>
                <div className={styles.buttonRow}>{adminExtraSlot}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className={styles.footer}>
        <FormFooter backHref={basePath} backText={`${name}一覧に戻る`} />
      </div>
    </div>
  );
};
