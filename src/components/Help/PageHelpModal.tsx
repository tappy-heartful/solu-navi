"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleQuestion,
  faXmark,
  faLightbulb,
} from "@fortawesome/free-solid-svg-icons";
import { getPageHelpContent } from "./page-help-data";
import styles from "./PageHelpModal.module.css";

interface PageHelpButtonProps {
  className?: string;
  label?: string;
}

export const PageHelpButton: React.FC<PageHelpButtonProps> = ({
  className = "",
  label = "このページの使い方",
}) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // モーダル表示中は背景スクロールを抑止
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const helpData = getPageHelpContent(pathname || "/");

  const modalContent = isOpen && mounted ? (
    <div
      className={styles.overlay}
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="page-help-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.iconWrapper}>
              <FontAwesomeIcon icon={helpData.icon} className={styles.titleIcon} />
            </div>
            <div>
              <h2 id="page-help-title" className={styles.title}>
                {helpData.title}
              </h2>
              <span className={styles.appBadge}>Solu Navi 使い方ガイド</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeIconBtn}
            onClick={() => setIsOpen(false)}
            aria-label="閉じる"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* 本文エリア */}
        <div className={styles.body}>
          {/* 概要サマリー */}
          <div className={styles.summaryCard}>
            <p className={styles.summaryText}>{helpData.summary}</p>
          </div>

          {/* 各セクション */}
          <div className={styles.sectionList}>
            {helpData.sections.map((sec, idx) => (
              <div key={idx} className={styles.sectionItem}>
                <div className={styles.sectionHeading}>
                  <h3 className={styles.sectionTitle}>{sec.title}</h3>
                  {sec.badge && <span className={styles.badge}>{sec.badge}</span>}
                </div>
                <ul className={styles.itemList}>
                  {sec.items.map((item, itemIdx) => (
                    <li key={itemIdx} className={styles.itemText}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Tips */}
          {helpData.tips && helpData.tips.length > 0 && (
            <div className={styles.tipsCard}>
              <div className={styles.tipsHeader}>
                <FontAwesomeIcon icon={faLightbulb} className={styles.tipsIcon} />
                <span className={styles.tipsTitle}>ヒント & お役立ち情報</span>
              </div>
              <ul className={styles.tipsList}>
                {helpData.tips.map((tip, tipIdx) => (
                  <li key={tipIdx} className={styles.tipItem}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setIsOpen(false)}
          >
            <FontAwesomeIcon icon={faXmark} /> 閉じる
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className={`${styles.buttonContainer} ${className}`}>
        <button
          type="button"
          className={styles.triggerBtn}
          onClick={() => setIsOpen(true)}
          title="この画面の使い方や操作方法を確認"
          aria-haspopup="dialog"
        >
          <FontAwesomeIcon icon={faCircleQuestion} className={styles.triggerIcon} />
          <span>{label}</span>
        </button>
      </div>

      {mounted && typeof document !== "undefined" && createPortal(modalContent, document.body)}
    </>
  );
};
