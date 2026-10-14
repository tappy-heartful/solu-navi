"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLine } from "@fortawesome/free-brands-svg-icons";
import {
  faArrowUpRightFromSquare,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { doc, onSnapshot, getDoc, deleteDoc } from "firebase/firestore";
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

  // PWA 関連ステート
  const [isStandalone, setIsStandalone] = useState(false);
  const [pwaSessionId, setPwaSessionId] = useState<string | null>(null);
  const [pwaLoginUrl, setPwaLoginUrl] = useState<string | null>(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const isRedirectingRef = useRef(false);

  // トークンによるログイン完了処理ヘルパー
  const completePwaLogin = useCallback(
    async (token: string, sid: string) => {
      setLoading(true);
      try {
        await loginWithCustomToken(token);
        try {
          await deleteDoc(doc(db, "pwaAuthSessions", sid));
        } catch {
          // 削除失敗はクリティカルではないため無視
        }
        localStorage.removeItem("pwa_session_id");
        router.replace(redirectPath);
      } catch (err: unknown) {
        console.error("PWA custom token login error:", err);
        setError(err instanceof Error ? err.message : "ログイン処理エラー");
        setLoading(false);
      }
    },
    [loginWithCustomToken, redirectPath, router]
  );

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
      let sid = localStorage.getItem("pwa_session_id");
      if (!sid) {
        sid =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : "pwa-" + Math.random().toString(36).substring(2, 15) + "-" + Date.now().toString(36);
        localStorage.setItem("pwa_session_id", sid);
      }
      setPwaSessionId(sid);

      // PWA用のLINEログイン認可URLを事前取得
      fetch(`/api/line/get-url?redirect=${encodeURIComponent(redirectPath)}&pwaSessionId=${sid}`)
        .then((res) => res.json())
        .then((data) => {
          const authUrl = data?.loginUrl || data?.url;
          if (authUrl) {
            setPwaLoginUrl(authUrl);
          }
        })
        .catch((err) => {
          console.error("Failed to pre-fetch PWA login URL:", err);
        });

      // セッションドキュメントの直接チェック関数（フォアグラウンド復帰時にも使用）
      const checkSessionDocDirect = async () => {
        try {
          const snap = await getDoc(doc(db, "pwaAuthSessions", sid));
          if (snap.exists()) {
            const data = snap.data();
            if (data?.status === "completed" && data?.customToken) {
              if (unsub) unsub();
              await completePwaLogin(data.customToken, sid);
            }
          }
        } catch (err) {
          console.error("Direct session check error:", err);
        }
      };

      // Firestore の pwaAuthSessions をリアルタイム監視
      unsub = onSnapshot(doc(db, "pwaAuthSessions", sid), async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.status === "completed" && data?.customToken) {
            if (unsub) unsub();
            await completePwaLogin(data.customToken, sid);
          }
        }
      });

      // iOS PWA がバックグラウンド（Safari）からフォアグラウンドに復帰した瞬間に即時チェック
      const handleVisibilityOrFocus = () => {
        if (document.visibilityState === "visible") {
          checkSessionDocDirect();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityOrFocus);
      window.addEventListener("focus", handleVisibilityOrFocus);

      return () => {
        if (unsub) unsub();
        document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
        window.removeEventListener("focus", handleVisibilityOrFocus);
      };
    } else if (urlPwaSessionId && !isRedirectingRef.current) {
      // 外部ブラウザで pwaSessionId 付きで開かれた場合、即座にLINE認可URLへ自動リダイレクト
      isRedirectingRef.current = true;
      fetch(`/api/line/get-url?redirect=${encodeURIComponent(redirectPath)}&pwaSessionId=${urlPwaSessionId}`)
        .then((res) => res.json())
        .then((data) => {
          const authUrl = data?.loginUrl || data?.url;
          if (authUrl) {
            window.location.href = authUrl;
          }
        })
        .catch((err) => {
          console.error("Auto redirect error with pwaSessionId:", err);
        });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [redirectPath, urlPwaSessionId, completePwaLogin]);


  // 通常ブラウザでの LINE ログイン開始
  const handleLineLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/line/get-url?redirect=${encodeURIComponent(redirectPath)}`);
      const data = await res.json();
      const authUrl = data?.loginUrl || data?.url;
      if (!res.ok || !authUrl) {
        throw new Error(data.error || "認可URLの取得に失敗しました");
      }
      window.location.href = authUrl;
    } catch (err: unknown) {
      console.error("Login redirect error:", err);
      setError(err instanceof Error ? err.message : "ログイン開始エラー");
      setLoading(false);
    }
  };

  // PWA での手動確認・遷移（ボタン押下時）
  const handlePwaManualConfirm = useCallback(async () => {
    if (user) {
      localStorage.removeItem("pwa_session_id");
      router.replace(redirectPath);
      return;
    }

    // まだユーザーが反映されていない場合、Firestore を直接確認
    const sid = pwaSessionId || localStorage.getItem("pwa_session_id");
    if (sid) {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "pwaAuthSessions", sid));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.status === "completed" && data?.customToken) {
            await completePwaLogin(data.customToken, sid);
            return;
          }
        }
      } catch (err) {
        console.error("Manual confirm session check error:", err);
      } finally {
        setLoading(false);
      }
    }

    setError("ブラウザでのログイン完了をお待ちいただくか、Safari等でログイン完了後に再度このボタンを押してください。");
  }, [user, pwaSessionId, completePwaLogin, redirectPath, router]);

  return (
    <div className={styles.loginPage}>
      {/* 背景アンビエント光彩 */}
      <div className={styles.ambientGlowTeal} />
      <div className={styles.ambientGlowAmber} />

      {/* サークルの公式エンブレムロゴ（薄く大きく背景に配置） */}
      <div className={styles.bgLogoBackdrop} aria-hidden="true">
        <Image
          src="/sso-logo.jpg"
          alt=""
          width={720}
          height={720}
          className={styles.bgLogoImg}
          priority
        />
      </div>

      {/* 画面上部：タイトルエリア */}
      <div className={styles.titleArea}>
        <div className={styles.appIconBadge}>
          <Image
            src="/icons/icon-192.png"
            alt="Solu Navi"
            width={76}
            height={76}
            className={styles.appIconImg}
            priority
          />
        </div>

        <h1 className={styles.title}>
          Solu <span className={styles.titleHighlight}>N</span>avi
        </h1>
        <p className={styles.subtitle}>Sound Solition Orchestra</p>
        <p className={styles.caption}>愛媛大学軽音楽部 活動ポータル</p>
      </div>

      {/* 画面下部：認証アクションエリア */}
      <div className={styles.authContainer}>
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
                disabled={loading}
              >
                <FontAwesomeIcon icon={faCircleCheck} style={{ marginRight: 6 }} />
                {loading ? "確認中..." : "ログインを完了して進む"}
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
                  className={styles.loginBtn}
                  onClick={() => setShowPwaGuide(true)}
                >
                  <FontAwesomeIcon icon={faLine} className={styles.lineIcon} />
                  <span>LINEでログイン</span>
                </a>
              ) : (
                <button
                  type="button"
                  className={styles.loginBtn}
                  disabled
                >
                  <FontAwesomeIcon icon={faLine} className={styles.lineIcon} />
                  <span>ログイン準備中...</span>
                </button>
              )
            ) : (
              <button
                type="button"
                className={styles.loginBtn}
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
          ※部員限定システム（公式LINE友だち追加必須）
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.loginPage}>読み込み中...</div>}>
      <LoginContent />
    </Suspense>
  );
}
