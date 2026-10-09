"use client";

import React, { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BaseLayout } from "./BaseLayout";
import { FormButtons } from "@/components/Form/FormButtons";
import { FormFooter } from "@/components/Form/FormFooter";
import { useAuth } from "@/contexts/AuthContext";
import { useBreadcrumb } from "@/contexts/BreadcrumbContext";
import { showDialog } from "@/lib/functions";
import { AppFormReturn } from "@/hooks/useAppForm";
import styles from "./EditFormLayout.module.css";

export interface EditFormLayoutProps<T extends Record<string, any> = Record<string, any>> {
  title?: string;
  featureName?: string;
  icon?: ReactNode | string;
  featureIdKey?: string;
  basePath?: string;
  dataId?: string;
  mode?: "new" | "edit" | "copy";
  overrideAdmin?: boolean;
  children: ReactNode;
  form?: AppFormReturn<T>;
  onSaveApi?: (data: T) => Promise<string | undefined>;
  onSubmit?: (e: React.FormEvent) => void;
}

export function EditFormLayout<T extends Record<string, any>>({
  title,
  featureName,
  icon,
  featureIdKey,
  basePath,
  dataId,
  mode = "new",
  overrideAdmin,
  children,
  form,
  onSaveApi,
  onSubmit,
}: EditFormLayoutProps<T>) {
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [isAuthorized, setIsAuthorized] = useState(false);

  const isAdvancedMode = Boolean(featureName && basePath && form && onSaveApi);
  const isNew = mode === "new";
  const displayTitle = title || (isNew ? `${featureName}新規作成` : `${featureName}編集`);
  const confirmPath = `${basePath}/confirm?${featureIdKey}=${dataId}`;
  const effectiveIsAdmin = overrideAdmin ?? isAdmin;

  useEffect(() => {
    if (!isAdvancedMode) {
      setIsAuthorized(true);
      return;
    }
    if (loading) return;
    if (!effectiveIsAdmin) {
      showDialog("この操作を行う権限がありません。", true).then(() => {
        if (basePath) router.push(basePath);
      });
    } else {
      setIsAuthorized(true);
      setBreadcrumbs([
        { label: `${featureName}一覧`, href: basePath },
        ...(!isNew ? [{ label: `${featureName}確認`, href: confirmPath }] : []),
        { label: displayTitle, href: "" },
      ]);
    }
  }, [
    isAdvancedMode,
    effectiveIsAdmin,
    loading,
    featureName,
    basePath,
    dataId,
    mode,
    isNew,
    displayTitle,
    confirmPath,
    router,
    setBreadcrumbs,
  ]);

  const handleSave = async () => {
    if (!form || !onSaveApi || !basePath) return;
    const errors = form.validate();
    if (Object.keys(errors).length > 0) {
      return showDialog("入力内容を確認してください", true);
    }
    if (!(await showDialog(`${mode === "edit" ? "更新" : "登録"}しますか？`))) return;

    const { showSpinner, hideSpinner, writeLog } = await import("@/lib/functions");
    showSpinner();
    try {
      const finalId = await onSaveApi(form.formData);
      hideSpinner();
      await writeLog({
        dataId: finalId || dataId || "new",
        action: `${featureName}${mode === "edit" ? "更新" : "登録"}`,
      });
      await showDialog("保存しました", true);

      showSpinner();
      router.push(`${basePath}/confirm?${featureIdKey}=${finalId}`);
    } catch (error) {
      hideSpinner();
      const msg = error instanceof Error ? error.message : "";
      await writeLog({
        dataId: dataId || "new",
        action: `${featureName}${mode === "edit" ? "更新" : "登録"}`,
        status: "error",
        errorDetail: { message: msg },
      });
      if (msg.startsWith("validation:")) {
        await showDialog(msg.slice("validation:".length), true);
      } else {
        await showDialog("保存に失敗しました", true);
      }
    }
  };

  if (isAdvancedMode && (loading || !isAuthorized)) {
    return (
      <BaseLayout>
        <div style={{ padding: "2rem", textAlign: "center" }}>権限を確認中...</div>
      </BaseLayout>
    );
  }

  // 従来通りのシンプルな form onSubmit モード
  if (!isAdvancedMode) {
    return (
      <BaseLayout>
        <div className={styles.card}>
          <div className={styles.header}>
            {icon && (
              <span className={styles.icon}>
                {typeof icon === "string" ? <i className={icon} /> : icon}
              </span>
            )}
            <h2 className={styles.title}>{displayTitle}</h2>
          </div>
          <form onSubmit={onSubmit} className={styles.form}>
            {children}
          </form>
        </div>
      </BaseLayout>
    );
  }

  // 高度なフィーチャーフォームモード
  return (
    <BaseLayout>
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
          {icon && (typeof icon === "string" ? <i className={icon} /> : icon)}
          {displayTitle}
        </h1>
      </div>
      <div className={styles.formContainer}>
        {children}
        <FormButtons mode={mode} onSave={handleSave} onClear={form?.resetForm || (() => {})} />
      </div>
      <FormFooter
        backHref={isNew ? basePath : confirmPath}
        backText={isNew ? `${featureName}一覧` : `${featureName}確認`}
      />
    </BaseLayout>
  );
}
