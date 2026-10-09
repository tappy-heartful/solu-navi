"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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
 */
export function UserAvatar({
  src,
  alt = "部員アバター",
  size = 48,
  className,
  priority = false,
}: UserAvatarProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(src || globalLineDefaultImage);

  useEffect(() => {
    setCurrentSrc(src || globalLineDefaultImage);
  }, [src]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={size}
      height={size}
      className={`${styles.avatarImg} ${className || ""}`.trim()}
      priority={priority}
      unoptimized
      onError={() => {
        if (currentSrc !== globalLineDefaultImage) {
          setCurrentSrc(globalLineDefaultImage);
        }
      }}
    />
  );
}
