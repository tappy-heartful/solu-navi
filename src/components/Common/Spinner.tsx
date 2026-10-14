"use client";

import React, { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export const BAND_MESSAGES = [
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
  "バンドスコアを読み解いています...",
  "ステージ衣装を整えています...",
];

let spinnerInterval: ReturnType<typeof setInterval> | null = null;
let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 音楽的ローディングスピナーの表示 (公式エンブレムロゴ＋FontAwesome音符＋メッセージ)
 */
export function showSpinner(customMsg?: string) {
  if (typeof document === "undefined") return;

  let overlay = document.getElementById("spinner-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "spinner-overlay";
    overlay.innerHTML = `
      <div class="musical-loading">
        <div class="note-container">
          <i class="fa-solid fa-music note"></i>
          <i class="fa-solid fa-note-sticky note"></i>
          <i class="fa-solid fa-guitar note"></i>
          <i class="fa-solid fa-drum note"></i>
        </div>
        <p class="loading-message" id="spinner-message">${customMsg || BAND_MESSAGES[0]}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  } else {
    const el = document.getElementById("spinner-message");
    if (el) el.textContent = customMsg || BAND_MESSAGES[Math.floor(Math.random() * BAND_MESSAGES.length)];
  }
  overlay.style.display = "flex";

  if (spinnerInterval) clearInterval(spinnerInterval);
  spinnerInterval = setInterval(() => {
    const el = document.getElementById("spinner-message");
    if (el) el.textContent = BAND_MESSAGES[Math.floor(Math.random() * BAND_MESSAGES.length)];
  }, 1000);

  // 安全タイマー（最大10秒で自動終了）
  if (timeoutTimer) clearTimeout(timeoutTimer);
  timeoutTimer = setTimeout(() => {
    hideSpinner();
  }, 10000);
}

/**
 * スピナーの非表示 (streak-navi準拠: 自然な画面遷移完了で即時非表示)
 */
export function hideSpinner() {
  if (typeof document === "undefined") return;

  const overlay = document.getElementById("spinner-overlay");
  if (overlay) overlay.style.display = "none";
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
  if (timeoutTimer) {
    clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }
}

// ページ遷移を検知して自動でスピナーを消去する
function RouteChangeSpinnerCloser() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    hideSpinner();
  }, [pathname, searchParams]);

  return null;
}

export function Spinner() {
  return (
    <Suspense fallback={null}>
      <RouteChangeSpinnerCloser />
    </Suspense>
  );
}
