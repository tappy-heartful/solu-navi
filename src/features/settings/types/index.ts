import { AppSettings } from "@/lib/firestore/types";

export type { AppSettings };

export interface SettingsFormData {
  generalLineGroupId: string;
  generalLineGroupName?: string;
  generalLineGroupJoinedAt?: number;
  generalChannelAccessToken?: string;
  sectionLineGroupIds: Record<string, string>;
  sectionLineGroupNames?: Record<string, string>;
  sectionLineGroupJoinedAt?: Record<string, number>;
  sectionChannelAccessTokens?: Record<string, string>;
  homeAttendanceDays: number;
  homeScoreCount: number;
  homeMediaCount: number;
  showCallInAnnouncement: boolean;
  showVoteInAnnouncement: boolean;
  showFeeInAnnouncement: boolean;
  enableEventNotice: boolean;
  eventNoticeDaysOfWeek: number[];
  eventNoticeTargetDays: number;
}
