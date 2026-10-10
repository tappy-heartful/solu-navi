"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faUsers,
  faIdCard,
  faUserPen,
  faCalendarDays,
  faMusic,
  faSquarePollVertical,
  faSliders,
  faFileShield,
  faTriangleExclamation,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { PwaInstallHint } from "../components/PwaInstallHint";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { DEFAULT_SECTIONS, DEFAULT_ROLES, DEFAULT_INSTRUMENTS } from "@/lib/firestore/constants";
import { getGradeFromEnrollmentYear } from "@/lib/functions";
import styles from "./HomeClient.module.css";

export function HomeClient() {
  const { userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  useEffect(() => {
    setBreadcrumbs([]); // ホームはパンくず空
  }, [setBreadcrumbs]);

  const section = DEFAULT_SECTIONS.find((s) => s.id === userData?.sectionId);
  const role = DEFAULT_ROLES.find((r) => r.id === userData?.roleId);
  const instruments = (userData?.instrumentIds || [])
    .map((id) => DEFAULT_INSTRUMENTS.find((i) => i.id === id)?.name)
    .filter(Boolean);

  // プロフィール未完了判定
  const isProfileIncomplete = !Boolean(
    userData?.abbreviation &&
    userData?.roleId &&
    userData?.sectionId &&
    userData?.enrollmentYear &&
    userData?.instrumentIds?.length
  );

  return (
    <BaseLayout showBreadcrumbs={false}>
      <div className={styles.container}>
        {/* 未完了警告アラート */}
        {isProfileIncomplete && (
          <Link href="/user/edit" prefetch={false} className={styles.warningBanner}>
            <div className={styles.warningContent}>
              <FontAwesomeIcon icon={faTriangleExclamation} className={styles.warningIcon} />
              <div>
                <strong>プロフィールが未入力です</strong>
                <p>出欠や譜割りの登録のため、パートや担当楽器を設定してください。</p>
              </div>
            </div>
            <FontAwesomeIcon icon={faArrowRight} className={styles.warningArrow} />
          </Link>
        )}

        {/* ユーザーウェルカムカード */}
        <div className={styles.welcomeCard}>
          <div className={styles.welcomeHeader}>
            <div className={styles.logoBadge}>
              <Image
                src="/sso-logo.jpg"
                alt="Sound Solition Orchestra Logo"
                width={56}
                height={56}
                className={styles.logoImg}
                priority
              />
            </div>
            <div className={styles.welcomeText}>
              <span className={styles.greeting}>Sound Solition Orchestra</span>
              <h2 className={styles.userName}>
                {userData?.displayName
                  ? `${userData.displayName} さん`
                  : "部員メンバー さん"}
              </h2>
            </div>
          </div>

          <div className={styles.profileBadgeGrid}>
            <div className={styles.badgeItem}>
              <span className={styles.badgeLabel}>役職</span>
              <span className={styles.roleBadge}>{role?.name || "メンバー"}</span>
            </div>
            <div className={styles.badgeItem}>
              <span className={styles.badgeLabel}>パート</span>
              <span
                className={styles.sectionBadge}
                style={{ backgroundColor: section?.color || "#146081" }}
              >
                {section?.name || "未設定"}
              </span>
            </div>
            <div className={styles.badgeItem}>
              <span className={styles.badgeLabel}>回生</span>
              <span className={styles.gradeBadge}>
                {userData?.enrollmentYear
                  ? getGradeFromEnrollmentYear(userData.enrollmentYear)
                  : "未設定"}
              </span>
            </div>
            <div className={styles.badgeItem}>
              <span className={styles.badgeLabel}>担当楽器</span>
              <span className={styles.instBadge}>
                {instruments.length > 0 ? instruments.join(", ") : "未設定"}
              </span>
            </div>
          </div>
        </div>

        {/* クイックアクセスグリッド */}
        <div className={styles.sectionTitleRow}>
          <h3 className={styles.sectionTitle}>クイックアクセス</h3>
        </div>

        <div className={styles.quickGrid}>
          <Link href="/event" prefetch={false} className={styles.quickCard}>
            <div className={`${styles.quickIcon} ${styles.blue}`}>
              <FontAwesomeIcon icon={faCalendarDays} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>イベント・出欠</span>
              <span className={styles.quickSub}>練習日程・本番・出欠回答</span>
            </div>
          </Link>

          <Link href="/call" prefetch={false} className={styles.quickCard}>
            <div className={`${styles.quickIcon} ${styles.amber}`}>
              <FontAwesomeIcon icon={faMusic} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>曲募集</span>
              <span className={styles.quickSub}>ライブ選曲のリクエスト応募</span>
            </div>
          </Link>

          <Link href="/vote" prefetch={false} className={styles.quickCard}>
            <div className={`${styles.quickIcon} ${styles.purple}`}>
              <FontAwesomeIcon icon={faSquarePollVertical} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>曲投票</span>
              <span className={styles.quickSub}>候補曲の単一・ボルダ投票</span>
            </div>
          </Link>

          <Link href="/master" prefetch={false} className={styles.quickCard}>
            <div className={`${styles.quickIcon} ${styles.emerald}`}>
              <FontAwesomeIcon icon={faSliders} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>マスタ管理</span>
              <span className={styles.quickSub}>パート・楽器一覧と管理</span>
            </div>
          </Link>

          <Link href="/user" prefetch={false} className={styles.quickCard}>
            <div className={`${styles.quickIcon} ${styles.blue}`}>
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>部員名簿</span>
              <span className={styles.quickSub}>メンバー連絡先・パート一覧</span>
            </div>
          </Link>

          <Link href="/user/detail" prefetch={false} className={styles.quickCard}>
            <div className={`${styles.quickIcon} ${styles.amber}`}>
              <FontAwesomeIcon icon={faIdCard} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>マイプロフィール</span>
              <span className={styles.quickSub}>自身の登録情報の確認</span>
            </div>
          </Link>

          <Link href="/user/edit" prefetch={false} className={styles.quickCard}>
            <div className={`${styles.quickIcon} ${styles.emerald}`}>
              <FontAwesomeIcon icon={faUserPen} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>登録情報変更</span>
              <span className={styles.quickSub}>パート・担当楽器・連絡先</span>
            </div>
          </Link>

          <Link href="/agreement" prefetch={false} className={styles.quickCard}>
            <div className={`${styles.quickIcon} ${styles.purple}`}>
              <FontAwesomeIcon icon={faFileShield} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>サークル利用規約</span>
              <span className={styles.quickSub}>活動ルールと個人情報</span>
            </div>
          </Link>
        </div>

        {/* PWA ホーム画面アイコン追加ヒント */}
        <PwaInstallHint />
      </div>
    </BaseLayout>
  );
}
