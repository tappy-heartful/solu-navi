"use client";

import React, { useMemo } from "react";
import Link from "next/link";
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
}

export function DailyAgendaModal({ activeDateStr, items, onClose }: DailyAgendaModalProps) {
  const router = useRouter();

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

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.bottomSheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandleContainer}>
          <div className={styles.dragHandle} onClick={onClose} />
        </div>

        <div className={styles.headerRow}>
          <h2 className={styles.dateTitle}>{formattedDate}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* クイックアクション */}
        <div className={styles.actionsGrid}>
          <Link
            prefetch={false}
            href={`/event/edit?mode=new&date=${activeDateStr}`}
            className={`${styles.actionBtn} ${styles.eventBtn}`}
            onClick={onClose}
          >
            <i className="fa-solid fa-calendar-plus" /> この日のイベント登録
          </Link>
        </div>

        {/* 予定一覧 */}
        <div className={styles.itemList}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <i
                className="fa-regular fa-calendar-minus"
                style={{ fontSize: "2rem", display: "block", marginBottom: "12px", opacity: 0.5 }}
              />
              予定はありません
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={`${item.type}-${item.id}-${idx}`}
                className={`${styles.itemRow} ${getThemeClass(item.type)}`}
                onClick={() => {
                  onClose();
                  router.push(item.link);
                }}
              >
                <div className={styles.iconCol}>
                  <i className={item.iconClass || "fa-solid fa-circle-info"} />
                </div>
                <div className={styles.contentCol}>
                  <div className={styles.itemMeta}>
                    <span className={styles.typeBadge}>{getTypeLabel(item.type)}</span>
                  </div>
                  <div className={styles.itemTitle}>{item.label}</div>
                </div>
                <div className={styles.arrowCol}>
                  <i className="fa-solid fa-chevron-right" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
