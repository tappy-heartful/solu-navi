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
  faPhotoFilm,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { HomeAnnouncementSection } from "../components/HomeAnnouncementSection";
import { HomeAnnouncement } from "../types";
import { CalendarView } from "@/features/calendar/components/CalendarView";
import { Event, Vote, Call, Fee, Score } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { DEFAULT_SECTIONS, DEFAULT_ROLES, DEFAULT_INSTRUMENTS } from "@/lib/firestore/constants";
import { getGradeFromEnrollmentYear } from "@/lib/functions";
import { showSpinner } from "@/components/Common/Spinner";
import styles from "./HomeClient.module.css";

interface HomeClientProps {
  initialAnnouncements?: HomeAnnouncement[];
  events?: Event[];
  votes?: Vote[];
  calls?: Call[];
  fees?: Fee[];
  scores?: Score[];
}

export function HomeClient({
  initialAnnouncements = [],
  events = [],
  votes = [],
  calls = [],
  fees = [],
  scores = [],
}: HomeClientProps) {
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

  const quickScores = (scores || []).slice(0, 6);
  const scorePlaylistIds = (scores || [])
    .map((s) => s.youtubeId)
    .filter(Boolean)
    .join(",");

  return (
    <BaseLayout showBreadcrumbs={false}>
      <div className={styles.container}>
        {/* 画面タイトル (streak-navi準拠) */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            <FontAwesomeIcon icon={faHouse} className={styles.headerIcon} />
            <span>ホーム</span>
          </h1>
        </div>

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

        {/* 1. 受付中のお知らせ (曲募集・曲投票・リマインド等) */}
        <HomeAnnouncementSection announcements={initialAnnouncements} />

        {/* 2. 新着譜面セクション */}
        <div className={styles.sectionTitleRow}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.titleIcon}>🎼</span> 新着譜面
          </h3>
          {scorePlaylistIds && (
            <a
              href={`https://www.youtube.com/watch_videos?video_ids=${scorePlaylistIds}`}
              target="_blank"
              rel="noreferrer"
              className={styles.playlistBtn}
            >
              <i className="fa-brands fa-youtube" /> プレイリスト
            </a>
          )}
        </div>

        <div className={styles.scoreSection}>
          {quickScores.length > 0 ? (
            <div className={styles.quickScoreGrid}>
              {quickScores.map((score) => (
                <Link
                  key={score.id}
                  href={`/score/confirm?scoreId=${score.id}`}
                  prefetch={false}
                  className={styles.quickScoreCard}
                  onClick={() => showSpinner()}
                >
                  <span className={styles.scoreCardTitle}>🎼 {score.title}</span>
                  <div className={styles.scoreCardMeta}>
                    <span>{score.abbreviation || score.note || "譜面詳細"}</span>
                    {score.youtubeId && (
                      <i className={`fa-brands fa-youtube ${styles.scoreHasYoutube}`} title="参考音源あり" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyScoreMsg}>譜面はまだ登録されていません🍀</div>
          )}

          <div className={styles.moreScoreRow}>
            <Link
              href="/score"
              prefetch={false}
              className={styles.moreScoreLink}
              onClick={() => showSpinner()}
            >
              もっと見る <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: "0.75rem" }} />
            </Link>
          </div>
        </div>

        {/* 3. サークルカレンダー */}
        <div className={styles.sectionTitleRow}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.titleIcon}>📅</span> サークルカレンダー
          </h3>
        </div>
        <CalendarView events={events} votes={votes} calls={calls} />

        {/* ユーザーウェルカムカード (いったん非表示) */}
        {/*
        <div className={styles.welcomeCard}>
          <div className={styles.welcomeHeader}>
            <div className={styles.logoBadge}>
              <Image
                src="/sso-logo.jpg"
                alt="Sound Solution Orchestra Logo"
                width={56}
                height={56}
                className={styles.logoImg}
                priority
              />
            </div>
            <div className={styles.welcomeText}>
              <span className={styles.greeting}>Sound Solution Orchestra</span>
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
        */}

        {/* 4. 活動・音楽メニュー */}
        <div className={styles.sectionTitleRow}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.titleIcon}>🎷</span> 活動・音楽メニュー
          </h3>
        </div>

        <div className={styles.quickGrid}>
          <Link
            href="/event"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardTeal}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconTealBg}`}>
              <FontAwesomeIcon icon={faCalendarDays} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>イベント・出欠</span>
              <span className={styles.quickKeyword}>練習日程・回答</span>
            </div>
            <FontAwesomeIcon icon={faCalendarDays} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/score"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardPurple}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconPurpleBg}`}>
              <FontAwesomeIcon icon={faMusic} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>譜面管理</span>
              <span className={styles.quickKeyword}>保管ボックス・編成情報</span>
            </div>
            <FontAwesomeIcon icon={faMusic} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/media"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardAmber}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconAmberBg}`}>
              <FontAwesomeIcon icon={faPhotoFilm} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>録音・メディア</span>
              <span className={styles.quickKeyword}>練習録音・YouTube</span>
            </div>
            <FontAwesomeIcon icon={faPhotoFilm} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/fee"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardTeal}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconTealBg}`}>
              <FontAwesomeIcon icon={faCoins} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>部費・集金</span>
              <span className={styles.quickKeyword}>納入管理・催促通知</span>
            </div>
            <FontAwesomeIcon icon={faCoins} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/call"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardAmber}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconAmberBg}`}>
              <FontAwesomeIcon icon={faMusic} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>曲募集</span>
              <span className={styles.quickKeyword}>リクエスト応募</span>
            </div>
            <FontAwesomeIcon icon={faMusic} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/vote"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardPurple}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconPurpleBg}`}>
              <FontAwesomeIcon icon={faSquarePollVertical} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>曲投票</span>
              <span className={styles.quickKeyword}>選曲・順位投票</span>
            </div>
            <FontAwesomeIcon icon={faSquarePollVertical} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/master"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardEmerald}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconEmeraldBg}`}>
              <FontAwesomeIcon icon={faSliders} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>マスタ管理</span>
              <span className={styles.quickKeyword}>パート・楽器設定</span>
            </div>
            <FontAwesomeIcon icon={faSliders} className={styles.watermarkIcon} />
          </Link>
        </div>

        {/* ユーザ・サークル設定メニュー */}
        <div className={styles.sectionTitleRow}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.titleIcon}>👥</span> ユーザ・サークル設定
          </h3>
        </div>

        <div className={styles.quickGrid}>
          <Link
            href="/user"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardBlue}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconBlueBg}`}>
              <FontAwesomeIcon icon={faUsers} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>ユーザ</span>
              <span className={styles.quickKeyword}>ユーザ一覧</span>
            </div>
            <FontAwesomeIcon icon={faUsers} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/user/detail"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardCyan}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconCyanBg}`}>
              <FontAwesomeIcon icon={faIdCard} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>マイプロフィール</span>
              <span className={styles.quickKeyword}>登録情報確認</span>
            </div>
            <FontAwesomeIcon icon={faIdCard} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/user/edit"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardIndigo}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconIndigoBg}`}>
              <FontAwesomeIcon icon={faUserPen} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>登録情報変更</span>
              <span className={styles.quickKeyword}>パート・楽器変更</span>
            </div>
            <FontAwesomeIcon icon={faUserPen} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/agreement"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardSlate}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconSlateBg}`}>
              <FontAwesomeIcon icon={faFileShield} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>サークル利用規約</span>
              <span className={styles.quickKeyword}>活動ルールと規程</span>
            </div>
            <FontAwesomeIcon icon={faFileShield} className={styles.watermarkIcon} />
          </Link>
        </div>
      </div>
    </BaseLayout>
  );
}
