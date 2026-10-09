"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEdit,
  faPhone,
  faMusic,
  faBuildingColumns,
  faCreditCard,
  faShieldHalved,
  faIdCard,
} from "@fortawesome/free-solid-svg-icons";
import { ConfirmLayout } from "@/components/Layout/ConfirmLayout";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { useAuth } from "@/contexts/AuthContext";
import { UserDoc } from "../types";
import { fetchUserById } from "../api/user-client-service";
import { DEFAULT_SECTIONS, DEFAULT_ROLES, DEFAULT_INSTRUMENTS } from "@/lib/firestore/constants";
import styles from "./UserConfirmClient.module.css";

export function UserConfirmClient() {
  const searchParams = useSearchParams();
  const queryUid = searchParams.get("uid");
  const { user: currentUser, userData: currentUserData, isAdmin } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [targetUser, setTargetUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // 表示対象のUID（指定がなければ自身）
  const targetUid = queryUid || currentUser?.uid;

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: "部員名簿", href: "/user" },
      { label: "プロフィール詳細" },
    ]);

    async function load() {
      if (!targetUid) {
        setLoading(false);
        return;
      }

      // 自身の場合は Context のデータを即座に利用可能
      if (targetUid === currentUser?.uid && currentUserData) {
        setTargetUser(currentUserData);
        setLoading(false);
        return;
      }

      const data = await fetchUserById(targetUid);
      setTargetUser(data);
      setLoading(false);
    }

    load();
  }, [targetUid, currentUser?.uid, currentUserData, setBreadcrumbs]);

  const isOwner = currentUser?.uid === targetUid;
  const canEdit = isOwner || isAdmin;

  const section = DEFAULT_SECTIONS.find((s) => s.id === targetUser?.sectionId);
  const role = DEFAULT_ROLES.find((r) => r.id === targetUser?.roleId);
  const instruments = (targetUser?.instrumentIds || [])
    .map((id) => DEFAULT_INSTRUMENTS.find((i) => i.id === id))
    .filter(Boolean);

  if (loading) {
    return (
      <ConfirmLayout title="部員詳細">
        <div className={styles.loading}>読み込み中...</div>
      </ConfirmLayout>
    );
  }

  if (!targetUser) {
    return (
      <ConfirmLayout title="部員詳細">
        <div className={styles.notFound}>部員情報が見つかりませんでした。</div>
      </ConfirmLayout>
    );
  }

  return (
    <ConfirmLayout
      title="部員詳細"
      icon={<FontAwesomeIcon icon={faIdCard} />}
      actions={
        canEdit && (
          <Link
            href={`/user/edit?uid=${targetUser.uid}`}
            prefetch={false}
            className={styles.editBtn}
          >
            <FontAwesomeIcon icon={faEdit} />
            <span>編集する</span>
          </Link>
        )
      }
    >
      <div className={styles.container}>
        {/* プロフィール基本カード */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarWrapper}>
            {targetUser.pictureUrl ? (
              <Image
                src={targetUser.pictureUrl}
                alt={targetUser.displayName}
                width={80}
                height={80}
                className={styles.avatarImg}
                unoptimized
              />
            ) : (
              <div className={styles.avatarFallback}>
                <FontAwesomeIcon icon={faUser} />
              </div>
            )}
          </div>

          <div className={styles.headerInfo}>
            <div className={styles.kana}>{targetUser.kana || "　"}</div>
            <h2 className={styles.displayName}>{targetUser.displayName}</h2>
            <div className={styles.tagsRow}>
              {targetUser.abbreviation && (
                <span className={styles.abbrBadge}>略称: {targetUser.abbreviation}</span>
              )}
              {section && (
                <span
                  className={styles.sectionBadge}
                  style={{ backgroundColor: section.color || "#1e3a8a" }}
                >
                  {section.name}
                </span>
              )}
              {role && <span className={styles.roleBadge}>{role.name}</span>}
              {targetUser.isSystemAdmin && (
                <span className={styles.adminBadge}>
                  <FontAwesomeIcon icon={faShieldHalved} /> システム管理者
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 詳細グリッド */}
        <div className={styles.detailList}>
          {/* 担当楽器 */}
          <div className={styles.detailItem}>
            <div className={styles.itemLabel}>
              <FontAwesomeIcon icon={faMusic} className={styles.itemIcon} />
              <span>担当楽器</span>
            </div>
            <div className={styles.itemValue}>
              {instruments.length > 0 ? (
                <div className={styles.instTags}>
                  {instruments.map((inst) => (
                    <span key={inst?.id} className={styles.instTag}>
                      {inst?.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className={styles.unregistered}>未設定</span>
              )}
            </div>
          </div>

          {/* 学年 */}
          <div className={styles.detailItem}>
            <div className={styles.itemLabel}>
              <FontAwesomeIcon icon={faBuildingColumns} className={styles.itemIcon} />
              <span>学年 / 所属</span>
            </div>
            <div className={styles.itemValue}>
              {targetUser.grade || <span className={styles.unregistered}>未設定</span>}
            </div>
          </div>

          {/* 連絡先 (本人のみまたは管理者のみ閲覧可能) */}
          <div className={styles.detailItem}>
            <div className={styles.itemLabel}>
              <FontAwesomeIcon icon={faPhone} className={styles.itemIcon} />
              <span>電話番号</span>
            </div>
            <div className={styles.itemValue}>
              {targetUser.phoneNumber ? (
                <a href={`tel:${targetUser.phoneNumber}`} className={styles.telLink}>
                  {targetUser.phoneNumber}
                </a>
              ) : (
                <span className={styles.unregistered}>未設定</span>
              )}
            </div>
          </div>

          {/* PayPay ID */}
          <div className={styles.detailItem}>
            <div className={styles.itemLabel}>
              <FontAwesomeIcon icon={faCreditCard} className={styles.itemIcon} />
              <span>PayPay ID (精算用)</span>
            </div>
            <div className={styles.itemValue}>
              {targetUser.paypayId ? (
                <span className={styles.paypayId}>{targetUser.paypayId}</span>
              ) : (
                <span className={styles.unregistered}>未設定</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </ConfirmLayout>
  );
}
