"use client";

import React, { memo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBullhorn,
  faCircleExclamation,
  faCheckToSlot,
  faMusic,
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
  const items =
    announcements && announcements.length > 0
      ? announcements
      : [{ type: "empty" as const, message: "お知らせはありません🍀" }];

  return (
    <section className={styles.announcementContainer}>
      <div className={styles.announcementHeader}>
        <h3 className={styles.headerTitle}>
          <span className={styles.titleIcon}>📢</span> お知らせ
        </h3>
      </div>
      <ul className={styles.notificationList}>
        {items.map((a, i) => {
          if (a.type === "empty") {
            return (
              <li key={`empty-${i}`} className={styles.emptyItem}>
                <div className={styles.emptyMessage}>
                  {a.message || "お知らせはありません🍀"}
                </div>
              </li>
            );
          }

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

          const isVote = a.category === "vote";
          const icon = isVote ? faCheckToSlot : faMusic;
          const iconBgClass = isVote ? styles.voteIconBg : styles.callIconBg;

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
        })}
        {/* PWA ホーム画面追加ヒント (お知らせ最下位優先度) */}
        <li className={styles.pwaHintItem}>
          <PwaInstallHint isInsideAnnouncement={true} />
        </li>
      </ul>
    </section>
  );
});
