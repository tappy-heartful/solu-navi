"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileShield,
  faCheck,
  faHouse,
  faArrowLeft,
  faCircleCheck,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/contexts/AuthContext";
import { saveUserDoc } from "@/lib/firestore";
import { showSpinner, hideSpinner } from "@/components/Common/Spinner";
import { showDialog } from "@/components/Common/CommonDialog";
import { format, writeLog } from "@/lib/functions";
import styles from "./agreement.module.css";

export default function AgreementPage() {
  const router = useRouter();
  const { user, userData, refreshUserData } = useAuth();
  const [agreed, setAgreed] = useState(false);

  const isAlreadyAgreed = Boolean(userData?.agreedAt);
  const agreedDate = userData?.agreedAt
    ? typeof userData.agreedAt === "number"
      ? new Date(userData.agreedAt)
      : typeof (userData.agreedAt as { toDate?: () => Date }).toDate === "function"
        ? (userData.agreedAt as { toDate: () => Date }).toDate()
        : typeof (userData.agreedAt as { toMillis?: () => number }).toMillis === "function"
          ? new Date((userData.agreedAt as { toMillis: () => number }).toMillis())
          : null
    : null;
  const agreedDateStr = agreedDate ? format(agreedDate, "yyyy.MM.dd") : "";

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
      await refreshUserData();
      hideSpinner();
      await writeLog({
        dataId: user.uid,
        action: "利用規約同意",
      });
      await showDialog({
        title: "完了",
        message: "利用規約に同意しました。Solu Naviへようこそ！",
        type: "success",
      });
      router.replace("/user/edit?initial=1");
    } catch (err: unknown) {
      hideSpinner();
      console.error("[AgreementPage] 規約同意登録エラー:", err);
      await writeLog({
        dataId: user.uid,
        action: "利用規約同意",
        status: "error",
        errorDetail: { message: err instanceof Error ? err.message : String(err) },
      });
      await showDialog({
        title: "エラー",
        message: "登録に失敗しました。もう一度お試しください。",
        type: "danger",
      });
    }
  };

  return (
    <div className={styles.agreementContainer || styles.container}>
      {user && (
        <div style={{ maxWidth: "36rem", width: "100%", margin: "0 auto" }}>
          <Link href="/" prefetch={false} className={styles.topBackLink}>
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>ホームに戻る</span>
          </Link>
        </div>
      )}

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
            <p className={styles.subtitle}>愛媛大学軽音楽部 Sound Solution Orchestra</p>
          </div>
        </div>

        <div className={styles.termsContent}>
          {/* 重要注意事項ハイライトボックス */}
          <div className={styles.cautionBox}>
            <div className={styles.cautionHeader}>
              <FontAwesomeIcon icon={faTriangleExclamation} className={styles.cautionIcon} />
              <span>重要事項：個人情報・著作物の取り扱いと法令遵守</span>
            </div>
            <ul className={styles.cautionList}>
              <li className={styles.cautionItem}>
                <strong>個人情報の登録・アップロード禁止：</strong>
                本名、住所、電話番号、金融口座、マイナンバー等の機密情報の入力・公開は禁止です。
              </li>
              <li className={styles.cautionItem}>
                <strong>著作物の不正アップロード禁止：</strong>
                権利者の許諾のない市販楽譜（PDF等）、市販CD/有料配信音源、映像等の無断アップロードは著作権法により固く禁じられています。
              </li>
              <li className={styles.cautionItem}>
                <strong>法令遵守・迷惑行為の禁止：</strong>
                誹謗中傷、不正アクセス、サークル運営や他部員の活動を妨害する行為は禁止します。
              </li>
            </ul>
          </div>

          <section className={styles.termSection}>
            <h3>第1条（総則・利用目的）</h3>
            <p>
              本規約は、愛媛大学軽音楽部 Sound Solution Orchestra（以下「本サークル」）が部員向けに提供する活動ポータル「Solu Navi」（以下「本サービス」）の利用条件を定めるものです。本サービスは、サークル運営、練習・ライブ・イベントの出欠確認および日程調整、選曲リクエスト募集・選曲投票、録音等の共有、部員情報の相互共有を円滑化することを目的とします。
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
            <h3>第4条（個人情報・機密情報の保護および投稿禁止）</h3>
            <p>
              1. ユーザーは、本サービスにおいて、自己または第三者の詳細な個人情報（本名、住所の番地以降、電話番号、金融機関の口座情報、クレジットカード番号、マイナンバー、その他プライバシーに関する機密情報）をプロフィール、フォーム、掲示板、コメント欄、アップロードファイル等に入力・登録・公開してはなりません。
              <br />
              2. 本サークルは、部員のプライバシーを尊重するため、LINE表示名・略称・パート・楽器・入学年度のみを扱い、過度な個人情報の収集は行いません。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第5条（著作権の尊重および著作物の不正アップロード禁止）</h3>
            <p>
              1. ユーザーは、著作権法その他関連法令を遵守し、正当な権利者の許諾を得ていない市販楽譜（スコア、パート譜、PDF、画像データ等）、市販CD/有料配信の楽曲音源、市販映像、および他者の著作物を本サービス上にアップロード、無断複製、配布、転載、または公開してはなりません。
              <br />
              2. 楽譜管理（`/score`）や録音・メディア管理（`/media`）等で共有・登録できるデータは、本サークルが正規に購入または利用許諾を得ているもの、サークルメンバーが独自に作編曲・制作したもの、著作権の存続期間が満了しているパブリックドメイン楽曲、または本サークル自身の演奏録音・動画等の適法なデータに限られます。
              <br />
              3. 万一、第三者の著作権その他の知的財産権を侵害するデータがアップロードされた場合、サークル幹部会およびシステム管理者は事前の通知なく当該データを削除し、必要な措置を講じることができます。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第6条（禁止事項および法令遵守）</h3>
            <p>
              ユーザーは、本サービスの利用にあたり、以下の各号に該当する行為（それらを誘発・助長する行為を含みます）を行ってはなりません。
            </p>
            <ul className={styles.termList}>
              <li className={styles.termListItem}>日本国の法令、条例、公序良俗に違反する行為、または犯罪行為に関連する行為</li>
              <li className={styles.termListItem}>他の部員、サークル関係者、または第三者の著作権、商標権、プライバシー権、肖像権、名誉その他一切の権利を侵害する行為</li>
              <li className={styles.termListItem}>誹謗中傷、嫌がらせ、差別的表現、または他の利用者に不快感を与える表現を投稿・共有する行為</li>
              <li className={styles.termListItem}>本サービスのサーバー、ネットワーク、またはシステムに不正にアクセスする行為、脆弱性を突く行為、有害なプログラムやスクリプトを送信する行為</li>
              <li className={styles.termListItem}>自動巡回プログラム（クローラー、ボット等）を用いたスクレイピングや、サーバーに過度な負荷を与える行為</li>
              <li className={styles.termListItem}>本サービスの運営、サークルの活動、または他の部員による利用を妨害する行為</li>
            </ul>
          </section>

          <section className={styles.termSection}>
            <h3>第7条（違反行為に対する措置）</h3>
            <p>
              ユーザーが本規約の条項に違反した場合、本サークルは事前の予告なく、違反に該当するデータの即時削除、アカウントの利用停止、またはサークル活動への参加制限・除名等の処分を行うことができるものとします。重大な法令違反が発生した場合は、関係機関への報告や法的措置を検討する場合があります。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第8条（活動・利用ルール）</h3>
            <p>
              1. イベントの出欠回答や日程調整回答、選曲募集への応募および選曲投票は、サークル運営に支障をきたさないよう指定された期日までに正確に行ってください。
              <br />
              2. 共有されるスケジュールや部内連絡事項を定期的に確認し、円滑なサークル運営にご協力ください。
            </p>
          </section>

          <section className={styles.termSection}>
            <h3>第9条（免責事項および規約の改定）</h3>
            <p>
              1. ユーザーが本規約に違反したことにより生じた損害やトラブル（著作権侵害による損害賠償請求等を含みます）について、本サークルおよび管理者は故意または重過失がある場合を除き、一切の責任を負いません。
              <br />
              2. 本規約は、サークル運営上の必要、法令の改正、または機能アップデートに応じて幹部会の承認により改定されることがあります。改定後の内容は本ポータル上にて周知します。
            </p>
          </section>
        </div>

        {isAlreadyAgreed ? (
          <div className={styles.agreedBox}>
            <div className={styles.agreedBanner}>
              <div className={styles.agreedBadge}>
                <FontAwesomeIcon icon={faCircleCheck} className={styles.checkIcon} />
                <span>利用規約に同意済みです</span>
              </div>
              {agreedDateStr && (
                <span className={styles.agreedDate}>（同意日: {agreedDateStr}）</span>
              )}
            </div>

            <Link href="/" prefetch={false} className={styles.backHomeBtn}>
              <FontAwesomeIcon icon={faHouse} />
              <span>ホームに戻る</span>
            </Link>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
