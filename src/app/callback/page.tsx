"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { writeLog } from "@/lib/functions";
import { showDialog } from "@/components/Common/CommonDialog";
import styles from "./callback.module.css";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithCustomToken } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPwaSuccess, setIsPwaSuccess] = useState(false);
  const hasCalled = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setErrorMsg(errorDescription || "ログインがキャンセルされました。");
      return;
    }

    if (!code || !state) {
      setErrorMsg("認証パラメータが不足しています。");
      return;
    }

    if (hasCalled.current) {
      return;
    }
    hasCalled.current = true;

    async function handleLogin() {
      try {
        const res = await fetch("/api/line/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error === "NOT_FRIEND") {
            setErrorMsg("公式アカウントが友だち追加されていません。友だち追加後に再度お試しください。");
          } else {
            setErrorMsg(data.message || data.error || "ログイン処理に失敗しました。");
          }
          return;
        }

        // PWA ログインの場合（外部ブラウザから PWA アプリ本体へ戻す）
        if (data.isPwaLogin) {
          setIsPwaSuccess(true);
          await showDialog({
            title: "ログイン成功！",
            message: "認証が完了しました！Solu Naviアプリに戻り、画面左上の「完了」ボタン（またはブラウザを閉じて）アプリをご確認ください。",
            type: "success",
          });
          return;
        }

        // 通常ブラウザでのログイン：Firebase Custom Token でサインインして遷移
        await loginWithCustomToken(data.customToken);
        router.replace(data.redirectAfterLogin || "/");
      } catch (err: unknown) {
        console.error("Callback error:", err);
        await writeLog({
          dataId: state || "oauth",
          action: "LINEログインコールバック",
          status: "error",
          errorDetail: { message: err instanceof Error ? err.message : String(err) },
        });
        setErrorMsg("通信エラーが発生しました。");
      }
    }

    handleLogin();
  }, [searchParams, loginWithCustomToken, router]);

  return (
    <div className={styles.callbackContainer || styles.container}>
      <div className={styles.callbackCard || styles.card}>
        {errorMsg ? (
          <>
            <h2 className={styles.errorTitle}>ログインエラー</h2>
            <p className={styles.errorText}>{errorMsg}</p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => router.push("/login")}
            >
              ログイン画面に戻る
            </button>
          </>
        ) : isPwaSuccess ? (
          <>
            <h2 className={styles.successTitle} style={{ color: "#16a34a", fontSize: "1.25rem", fontWeight: 800 }}>
              ✓ ログイン成功！
            </h2>
            <p className={styles.loadingText} style={{ marginTop: "0.75rem", lineHeight: 1.6 }}>
              LINE認証が正常に完了しました。
              <br />
              <strong>「Solu Navi」アプリ</strong>に戻ってください。自動的にログイン後の画面へ切り替わります。
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "1rem" }}>
              ※画面左上の「完了」やブラウザの閉じるボタンを押してアプリにお戻りいただけます。
            </p>
          </>
        ) : (
          <>
            <div className={styles.spinner}></div>
            <h2 className={styles.loadingTitle}>LINEでログイン中...</h2>
            <p className={styles.loadingText}>認証情報を確認しています。少々お待ちください。</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className={styles.callbackContainer || styles.container}>読み込み中...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
