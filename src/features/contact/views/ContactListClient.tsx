"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeadset,
  faPlus,
  faClock,
  faCheckDouble,
  faComments,
  faCircleQuestion,
  faInbox,
} from "@fortawesome/free-solid-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { UserAvatar } from "@/components/Common/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import {
  Contact,
  ContactStatus,
  CONTACT_CATEGORY_MAP,
  CONTACT_FEATURE_MAP,
  CONTACT_STATUS_MAP,
} from "../types";
import styles from "./ContactListClient.module.css";

interface ContactListClientProps {
  initialContacts: Contact[];
}

export function ContactListClient({ initialContacts }: ContactListClientProps) {
  const { user, isSystemAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [activeTab, setActiveTab] = useState<"all" | ContactStatus>("all");

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "お問い合わせ一覧" },
    ]);
  }, [setBreadcrumbs]);

  // 閲覧権限によるベースリストの決定（一般部員は自分のチケットのみ）
  const baseContacts = useMemo(() => {
    if (isSystemAdmin) return initialContacts;
    if (!user) return [];
    return initialContacts.filter((c) => c.uid === user.uid);
  }, [initialContacts, isSystemAdmin, user]);

  // タブ別カウント
  const counts = useMemo(() => {
    const res = { all: baseContacts.length, open: 0, in_progress: 0, resolved: 0 };
    baseContacts.forEach((c) => {
      if (c.status in res) {
        res[c.status as ContactStatus]++;
      }
    });
    return res;
  }, [baseContacts]);

  // フィルタリング
  const filteredContacts = useMemo(() => {
    if (activeTab === "all") return baseContacts;
    return baseContacts.filter((c) => c.status === activeTab);
  }, [baseContacts, activeTab]);

  return (
    <BaseLayout title="お問い合わせ一覧">
      <div className={styles.wrapper}>
        {/* トップアクションバー */}
        <div className={styles.topActionBar}>
          <p className={styles.pageDescription}>
            {isSystemAdmin
              ? "部員から届いたお問い合わせ・不具合報告の一覧です。スレッドからLINE風に直接チャットで対応できます。"
              : "操作方法の質問や不具合報告、機能要望などを送信し、システム管理者と直接チャットでやり取りできます。"}
          </p>
          <Link href="/contact/edit" className={styles.newContactBtn}>
            <FontAwesomeIcon icon={faPlus} />
            <span>新規お問い合わせ</span>
          </Link>
        </div>

        {/* フィルタタブ */}
        <div className={styles.filterTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "all" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <span>すべて</span>
            <span className={styles.tabCountBadge}>{counts.all}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "open" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("open")}
          >
            <span>未対応</span>
            <span className={styles.tabCountBadge}>{counts.open}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "in_progress" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("in_progress")}
          >
            <span>対応中</span>
            <span className={styles.tabCountBadge}>{counts.in_progress}</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "resolved" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("resolved")}
          >
            <span>解決済み</span>
            <span className={styles.tabCountBadge}>{counts.resolved}</span>
          </button>
        </div>

        {/* チケット一覧 */}
        {filteredContacts.length === 0 ? (
          <div className={styles.emptyCard}>
            <FontAwesomeIcon icon={faInbox} className={styles.emptyIcon} />
            <div className={styles.emptyTitle}>お問い合わせはありません</div>
            <div className={styles.emptyText}>
              {activeTab === "all"
                ? "現在登録されているお問い合わせはありません。お困りごとやご要望があればお気軽にお寄せください。"
                : `現在「${CONTACT_STATUS_MAP[activeTab as ContactStatus]?.label}」のお問い合わせはありません。`}
            </div>
            <Link href="/contact/edit" className={styles.newContactBtn}>
              <FontAwesomeIcon icon={faPlus} />
              <span>お問い合わせを作成する</span>
            </Link>
          </div>
        ) : (
          <div className={styles.ticketList}>
            {filteredContacts.map((contact) => {
              const catMeta = CONTACT_CATEGORY_MAP[contact.category] || CONTACT_CATEGORY_MAP.other;
              const featMeta = CONTACT_FEATURE_MAP[contact.feature] || CONTACT_FEATURE_MAP.other;
              const statusMeta = CONTACT_STATUS_MAP[contact.status] || CONTACT_STATUS_MAP.open;

              return (
                <Link
                  key={contact.id}
                  href={`/contact/confirm?contactId=${contact.id}`}
                  className={styles.ticketCard}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.badgeRow}>
                      <span
                        className={styles.categoryBadge}
                        style={{ backgroundColor: catMeta.badgeColor }}
                      >
                        {catMeta.label}
                      </span>
                      <span className={styles.featureBadge}>{featMeta.label}</span>
                    </div>
                    <span
                      className={styles.statusBadge}
                      style={{
                        color: statusMeta.badgeColor,
                        backgroundColor: statusMeta.bg,
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <h2 className={styles.cardTitle}>{contact.title}</h2>

                  {contact.latestMessage && (
                    <div className={styles.previewText}>{contact.latestMessage}</div>
                  )}

                  <div className={styles.cardFooter}>
                    <div className={styles.userInfo}>
                      <UserAvatar src={contact.userAvatar} size={18} alt={contact.userName} />
                      <span>{contact.userName}</span>
                    </div>
                    <div className={styles.timeInfo}>
                      <FontAwesomeIcon icon={faClock} />
                      <span>
                        {new Date(contact.updatedAt || contact.createdAt).toLocaleDateString("ja-JP")}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </BaseLayout>
  );
}
