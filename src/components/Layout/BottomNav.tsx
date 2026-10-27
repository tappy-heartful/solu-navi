"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faCalendarDays,
  faMusic,
  faPhotoFilm,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/AuthContext";
import { showSpinner } from "@/components/Common/Spinner";
import styles from "./BottomNav.module.css";

interface NavItem {
  label: string;
  href: string;
  icon: typeof faHome;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "ホーム",
    href: "/",
    icon: faHome,
    isActive: (pathname: string) => pathname === "/",
  },
  {
    label: "イベント",
    href: "/event",
    icon: faCalendarDays,
    isActive: (pathname: string) =>
      pathname.startsWith("/event") || pathname === "/calendar",
  },
  {
    label: "譜面",
    href: "/score",
    icon: faMusic,
    isActive: (pathname: string) => pathname.startsWith("/score"),
  },
  {
    label: "メディア",
    href: "/media",
    icon: faPhotoFilm,
    isActive: (pathname: string) => pathname.startsWith("/media"),
  },
  {
    label: "部費",
    href: "/fee",
    icon: faCoins,
    isActive: (pathname: string) => pathname.startsWith("/fee"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkStandalone = () => {
        const isPwa =
          window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        setIsStandalone(Boolean(isPwa));
      };
      checkStandalone();
      const mql = window.matchMedia("(display-mode: standalone)");
      if (mql.addEventListener) {
        mql.addEventListener("change", checkStandalone);
        return () => mql.removeEventListener("change", checkStandalone);
      }
    }
  }, []);

  // 未ログイン時、またはログイン・同意前の認証関連画面では表示しない
  if (!user || pathname === "/login" || pathname === "/agreement") {
    return null;
  }

  return (
    <nav
      className={`${styles.bottomNav} ${isStandalone ? styles.isPwa : ""}`}
      aria-label="モバイルフッターナビゲーション"
    >
      <div className={styles.navContainer}>
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(pathname || "");
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`${styles.navItem} ${active ? styles.active : ""}`}
              onClick={() => {
                if (!active) {
                  showSpinner();
                }
              }}
            >
              <div className={styles.iconWrapper}>
                <FontAwesomeIcon icon={item.icon} className={styles.icon} />
                {active && <span className={styles.activeDot} />}
              </div>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
