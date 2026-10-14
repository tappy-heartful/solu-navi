import React from "react";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers } from "@fortawesome/free-solid-svg-icons";
import styles from "@/features/user/views/UserListClient.module.css";

export default function UserLoading() {
  return (
    <BaseLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faUsers} className={styles.titleIcon} />
            部員名簿
          </h1>
          <span className={styles.countBadge}>読み込み中...</span>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="部員名 (略称) で検索"
            disabled
          />
        </div>

        <div className={styles.list}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={styles.userCard}
              style={{
                opacity: 0.6,
                pointerEvents: "none",
                minHeight: "72px",
              }}
            >
              <div
                className={styles.avatarWrapper}
                style={{
                  backgroundColor: "#e2e8f0",
                  animation: "pulse 1.5s infinite",
                }}
              />
              <div className={styles.cardContent} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ width: "120px", height: "16px", backgroundColor: "#e2e8f0", borderRadius: "4px" }} />
                <div style={{ width: "180px", height: "12px", backgroundColor: "#f1f5f9", borderRadius: "4px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </BaseLayout>
  );
}
