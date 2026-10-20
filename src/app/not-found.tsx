"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faRightFromBracket,
  faCompass,
} from "@fortawesome/free-solid-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { useAuth } from "@/contexts/AuthContext";
import { showSpinner, hideSpinner } from "@/components/Common/Spinner";
import { showDialog } from "@/components/Common/CommonDialog";
import styles from "./not-found.module.css";

export default function NotFound() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (!user) {
      showSpinner();
      router.replace("/login");
      return;
    }

    const confirmed = await showDialog({
      title: "ログアウト",
      message: "ログアウトしてログイン画面に戻りますか？",
      isConfirm: true,
      type: "warning",
      confirmText: "ログアウト",
      cancelText: "キャンセル",
    });
    if (!confirmed) return;

    try {
      showSpinner();
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("[NotFound] ログアウトエラー:", error);
    } finally {
      hideSpinner();
    }
  };

  return (
    <BaseLayout showBreadcrumbs={false} showActions={false}>
      <div className={styles.notFoundWrapper}>
        <div className={styles.card}>
          <div className={styles.iconBadge}>
            <FontAwesomeIcon icon={faCompass} />
          </div>

          <div className={styles.codeText}>404</div>
          <h1 className={styles.title}>ページが見つかりません</h1>
          <p className={styles.description}>
            アクセスしようとしたページは削除されたか、URLが間違っている可能性があります。
          </p>

          <div className={styles.actionGroup}>
            <Link
              href="/"
              prefetch={false}
              className={styles.homeBtn}
              onClick={() => showSpinner()}
            >
              <FontAwesomeIcon icon={faHome} />
              <span>ホームへ戻る</span>
            </Link>

            <button
              type="button"
              className={styles.logoutBtn}
              onClick={handleLogout}
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
              <span>{user ? "ログアウト" : "ログイン画面へ"}</span>
            </button>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}
