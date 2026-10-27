import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { AppSettings } from "@/lib/firestore/types";
import { DEFAULT_APP_SETTINGS } from "@/lib/firestore/constants";
import { SettingsFormData } from "../types";

/**
 * クライアント側で設定を取得
 */
export async function getAppSettingsClient(): Promise<AppSettings> {
  try {
    const docRef = doc(db, "settings", "general");
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { ...DEFAULT_APP_SETTINGS };
    }
    const data = snap.data() as AppSettings;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...data,
      id: "general",
      generalLineGroupId: data.generalLineGroupId || "",
      generalLineGroupName: data.generalLineGroupName || "",
      generalLineGroupJoinedAt: typeof data.generalLineGroupJoinedAt === "number" ? data.generalLineGroupJoinedAt : undefined,
      generalChannelAccessToken: data.generalChannelAccessToken || "",
      sectionLineGroupIds: data.sectionLineGroupIds || {},
      sectionLineGroupNames: data.sectionLineGroupNames || {},
      sectionLineGroupJoinedAt: data.sectionLineGroupJoinedAt || {},
      sectionChannelAccessTokens: data.sectionChannelAccessTokens || {},
    };
  } catch (err) {
    console.error("[getAppSettingsClient] Error:", err);
    return { ...DEFAULT_APP_SETTINGS };
  }
}

/**
 * アプリ設定の保存（更新）
 */
export async function saveAppSettings(
  formData: SettingsFormData,
  updatedByUid?: string
): Promise<void> {
  const docRef = doc(db, "settings", "general");

  const cleanSectionLineGroupIds: Record<string, string> = {};
  const cleanSectionLineGroupNames: Record<string, string> = { ...(formData.sectionLineGroupNames || {}) };
  const cleanSectionLineGroupJoinedAt: Record<string, number> = { ...(formData.sectionLineGroupJoinedAt || {}) };
  const cleanSectionChannelAccessTokens: Record<string, string> = {};

  if (formData.sectionLineGroupIds) {
    Object.entries(formData.sectionLineGroupIds).forEach(([secId, grpId]) => {
      const trimmedId = (grpId || "").trim();
      cleanSectionLineGroupIds[secId] = trimmedId;
      if (trimmedId && !cleanSectionLineGroupJoinedAt[secId]) {
        cleanSectionLineGroupJoinedAt[secId] = Date.now();
      }
    });
  }

  if (formData.sectionChannelAccessTokens) {
    Object.entries(formData.sectionChannelAccessTokens).forEach(([secId, token]) => {
      cleanSectionChannelAccessTokens[secId] = (token || "").trim();
    });
  }

  const generalGroupId = (formData.generalLineGroupId || "").trim();
  let generalJoinedAt = formData.generalLineGroupJoinedAt;
  if (generalGroupId && !generalJoinedAt) {
    generalJoinedAt = Date.now();
  }

  const payload: Partial<AppSettings> = {
    generalLineGroupId: generalGroupId,
    generalLineGroupName: formData.generalLineGroupName || "",
    generalLineGroupJoinedAt: generalJoinedAt,
    generalChannelAccessToken: (formData.generalChannelAccessToken || "").trim(),
    sectionLineGroupIds: cleanSectionLineGroupIds,
    sectionLineGroupNames: cleanSectionLineGroupNames,
    sectionLineGroupJoinedAt: cleanSectionLineGroupJoinedAt,
    sectionChannelAccessTokens: cleanSectionChannelAccessTokens,
    homeAttendanceDays: Number(formData.homeAttendanceDays) || DEFAULT_APP_SETTINGS.homeAttendanceDays || 7,
    homeAttendanceCount: Number(formData.homeAttendanceDays) || DEFAULT_APP_SETTINGS.homeAttendanceCount || 5, // 旧互換
    homeScoreCount: Number(formData.homeScoreCount) || DEFAULT_APP_SETTINGS.homeScoreCount || 6,
    homeMediaCount: Number(formData.homeMediaCount) || DEFAULT_APP_SETTINGS.homeMediaCount || 4,
    showCallInAnnouncement: formData.showCallInAnnouncement ?? true,
    showVoteInAnnouncement: formData.showVoteInAnnouncement ?? true,
    showFeeInAnnouncement: formData.showFeeInAnnouncement ?? true,
    updatedAt: Date.now(),
    updatedBy: updatedByUid || "anonymous",
  };

  await setDoc(docRef, {
    ...payload,
    lastSavedAt: serverTimestamp(),
  }, { merge: true });
}
