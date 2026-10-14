"use client";

import React, { useState, useEffect } from "react";
import styles from "./Spinner.module.css";

const BAND_MESSAGES = [
  "チューニングしています...",
  "リードの調子を確認しています...",
  "ミュートを準備しています...",
  "スコアをめくっています...",
  "アドリブを練っています...",
  "カウントを出しています...",
  "ピッチを合わせています...",
  "テンポキープを意識しています...",
  "アンサンブルを揃えています...",
  "スウィングのリズムに乗っています...",
  "ダイナミクスを整えています...",
  "譜面台の高さを調整しています...",
  "ドラムのフィルインを聴いています...",
  "サックスセクションがブレスを合わせています...",
  "トロンボーンがスライドオイルを差しています...",
  "トランペットがハイノートに備えています...",
  "ベースがコードトーンを支えています...",
  "ピアノが美しいバッキングを探っています...",
];

let spinnerShowHandler: ((msg?: string) => void) | null = null;
let spinnerHideHandler: (() => void) | null = null;

export function showSpinner(customMsg?: string) {
  if (spinnerShowHandler) spinnerShowHandler(customMsg);
}

export function hideSpinner() {
  if (spinnerHideHandler) spinnerHideHandler();
}

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

// ページ遷移を検知して自動でスピナーを閉じるサブコンポーネント
function RouteChangeSpinnerCloser() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    hideSpinner();
  }, [pathname, searchParams]);

  return null;
}

export function Spinner() {
  const [visible, setVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(BAND_MESSAGES[0]);

  useEffect(() => {
    spinnerShowHandler = (msg?: string) => {
      const initial = msg || BAND_MESSAGES[Math.floor(Math.random() * BAND_MESSAGES.length)];
      setCurrentMessage(initial);
      setVisible(true);
    };

    spinnerHideHandler = () => {
      setVisible(false);
    };

    return () => {
      spinnerShowHandler = null;
      spinnerHideHandler = null;
    };
  }, []);

  // メッセージのランダムローテーション & 安全タイムアウト（最大10秒で自動非表示）
  useEffect(() => {
    if (!visible) return;

    // 10秒経過しても閉じられない場合は安全のため自動非表示
    const timeout = setTimeout(() => {
      setVisible(false);
    }, 10000);

    const interval = setInterval(() => {
      const nextMsg = BAND_MESSAGES[Math.floor(Math.random() * BAND_MESSAGES.length)];
      setCurrentMessage(nextMsg);
    }, 2200);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [visible]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteChangeSpinnerCloser />
      </Suspense>
      {!visible ? null : (
        <div className={styles.overlay} onClick={() => hideSpinner()}>
          <div className={styles.spinnerCard || styles.container} onClick={(e) => e.stopPropagation()}>
            <div className={styles.pulseRing}>
              <div className={styles.iconContainer}>
                <span className={styles.noteIcon}>🎷</span>
              </div>
            </div>
            <p className={styles.message}>{currentMessage}</p>
          </div>
        </div>
      )}
    </>
  );
}
