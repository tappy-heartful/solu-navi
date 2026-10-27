import "server-only";
import { adminDb } from "@/lib/firebase-admin";
import { toPlainObject } from "@/lib/firestore/utils";
import { AppSettings, SectionDoc } from "@/lib/firestore/types";
import { DEFAULT_APP_SETTINGS, DEFAULT_SECTIONS } from "@/lib/firestore/constants";

/**
 * サークル・システム設定をサーバーサイドで取得
 */
export async function getAppSettingsServer(): Promise<AppSettings> {
  try {
    const docSnap = await adminDb.collection("settings").doc("general").get();
    if (!docSnap.exists) {
      return { ...DEFAULT_APP_SETTINGS };
    }
    const data = toPlainObject(docSnap) as AppSettings;
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
      homeAttendanceDays: typeof data.homeAttendanceDays === "number" ? data.homeAttendanceDays : DEFAULT_APP_SETTINGS.homeAttendanceDays,
      homeAttendanceCount: typeof data.homeAttendanceCount === "number" ? data.homeAttendanceCount : DEFAULT_APP_SETTINGS.homeAttendanceCount,
      homeScoreCount: typeof data.homeScoreCount === "number" ? data.homeScoreCount : DEFAULT_APP_SETTINGS.homeScoreCount,
      homeMediaCount: typeof data.homeMediaCount === "number" ? data.homeMediaCount : DEFAULT_APP_SETTINGS.homeMediaCount,
    };
  } catch (err) {
    console.error("[getAppSettingsServer] Error:", err);
    return { ...DEFAULT_APP_SETTINGS };
  }
}

/**
 * 設定画面で使用するパートマスタ一覧を取得
 */
export async function getSectionsForConfigServer(): Promise<SectionDoc[]> {
  try {
    const snap = await adminDb.collection("sections").orderBy("order", "asc").get();
    if (snap.empty) {
      return DEFAULT_SECTIONS;
    }
    const sections = snap.docs.map(toPlainObject) as SectionDoc[];
    return sections.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (err) {
    console.error("[getSectionsForConfigServer] Error:", err);
    return DEFAULT_SECTIONS;
  }
}
