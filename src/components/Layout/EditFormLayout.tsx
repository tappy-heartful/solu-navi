"use client";

import React, { ReactNode } from "react";
import { BaseLayout } from "./BaseLayout";
import styles from "./EditFormLayout.module.css";

interface EditFormLayoutProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditFormLayout({ title, icon, children, onSubmit }: EditFormLayoutProps) {
  return (
    <BaseLayout>
      <div className={styles.card}>
        <div className={styles.header}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <h2 className={styles.title}>{title}</h2>
        </div>
        <form onSubmit={onSubmit} className={styles.form}>
          {children}
        </form>
      </div>
    </BaseLayout>
  );
}
