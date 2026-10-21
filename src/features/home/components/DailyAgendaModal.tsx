"use client";

import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./DailyAgendaModal.module.css";

export interface AgendaItem {
  type: "event" | "vote" | "call" | "schedule_adjust" | "fee";
  iconClass?: string;
  label: string;
  link: string;
  id: string;
  status?: string;
  timeText?: string;
  isAllDay?: boolean;
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

  // CANDY準拠の日付表示分割 (日付と曜日)
  const dateInfo = useMemo(() => {
    if (!activeDateStr) return { dateText: "", dayText: "" };
    const parts = activeDateStr.split(".");
    if (parts.length !== 3) return { dateText: activeDateStr, dayText: "" };
    const [y, m, d] = parts.map(Number);
    const dateObj = new Date(y, m - 1, d);
    const days = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
    const dayStr = days[dateObj.getDay()];
    return {
      dateText: `${m}月${d}日`,
      dayText: dayStr,
    };
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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.bottomSheet} onClick={(e) => e.stopPropagation()}>
        {/* クローズボタン (CANDY 準拠) */}
        <button
          type="button"
          className={styles.modalClose}
          onClick={onClose}
          aria-label="閉じる"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* ヘッダー行 (CANDY 準拠: 大きな日付 + 曜日 + 予定追加丸ボタン) */}
        <div className={styles.headerRow}>
          <div className={styles.dateTitle}>
            <span className={styles.dateText}>{dateInfo.dateText}</span>
            <span className={styles.dayText}>{dateInfo.dayText}</span>
          </div>

          <div className={styles.headerActions}>
            {onAddEvent && (
              <button
                type="button"
                className={styles.addBtn}
                title="予定を追加"
                onClick={() => {
                  onClose();
                  onAddEvent(activeDateStr);
                }}
              >
                <i className="fa-solid fa-plus" />
              </button>
            )}
          </div>
        </div>

        {/* アイテム一覧 */}
        <div className={styles.itemList}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <i
                className="fa-regular fa-calendar-minus"
                style={{ fontSize: "2.2rem", display: "block", marginBottom: "10px", opacity: 0.4 }}
              />
              予定はありません
            </div>
          ) : (
            items.map((item, idx) => {
              const isEventItem = item.type === "event" || item.type === "schedule_adjust";

              return (
                <div
                  key={`${item.type}-${item.id}-${idx}`}
                  className={`${styles.itemRow} ${getThemeClass(item.type)}`}
                  onClick={() => {
                    onClose();
                    if (isEventItem && onViewEventDetail) {
                      // イベント確認画面に遷移させず、詳細・出欠モーダルを開く
                      onViewEventDetail(item.id);
                    } else if (isEventItem && onEditEvent) {
                      onEditEvent(item.id);
                    } else if (!isEventItem && item.link) {
                      // 投票や募集などのみ別画面へ
                      window.location.href = item.link;
                    }
                  }}
                >
                  <div className={styles.timeCol}>
                    <span className={styles.timeText}>
                      {item.isAllDay ?? true ? "終日" : item.timeText || "予定"}
                    </span>
                  </div>

                  <div className={styles.mainCol}>
                    <div className={styles.itemMeta}>
                      <span className={styles.typeBadge}>{getTypeLabel(item.type)}</span>
                      {isEventItem && item.status && (
                        <span className={styles.answerBadge}>
                          <i className="fa-solid fa-check" /> 回答済
                        </span>
                      )}
                    </div>
                    <div className={styles.itemTitle}>{item.label}</div>
                  </div>

                  <div className={styles.actionCol}>
                    {isEventItem && onEditEvent && (
                      <button
                        type="button"
                        className={styles.miniActionBtn}
                        title="予定を編集"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          onEditEvent(item.id);
                        }}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                    )}
                    <i className={`fa-solid fa-chevron-right ${styles.arrowIcon}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* フッター */}
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnCloseFooter} onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
