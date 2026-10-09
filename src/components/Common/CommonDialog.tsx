"use client";

import React, { useState, useEffect } from "react";
import styles from "./CommonDialog.module.css";

interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirm?: boolean; // キャンセルボタンを表示するか
  type?: "info" | "success" | "warning" | "danger";
}

let dialogHandler: ((options: DialogOptions) => Promise<boolean>) | null = null;

export function showDialog(options: DialogOptions): Promise<boolean> {
  if (dialogHandler) {
    return dialogHandler(options);
  }
  // フォールバック
  if (options.isConfirm) {
    return Promise.resolve(window.confirm(options.message));
  }
  window.alert(options.message);
  return Promise.resolve(true);
}

export function CommonDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const [resolver, setResolver] = useState<((val: boolean) => void) | null>(null);

  useEffect(() => {
    dialogHandler = (opts: DialogOptions) => {
      setOptions(opts);
      setIsOpen(true);
      return new Promise<boolean>((resolve) => {
        setResolver(() => resolve);
      });
    };
    return () => {
      dialogHandler = null;
    };
  }, []);

  if (!isOpen || !options) return null;

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolver) resolver(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolver) resolver(false);
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {options.title && <h3 className={styles.title}>{options.title}</h3>}
        <p className={styles.message}>{options.message}</p>
        <div className={styles.actions}>
          {options.isConfirm && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancel}
            >
              {options.cancelText || "キャンセル"}
            </button>
          )}
          <button
            type="button"
            className={`${styles.confirmBtn} ${options.type === "danger" ? styles.danger : ""}`}
            onClick={handleConfirm}
          >
            {options.confirmText || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
