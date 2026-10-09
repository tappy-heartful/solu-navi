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
    <div className={styles.agreementContainer || styles.container}>
      <div className={styles.agreementCard || styles.card}>
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
              本規約は、愛媛大学軽音楽部 Sound Solition Orchestra（以下「本サークル」）が部員向けに提供する活動ポータル「Solu Navi」（以下「本サービス」）の利用条件を定めるものです。本サービスは、サークル運営、練習・ライブ・イベントの出欠確認および日程調整、選曲リクエスト募集・選曲投票、録音等の共有、部員情報の相互共有を円滑化することを目的とします。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第2条（部員資格とアカウント管理）</h3>
            <p>
              1. 本サービスの利用は、本サークルの現役部員および幹部会が認めたOB・OG、関係者に限られます。
              <br />
              2. ログインには公式LINEアカウントの友だち追加および認証連携が必要です。
              <br />
              3. ユーザーは、本サービスのアカウントおよび利用資格を第三者に譲渡または貸与することはできません。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第3条（登録情報の管理とプライバシー保護）</h3>
            <p>
              1. ユーザーは、LINE表示名、譜割り用略称（2文字以内）、役職、所属パート、担当楽器、入学年度等のプロフィール情報を正確に登録・維持するものとします（本サークルでは部員のプライバシー保護のため、本名や電話番号、決済情報等の過度な個人情報の登録は求めていません）。
              <br />
              2. 登録された部員情報は、本サークルの部活動運営、出欠管理、選曲および部員相互の円滑な連絡目的にのみ使用し、外部への無断持ち出しや目的外利用を固く禁じます。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第4条（活動・利用ルール）</h3>
            <p>
              1. イベントの出欠回答や日程調整回答、選曲募集への応募および選曲投票は、サークル運営に支障をきたさないよう指定された期日までに正確に行ってください。
              <br />
              2. 掲示板や録音リンク、各種回答欄において、他の部員への誹謗中傷、公序良俗に反する投稿、またはサークル活動を妨害する行為を禁止します。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第5条（規約の改定）</h3>
            <p>
              本規約は、サークル運営上の必要や機能アップデートに応じて幹部会の承認により改定されることがあります。改定後の内容は本ポータル上にて周知します。
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
