"use server";

import { fetchEventConfirmData, EventConfirmData } from "./event-server-actions";

/**
 * ホームカレンダー等のクライアントからイベント詳細確認データを一括取得する Server Action
 */
export async function getEventConfirmDataAction(eventId: string): Promise<EventConfirmData | null> {
  if (!eventId) return null;
  try {
    return await fetchEventConfirmData(eventId);
  } catch (err) {
    console.error("[getEventConfirmDataAction] エラー:", err);
    return null;
  }
}
