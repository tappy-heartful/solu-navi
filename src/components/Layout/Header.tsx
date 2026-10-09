"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark, faUser, faRightFromBracket, faHome, faUsers, faFileShield } from "@fortawesome/free-solid-svg-icons";
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
            {section && (
              <span
                className={styles.sectionBadge}
                style={{ backgroundColor: section.color || "#3b82f6" }}
              >
                {section.shortName}
              </span>
            )}
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
                <div>
                  <div className={styles.userName}>{userData?.displayName || "メンバー"}</div>
                  <div className={styles.userRole}>
                    {section?.name || "パート未設定"}
                  </div>
                </div>
              </div>
            </div>

            <nav className={styles.drawerNav}>
              <Link href="/" className={styles.navItem} prefetch={false} onClick={closeDrawer}>
                <FontAwesomeIcon icon={faHome} className={styles.navIcon} />
                <span>ホーム</span>
              </Link>
              <Link href="/event" className={styles.navItem} prefetch={false} onClick={closeDrawer}>
                <i className="fa-solid fa-calendar-days" style={{ width: "20px", textAlign: "center" }} />
                <span>イベント・練習予定</span>
              </Link>
              <Link href="/call" className={styles.navItem} prefetch={false} onClick={closeDrawer}>
                <i className="fa-solid fa-music" style={{ width: "20px", textAlign: "center" }} />
                <span>曲募集</span>
              </Link>
              <Link href="/vote" className={styles.navItem} prefetch={false} onClick={closeDrawer}>
                <i className="fa-solid fa-square-poll-vertical" style={{ width: "20px", textAlign: "center" }} />
                <span>曲投票</span>
              </Link>
              <Link href="/master" className={styles.navItem} prefetch={false} onClick={closeDrawer}>
                <i className="fa-solid fa-sliders" style={{ width: "20px", textAlign: "center" }} />
                <span>マスタ管理 (パート・楽器)</span>
              </Link>
              <Link href="/user" className={styles.navItem} prefetch={false} onClick={closeDrawer}>
                <FontAwesomeIcon icon={faUsers} className={styles.navIcon} />
                <span>部員名簿 (ユーザー一覧)</span>
              </Link>
              <Link href="/user/detail" className={styles.navItem} prefetch={false} onClick={closeDrawer}>
                <FontAwesomeIcon icon={faUser} className={styles.navIcon} />
                <span>マイプロフィール</span>
              </Link>
              <Link href="/agreement" className={styles.navItem} prefetch={false} onClick={closeDrawer}>
                <FontAwesomeIcon icon={faFileShield} className={styles.navIcon} />
                <span>利用規約</span>
              </Link>
              <button
                type="button"
                className={`${styles.navItem} ${styles.logoutBtn}`}
                onClick={async () => {
                  closeDrawer();
                  await logout();
                }}
              >
                <FontAwesomeIcon icon={faRightFromBracket} className={styles.navIcon} />
                <span>ログアウト</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
