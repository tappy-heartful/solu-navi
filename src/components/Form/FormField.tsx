import React, { ReactNode } from "react";
import styles from "./FormField.module.css";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  children: ReactNode;
}

export function FormField({ label, required, error, description, children }: FormFieldProps) {
  return (
    <div className={styles.field}>
      {label && (
        <div className={styles.labelWrapper}>
          <label className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
          {required ? (
            <span className={styles.requiredBadge}>必須</span>
          ) : (
            <span className={styles.optionalBadge}>任意</span>
          )}
        </div>
      )}

      {description && <p className={styles.description}>{description}</p>}

      <div className={styles.inputWrapper}>{children}</div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
