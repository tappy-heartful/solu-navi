"use client";

import React, { ReactNode } from "react";
import { BaseLayout } from "./BaseLayout";
import { BackNavigation } from "@/components/Common/BackNavigation";
import styles from "./ConfirmLayout.module.css";

interface ConfirmLayoutProps {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backText?: string;
  children: ReactNode;
}

export function ConfirmLayout({ title, icon, actions, backHref, backText = "戻る", children }: ConfirmLayoutProps) {
  return (
    <BaseLayout>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            {icon && <span className={styles.icon}>{icon}</span>}
            <h2 className={styles.title}>{title}</h2>
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
        <div className={styles.body}>{children}</div>
      </div>
      {backHref && <BackNavigation href={backHref} label={backText} />}
    </BaseLayout>
  );
}
