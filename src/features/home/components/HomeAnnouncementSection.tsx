"use client";

import React, { memo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullhorn,
  faCircleExclamation,
  faCheckToSlot,
  faMusic,
  faCoins,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { showSpinner } from "@/components/Common/Spinner";
import { HomeAnnouncement } from "../types";
import { PwaInstallHint } from "./PwaInstallHint";
import styles from "./HomeAnnouncementSection.module.css";

interface HomeAnnouncementSectionProps {
  announcements: HomeAnnouncement[];
}

export const HomeAnnouncementSection = memo(function HomeAnnouncementSection({
  announcements,
}: HomeAnnouncementSectionProps) {
  // 実質的なお知らせ（曲投票・曲募集・重要通知など）のみを抽出
  const activeItems = (announcements || []).filter(
    (a) => a.type === "item" || a.type === "pending"
  );

  return (
    <section className={styles.announcementContainer}>
      <div className={styles.announcementHeader}>
        <h3 className={styles.headerTitle}>
          <span className={styles.titleIcon}>📢</span> お知らせ
        </h3>
      </div>
      <ul className={styles.notificationList}>
        {activeItems.length === 0 ? (
          <li className={styles.emptyItem}>
            <div className={styles.emptyMessage}>
              <span>お知らせはありません🍀</span>
            </div>
          </li>
        ) : (
          activeItems.map((a, i) => {

          if (a.type === "pending") {
            return (
              <li key={`pending-${i}`} className={styles.pendingItem}>
                <div className={styles.pendingMessage}>
                  <FontAwesomeIcon
                    icon={faCircleExclamation}
                    className={styles.pendingIcon}
                  />
                  <span>{a.message}</span>
                </div>
              </li>
            );
          }

          let icon = faMusic;
          let iconBgClass = styles.callIconBg;
          if (a.category === "vote") {
            icon = faCheckToSlot;
            iconBgClass = styles.voteIconBg;
          } else if (a.category === "fee") {
            icon = faCoins;
            iconBgClass = styles.feeIconBg;
          }

          return (
            <li key={`item-${i}`} className={styles.linkItem}>
              <Link
                prefetch={false}
                href={a.link || "#"}
                className={styles.notificationLink}
                onClick={() => showSpinner()}
              >
                <div className={`${styles.itemIconWrapper} ${iconBgClass}`}>
                  <FontAwesomeIcon icon={icon} />
                </div>
                <span className={styles.itemLabel}>{a.label}</span>
                <FontAwesomeIcon icon={faChevronRight} className={styles.chevron} />
              </Link>
            </li>
          );
        }))}
        {/* PWA ホーム画面追加ヒント (お知らせ最下位優先度) */}
        <li className={styles.pwaHintItem}>
          <PwaInstallHint isInsideAnnouncement={true} />
        </li>
      </ul>
    </section>
  );
});
