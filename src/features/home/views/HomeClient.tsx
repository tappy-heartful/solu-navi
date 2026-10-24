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
  faRecordVinyl,
  faRightLeft,
} from "@fortawesome/free-solid-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { HomeAnnouncementSection } from "../components/HomeAnnouncementSection";
import { QuickAttendanceSection } from "../components/QuickAttendanceSection";
import { HomeAnnouncement } from "../types";
import { CalendarView } from "@/features/calendar/components/CalendarView";
import { Event, Vote, Call, Fee, Score, BlueNote } from "@/lib/firestore/types";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { DEFAULT_SECTIONS, DEFAULT_ROLES, DEFAULT_INSTRUMENTS } from "@/lib/firestore/constants";
import {
  getGradeFromEnrollmentYear,
  buildYouTubeHtml,
  getWatchVideosOrder,
  getRandomIndex,
  format,
} from "@/lib/functions";
import { showSpinner } from "@/components/Common/Spinner";
import styles from "./HomeClient.module.css";

const Player = React.memo(
  ({
    title,
    subtitle,
    data,
    idx,
    setIdx,
    onRandom,
  }: {
    title?: string;
    subtitle?: string;
    data: (Score | BlueNote)[];
    idx: number;
    setIdx: React.Dispatch<React.SetStateAction<number>>;
    onRandom: () => void;
  }) => (
    <div className={styles.playerWrapper}>
      <h2 className={styles.playerTitle}>
        {subtitle && <div className={styles.playerSubtitle}>{subtitle}</div>}
        {title}
      </h2>
      <div
        dangerouslySetInnerHTML={{
          __html: buildYouTubeHtml(getWatchVideosOrder(idx, data), false),
        }}
      />
      <div className={styles.playerControls}>
        <button
          type="button"
          onClick={() => setIdx((idx - 1 + data.length) % data.length)}
          className={styles.playerControl}
          title="前へ"
          aria-label="前へ"
        >
          <i className="fa-solid fa-backward-step"></i>
        </button>
        <button
          type="button"
          onClick={onRandom}
          className={styles.playerControl}
          title="ランダム再生"
        >
          ランダム <i className="fa-solid fa-arrows-rotate"></i>
        </button>
        <button
          type="button"
          onClick={() => setIdx((idx + 1) % data.length)}
          className={styles.playerControl}
          title="次へ"
          aria-label="次へ"
        >
          <i className="fa-solid fa-forward-step"></i>
        </button>
      </div>
    </div>
  )
);
Player.displayName = "Player";

interface HomeClientProps {
  initialAnnouncements?: HomeAnnouncement[];
  events?: Event[];
  votes?: Vote[];
  calls?: Call[];
  fees?: Fee[];
  scores?: Score[];
  blueNotes?: BlueNote[];
}

