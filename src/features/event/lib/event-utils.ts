import { Event, User } from "@/lib/firestore/types";

/**
 * イベントの編集・削除権限があるかを判定する
 * 権限条件: システム管理者 または イベント管理者 または イベント作成者本人
 */
export function canEditEvent(
  event: Partial<Event> | null | undefined,
  user: (Partial<User> & { isEventAdmin?: boolean; isSystemAdmin?: boolean }) | null | undefined
): boolean {
  if (!user || !user.id) return false;

  // システム管理者 または イベント管理者は全イベント編集・削除可能
  if (user.isSystemAdmin || user.isEventAdmin) {
    return true;
  }

  // 新規作成（IDなし）時はログイン済み部員であれば作成可能
  if (!event || !event.id) {
    return true;
  }

  // 作成者判定 (createdUid, createdByUid, createdBy(UIDまたはdisplayName)に対応)
  const uid = user.id;
  const isCreator =
    event.createdUid === uid ||
    event.createdByUid === uid ||
    event.createdBy === uid ||
    (!!user.displayName && event.createdBy === user.displayName);

  return !!isCreator;
}
