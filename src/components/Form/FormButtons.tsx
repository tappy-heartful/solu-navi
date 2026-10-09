"use client";

import React from "react";
import { showDialog } from "@/lib/functions";
import styles from "./FormButtons.module.css";

type Props = {
  mode: "new" | "edit" | "copy";
  onSave: () => void;
  onClear: () => void;
  confirmMessage?: string;
};

export const FormButtons = ({
  mode,
  onSave,
  onClear,
  confirmMessage = "入力内容をクリアしてもよろしいですか？",
}: Props) => {
  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.clearBtn}
        onClick={async () => {
          if (await showDialog(confirmMessage)) {
            onClear();
          }
        }}
      >
        クリア
      </button>
      <button type="button" className={styles.saveBtn} onClick={onSave}>
        {mode === "edit" ? "更新" : "登録"}
      </button>
    </div>
  );
};
