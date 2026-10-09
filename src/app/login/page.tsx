"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLine } from "@fortawesome/free-brands-svg-icons";
import { faShieldHalved, faUserCheck } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./login.module.css";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const { loginWithCustomToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDevLogin, setShowDevLogin] = useState(false);

  // LINE ログイン開始
  const handleLineLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/line/get-url?redirect=${encodeURIComponent(redirectPath)}`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "認可URLの取得に失敗しました");
      }
      window.location.href = data.url;
    } catch (err: unknown) {
      console.error("Login redirect error:", err);
      setError(err instanceof Error ? err.message : "ログイン開始エラー");
      setLoading(false);
    }
  };

  // 開発・テスト用ログイン
  const handleDevLogin = async (role: "admin" | "user") => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/test-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok || !data.customToken) {
        throw new Error(data.error || "テストトークン取得失敗");
      }
      await loginWithCustomToken(data.customToken);
      router.replace(redirectPath);
    } catch (err: unknown) {
      console.error("Dev login error:", err);
      setError(err instanceof Error ? err.message : "開発ログインエラー");
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer || styles.container}>
      <div className={styles.loginCard || styles.card}>
        {/* ロゴ & タイトル */}
        <div className={styles.logoWrapper}>
          <Image
            src="/sso-logo.jpg"
            alt="Sound Solition Orchestra"
            width={120}
            height={120}
            className={styles.logoImg}
            priority
          />
        </div>

        <h1 className={styles.title}>Solu Navi</h1>
        <p className={styles.subtitle}>愛媛大学軽音楽部 Sound Solition Orchestra</p>
        <p className={styles.caption}>活動ポータルへようこそ</p>

        {error && <div className={styles.errorBox}>{error}</div>}

        {/* LINEログインボタン */}
        <button
          type="button"
          className={styles.lineBtn}
          onClick={handleLineLogin}
          disabled={loading}
        >
          <FontAwesomeIcon icon={faLine} className={styles.lineIcon} />
          <span>{loading ? "接続中..." : "LINEでログイン"}</span>
        </button>

        <p className={styles.notes}>
          ※部員限定システムです。ログインには公式LINEアカウントの友だち追加が必要です。
        </p>

        {/* 開発・テスト用ログインセクション */}
        <div className={styles.devSection}>
          <button
            type="button"
            className={styles.devToggle}
            onClick={() => setShowDevLogin((prev) => !prev)}
          >
            {showDevLogin ? "▲ テストログインを閉じる" : "▼ ローカル・テスト用ログイン"}
          </button>

          {showDevLogin && (
            <div className={styles.devButtons}>
              <button
                type="button"
                className={styles.testBtn}
                onClick={() => handleDevLogin("admin")}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faShieldHalved} />
                <span>管理者としてログイン</span>
              </button>
              <button
                type="button"
                className={styles.testBtn}
                onClick={() => handleDevLogin("user")}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faUserCheck} />
                <span>一般部員としてログイン</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.loginContainer || styles.container}>読み込み中...</div>}>
      <LoginContent />
    </Suspense>
  );
}
