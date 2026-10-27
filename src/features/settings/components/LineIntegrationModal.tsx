"use client";

import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faCopy,
  faShieldHalved,
  faLink,
  faListOl,
} from "@fortawesome/free-solid-svg-icons";
import { faLine } from "@fortawesome/free-brands-svg-icons";
import { SectionDoc } from "@/lib/firestore/types";
import { showDialog } from "@/lib/functions";
import styles from "./LineIntegrationModal.module.css";

interface LineIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: SectionDoc[];
  origin: string;
}

export function LineIntegrationModal({
  isOpen,
  onClose,
  sections = [],
  origin,
}: LineIntegrationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // スクロール抑制
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const generalWebhookUrl = origin ? `${origin}/api/line/webhook?target=general` : "";

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      await showDialog(`【${label}】をクリップボードにコピーしました！`, true);
    } catch {
      await showDialog(`内容: ${text}`, true);
    }
  };

  const envTemplate =
`# 5つの公式LINE Messaging API チャンネルアクセストークン
LINE_CHANNEL_ACCESS_TOKEN_GENERAL=""
LINE_CHANNEL_ACCESS_TOKEN_SAX=""
LINE_CHANNEL_ACCESS_TOKEN_TP=""
LINE_CHANNEL_ACCESS_TOKEN_TB=""
LINE_CHANNEL_ACCESS_TOKEN_RHYTHM=""`;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <FontAwesomeIcon icon={faLine} className={styles.headerIcon} />
            <h2 className={styles.title}>公式LINE 5アカウント連携設定ガイド</h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="閉じる"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.leadText}>
            LINE公式アカウントの月間無料メッセージ制限（200通/月）を回避するため、
            全体用＋各パート（サックス/トランペット/トロンボーン/リズム）の<strong>計5つの公式アカウント</strong>を使い分けます。
          </p>

          {/* セクション1: Webhook URL */}
          <div className={styles.sectionBlock}>
            <h3 className={styles.sectionTitle}>
              <FontAwesomeIcon icon={faLink} style={{ color: "#0284c7" }} />
              <span>① 各アカウントの専用Webhook URL</span>
            </h3>
            <p className={styles.sectionDesc}>
              各公式アカウントのLINE Developers（Messaging API設定）の「Webhook URL」に以下を登録し、「Webhookの利用」をONにしてください。
            </p>

            <div className={styles.webhookList}>
              {/* 全体用 */}
              <div className={styles.webhookCard}>
                <div className={styles.webhookLabelGroup}>
                  <span className={styles.badge} style={{ backgroundColor: "#146081" }}>
                    👑 全体用
                  </span>
                </div>
                <div className={styles.webhookUrlText}>{generalWebhookUrl}</div>
                <button
                  type="button"
                  className={styles.copyBtn}
                  onClick={() => handleCopy(generalWebhookUrl, "全体用 Webhook URL")}
                >
                  <FontAwesomeIcon icon={faCopy} /> コピー
                </button>
              </div>

              {/* パート用 */}
              {sections.map((sec) => {
                const partUrl = origin ? `${origin}/api/line/webhook?sectionId=${sec.id}` : "";
                return (
                  <div key={sec.id} className={styles.webhookCard}>
                    <div className={styles.webhookLabelGroup}>
                      <span
                        className={styles.badge}
                        style={{ backgroundColor: sec.color || "#0284c7" }}
                      >
                        {sec.shortName || sec.name}
                      </span>
                    </div>
                    <div className={styles.webhookUrlText}>{partUrl}</div>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => handleCopy(partUrl, `${sec.name}用 Webhook URL`)}
                    >
                      <FontAwesomeIcon icon={faCopy} /> コピー
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* セクション2: 環境変数 */}
          <div className={styles.sectionBlock}>
            <div className={styles.envHeader}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                <FontAwesomeIcon icon={faShieldHalved} style={{ color: "#10b981" }} />
                <span>② 環境変数（.env.local / Vercel）</span>
              </h3>
              <button
                type="button"
                className={styles.envCopyBtn}
                onClick={() => handleCopy(envTemplate, "環境変数テンプレート")}
              >
                <FontAwesomeIcon icon={faCopy} /> テンプレートをコピー
              </button>
            </div>
            <p className={styles.sectionDesc}>
              各公式アカウントのアクセストークン（長期）を以下のキー名で <code>.env.local</code>（本番はVercelのEnvironment Variables）に設定します。
            </p>
            <pre className={styles.envCodeBox}>
              <code>{envTemplate}</code>
            </pre>
          </div>

          {/* セクション3: 自動登録の流れ */}
          <div className={styles.sectionBlock}>
            <h3 className={styles.sectionTitle}>
              <FontAwesomeIcon icon={faListOl} style={{ color: "#f59e0b" }} />
              <span>③ 設定後の自動登録の流れ</span>
            </h3>
            <ol className={styles.stepList}>
              <li>全体LINEや各パートのLINEグループに、対応する公式LINEアカウントを招待します。</li>
              <li>招待された瞬間にグループ名・招待日時・グループIDが自動的に判定され、この画面に反映されます。</li>
              <li>招待グループ宛てに「〇〇としてSolu Naviに自動登録しました！」と完了返信が届きます。</li>
            </ol>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.closeFooterBtn}
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