export function HomeClient({
  initialAnnouncements = [],
  events = [],
  votes = [],
  calls = [],
  fees = [],
  scores = [],
  blueNotes = [],
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

  const [currentScoreIdx, setCurrentScoreIdx] = React.useState(0);
  const [currentBNIdx, setCurrentBNIdx] = React.useState(0);

  useEffect(() => {
    if (scores.length) {
      setCurrentScoreIdx(Math.floor(Math.random() * Math.min(scores.length, 6)));
    }
    if (blueNotes.length) {
      const now = new Date();
      const todayId = format(now, "MMdd");
      const firstDayId = format(now, "MM") + "01";

      const todayIdx = blueNotes.findIndex((n) => n.id === todayId);
      if (todayIdx !== -1) {
        setCurrentBNIdx(todayIdx);
      } else {
        const firstDayIdx = blueNotes.findIndex((n) => n.id === firstDayId);
        if (firstDayIdx !== -1) {
          setCurrentBNIdx(firstDayIdx);
        } else {
          const currentMonthPrefix = format(now, "MM");
          const monthBlueNotesIdx = blueNotes.findIndex((n) => n.id.startsWith(currentMonthPrefix));
          setCurrentBNIdx(
            monthBlueNotesIdx !== -1 ? monthBlueNotesIdx : Math.floor(Math.random() * blueNotes.length)
          );
        }
      }
    }
  }, [scores, blueNotes]);

  const quickScores = (scores || []).slice(0, 6);
  const scorePlaylistIds = (scores || [])
    .map((s) => s.youtubeId)
    .filter(Boolean)
    .join(",");
  const bnPlaylistIds = React.useMemo(
    () => getWatchVideosOrder(currentBNIdx, blueNotes)?.join(","),
    [currentBNIdx, blueNotes]
  );

  return (
    <BaseLayout showBreadcrumbs={false} stickyHeader={true}>
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

        {/* 2. サークルカレンダー */}
        <div className={styles.sectionTitleRow}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.titleIcon}>📅</span> サークルカレンダー
          </h3>
        </div>
        <CalendarView events={events} votes={votes} calls={calls} />

        {/* 3. 出欠一括登録 (直近3件の出欠登録カード) */}
        <QuickAttendanceSection events={events} />

        {/* 4. 新着譜面セクション */}
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
                    <span>{score.abbreviation || score.note || "譜面確認"}</span>
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

          {scores.length > 0 && (
            <Player
              title={scores[currentScoreIdx]?.title || "参考演奏"}
              data={scores}
              idx={currentScoreIdx}
              setIdx={setCurrentScoreIdx}
              onRandom={() =>
                setCurrentScoreIdx(getRandomIndex(currentScoreIdx, scores.length))
              }
            />
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

        {/* 4. 今日の一曲セクション (streak-navi 完全準拠) */}
        {blueNotes.length > 0 && (
          <>
            <div className={styles.sectionTitleRow}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.titleIcon}>💿</span> 今日の一曲
              </h3>
              {bnPlaylistIds && (
                <a
                  href={`https://www.youtube.com/watch_videos?video_ids=${bnPlaylistIds}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.playlistBtn}
                >
                  <i className="fa-brands fa-youtube" /> プレイリスト
                </a>
              )}
            </div>

            <div className={styles.scoreSection}>
              <Player
                title={blueNotes[currentBNIdx]?.title}
                subtitle={
                  blueNotes[currentBNIdx]?.id
                    ? `${parseInt(blueNotes[currentBNIdx].id.substring(0, 2))}月${parseInt(blueNotes[currentBNIdx].id.substring(2))}日の曲`
                    : ""
                }
                data={blueNotes}
                idx={currentBNIdx}
                setIdx={setCurrentBNIdx}
                onRandom={() =>
                  setCurrentBNIdx(getRandomIndex(currentBNIdx, blueNotes.length))
                }
              />
              <div className={styles.moreScoreRow}>
                <Link
                  href="/blue-note"
                  prefetch={false}
                  className={styles.moreScoreLink}
                  onClick={() => showSpinner()}
                >
                  もっと見る <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: "0.75rem" }} />
                </Link>
              </div>
            </div>
          </>
        )}

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
            </div>
            <FontAwesomeIcon icon={faSliders} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/blue-note"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardCyan}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconCyanBg}`}>
              <FontAwesomeIcon icon={faRecordVinyl} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>今日の一曲</span>
            </div>
            <FontAwesomeIcon icon={faRecordVinyl} className={styles.watermarkIcon} />
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
            </div>
            <FontAwesomeIcon icon={faFileShield} className={styles.watermarkIcon} />
          </Link>

          <Link
            href="/handover"
            prefetch={false}
            className={`${styles.quickCard} ${styles.cardAmber}`}
            onClick={() => showSpinner()}
          >
            <div className={`${styles.quickIcon} ${styles.iconAmberBg}`}>
              <FontAwesomeIcon icon={faRightLeft} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>引継ぎ</span>
            </div>
            <FontAwesomeIcon icon={faRightLeft} className={styles.watermarkIcon} />
          </Link>
        </div>
      </div>
    </BaseLayout>
  );
}
