"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styles from "./DailyAgendaModal.module.css";

export interface AgendaItem {
  type: "event" | "vote" | "call" | "schedule_adjust" | "fee";
  iconClass?: string;
  label: string;
  link: string;
  id: string;
  status?: string;
  position?: "start" | "middle" | "end";
  createdBy?: string;
}

interface DailyAgendaModalProps {
  activeDateStr: string;
  items: AgendaItem[];
  onClose: () => void;
  onAddEvent?: (dateStr: string) => void;
  onEditEvent?: (eventId: string) => void;
  onViewEventDetail?: (eventId: string) => void;
}

export function DailyAgendaModal({
  activeDateStr,
  items,
  onClose,
  onAddEvent,
  onEditEvent,
  onViewEventDetail,
}: DailyAgendaModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // モーダル表示時に背面のスクロールを抑制
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const formattedDate = useMemo(() => {
    if (!activeDateStr) return "";
    const parts = activeDateStr.split(".");
    if (parts.length !== 3) return activeDateStr;
    const [y, m, d] = parts.map(Number);
    const dateObj = new Date(y, m - 1, d);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const dayStr = days[dateObj.getDay()];
    return `${m}月${d}日 (${dayStr})`;
  }, [activeDateStr]);

  const getThemeClass = (type: string) => {
    switch (type) {
      case "event":
        return styles.eventTheme;
      case "schedule_adjust":
        return styles.scheduleAdjustTheme;
      case "vote":
        return styles.voteTheme;
      case "call":
        return styles.callTheme;
      default:
        return styles.eventTheme;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "event":
        return "イベント";
      case "schedule_adjust":
        return "日程調整";
      case "vote":
        return "曲投票";
      case "call":
        return "曲募集";
      case "fee":
        return "部費期日";
      default:
        return type;
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div
      className={styles.modalOverlay}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        className={`${styles.eventModal} ${styles.agendaModal} ${styles.bottomSheet}`}
        style={{
          backgroundColor: "#ffffff",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "85vh",
          borderRadius: "20px",
          position: "relative",
          padding: "24px 20px 18px",
          border: "2px solid #e2e8f0",
          boxShadow: "0 20px 35px -5px rgba(15, 23, 42, 0.25), 0 10px 15px -5px rgba(15, 23, 42, 0.1)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          margin: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 閉じるアイコンボタン */}
        <button
          type="button"
          className={styles.modalClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            fontSize: "18px",
            color: "#64748b",
            cursor: "pointer",
            backgroundColor: "#f1f5f9",
            border: "none",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
          }}
          onClick={onClose}
          aria-label="閉じる"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* モーダルタイトル */}
        <div
          className={`${styles.modalTitle} ${styles.dateTitle}`}
          style={{
            fontSize: "18px",
            fontWeight: 800,
            color: "#146081",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            paddingRight: "36px",
          }}
        >
          <i className="fa-solid fa-calendar-days" style={{ color: "#146081", fontSize: "19px" }}></i>
          <span>{formattedDate} の予定一覧</span>
        </div>

        {/* クイックアクション: 「予定を追加」ボタンのみ */}
        {onAddEvent && (
          <div className={styles.actionsContainer} style={{ marginBottom: "14px", flexShrink: 0 }}>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.quickAddBtn}`}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "0.95rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxSizing: "border-box",
                backgroundColor: "#146081",
                color: "#ffffff",
                boxShadow: "0 4px 10px rgba(20, 96, 129, 0.25)",
              }}
              onClick={() => {
                onClose();
                onAddEvent(activeDateStr);
              }}
            >
              <i className="fa-solid fa-calendar-plus" /> 予定を追加
            </button>
          </div>
        )}

        {/* 予定一覧 */}
        <div
          className={styles.itemList}
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            paddingRight: "2px",
            maxHeight: "50vh",
          }}
        >
          {items.length === 0 ? (
            <div
              className={styles.emptyState}
              style={{
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "0.9rem",
                padding: "36px 16px",
              }}
            >
              <i
                className="fa-regular fa-calendar-minus"
                style={{ fontSize: "2rem", display: "block", marginBottom: "12px", opacity: 0.5 }}
              />
              予定はありません
            </div>
          ) : (
            items.map((item, idx) => {
              const isEventItem = item.type === "event";

              return (
                <div
                  key={`${item.type}-${item.id}-${idx}`}
                  className={`${styles.itemRow} ${styles.eventRow} ${getThemeClass(item.type)}`}
                  onClick={() => {
                    onClose();
                    if (isEventItem && onViewEventDetail) {
                      onViewEventDetail(item.id);
                    } else if (isEventItem && onEditEvent) {
                      onEditEvent(item.id);
                    } else {
                      router.push(item.link);
                    }
                  }}
                >
                  <div className={styles.iconCol}>
                    <i className={item.iconClass || "fa-solid fa-circle-info"} />
                  </div>
                  <div className={styles.contentCol}>
                    <div className={styles.itemMeta}>
                      <span className={styles.typeBadge}>{getTypeLabel(item.type)}</span>
                      {isEventItem && (
                        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>
                          タップで詳細確認
                        </span>
                      )}
                    </div>
                    <div className={styles.itemTitle}>{item.label}</div>
                  </div>
                  {isEventItem ? (
                    <button
                      type="button"
                      className={styles.miniDetailBtn}
                      title="イベント確認モーダルを開く"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        if (onViewEventDetail) {
                          onViewEventDetail(item.id);
                        } else {
                          router.push(item.link);
                        }
                      }}
                    >
                      <span>確認</span>
                      <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "10px" }} />
                    </button>
                  ) : (
                    <div className={styles.arrowCol}>
                      <i className="fa-solid fa-chevron-right" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* フッターアクション: 閉じるボタン */}
        <div
          className={styles.modalFooter}
          style={{
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className={styles.btnCloseFooter}
            style={{
              width: "100%",
              padding: "11px",
              borderRadius: "12px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              color: "#475569",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              boxSizing: "border-box",
            }}
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
