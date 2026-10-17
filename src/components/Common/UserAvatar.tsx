"use client";

import React from "react";
import { globalLineDefaultImage } from "@/lib/functions";
import styles from "./UserAvatar.module.css";

export interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  priority?: boolean;
}

/**
 * ユーザーアバター共通コンポーネント
 * - LINEアイコン画像が存在する場合はそれを表示
 * - 未設定または読み込み失敗時は共通の音楽団体抽象アイコン (/default-avatar.svg) を表示
 * - iPhone Safari / PWA での描画負荷を最小化するため、軽量なネイティブ img タグを使用
 */
export function UserAvatar({
  src,
  alt = "ユーザアバター",
  size = 48,
  className,
  priority = false,
}: UserAvatarProps) {
  return (
    <img
      src={src || globalLineDefaultImage}
      alt={alt}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`${styles.avatarImg} ${className || ""}`.trim()}
      onError={(e) => {
        const target = e.currentTarget;
        if (target.src !== globalLineDefaultImage) {
          target.src = globalLineDefaultImage;
        }
      }}
    />
  );
}
