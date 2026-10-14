"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faUsers, faUser, faEdit } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Footer.module.css";

export function Footer() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user || pathname.startsWith("/login") || pathname.startsWith("/callback")) {
    return null;
  }

  const navItems = [
    { label: "ホーム", href: "/", icon: faHome, active: pathname === "/" },
    { label: "名簿", href: "/user", icon: faUsers, active: pathname === "/user" },
    { label: "プロフィール", href: "/user/detail", icon: faUser, active: pathname.startsWith("/user/detail") },
    { label: "登録変更", href: "/user/edit", icon: faEdit, active: pathname.startsWith("/user/edit") },
  ];

  return (
    <footer className={styles.bottomNav}>
      <div className={styles.navContainer}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={`${styles.navLink} ${item.active ? styles.active : ""}`}
          >
            <FontAwesomeIcon icon={item.icon} className={styles.icon} />
            <span className={styles.label}>{item.label}</span>
          </Link>
        ))}
      </div>
    </footer>
  );
}
