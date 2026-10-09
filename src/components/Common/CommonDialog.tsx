"use client";

import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faTriangleExclamation,
  faCircleXmark,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
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

export function showDialog(
  optionsOrMessage: string | DialogOptions,
  isAlertOnly = false
): Promise<boolean> {
  let options: DialogOptions;
  if (typeof optionsOrMessage === "string") {
    options = {
      message: optionsOrMessage,
      isConfirm: !isAlertOnly,
    };
  } else {
    options = optionsOrMessage;
  }

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

  const renderIcon = () => {
    switch (options.type) {
      case "success":
        return (
          <div className={`${styles.iconWrapper} ${styles.iconSuccess}`}>
            <FontAwesomeIcon icon={faCircleCheck} />
          </div>
        );
      case "danger":
        return (
          <div className={`${styles.iconWrapper} ${styles.iconDanger}`}>
            <FontAwesomeIcon icon={faCircleXmark} />
          </div>
        );
      case "warning":
        return (
          <div className={`${styles.iconWrapper} ${styles.iconWarning}`}>
            <FontAwesomeIcon icon={faTriangleExclamation} />
          </div>
        );
      case "info":
      default:
        return (
          <div className={`${styles.iconWrapper} ${styles.iconInfo}`}>
            <FontAwesomeIcon icon={faCircleInfo} />
          </div>
        );
    }
  };

  const getConfirmBtnClass = () => {
    if (options.type === "danger") return styles.danger;
    if (options.type === "success") return styles.success;
    if (options.type === "warning") return styles.warning;
    return "";
  };

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {renderIcon()}
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
            className={`${styles.confirmBtn} ${getConfirmBtnClass()}`}
            onClick={handleConfirm}
          >
            {options.confirmText || "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
