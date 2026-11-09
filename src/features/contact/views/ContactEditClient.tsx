"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeadset,
  faPaperPlane,
  faBug,
  faLightbulb,
  faCircleQuestion,
  faWrench,
  faCommentDots,
  faLayerGroup,
  faMobileScreen,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { showSpinner, hideSpinner, showDialog } from "@/lib/functions";
import {
  ContactCategory,
  ContactFeature,
  CONTACT_CATEGORY_MAP,
  CONTACT_FEATURE_MAP,
} from "../types";
import { createContact } from "../api/contact-client-service";
import styles from "./ContactEditClient.module.css";

const CATEGORY_ITEMS: { key: ContactCategory; icon: any }[] = [
  { key: "bug", icon: faBug },
  { key: "request", icon: faLightbulb },
  { key: "question", icon: faCircleQuestion },
  { key: "data_fix", icon: faWrench },
  { key: "other", icon: faCommentDots },
];

const FEATURE_OPTIONS: { key: ContactFeature; label: string }[] = Object.entries(
  CONTACT_FEATURE_MAP
).map(([key, val]) => ({
  key: key as ContactFeature,
  label: val.label,
}));

export function ContactEditClient() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [category, setCategory] = useState<ContactCategory>("bug");
  const [feature, setFeature] = useState<ContactFeature>("event");
  const [title, setTitle] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "お問い合わせ", href: "/contact" },
      { label: "新規お問い合わせ" },
    ]);
  }, [setBreadcrumbs]);

  // 端末・環境の自動判定
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;

      let os = "PC / その他";
      if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS (iPhone/iPad)";
      else if (/Android/i.test(ua)) os = "Android";
      else if (/Macintosh/i.test(ua)) os = "Mac";
      else if (/Windows/i.test(ua)) os = "Windows";

      let browser = "Browser";
      if (/LINE/i.test(ua)) browser = "LINEアプリ内ブラウザ";
      else if (/CriOS|Chrome/i.test(ua)) browser = "Chrome";
      else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

      const mode = isStandalone ? " (PWAアプリ)" : "";
      setDeviceInfo(`${os} / ${browser}${mode}`);
    }
  }, []);

  // カテゴリに応じたプレースホルダー
  const getPlaceholder = () => {
    switch (category) {
      case "bug":
        return `【発生手順・状況】\n1. どの画面で何を操作したか：\n2. どんなエラーや表示になったか：\n3. 期待していた動作：\n\n※できるだけ詳しくご記入いただけると迅速に対応できます。`;
      case "request":
        return `【ご要望の内容】\n・どんな機能や改善を希望されますか？：\n・それによってどんなことが便利になりますか？：`;
      case "question":
        return `【ご質問の内容】\n・操作方法や機能について知りたい点をご記入ください：`;
      case "data_fix":
        return `【修正・削除を希望するデータ】\n・対象（名前・パート・過去の回答など）：\n・現在の内容と、変更後の正しい内容：`;
      default:
        return `お問い合わせ内容をご記入ください。`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await showDialog("ログインが必要です。", true);
      return;
    }
    if (!title.trim()) {
      await showDialog("件名を入力してください。", true);
      return;
    }
    if (!content.trim()) {
      await showDialog("お問い合わせ内容を入力してください。", true);
      return;
    }

    const ok = await showDialog(
      "システム管理者へお問い合わせを送信しますか？\n（送信後、チャット画面でやり取りができます）"
    );
    if (!ok) return;

    setIsSubmitting(true);
    showSpinner();

    try {
      const contactId = await createContact({
        uid: user.uid,
        userName: userData?.displayName || user.displayName || "メンバー",
        userAvatar: userData?.pictureUrl || user.photoURL || "",
        category,
        feature,
        title: title.trim(),
        deviceInfo: deviceInfo.trim(),
        content: content.trim(),
      });

      hideSpinner();
      await showDialog(
        "お問い合わせを送信しました！\nシステム管理者からの返信をお待ちください。",
        true
      );
      router.push(`/contact/confirm?contactId=${contactId}`);
    } catch (err: any) {
      hideSpinner();
      setIsSubmitting(false);
      console.error("[ContactEditClient] 送信エラー:", err);
      await showDialog(`送信に失敗しました: ${err.message}`, true);
    }
  };

  return (
    <BaseLayout title="新規お問い合わせ">
      <div className={styles.wrapper}>
        <div className={styles.introBox}>
          <FontAwesomeIcon icon={faCircleInfo} className={styles.introIcon} />
          <div className={styles.introText}>
            Solu Naviの操作で困ったことや不具合、新機能の要望などをシステム管理者へ直接相談できます。
            <strong>フォーマットに沿ってご入力ください。</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 1. お問い合わせ種別 */}
          <div className={styles.sectionTitle}>
            <span>1. お問い合わせの種類</span>
            <span className={styles.requiredBadge}>必須</span>
          </div>
          <div className={styles.chipsGrid}>
            {CATEGORY_ITEMS.map((item) => {
              const meta = CONTACT_CATEGORY_MAP[item.key];
              const isSelected = category === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`${styles.chipBtn} ${isSelected ? styles.chipBtnActive : ""}`}
                  onClick={() => setCategory(item.key)}
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={styles.chipIcon}
                    style={{ color: meta.badgeColor }}
                  />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.formCard}>
            {/* 2. 対象機能 */}
            <div className={styles.fieldGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label}>
                  <FontAwesomeIcon icon={faLayerGroup} style={{ color: "#146081" }} />
                  <span>2. 対象の機能</span>
                </label>
                <span className={styles.requiredBadge}>必須</span>
              </div>
              <select
                className={styles.selectInput}
                value={feature}
                onChange={(e) => setFeature(e.target.value as ContactFeature)}
              >
                {FEATURE_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className={styles.hintText}>
                該当する機能を選択してください。全般的な内容の場合は「全般・その他」をお選びください。
              </div>
            </div>

            {/* 3. 件名 */}
            <div className={styles.fieldGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label}>3. 件名・タイトル</label>
                <span className={styles.requiredBadge}>必須</span>
              </div>
              <input
                type="text"
                className={styles.textInput}
                placeholder="例: 出欠回答ボタンが押せない、〇〇の機能が欲しい など"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            {/* 4. 端末環境 */}
            <div className={styles.fieldGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label}>
                  <FontAwesomeIcon icon={faMobileScreen} style={{ color: "#64748b" }} />
                  <span>4. ご利用環境（端末・ブラウザ）</span>
                </label>
                <span className={styles.optionalBadge}>自動取得</span>
              </div>
              <input
                type="text"
                className={styles.textInput}
                value={deviceInfo}
                onChange={(e) => setDeviceInfo(e.target.value)}
                placeholder="例: iPhone iOS 17 / Safari"
              />
              <div className={styles.hintText}>
                不具合の特定を円滑にするため、自動判別された環境情報が入っています。
              </div>
            </div>

            {/* 5. 詳しい内容 */}
            <div className={styles.fieldGroup}>
              <div className={styles.labelRow}>
                <label className={styles.label}>5. 詳しい内容・状況</label>
                <span className={styles.requiredBadge}>必須</span>
              </div>
              <textarea
                className={styles.textArea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={getPlaceholder()}
                rows={7}
                required
              />
            </div>
          </div>

          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => router.push("/contact")}
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || !title.trim() || !content.trim()}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              <span>{isSubmitting ? "送信中..." : "お問い合わせを送信"}</span>
            </button>
          </div>
        </form>
      </div>
    </BaseLayout>
  );
}