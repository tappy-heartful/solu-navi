"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeadset,
  faPaperPlane,
  faShieldHalved,
  faClock,
  faMobileScreen,
  faUser,
  faCircleCheck,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import { ConfirmLayout } from "@/components/Layout/ConfirmLayout";
import { UserAvatar } from "@/components/Common/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { showSpinner, hideSpinner, showDialog } from "@/lib/functions";
import {
  Contact,
  ContactMessage,
  ContactStatus,
  CONTACT_CATEGORY_MAP,
  CONTACT_FEATURE_MAP,
  CONTACT_STATUS_MAP,
} from "../types";
import {
  sendContactMessage,
  updateContactStatus,
  subscribeContactMessages,
  subscribeContact,
} from "../api/contact-client-service";
import styles from "./ContactConfirmClient.module.css";

interface ContactConfirmClientProps {
  initialContact: Contact;
  initialMessages: ContactMessage[];
}

// 日時フォーマット用ヘルパー
function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDateSeparator(timestamp: number): string {
  const d = new Date(timestamp);
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const yyyy = d.getFullYear();
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const day = days[d.getDay()];
  return `${yyyy}年${mm}月${dd}日(${day})`;
}

export function ContactConfirmClient({
  initialContact,
  initialMessages,
}: ContactConfirmClientProps) {
  const router = useRouter();
  const { user, userData, isSystemAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [contact, setContact] = useState<Contact>(initialContact);
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // パンくず設定 (規約15: 画面名・パンくずは必ず「確認」)
  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "お問い合わせ", href: "/contact" },
      { label: "お問い合わせ確認" },
    ]);
  }, [setBreadcrumbs]);

  // Firestoreリアルタイム購読 (メッセージ & 親ドキュメント)
  useEffect(() => {
    const unsubMessages = subscribeContactMessages(
      contact.id,
      (newMessages) => {
        setMessages(newMessages);
      },
      (err) => console.error("メッセージ購読エラー:", err)
    );

    const unsubContact = subscribeContact(contact.id, (updated) => {
      if (updated) setContact(updated);
    });

    return () => {
      unsubMessages();
      unsubContact();
    };
  }, [contact.id]);

  // 新着メッセージ時に自動で一番下へスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // メッセージ送信
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText("");

    try {
      await sendContactMessage({
        contactId: contact.id,
        senderUid: user.uid,
        senderName: userData?.displayName || user.displayName || "メンバー",
        senderAvatar: userData?.pictureUrl || user.photoURL || "",
        isAdmin: Boolean(isSystemAdmin),
        text,
      });

      // 解決済みの問い合わせに一般ユーザーからメッセージが来たらステータスを再オープン
      if (contact.status === "resolved" && !isSystemAdmin) {
        await updateContactStatus(contact.id, "open");
      }
    } catch (err: any) {
      console.error("[ContactConfirmClient] 送信エラー:", err);
      showDialog(`メッセージ送信に失敗しました: ${err.message}`, true);
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // 管理者によるステータス変更
  const handleStatusChange = async (newStatus: ContactStatus) => {
    if (!isSystemAdmin || newStatus === contact.status) return;
    showSpinner();
    try {
      await updateContactStatus(contact.id, newStatus);
      hideSpinner();
    } catch (err: any) {
      hideSpinner();
      showDialog(`ステータス更新に失敗しました: ${err.message}`, true);
    }
  };

  const categoryMeta = CONTACT_CATEGORY_MAP[contact.category] || CONTACT_CATEGORY_MAP.other;
  const featureMeta = CONTACT_FEATURE_MAP[contact.feature] || CONTACT_FEATURE_MAP.other;
  const statusMeta = CONTACT_STATUS_MAP[contact.status] || CONTACT_STATUS_MAP.open;

  // 日付セパレーター判定用のグループ分け
  let lastDateStr = "";

  return (
    <ConfirmLayout
      title="お問い合わせ確認"
      icon={<FontAwesomeIcon icon={faHeadset} />}
      backHref="/contact"
    >
      <div className={styles.wrapper}>
        {/* お問い合わせ基本情報サマリー */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            <div className={styles.titleGroup}>
              <div className={styles.badgeRow}>
                <span
                  className={styles.categoryBadge}
                  style={{ backgroundColor: categoryMeta.badgeColor }}
                >
                  {categoryMeta.label}
                </span>
                <span className={styles.featureBadge}>{featureMeta.label}</span>
                <span
                  className={styles.statusBadge}
                  style={{
                    color: statusMeta.badgeColor,
                    backgroundColor: statusMeta.bg,
                  }}
                >
                  {statusMeta.label}
                </span>
              </div>
              <h1 className={styles.ticketTitle}>{contact.title}</h1>
            </div>
          </div>

          <div className={styles.summaryMeta}>
            <div className={styles.metaItem}>
              <UserAvatar src={contact.userAvatar} size={20} alt={contact.userName} />
              <span>{contact.userName}</span>
            </div>
            <div className={styles.metaItem}>
              <FontAwesomeIcon icon={faClock} />
              <span>{new Date(contact.createdAt).toLocaleString("ja-JP")}</span>
            </div>
            {contact.deviceInfo && (
              <div className={styles.metaItem}>
                <FontAwesomeIcon icon={faMobileScreen} />
                <span>{contact.deviceInfo}</span>
              </div>
            )}
          </div>

          {/* 管理者用 ステータス変更クイックバー */}
          {isSystemAdmin && (
            <div className={styles.adminControlBar}>
              <div className={styles.adminControlLabel}>
                <FontAwesomeIcon icon={faShieldHalved} style={{ color: "#146081" }} />
                <span>対応ステータス変更:</span>
              </div>
              <div className={styles.statusButtonGroup}>
                {(["open", "in_progress", "resolved"] as ContactStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`${styles.statusBtn} ${
                      contact.status === st ? styles.statusBtnActive : ""
                    }`}
                    onClick={() => handleStatusChange(st)}
                  >
                    {CONTACT_STATUS_MAP[st].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* LINE風 チャットルーム */}
        <div className={styles.chatContainer}>
          <div className={styles.chatTimeline}>
            {messages.map((msg) => {
              const dateStr = formatDateSeparator(msg.createdAt);
              const showSeparator = dateStr !== lastDateStr;
              lastDateStr = dateStr;

              const isMe = msg.senderUid === user?.uid;

              return (
                <React.Fragment key={msg.id}>
                  {showSeparator && (
                    <div className={styles.dateSeparator}>
                      <span className={styles.datePill}>{dateStr}</span>
                    </div>
                  )}

                  <div
                    className={`${styles.messageRow} ${
                      isMe ? styles.messageRight : styles.messageLeft
                    }`}
                  >
                    {/* 相手からの発言のみアバターを表示 */}
                    {!isMe && (
                      <div className={styles.avatarCol}>
                        <UserAvatar
                          src={msg.senderAvatar}
                          size={36}
                          alt={msg.senderName}
                        />
                      </div>
                    )}

                    <div className={styles.messageContentCol}>
                      {!isMe && (
                        <div className={styles.senderNameRow}>
                          <span>{msg.senderName}</span>
                          {msg.isAdmin && (
                            <span className={styles.adminTag}>管理者</span>
                          )}
                        </div>
                      )}

                      <div
                        className={
                          isMe ? styles.bubbleRowRight : styles.bubbleRowLeft
                        }
                      >
                        <div className={isMe ? styles.bubbleRight : styles.bubbleLeft}>
                          {msg.text}
                        </div>
                        <span className={styles.timeText}>
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* 解決済みメッセージ案内 */}
          {contact.status === "resolved" && (
            <div className={styles.resolvedNotice}>
              <FontAwesomeIcon icon={faCircleCheck} style={{ marginRight: "6px" }} />
              このお問い合わせは「解決済み」となっています。追加のご質問がある場合はそのままメッセージを送信してください。
            </div>
          )}

          {/* メッセージ入力バー */}
          <form className={styles.inputBar} onSubmit={handleSendMessage}>
            <textarea
              ref={inputRef}
              className={styles.inputTextArea}
              placeholder="メッセージを入力..."
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isSending}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={isSending || !inputText.trim()}
              title="送信"
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </form>
        </div>
      </div>
    </ConfirmLayout>
  );
}

