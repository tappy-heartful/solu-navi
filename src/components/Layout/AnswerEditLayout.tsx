"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormFooter } from "../Form/FormFooter";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { showSpinner, hideSpinner, writeLog, showDialog } from "@/lib/functions";
import styles from "./AnswerEditLayout.module.css";

type Props = {
  featureName: string;
  icon?: string;
  basePath: string;
  featureIdKey: string;
  dataId: string;
  mode: "new" | "edit";
  onSave: () => Promise<void>;
  isLoading?: boolean;
  children: React.ReactNode;
};

export const AnswerEditLayout = ({
  featureName,
  icon,
  basePath,
  featureIdKey,
  dataId,
  mode,
  onSave,
  isLoading = false,
  children,
}: Props) => {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const confirmPath = `${basePath}/confirm?${featureIdKey}=${dataId}`;
  const title = mode === "edit" ? "回答修正" : "回答登録";
  const saveButtonText = mode === "edit" ? "回答を修正する" : "回答を登録する";

  const handleSave = async () => {
    showSpinner();
    try {
      await onSave();
      hideSpinner();
      await writeLog({ dataId, action: `${featureName}${title}` });
    } catch (e) {
      hideSpinner();
      await writeLog({
        dataId,
        action: `${featureName}${title}`,
        status: "error",
        errorDetail: { message: (e as Error).message },
      });
      await showDialog("保存に失敗しました", true);
    }
  };

  useEffect(() => {
    setBreadcrumbs([
      { label: "ホーム", href: "/" },
      { label: `${featureName}一覧`, href: basePath },
      { label: `${featureName}確認`, href: confirmPath },
      { label: title },
    ]);
  }, [setBreadcrumbs, featureName, basePath, confirmPath, title]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user || isLoading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>読み込み中...</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {icon && <i className={`${icon} ${styles.icon}`} />}
          <span>{title}</span>
        </h1>
      </div>

      <main className={styles.container}>
        {children}

        <div className={styles.submitSection}>
          <button type="button" className={styles.saveButton} onClick={handleSave}>
            {saveButtonText}
          </button>
        </div>
      </main>

      <div className={styles.footer}>
        <FormFooter backHref={confirmPath} backText={`${featureName}確認に戻る`} />
      </div>
    </div>
  );
};
