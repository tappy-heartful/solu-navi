import React, { InputHTMLAttributes } from "react";
import { FormField } from "./FormField";
import styles from "./AppInput.module.css";

export interface AppInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  label?: string;
  field?: string;
  value?: any;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  error?: string | boolean;
  required?: boolean;
  type?: string;
  updateField?: (field: string, value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
}

export function AppInput({
  label,
  field,
  value,
  onChange,
  error,
  required,
  type = "text",
  updateField,
  placeholder,
  disabled,
  className = "",
  min,
  max,
  ...rest
}: AppInputProps) {
  // updateField と field がない場合は通常の input として動作
  if (!updateField || !field) {
    const isError = Boolean(error);
    return (
      <input
        type={type}
        className={`${styles.input} ${isError ? styles.hasError : ""} ${className}`}
        value={value !== undefined && value !== null ? String(value) : undefined}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        {...rest}
      />
    );
  }

  // チェックボックス
  if (type === "checkbox") {
    return (
      <div className="form-group checkbox-group" style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={!!value}
            disabled={disabled}
            onChange={(e) => updateField(field, e.target.checked)}
            style={{ width: "18px", height: "18px" }}
          />
          {label}
        </label>
      </div>
    );
  }

  const strValue = value !== undefined && value !== null ? String(value) : "";
  const errorMessage = typeof error === "string" ? error : undefined;
  const isError = Boolean(error);

  // label が未指定の場合は FormField で二重ラップせず入力欄のみを返す
  if (!label) {
    if (type === "textarea") {
      return (
        <textarea
          className={`${styles.textarea} ${isError ? styles.hasError : ""} ${className}`}
          value={strValue}
          rows={4}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => updateField?.(field, e.target.value)}
          {...(rest as any)}
        />
      );
    }

    return (
      <input
        type={type}
        className={`${styles.input} ${isError ? styles.hasError : ""} ${className}`}
        value={strValue}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        onChange={(e) => updateField?.(field, type === "number" ? Number(e.target.value) : e.target.value)}
        {...rest}
      />
    );
  }

  // label が指定されている場合は FormField でラップして返す
  if (type === "textarea") {
    return (
      <FormField label={label} required={required} error={errorMessage}>
        <textarea
          className={`${styles.textarea} ${isError ? styles.hasError : ""} ${className}`}
          value={strValue}
          rows={4}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => updateField?.(field, e.target.value)}
          {...(rest as any)}
        />
      </FormField>
    );
  }

  return (
    <FormField label={label} required={required} error={errorMessage}>
      <input
        type={type}
        className={`${styles.input} ${isError ? styles.hasError : ""} ${className}`}
        value={strValue}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        onChange={(e) => updateField?.(field, type === "number" ? Number(e.target.value) : e.target.value)}
        {...rest}
      />
    </FormField>
  );
}
