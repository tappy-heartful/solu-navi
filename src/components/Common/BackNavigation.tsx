import React from "react";
import Link from "next/link";

export interface BackNavigationProps {
  href: string;
  label: string;
  className?: string;
}

/**
 * 前の画面に戻るボタンコンポーネント (中央配置・streak-navi同等アニメーション付きデザイン)
 */
export function BackNavigation({ href, label, className = "" }: BackNavigationProps) {
  if (!href) return null;

  const cleanLabel = label.replace(/に戻る$/, "");

  return (
    <div className={`back-nav-area ${className}`.trim()}>
      <Link href={href} className="back-link" prefetch={false}>
        ← {cleanLabel}に戻る
      </Link>
    </div>
  );
}
