"use client";

import React from "react";
import styles from "./DetailActionButtons.module.css";

type Props = {
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  show: boolean;
  hideCopy?: boolean;
  hideEdit?: boolean;
  hideDelete?: boolean;
};

export const DetailActionButtons = ({
  onEdit,
  onCopy,
  onDelete,
  show,
  hideCopy,
  hideEdit,
  hideDelete,
}: Props) => {
  if (!show) return null;
  if (hideEdit && hideCopy && hideDelete) return null;

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>管理メニュー</h2>
      <div className={styles.buttons}>
        {!hideEdit && (
          <button type="button" className={styles.editBtn} onClick={onEdit}>
            編集
          </button>
        )}
        {!hideCopy && (
          <button type="button" className={styles.copyBtn} onClick={onCopy}>
            コピー
          </button>
        )}
        {!hideDelete && (
          <button type="button" className={styles.deleteBtn} onClick={onDelete}>
            削除
          </button>
        )}
      </div>
    </div>
  );
};
