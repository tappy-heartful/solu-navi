"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRightLeft,
  faCheck,
  faClock,
  faArrowRight,
  faUserPen,
  faChevronDown,
  faChevronUp,
  faShieldHalved,
  faUsers,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { User, SectionDoc, RoleDoc } from "@/lib/firestore/types";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { buildHandoverData } from "../lib/handover-utils";
import { HandoverCategory, HandoverItem } from "../types";
import { globalLineDefaultImage } from "@/lib/functions";
import styles from "../Handover.module.css";

interface HandoverClientProps {
  users: User[];
  sections: SectionDoc[];
  roles: RoleDoc[];
}

export function HandoverClient({ users, sections, roles }: HandoverClientProps) {
  const { isAdmin, userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [activeCategory, setActiveCategory] = useState<"all" | HandoverCategory>("all");
  const [showCandidateSection, setShowCandidateSection] = useState(true);

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "引継ぎ進捗確認" },
    ]);
  }, [setBreadcrumbs]);

  // 引継ぎデータおよび統計の算出
  const { items, stats, secondYearUsers, thirdYearUsers } = useMemo(() => {
    return buildHandoverData(users, sections, roles);
  }, [users, sections, roles]);

  // セクションMap
  const sectionMap = useMemo(() => {
    const map = new Map<string, SectionDoc>();
    sections.forEach((s) => map.set(s.id, s));
    return map;
  }, [sections]);

  // フィルタリング
  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  return (
    <BaseLayout>
      <div className={styles.wrapper}>
        {/* 画面ヘッダー */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faRightLeft} className={styles.headerIcon} />
            <span>引継ぎ進捗確認</span>
          </h1>
        </div>

        {/* 全体進捗カード */}
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <div className={styles.progressTitleGroup}>
              <div className={styles.academicYearBadge}>
                <span>🗓️ {stats.academicYear}年度 ➔ {stats.nextAcademicYear}年度 代替わり</span>
              </div>
              <div className={styles.progressMainTitle}>
                <span>{stats.previousEnrollmentYear}年度生（3回生） ➔ {stats.newEnrollmentYear}年度生（2回生） 引継ぎ</span>
              </div>
              <span className={styles.progressSubtitle}>
                役職（幹部・パートリーダー）の引継ぎ状況をリアルタイムで集計しています
              </span>
            </div>

            <div className={styles.progressBadge}>
              <span className={styles.progressPercentNumber}>{stats.progressPercent}</span>
              <span>% 完了</span>
            </div>
          </div>

          {/* プログレスバー */}
          <div className={styles.progressBarTrack} role="progressbar" aria-valuenow={stats.progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>

          {/* 統計サマリー */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>引継ぎ完了状況</span>
              <span className={styles.statValue}>
                {stats.completedCount} / {stats.totalCount} 項目
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>旧幹部 (3回生 / {stats.previousEnrollmentYear}年度生)</span>
              <span className={styles.statValue}>{stats.thirdYearUsersCount} 名</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>新幹部 (2回生 / {stats.newEnrollmentYear}年度生)</span>
              <span className={styles.statValue}>{stats.secondYearUsersCount} 名</span>
            </div>
          </div>
        </div>

        {/* フィルタータブ */}
        <div className={styles.filterRow}>
          {[
            { id: "all", label: `すべて (${items.length})` },
            { id: "executive", label: `幹部 (${items.filter((i) => i.category === "executive").length})` },
            { id: "part-leader", label: `パートリーダー (${items.filter((i) => i.category === "part-leader").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.filterBtn} ${
                activeCategory === tab.id ? styles.filterBtnActive : ""
              }`}
              onClick={() => setActiveCategory(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 引継ぎカードリスト */}
        <div className={styles.cardList}>
          {filteredItems.map((item) => {
            const isCompleted = item.isCompleted;

            return (
              <div
                key={item.id}
                className={`${styles.itemCard} ${
                  isCompleted ? styles.itemCardCompleted : styles.itemCardPending
                }`}
              >
                {/* カードヘッダー */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleCol}>
                    <div className={styles.cardCategoryRow}>
                      <span className={styles.categoryBadge}>{item.categoryLabel}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <p className={styles.cardDesc}>{item.description}</p>
                  </div>

                  <div>
                    {isCompleted ? (
                      <span className={styles.statusBadgeCompleted}>
                        <FontAwesomeIcon icon={faCheck} /> 引継ぎ完了
                      </span>
                    ) : (
                      <span className={styles.statusBadgePending}>
                        <FontAwesomeIcon icon={faClock} /> 未引継ぎ
                      </span>
                    )}
                  </div>
                </div>

                {/* 3回生 ➔ 2回生 対比比較エリア */}
                <div className={styles.comparisonGrid}>
                  {/* 3回生（旧担当者） */}
                  <div className={styles.assigneeBox}>
                    <div className={styles.assigneeHeader}>
                      <span className={styles.assigneeGradeLabel}>
                        <span>3回生 / {stats.previousEnrollmentYear}年度生 (前任)</span>
                        <span className={styles.badgeRoleOld}>引退</span>
                      </span>
                    </div>

                    {item.previousAssignees.length > 0 ? (
                      <div className={styles.userList}>
                        {item.previousAssignees.map((u) => {
                          const sec = u.sectionId ? sectionMap.get(u.sectionId) : null;
                          return (
                            <div key={u.uid} className={styles.userItem}>
                              <img
                                src={u.pictureUrl || globalLineDefaultImage}
                                alt={u.displayName || "部員"}
                                className={styles.userAvatar}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = globalLineDefaultImage;
                                }}
                              />
                              <div className={styles.userInfo}>
                                <span className={styles.userName}>
                                  {u.displayName || "未設定"}
                                </span>
                                {u.abbreviation && (
                                  <span className={styles.userAbbr}>({u.abbreviation})</span>
                                )}
                              </div>
                              {sec && (
                                <span
                                  className={styles.userSectionBadge}
                                  style={{ backgroundColor: sec.color || "#146081" }}
                                >
                                  {sec.name}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={styles.emptyUserBox}>
                        <FontAwesomeIcon icon={faCircleInfo} />
                        <span>前任の登録なし</span>
                      </div>
                    )}
                  </div>

                  {/* 引継ぎ矢印 */}
                  <div className={`${styles.arrowCol} ${isCompleted ? styles.arrowCompleted : ""}`}>
                    <FontAwesomeIcon icon={faArrowRight} />
                  </div>

                  {/* 2回生（新担当者） */}
                  <div className={styles.assigneeBox}>
                    <div className={styles.assigneeHeader}>
                      <span className={styles.assigneeGradeLabel}>
                        <span>2回生 / {stats.newEnrollmentYear}年度生 (後任)</span>
                        <span className={styles.badgeRoleNew}>新体制</span>
                      </span>
                    </div>

                    {item.newAssignees.length > 0 ? (
                      <div className={styles.userList}>
                        {item.newAssignees.map((u) => {
                          const sec = u.sectionId ? sectionMap.get(u.sectionId) : null;
                          return (
                            <div key={u.uid} className={styles.userItem}>
                              <img
                                src={u.pictureUrl || globalLineDefaultImage}
                                alt={u.displayName || "部員"}
                                className={styles.userAvatar}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = globalLineDefaultImage;
                                }}
                              />
                              <div className={styles.userInfo}>
                                <span className={styles.userName}>
                                  {u.displayName || "未設定"}
                                </span>
                                {u.abbreviation && (
                                  <span className={styles.userAbbr}>({u.abbreviation})</span>
                                )}
                              </div>
                              {sec && (
                                <span
                                  className={styles.userSectionBadge}
                                  style={{ backgroundColor: sec.color || "#146081" }}
                                >
                                  {sec.name}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className={styles.emptyUserBox} style={{ color: "#b45309", borderColor: "#fde68a" }}>
                        <FontAwesomeIcon icon={faClock} />
                        <span>2回生に未任命 (未引継ぎ)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 管理者向けリンク */}
                {isAdmin && (
                  <div className={styles.cardFooter}>
                    <Link
                      href="/user"
                      className={styles.editLink}
                      title="ユーザ一覧で役職を変更"
                    >
                      <FontAwesomeIcon icon={faUserPen} />
                      <span>役職の任命/変更（ユーザ一覧へ）</span>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 引継ぎ候補となる2回生一覧 */}
        <div className={styles.candidateSection}>
          <div
            className={styles.candidateHeader}
            onClick={() => setShowCandidateSection(!showCandidateSection)}
          >
            <h3 className={styles.candidateTitle}>
              <FontAwesomeIcon icon={faUsers} style={{ color: "#146081" }} />
              <span>引継ぎ対象・候補者 (2回生 / {stats.newEnrollmentYear}年度生 {secondYearUsers.length}名)</span>
            </h3>
            <FontAwesomeIcon
              icon={showCandidateSection ? faChevronUp : faChevronDown}
              style={{ color: "#64748b" }}
            />
          </div>

          {showCandidateSection && (
            <div className={styles.candidateGrid}>
              {secondYearUsers.length > 0 ? (
                secondYearUsers.map((u) => {
                  const sec = u.sectionId ? sectionMap.get(u.sectionId) : null;
                  const roleObj = roles.find((r) => r.id === u.roleId);

                  return (
                    <div key={u.uid} className={styles.candidateCard}>
                      <img
                        src={u.pictureUrl || globalLineDefaultImage}
                        alt={u.displayName || "部員"}
                        className={styles.userAvatar}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = globalLineDefaultImage;
                        }}
                      />
                      <div className={styles.userInfo}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span className={styles.userName}>{u.displayName || "未設定"}</span>
                          <div style={{ display: "flex", gap: "4px", alignItems: "center", marginTop: "2px" }}>
                            {u.abbreviation && (
                              <span className={styles.userAbbr}>{u.abbreviation}</span>
                            )}
                            {roleObj && (
                              <span style={{ fontSize: "10px", color: "#0f766e", fontWeight: 700 }}>
                                {roleObj.name}
                              </span>
                            )}
                            {u.isSystemAdmin && (
                              <span style={{ fontSize: "10px", color: "#0284c7", fontWeight: 700 }}>
                                🛡️管理者
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {sec && (
                        <span
                          className={styles.userSectionBadge}
                          style={{ backgroundColor: sec.color || "#146081" }}
                        >
                          {sec.name}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyUserBox} style={{ gridColumn: "1 / -1" }}>
                  <FontAwesomeIcon icon={faCircleInfo} />
                  <span>2回生（{stats.newEnrollmentYear}年度入学）の部員はまだ登録されていません</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  );
}
