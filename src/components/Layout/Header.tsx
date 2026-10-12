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
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../contexts/AuthContext";
import { UserAvatar } from "../Common/UserAvatar";
import styles from "./Header.module.css";
import { DEFAULT_SECTIONS } from "../../lib/firestore/constants";

export function Header() {
  const { user, userData, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => setDrawerOpen((prev) => !prev);
  const closeDrawer = () => setDrawerOpen(false);

  const section = DEFAULT_SECTIONS.find((s) => s.id === userData?.sectionId);

  return (
    <>
      <header
        className={styles.headerBar}
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          className={styles.headerLeft}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Link href="/" className={styles.logoLink} prefetch={false} onClick={closeDrawer}>
            <div className={styles.logoWrapper}>
              <Image
                src="/sso-logo.jpg"
                alt="Sound Solition Orchestra Logo"
                width={36}
                height={36}
                className={styles.logoImg}
                priority
              />
            </div>
            <div className={styles.titleWrapper}>
              <span className={styles.brandTitle}>Solu Navi</span>
              <span className={styles.brandSubtitle}>Sound Solition Orch.</span>
            </div>
          </Link>
        </div>

        {user && (
          <div
            className={styles.headerRight}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "0.75rem",
              flexShrink: 0,
              marginLeft: "auto",
            }}
          >
            <div
              onClick={toggleDrawer}
              style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
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
                size={34}
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
                        await logout();
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
                <Link href="/" className={styles.homeCard} prefetch={false} onClick={closeDrawer}>
                  <FontAwesomeIcon icon={faHome} className={styles.homeIcon} />
                  <span className={styles.homeLabel}>ホーム</span>
                </Link>
              </div>

              {/* メインメニュー（2列グリッド・主要活動） */}
              <div className={styles.menuDivider}>メインメニュー</div>
              <div className={styles.mainGrid}>
                <Link href="/event" className={styles.mainCard} prefetch={false} onClick={closeDrawer}>
                  <FontAwesomeIcon icon={faCalendarDays} className={`${styles.mainIcon} ${styles.iconTeal}`} />
                  <span className={styles.mainLabel}>イベント・出欠</span>
                </Link>
                <Link href="/call" className={styles.mainCard} prefetch={false} onClick={closeDrawer}>
                  <FontAwesomeIcon icon={faMusic} className={`${styles.mainIcon} ${styles.iconAmber}`} />
                  <span className={styles.mainLabel}>曲募集</span>
                </Link>
                <Link href="/vote" className={styles.mainCard} prefetch={false} onClick={closeDrawer}>
                  <FontAwesomeIcon icon={faSquarePollVertical} className={`${styles.mainIcon} ${styles.iconPurple}`} />
                  <span className={styles.mainLabel}>曲投票</span>
                </Link>
                <Link href="/user" className={styles.mainCard} prefetch={false} onClick={closeDrawer}>
                  <FontAwesomeIcon icon={faUsers} className={`${styles.mainIcon} ${styles.iconEmerald}`} />
                  <span className={styles.mainLabel}>部員名簿</span>
                </Link>
              </div>

              {/* サブメニュー（3列グリッド・設定＆管理） */}
              <div className={styles.menuDivider}>設定・マスタ</div>
              <div className={styles.subGrid}>
                <Link href="/master" className={styles.subCard} prefetch={false} onClick={closeDrawer}>
                  <FontAwesomeIcon icon={faSliders} className={styles.subIcon} />
                  <span className={styles.subLabel}>マスタ管理</span>
                </Link>
                <Link href="/user/detail" className={styles.subCard} prefetch={false} onClick={closeDrawer}>
                  <FontAwesomeIcon icon={faIdCard} className={styles.subIcon} />
                  <span className={styles.subLabel}>マイプロフ</span>
                </Link>
                <Link href="/user/edit" className={styles.subCard} prefetch={false} onClick={closeDrawer}>
                  <FontAwesomeIcon icon={faUserPen} className={styles.subIcon} />
                  <span className={styles.subLabel}>情報変更</span>
                </Link>
                <Link href="/agreement" className={styles.subCard} prefetch={false} onClick={closeDrawer}>
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
