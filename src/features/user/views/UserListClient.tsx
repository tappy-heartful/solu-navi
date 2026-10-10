"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faSearch, faUser, faPhone, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { UserAvatar } from "@/components/Common/UserAvatar";
import { BackNavigation } from "@/components/Common/BackNavigation";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { UserDoc } from "../types";
import { fetchUsers } from "../api/user-client-service";
import { DEFAULT_SECTIONS, DEFAULT_ROLES, DEFAULT_INSTRUMENTS } from "@/lib/firestore/constants";
import { getGradeFromEnrollmentYear } from "@/lib/functions";
import styles from "./UserListClient.module.css";

export function UserListClient() {
  const { setBreadcrumbs } = useBreadcrumb();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "部員名簿" },
    ]);

    async function load() {
      try {
        const data = await fetchUsers();
        setUsers(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [setBreadcrumbs]);

  // フィルタリング
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // パート一致
      if (selectedSection !== "all" && u.sectionId !== selectedSection) {
        return false;
      }
      // 検索クエリ一致
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = u.displayName?.toLowerCase().includes(q);
        const abbrMatch = u.abbreviation?.toLowerCase().includes(q);
        return Boolean(nameMatch || abbrMatch);
      }
      return true;
    });
  }, [users, selectedSection, searchQuery]);

  return (
    <BaseLayout>
      <div className={styles.container}>
        {/* タイトル */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faUsers} className={styles.titleIcon} />
            部員名簿
          </h1>
          <span className={styles.countBadge}>{filteredUsers.length}名</span>
        </div>

        {/* 検索入力 */}
        <div className={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="部員名 (略称) で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>

        {/* パート選択タブ (横スクロール可能) */}
        <div className={styles.filterBar}>
          <button
            type="button"
            className={`${styles.filterTab} ${selectedSection === "all" ? styles.activeTab : ""}`}
            onClick={() => setSelectedSection("all")}
          >
            すべて
          </button>
          {DEFAULT_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              className={`${styles.filterTab} ${selectedSection === sec.id ? styles.activeTab : ""}`}
              onClick={() => setSelectedSection(sec.id)}
            >
              {sec.shortName}
            </button>
          ))}
        </div>

        {/* 一覧リスト */}
        {loading ? (
          <div className={styles.emptyState}>部員情報を読み込み中...</div>
        ) : filteredUsers.length === 0 ? (
          <div className={styles.emptyState}>
            該当する部員が見つかりません。
          </div>
        ) : (
          <div className={styles.list}>
            {filteredUsers.map((user) => {
              const sec = DEFAULT_SECTIONS.find((s) => s.id === user.sectionId);
              const role = DEFAULT_ROLES.find((r) => r.id === user.roleId);
              const instNames = (user.instrumentIds || [])
                .map((id) => DEFAULT_INSTRUMENTS.find((i) => i.id === id)?.name)
                .filter(Boolean);

              return (
                <Link
                  key={user.uid}
                  href={`/user/detail?uid=${user.uid}`}
                  prefetch={false}
                  className={styles.userCard}
                >
                  <div className={styles.avatarWrapper}>
                    <UserAvatar
                      src={user.pictureUrl}
                      alt={user.displayName || "部員アバター"}
                      size={48}
                      className={styles.avatarImg}
                    />
                  </div>

                  <div className={styles.cardContent}>
                    <div className={styles.nameRow}>
                      <span className={styles.displayName}>{user.displayName || "メンバー"}</span>
                      {sec && (
                        <span
                          className={styles.sectionBadge}
                          style={{ backgroundColor: sec.color || "#3b82f6" }}
                        >
                          {sec.shortName}
                        </span>
                      )}
                    </div>

                    <div className={styles.metaRow}>
                      {role && <span className={styles.roleName}>{role.name}</span>}
                      {user.enrollmentYear && (
                        <span className={styles.grade}>
                          {getGradeFromEnrollmentYear(user.enrollmentYear)}
                        </span>
                      )}
                      {instNames.length > 0 && (
                        <span className={styles.instruments}>
                          {instNames.join(" / ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.arrowIcon}>
                    <FontAwesomeIcon icon={faChevronRight} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <BackNavigation href="/" label="ホーム" />
    </BaseLayout>
  );
}
