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

import { SectionDoc, RoleDoc, InstrumentDoc } from "@/lib/firestore/types";

interface UserListClientProps {
  initialData?: {
    users: UserDoc[];
    sections?: SectionDoc[];
    roles?: RoleDoc[];
    instruments?: InstrumentDoc[];
  };
}

export function UserListClient({ initialData }: UserListClientProps = {}) {
  const { setBreadcrumbs } = useBreadcrumb();
  const [users, setUsers] = useState<UserDoc[]>(initialData?.users || []);
  const [loading, setLoading] = useState(!initialData?.users);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");

  const sections = initialData?.sections || DEFAULT_SECTIONS;
  const roles = initialData?.roles || DEFAULT_ROLES;
  const instruments = initialData?.instruments || DEFAULT_INSTRUMENTS;

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "ユーザ" },
    ]);

    // initialData がない場合のみクライアントフェッチを実行
    if (!initialData?.users || initialData.users.length === 0) {
      async function load() {
        try {
          const data = await fetchUsers();
          setUsers(data);
        } finally {
          setLoading(false);
        }
      }
      load();
    }
  }, [setBreadcrumbs, initialData?.users]);

  // フィルタリング & ソート (パート順 → 回生の高い順 → 役職の高い順)
  const sortedAndFilteredUsers = useMemo(() => {
    const filtered = users.filter((u) => {
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

    return [...filtered].sort((a, b) => {
      // 1. パート順 (section.order 昇順)
      const secA = sections.find((s) => s.id === a.sectionId);
      const secB = sections.find((s) => s.id === b.sectionId);
      const secOrderA = secA?.order ?? (secA ? Number(secA.id) : 999);
      const secOrderB = secB?.order ?? (secB ? Number(secB.id) : 999);
      if (secOrderA !== secOrderB) {
        return secOrderA - secOrderB;
      }

      // 2. 回生の高い順 (入学年度 enrollmentYear が古い/小さい順 = 上級生が先頭、未設定は末尾)
      const yearA = a.enrollmentYear ? parseInt(String(a.enrollmentYear), 10) : 99999;
      const yearB = b.enrollmentYear ? parseInt(String(b.enrollmentYear), 10) : 99999;
      const validYearA = isNaN(yearA) || yearA <= 0 ? 99999 : yearA;
      const validYearB = isNaN(yearB) || yearB <= 0 ? 99999 : yearB;
      if (validYearA !== validYearB) {
        return validYearA - validYearB;
      }

      // 3. 役職の高い順 (role.order 昇順、未設定は末尾)
      const roleA = roles.find((r) => r.id === a.roleId);
      const roleB = roles.find((r) => r.id === b.roleId);
      const roleOrderA = roleA?.order ?? (roleA ? Number(roleA.id) : 999);
      const roleOrderB = roleB?.order ?? (roleB ? Number(roleB.id) : 999);
      if (roleOrderA !== roleOrderB) {
        return roleOrderA - roleOrderB;
      }

      // 4. 同一条件時は名前順
      return (a.displayName || "").localeCompare(b.displayName || "", "ja");
    });
  }, [users, selectedSection, searchQuery, sections, roles]);

  // パートごとの見出しグループ作成
  interface SectionGroup {
    sectionId: string;
    sectionName: string;
    sectionColor: string;
    users: UserDoc[];
  }

  const groupedUsers = useMemo(() => {
    // 個別パートが選択されている場合
    if (selectedSection !== "all") {
      const sec = sections.find((s) => s.id === selectedSection);
      return [
        {
          sectionId: selectedSection,
          sectionName: sec?.name || "メンバー",
          sectionColor: sec?.color || "#146081",
          users: sortedAndFilteredUsers,
        },
      ];
    }

    // 「すべて」の場合: sections の order 順に見出しグループを作成
    const groups: SectionGroup[] = [];
    const sortedSections = [...sections].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    sortedSections.forEach((sec) => {
      const secUsers = sortedAndFilteredUsers.filter((u) => u.sectionId === sec.id);
      if (secUsers.length > 0) {
        groups.push({
          sectionId: sec.id,
          sectionName: sec.name,
          sectionColor: sec.color || "#146081",
          users: secUsers,
        });
      }
    });

    // パート未設定のユーザーがいる場合
    const unassignedUsers = sortedAndFilteredUsers.filter(
      (u) => !u.sectionId || !sections.some((s) => s.id === u.sectionId)
    );
    if (unassignedUsers.length > 0) {
      groups.push({
        sectionId: "unassigned",
        sectionName: "パート未設定",
        sectionColor: "#94a3b8",
        users: unassignedUsers,
      });
    }

    return groups;
  }, [sortedAndFilteredUsers, selectedSection, sections]);

  const renderUserCard = (user: UserDoc) => {
    const sec = sections.find((s) => s.id === user.sectionId);
    const role = roles.find((r) => r.id === user.roleId);
    const instNames = (user.instrumentIds || [])
      .map((id) => instruments.find((i) => i.id === id)?.name)
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
            alt={user.displayName || "ユーザアバター"}
            size={48}
            className={styles.avatarImg}
          />
        </div>

        <div className={styles.cardContent}>
          <div className={styles.nameRow}>
            <span className={styles.displayName}>{user.displayName || "メンバー"}</span>
            {user.abbreviation && (
              <span className={styles.abbrBadge}>{user.abbreviation}</span>
            )}
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
  };

  return (
    <BaseLayout>
      <div className={styles.container}>
        {/* タイトル */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faUsers} className={styles.titleIcon} />
            ユーザ
          </h1>
          <span className={styles.countBadge}>{sortedAndFilteredUsers.length}名</span>
        </div>

        {/* 検索入力 */}
        <div className={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ユーザ名 (略称) で検索"
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
          {sections.map((sec) => (
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

        {/* 一覧リスト (パート別見出しグループ) */}
        {loading ? (
          <div className={styles.emptyState}>ユーザ情報を読み込み中...</div>
        ) : sortedAndFilteredUsers.length === 0 ? (
          <div className={styles.emptyState}>
            該当するユーザが見つかりません。
          </div>
        ) : (
          <div className={styles.groupedList}>
            {groupedUsers.map((group) => (
              <div key={group.sectionId} className={styles.sectionGroup}>
                {/* 見出し (パート名と所属人数) */}
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleRow}>
                    <span
                      className={styles.sectionColorBar}
                      style={{ backgroundColor: group.sectionColor }}
                    />
                    <h2 className={styles.sectionTitle}>{group.sectionName}</h2>
                  </div>
                  <span className={styles.sectionCountBadge}>
                    {group.users.length}名
                  </span>
                </div>

                {/* メンバーカード一覧 */}
                <div className={styles.list}>
                  {group.users.map((user) => renderUserCard(user))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BackNavigation href="/" label="ホーム" />
    </BaseLayout>
  );
}
