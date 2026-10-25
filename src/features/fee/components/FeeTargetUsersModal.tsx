"use client";

import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faUser } from "@fortawesome/free-solid-svg-icons";
import { User } from "@/lib/firestore/types";
import { DEFAULT_SECTIONS } from "@/lib/firestore/constants";
import { getGradeFromEnrollmentYear } from "@/lib/functions";
import styles from "./FeeTargetUsersModal.module.css";

interface FeeTargetUsersModalProps {
  isOpen: boolean;
  initialTargetUserIds?: string[];
  users: User[];
  onClose: () => void;
  onSave: (selectedUserIds: string[]) => Promise<void> | void;
}

// パートごとの絵文字
const SECTION_ICONS: Record<string, string> = {
  "1": "🎷",
  "2": "🎺",
  "3": "📯",
  "4": "🥁",
};

export function FeeTargetUsersModal({
  isOpen,
  initialTargetUserIds,
  users,
  onClose,
  onSave,
}: FeeTargetUsersModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // 初期化（モーダルが開いたとき）
  useEffect(() => {
    if (!isOpen) return;

    if (initialTargetUserIds && initialTargetUserIds.length > 0) {
      setSelectedIds(new Set(initialTargetUserIds));
    } else {
      // 未設定時は現役生（1, 2, 3回生）をデフォルト選択
      const currentStudentIds = users
        .filter((u) => {
          if (!u.enrollmentYear) return false;
          const grade = getGradeFromEnrollmentYear(u.enrollmentYear);
          return grade === "1回生" || grade === "2回生" || grade === "3回生" || grade === "新入生";
        })
        .map((u) => u.uid || u.id)
        .filter((id): id is string => Boolean(id));

      const defaultIds =
        currentStudentIds.length > 0
          ? currentStudentIds
          : (users.map((u) => u.uid || u.id).filter(Boolean) as string[]);

      setSelectedIds(new Set(defaultIds));
    }
  }, [isOpen, initialTargetUserIds, users]);

  // パート別にユーザーをグループ化（streak-navi 準拠）
  const groupedSections = useMemo(() => {
    const list: {
      sectionId: string;
      sectionName: string;
      icon: string;
      members: User[];
    }[] = [];

    DEFAULT_SECTIONS.forEach((sec) => {
      const secMembers = users
        .filter((u) => u.sectionId === sec.id)
        .sort((a, b) => {
          const rA = a.roleId || "99";
          const rB = b.roleId || "99";
          if (rA !== rB) return rA.localeCompare(rB);
          return (a.displayName || "").localeCompare(b.displayName || "");
        });

      if (secMembers.length > 0) {
        list.push({
          sectionId: sec.id,
          sectionName: sec.name,
          icon: SECTION_ICONS[sec.id] || "🎵",
          members: secMembers,
        });
      }
    });

    const others = users.filter(
      (u) => !DEFAULT_SECTIONS.some((sec) => sec.id === u.sectionId)
    );
    if (others.length > 0) {
      list.push({
        sectionId: "other",
        sectionName: "その他・未設定",
        icon: "👥",
        members: others,
      });
    }

    return list;
  }, [users]);

  if (!isOpen) return null;

  // 単独トグル
  const handleToggle = (uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  // 保存実行
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(Array.from(selectedIds));
      onClose();
    } catch (err) {
      console.error("[FeeTargetUsersModal] Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <h3 className={styles.title}>集金対象メンバーの選択</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="閉じる"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* スクロール領域（streak-navi 準拠のシンプルリスト） */}
        <div className={styles.scrollArea}>
          {groupedSections.map(({ sectionId, sectionName, icon, members }) => (
            <div key={sectionId} className={styles.sectionBlock}>
              <h4 className={styles.sectionHeader}>
                <span>{icon}</span> {sectionName}
              </h4>

              <div className={styles.memberList}>
                {members.map((u) => {
                  const targetUid = u.uid || u.id;
                  if (!targetUid) return null;
                  const isChecked = selectedIds.has(targetUid);

                  return (
                    <label
                      key={targetUid}
                      className={styles.memberItem}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggle(targetUid);
                      }}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isChecked}
                        onChange={() => {}}
                        id={`modal-target-${targetUid}`}
                      />
                      {u.pictureUrl ? (
                        <img
                          src={u.pictureUrl}
                          alt=""
                          className={styles.avatar}
                        />
                      ) : (
                        <div className={styles.defaultAvatar}>
                          <FontAwesomeIcon icon={faUser} />
                        </div>
                      )}
                      <span className={styles.memberName}>
                        {u.displayName || "不明なユーザー"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* フッター */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isSaving}
          >
            キャンセル
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
