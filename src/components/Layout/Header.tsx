"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faXmark,
  faUser,
  faRightFromBracket,
  faHome,
  faUsers,
  faFileShield,
  faCalendarDays,
  faMusic,
  faSquarePollVertical,
  faSliders,
  faIdCard,
  faUserPen,
  faPhotoFilm,
  faCoins,
  faRecordVinyl,
  faRightLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../contexts/AuthContext";
import { UserAvatar } from "../Common/UserAvatar";
import { showSpinner } from "../Common/Spinner";
import styles from "./Header.module.css";
import { DEFAULT_SECTIONS } from "../../lib/firestore/constants";
import { writeLog } from "../../lib/functions";

export function Header() {
  const { user, userData, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const closeDrawer = () => setDrawerOpen(false);

  const handleMenuNav = () => {
    closeDrawer();
    showSpinner();
  };

  const section = DEFAULT_SECTIONS.find((s) => s.id === userData?.sectionId);

  return (
    <>
      <header className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <Link
            href="/"
            className={styles.logoLink}
            prefetch={false}
            onClick={() => {
              closeDrawer();
              showSpinner();
            }}
          >
            <div className={styles.logoWrapper}>
              <Image
                src="/sso-logo.jpg"
                alt="Sound Solution Orchestra Logo"
                width={44}
                height={44}
                className={styles.logoImg}
                priority
              />
            </div>
            <div className={styles.titleWrapper}>
              <span className={styles.brandTitle}>Solu Navi</span>
              <span className={styles.brandSubtitle}>Sound Solution Orch.</span>
            </div>
          </Link>
        </div>

        {user && (
          <div className={styles.headerRight}>
            <div
              onClick={toggleDrawer}
              className={styles.avatarButton}
              title="メニューを開く"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") toggleDrawer();
              }}
            >
              <UserAvatar
                src={userData?.pictureUrl}
                alt={userData?.displayName || "ユーザー"}
                size={46}
                className={styles.headerAvatar}
                priority
              />
            </div>
            <button
              type="button"
              className={styles.menuButton}
              onClick={toggleDrawer}
              aria-label="メニューを開く"
            >
              <FontAwesomeIcon icon={drawerOpen ? faXmark : faBars} className={styles.icon} />
            </button>
          </div>
        )}
      </header>

      {/* ドロワーメニュー */}
      {drawerOpen && user && (
        <div className={styles.drawerOverlay} onClick={closeDrawer}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
            {/* スライドメニュー本体 */}
            <div className={styles.drawerHeader}>
              <div className={styles.userInfo}>
                <div className={styles.avatar}>
                  <UserAvatar
                    src={userData?.pictureUrl}
                    alt={userData?.displayName || "アバター"}
                    size={44}
                    className={styles.avatarImg}
                  />
                </div>
                <div className={styles.userTextInfo}>
                  <div className={styles.userName}>{userData?.displayName || "メンバー"}</div>
                  <div className={styles.userRoleRow}>
                    <span
                      className={styles.sectionTag}
                      style={{ backgroundColor: section?.color || "#146081" }}
                    >
                      {section?.name || "パート未設定"}
                    </span>
                    <button
                      type="button"
                      className={styles.smallLogoutBtn}
                      onClick={async () => {
                        closeDrawer();
                        try {
                          await logout();
                        } catch (error) {
                          console.error("[Header] ログアウトエラー:", error);
                          await writeLog({
                            dataId: user?.uid || "unknown",
                            action: "ログアウト",
                            status: "error",
                            errorDetail: { message: (error as Error).message },
                          });
                        }
                      }}
                      title="ログアウト"
                    >
                      <FontAwesomeIcon icon={faRightFromBracket} /> ログアウト
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={styles.closeDrawerBtn}
                onClick={closeDrawer}
                aria-label="メニューを閉じる"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              {/* ホーム（1列・フル幅カード） */}
              <div className={styles.homeSection}>
                <Link href="/" className={styles.homeCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faHome} className={styles.homeIcon} />
                  <span className={styles.homeLabel}>ホーム</span>
                </Link>
              </div>

              {/* メインメニュー（2列グリッド・主要活動） */}
              <div className={styles.menuDivider}>活動メニュー</div>
              <div className={styles.mainGrid}>
                <Link href="/event" className={styles.mainCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faCalendarDays} className={`${styles.mainIcon} ${styles.iconTeal}`} />
                  <span className={styles.mainLabel}>イベント・出欠</span>
                </Link>
                <Link href="/score" className={styles.mainCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faMusic} className={`${styles.mainIcon} ${styles.iconPurple}`} />
                  <span className={styles.mainLabel}>譜面管理</span>
                </Link>
                <Link href="/media" className={styles.mainCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faPhotoFilm} className={`${styles.mainIcon} ${styles.iconAmber}`} />
                  <span className={styles.mainLabel}>録音・メディア</span>
                </Link>
                <Link href="/fee" className={styles.mainCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faCoins} className={`${styles.mainIcon} ${styles.iconTeal}`} />
                  <span className={styles.mainLabel}>部費・集金</span>
                </Link>
              </div>

              {/* サブメニュー（3列グリッド・機能＆設定） */}
              <div className={styles.menuDivider}>その他の機能・設定</div>
              <div className={styles.subGrid}>
                <Link href="/call" className={styles.subCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faMusic} className={styles.subIcon} />
                  <span className={styles.subLabel}>曲募集</span>
                </Link>
                <Link href="/vote" className={styles.subCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faSquarePollVertical} className={styles.subIcon} />
                  <span className={styles.subLabel}>曲投票</span>
                </Link>
                <Link href="/blue-note" className={styles.subCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faRecordVinyl} className={styles.subIcon} />
                  <span className={styles.subLabel}>今日の一曲</span>
                </Link>
                <Link href="/user" className={styles.subCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faUsers} className={styles.subIcon} />
                  <span className={styles.subLabel}>ユーザ</span>
                </Link>
                <Link href="/handover" className={styles.subCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faRightLeft} className={styles.subIcon} />
                  <span className={styles.subLabel}>引継ぎ</span>
                </Link>
                <Link href="/master" className={styles.subCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faSliders} className={styles.subIcon} />
                  <span className={styles.subLabel}>マスタ管理</span>
                </Link>
                <Link href="/user/detail" className={styles.subCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faIdCard} className={styles.subIcon} />
                  <span className={styles.subLabel}>マイプロフ</span>
                </Link>
                <Link href="/user/edit" className={styles.subCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faUserPen} className={styles.subIcon} />
                  <span className={styles.subLabel}>情報変更</span>
                </Link>
                <Link href="/agreement" className={styles.subCard} prefetch={false} onClick={handleMenuNav}>
                  <FontAwesomeIcon icon={faFileShield} className={styles.subIcon} />
                  <span className={styles.subLabel}>利用規約</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
