"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./callback.module.css";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithCustomToken } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
            setErrorMsg(data.message || "ログイン処理に失敗しました。");
          }
          return;
        }

        // Firebase Custom Token でサインイン
        await loginWithCustomToken(data.customToken);

        // 成功時のリダイレクト
        router.replace(data.redirectAfterLogin || "/");
      } catch (err: unknown) {
        console.error("Callback error:", err);
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
