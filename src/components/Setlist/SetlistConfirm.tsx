"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMusic, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { faYoutube } from "@fortawesome/free-brands-svg-icons";
import { Score, SetlistGroup } from "@/lib/firestore/types";
import { extractYouTubeId } from "@/lib/functions";
import styles from "./SetlistConfirm.module.css";

type Props = {
  setlist: SetlistGroup[];
  scoresMap: Record<string, Score>;
};

export function SetlistConfirm({ setlist, scoresMap }: Props) {
  const watchIds: string[] = [];
  const setlistGroups = setlist.map((group) => {
    const songs = (group.songIds || []).map((id) => {
      const score = scoresMap[id];
      if (!score) return { id, title: "曲名が見つかりません", scoreUrl: undefined };
      if (score.referenceTrack) {
        const vid = extractYouTubeId(score.referenceTrack);
        if (vid && !watchIds.includes(vid)) watchIds.push(vid);
      }
      return { id, title: score.title, scoreUrl: score.scoreUrl };
    });
    return { title: group.title, songs };
  });

  const playlistUrl =
    watchIds.length > 0
      ? `https://www.youtube.com/watch_videos?video_ids=${watchIds.join(",")}`
      : null;

  if (setlistGroups.length === 0) {
    return <div className={styles.emptyNotice}>設定されていません</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <label className={styles.title}>
          <FontAwesomeIcon icon={faMusic} style={{ color: "#146081", marginRight: "6px" }} />
          セットリスト
        </label>
        {playlistUrl && (
          <a
            href={playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.playlistBtn}
          >
            <FontAwesomeIcon icon={faYoutube} />
            <span>参考音源全曲再生</span>
          </a>
        )}
      </div>

      <div className={styles.groups}>
        {setlistGroups.map((group, idx) => (
          <div key={idx} className={styles.groupCard}>
            {group.title && <div className={styles.groupTitle}>{group.title}</div>}
            <ol className={styles.songsList}>
              {group.songs.map((song, sIdx) => (
                <li key={sIdx} className={styles.songItem}>
                  <span>{song.title}</span>
                  {song.scoreUrl && (
                    <a
                      href={song.scoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.scoreLink}
                    >
                      <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: "0.75rem" }} />
                      楽譜
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
