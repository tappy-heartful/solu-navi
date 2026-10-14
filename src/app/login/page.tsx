"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLine } from "@fortawesome/free-brands-svg-icons";
import {
  faShieldHalved,
  faUserCheck,
  faArrowUpRightFromSquare,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./login.module.css";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
  const urlPwaSessionId = searchParams.get("pwaSessionId");
  const { loginWithCustomToken, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDevLogin, setShowDevLogin] = useState(false);

  // PWA 関連ステート
  const [isStandalone, setIsStandalone] = useState(false);
  const [pwaSessionId, setPwaSessionId] = useState<string | null>(null);
  const [pwaLoginUrl, setPwaLoginUrl] = useState<string | null>(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const isRedirectingRef = useRef(false);

  // 1. PWA スタンドアロン判定 & pwaSessionId 初期化
  useEffect(() => {
    const standalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches);

    setIsStandalone(standalone);

    let unsub: (() => void) | undefined;

    if (standalone) {
      // PWA スタンドアロンの場合、Session ID を発行・保持
      let sid = localStorage.getItem("pwa_session_id");
      if (!sid) {
        sid =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : "pwa-" + Math.random().toString(36).substring(2, 15) + "-" + Date.now().toString(36);
        localStorage.setItem("pwa_session_id", sid);
      }
      setPwaSessionId(sid);

      // PWA用の認可URLを事前取得
      fetch(`/api/line/get-url?redirect=${encodeURIComponent(redirectPath)}&pwaSessionId=${sid}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.url) {
            setPwaLoginUrl(data.url);
          }
        })
        .catch((err) => {
          console.error("Failed to pre-fetch PWA login URL:", err);
        });

      // Firestore の pwaAuthSessions をリアルタイム監視
      unsub = onSnapshot(doc(db, "pwaAuthSessions", sid), async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.status === "completed" && data?.customToken) {
            setLoading(true);
            try {
              if (unsub) unsub();
              await loginWithCustomToken(data.customToken);
              await deleteDoc(doc(db, "pwaAuthSessions", sid));
              localStorage.removeItem("pwa_session_id");
              router.replace(redirectPath);
            } catch (err: unknown) {
              console.error("PWA token login error:", err);
              setError(err instanceof Error ? err.message : "PWAセッション同期エラー");
              setLoading(false);
            }
          }
        }
      });
    } else if (urlPwaSessionId && !isRedirectingRef.current) {
      // 外部ブラウザで pwaSessionId 付きで開かれた場合、即座にLINE認可URLへ自動リダイレクト
      isRedirectingRef.current = true;
      fetch(`/api/line/get-url?redirect=${encodeURIComponent(redirectPath)}&pwaSessionId=${urlPwaSessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.url) {
            window.location.href = data.url;
          }
        })
        .catch((err) => {
          console.error("Auto redirect error with pwaSessionId:", err);
        });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [redirectPath, urlPwaSessionId, loginWithCustomToken, router]);

  // すでにログイン済みの場合はリダイレクト
  useEffect(() => {
    if (user) {
      router.replace(redirectPath);
    }
  }, [user, redirectPath, router]);

  // 通常ブラウザでの LINE ログイン開始
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

  // PWA での手動確認・遷移
  const handlePwaManualConfirm = useCallback(() => {
    if (user) {
      localStorage.removeItem("pwa_session_id");
      router.replace(redirectPath);
    } else {
      setError("ブラウザでのログイン完了をお待ちいただくか、再度お試しください。");
    }
  }, [user, redirectPath, router]);

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

        {/* PWA ガイド表示 */}
        {isStandalone && showPwaGuide ? (
          <div className={styles.pwaGuideBox}>
            <div className={styles.pwaGuideTitle}>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              <span>外部ブラウザでログイン中</span>
            </div>
            <p className={styles.pwaGuideText}>
              LINEログインを行うため、外部ブラウザを起動しました。
              <br />
              ログイン完了後、自動的にこのアプリの画面が切り替わります。
            </p>
            <div className={styles.pwaActions}>
              <button
                type="button"
                className={styles.pwaConfirmBtn}
                onClick={handlePwaManualConfirm}
              >
                <FontAwesomeIcon icon={faCircleCheck} style={{ marginRight: 6 }} />
                ログインを完了して進む
              </button>
              <button
                type="button"
                className={styles.pwaCancelBtn}
                onClick={() => setShowPwaGuide(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* LINEログインボタン (PWA Standalone vs 通常ブラウザ) */}
            {isStandalone ? (
              pwaLoginUrl ? (
                <a
                  href={pwaLoginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.lineBtn}
                  onClick={() => setShowPwaGuide(true)}
                >
                  <FontAwesomeIcon icon={faLine} className={styles.lineIcon} />
                  <span>LINEでログイン</span>
                </a>
              ) : (
                <button
                  type="button"
                  className={styles.lineBtn}
                  disabled
                >
                  <FontAwesomeIcon icon={faLine} className={styles.lineIcon} />
                  <span>ログイン準備中...</span>
                </button>
              )
            ) : (
              <button
                type="button"
                className={styles.lineBtn}
                onClick={handleLineLogin}
                disabled={loading}
              >
                <FontAwesomeIcon icon={faLine} className={styles.lineIcon} />
                <span>{loading ? "接続中..." : "LINEでログイン"}</span>
              </button>
            )}
          </>
        )}

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
