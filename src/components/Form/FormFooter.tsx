import React from "react";
import styles from "./FormFooter.module.css";

interface FormFooterProps {
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  submitting?: boolean;
  disabled?: boolean;
}

export function FormFooter({
  submitText = "保存する",
  cancelText = "キャンセル",
  onCancel,
  submitting = false,
  disabled = false,
}: FormFooterProps) {
  return (
    <div className={styles.footer}>
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
      <button
        type="submit"
        className={styles.submitBtn}
        disabled={disabled || submitting}
      >
        {submitting ? "処理中..." : submitText}
      </button>
    </div>
  );
}
