import React from "react";
import Link from "next/link";
import styles from "./FormFooter.module.css";

export interface FormFooterProps {
  backHref?: string;
  backText?: string;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  submitting?: boolean;
  disabled?: boolean;
}

/**
 * 送信ボタンエリアおよび前の画面に戻るナビゲーションボタン
 */
export function FormFooter({
  backHref,
  backText = "戻る",
  submitText,
  cancelText = "キャンセル",
  onCancel,
  submitting = false,
  disabled = false,
}: FormFooterProps) {
  const cleanBackText = backText.replace(/に戻る$/, "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
      {(submitText || onCancel) && (
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          {onCancel && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onCancel}
              disabled={submitting}
            >
              {cancelText}
            </button>
          )}
          {submitText && (
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={disabled || submitting}
            >
              {submitting ? "処理中..." : submitText}
            </button>
          )}
        </div>
      )}

      {/* 前の画面に戻るボタン (中央配置・大きく表示・streak-navi同等デザイン) */}
      {backHref && (
        <div className="back-nav-area">
          <Link href={backHref} className="back-link" prefetch={false}>
            ← {cleanBackText}に戻る
          </Link>
        </div>
      )}
    </div>
  );
}
