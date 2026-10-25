import { AppSettings } from "@/lib/firestore/types";

export type { AppSettings };

export interface SettingsFormData {
  generalLineGroupId: string;
  sectionLineGroupIds: Record<string, string>;
  homeAttendanceDays: number;
  homeScoreCount: number;
  homeMediaCount: number;
  showCallInAnnouncement: boolean;
  showVoteInAnnouncement: boolean;
  showFeeInAnnouncement: boolean;
}
