import React, { InputHTMLAttributes } from "react";
import styles from "./AppInput.module.css";

interface AppInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function AppInput({ error, className = "", ...props }: AppInputProps) {
  return (
    <input
      className={`${styles.input} ${error ? styles.hasError : ""} ${className}`}
      {...props}
    />
  );
}
