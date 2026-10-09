"use client";

import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLightbulb,
  faArrowUpFromBracket,
  faEllipsisVertical,
  faPlus,
  faChevronDown,
  faChevronUp,
  faMobileScreen,
} from "@fortawesome/free-solid-svg-icons";
import { faApple, faAndroid } from "@fortawesome/free-brands-svg-icons";
import styles from "./PwaInstallHint.module.css";

export function PwaInstallHint() {
  const [isMounted, setIsMounted] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const [deviceType, setDeviceType] = useState<"ios" | "android">("ios");
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setIsMounted(true);

    // スタンドアロン（PWA ホーム画面から起動）判定
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    // モバイル端末判定 (スマホ / タブレット)
    const ua = window.navigator.userAgent.toLowerCase();
    const isMobile =
      /iphone|ipad|ipod|android/.test(ua) ||
      (window.navigator.maxTouchPoints > 1 && /macintosh/.test(ua));

    // PCで開いている時、またはすでにスマホでPWA起動している時は非表示
    if (!isMobile || isStandaloneMode) {
      setShouldShow(false);
      return;
    }

    // スマホのブラウザで開いている場合のみ表示
    setShouldShow(true);

    // デバイス種別（iOS vs Android）の初期判定
    if (/iphone|ipad|ipod/.test(ua) || (window.navigator.maxTouchPoints > 1 && /macintosh/.test(ua))) {
      setDeviceType("ios");
    } else if (/android/.test(ua)) {
      setDeviceType("android");
    }
  }, []);

  // SSR時、またはPCアクセス時、またはスマホPWA起動時は何も描画しない
  if (!isMounted || !shouldShow) {
    return null;
  }

  return (
    <div className={styles.card}>
      <div
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className={styles.headerLeft}>
          <div className={styles.bulbIcon}>
            <FontAwesomeIcon icon={faLightbulb} />
          </div>
          <div>
            <h4 className={styles.headerTitle}>
              スマホのホーム画面にアイコンを追加しよう！
            </h4>
            <p className={styles.headerSub}>
              アプリのようにワンタップで起動でき、全画面でサクサク使えます
            </p>
          </div>
        </div>

        <button
          type="button"
          className={styles.toggleBtn}
          aria-label={isExpanded ? "閉じる" : "開く"}
        >
          <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
        </button>
      </div>

      {isExpanded && (
        <div className={styles.body}>
          {/* デバイス切り替えタブ */}
          <div className={styles.tabList}>
            <button
              type="button"
              className={`${styles.tabBtn} ${
                deviceType === "ios" ? styles.activeTab : ""
              }`}
              onClick={() => setDeviceType("ios")}
            >
              <FontAwesomeIcon icon={faApple} />
              <span>iPhone (Safari)</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${
                deviceType === "android" ? styles.activeTab : ""
              }`}
              onClick={() => setDeviceType("android")}
            >
              <FontAwesomeIcon icon={faAndroid} />
              <span>Android (Chrome)</span>
            </button>
          </div>

          {/* ステップ手順 */}
          {deviceType === "ios" ? (
            <div className={styles.stepContainer}>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <div className={styles.stepContent}>
                  <p className={styles.stepTitle}>
                    画面下部の
                    <span className={styles.inlineIcon}>
                      <FontAwesomeIcon icon={faArrowUpFromBracket} /> 共有
                    </span>
                    ボタンをタップ
                  </p>
                  <p className={styles.stepDesc}>
                    Safariの画面下（またはURLバー横）にある、四角から上矢印が出ているアイコンを押します。
                  </p>
                </div>
              </div>

              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <div className={styles.stepContent}>
                  <p className={styles.stepTitle}>
                    メニューの「
                    <span className={styles.inlineIcon}>
                      <FontAwesomeIcon icon={faPlus} /> ホーム画面に追加
                    </span>
                    」をタップ
                  </p>
                  <p className={styles.stepDesc}>
                    共有メニューを少し下にスクロールすると見つかります。
                  </p>
                </div>
              </div>

              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <div className={styles.stepContent}>
                  <p className={styles.stepTitle}>
                    右上の「追加」を押せば完了！
                  </p>
                  <p className={styles.stepDesc}>
                    スマホのホーム画面に「Solu Navi」のアイコンが追加され、次回から本物のアプリのように開けます。
                  </p>
                </div>
              </div>

              <div className={styles.noticeTip}>
                <strong>💡 LINEアプリ内で開いている場合:</strong>
                <br />
                右下の「…」またはコンパスアイコンを押して<strong>「Safariで開く」</strong>を行ってからホーム画面に追加してください。
              </div>
            </div>
          ) : (
            <div className={styles.stepContainer}>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>1</span>
                <div className={styles.stepContent}>
                  <p className={styles.stepTitle}>
                    画面右上の
                    <span className={styles.inlineIcon}>
                      <FontAwesomeIcon icon={faEllipsisVertical} /> メニュー
                    </span>
                    をタップ
                  </p>
                  <p className={styles.stepDesc}>
                    Chromeブラウザの右上にある縦の3点リーダー（⋮）を押します。
                  </p>
                </div>
              </div>

              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>2</span>
                <div className={styles.stepContent}>
                  <p className={styles.stepTitle}>
                    「
                    <span className={styles.inlineIcon}>
                      <FontAwesomeIcon icon={faMobileScreen} /> ホーム画面に追加
                    </span>
                    」をタップ
                  </p>
                  <p className={styles.stepDesc}>
                    機種によっては「アプリをインストール」と表示される場合もあります。
                  </p>
                </div>
              </div>

              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>3</span>
                <div className={styles.stepContent}>
                  <p className={styles.stepTitle}>
                    「追加」または「インストール」を押せば完了！
                  </p>
                  <p className={styles.stepDesc}>
                    スマホのホーム画面に「Solu Navi」のアプリアイコンが追加されます。
                  </p>
                </div>
              </div>

              <div className={styles.noticeTip}>
                <strong>💡 LINEアプリ内で開いている場合:</strong>
                <br />
                右上のメニュー（⋮）から<strong>「Chromeで開く」</strong>または<strong>「他のアプリで開く」</strong>を選んでから追加してください。
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
