"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons";
import { Score, SetlistGroup } from "@/lib/firestore/types";
import styles from "./SetlistEdit.module.css";

type Props = {
  setlist: SetlistGroup[];
  scores: Score[];
  onChange: (setlist: SetlistGroup[]) => void;
};

export function SetlistEdit({ setlist, scores, onChange }: Props) {
  const addSetlistGroup = () => {
    onChange([...setlist, { title: "", songIds: [] }]);
  };

  const removeSetlistGroup = (idx: number) => {
    onChange(setlist.filter((_, i) => i !== idx));
  };

  const updateSetlistGroupTitle = (idx: number, title: string) => {
    onChange(setlist.map((g, i) => (i === idx ? { ...g, title } : g)));
  };

  const addSongToGroup = (groupIdx: number) => {
    onChange(
      setlist.map((g, i) =>
        i === groupIdx ? { ...g, songIds: [...g.songIds, ""] } : g
      )
    );
  };

  const removeSongFromGroup = (groupIdx: number, songIdx: number) => {
    onChange(
      setlist.map((g, i) =>
        i === groupIdx ? { ...g, songIds: g.songIds.filter((_, j) => j !== songIdx) } : g
      )
    );
  };

  const updateSongInGroup = (groupIdx: number, songIdx: number, scoreId: string) => {
    onChange(
      setlist.map((g, i) =>
        i === groupIdx
          ? { ...g, songIds: g.songIds.map((s, j) => (j === songIdx ? scoreId : s)) }
          : g
      )
    );
  };

  return (
    <div className={styles.container}>
      {setlist.map((group, groupIdx) => (
        <div key={groupIdx} className={styles.groupCard}>
          <div className={styles.groupHeader}>
            <FontAwesomeIcon icon={faLayerGroup} className={styles.groupIcon} />
            <input
              type="text"
              value={group.title}
              onChange={(e) => updateSetlistGroupTitle(groupIdx, e.target.value)}
              placeholder="グループ名 (例: 1部, 2部, アンコール)"
              className={styles.titleInput}
            />
            <button
              type="button"
              onClick={() => removeSetlistGroup(groupIdx)}
              className={styles.removeGroupBtn}
            >
              グループ削除
            </button>
          </div>

          <div className={styles.songsList}>
            {group.songIds.map((songId, songIdx) => (
              <div key={songIdx} className={styles.songRow}>
                <span className={styles.songNumber}>{songIdx + 1}.</span>
                <select
                  value={songId}
                  onChange={(e) => updateSongInGroup(groupIdx, songIdx, e.target.value)}
                  className={styles.songSelect}
                >
                  <option value="">-- 曲を選択 --</option>
                  {scores.map((score) => (
                    <option key={score.id} value={score.id}>
                      {score.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeSongFromGroup(groupIdx, songIdx)}
                  className={styles.removeSongBtn}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addSongToGroup(groupIdx)}
            className={styles.addSongBtn}
          >
            ＋ 曲を追加
          </button>
        </div>
      ))}

      <button type="button" onClick={addSetlistGroup} className={styles.addGroupBtn}>
        ＋ セットリストグループを追加
      </button>
    </div>
  );
}
