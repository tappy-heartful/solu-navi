"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileShield, faCheck } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/AuthContext";
import { saveUserDoc } from "@/lib/firestore";
import { showSpinner, hideSpinner } from "@/components/Common/Spinner";
import { showDialog } from "@/components/Common/CommonDialog";
import styles from "./agreement.module.css";

export default function AgreementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !user) {
      await showDialog({
        title: "ご確認",
        message: "利用規約を確認し、同意チェックを入れてください。",
      });
      return;
    }

    try {
      showSpinner("規約同意を登録しています...");
      await saveUserDoc(user.uid, {
        agreedAt: Date.now(),
      });
      hideSpinner();
      await showDialog({
        title: "完了",
        message: "利用規約に同意しました。Solu Naviへようこそ！",
        type: "success",
      });
      router.replace("/");
    } catch (err: unknown) {
      hideSpinner();
      console.error("Agreement error:", err);
      await showDialog({
        title: "エラー",
        message: "登録に失敗しました。もう一度お試しください。",
        type: "danger",
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoBadge}>
            <Image
              src="/sso-logo.jpg"
              alt="SSO Logo"
              width={48}
              height={48}
              className={styles.logoImg}
            />
          </div>
          <div className={styles.titleWrapper}>
            <h1 className={styles.title}>
              <FontAwesomeIcon icon={faFileShield} className={styles.titleIcon} />
              Solu Navi 利用規約
            </h1>
            <p className={styles.subtitle}>愛媛大学軽音楽部 Sound Solition Orchestra</p>
          </div>
        </div>

        <div className={styles.termsContent}>
          <section className={styles.termSection}>
            <h3>第1条（総則・利用目的）</h3>
            <p>
              本規約は、愛媛大学軽音楽部 Sound Solition Orchestra（以下「本サークル」）が部員向けに提供する活動ポータル「Solu Navi」（以下「本サービス」）の利用条件を定めるものです。本サービスは、サークル運営、練習・ライブ出欠管理、楽譜・演奏情報共有、および部費・会計清算の円滑化を目的とします。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第2条（部員資格とアカウント管理）</h3>
            <p>
              1. 本サービスの利用は、本サークルの現役部員および幹部会が認めたOB・OG、関係者に限られます。
              <br />
              2. ユーザーは、本サービスの利用資格を第三者に譲渡または貸与することはできません。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第3条（個人情報の保護）</h3>
            <p>
              1. 本サービスに登録された氏名、所属パート、連絡先、出欠状況等の個人情報は、本サークルの活動運営および部員相互の連絡目的にのみ使用します。
              <br />
              2. 外部への不正持ち出し、目的外利用を固く禁じます。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第4条（会計・経費精算ルール）</h3>
            <p>
              1. ライブチケット清算、部費、立替経費などの精算データは正確に入力してください。
              <br />
              2. PayPay等の送金エビデンス画像は、改ざんのない正規のスクリーンショットを添付してください。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第5条（規約の改定）</h3>
            <p>
              本規約は、サークル運営上の必要に応じて幹部会の承認により改定されることがあります。改定後の内容は本ポータル上にて周知します。
            </p>
          </section>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              上記すべての利用規約を確認し、内容に同意します
            </span>
          </label>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!agreed}
          >
            <FontAwesomeIcon icon={faCheck} />
            <span>同意して利用を開始する</span>
          </button>
        </form>
      </div>
    </div>
  );
}
