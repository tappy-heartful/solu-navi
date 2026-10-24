import { User, SectionDoc, RoleDoc } from "@/lib/firestore/types";
import { getCurrentAcademicYear, getGradeFromEnrollmentYear } from "@/lib/functions";
import { HandoverItem, HandoverStats } from "../types";

export function getSectionIcon(sectionId?: string): string {
  switch (sectionId) {
    case "1":
      return "🎷";
    case "2":
      return "🎺";
    case "3":
      return "🎺";
    case "4":
      return "🥁";
    default:
      return "🎵";
  }
}

export function buildHandoverData(
  users: User[],
  sections: SectionDoc[],
  roles: RoleDoc[]
): {
  items: HandoverItem[];
  stats: HandoverStats;
  secondYearUsers: User[];
  thirdYearUsers: User[];
} {
  const currentAcademicYear = getCurrentAcademicYear();

  // 学年別に部員を分類
  const thirdYearUsers = users.filter(
    (u) => getGradeFromEnrollmentYear(u.enrollmentYear) === "3回生"
  );
  const secondYearUsers = users.filter(
    (u) => getGradeFromEnrollmentYear(u.enrollmentYear) === "2回生"
  );

  const items: HandoverItem[] = [];

  // 1. バンマス (roles: 1)
  const prevBandmaster = thirdYearUsers.filter((u) => u.roleId === "1");
  const newBandmaster = secondYearUsers.filter((u) => u.roleId === "1");
  items.push({
    id: "role-1",
    title: "👑 バンドマスター",
    category: "executive",
    categoryLabel: "幹部",
    icon: "👑",
    color: "#f59e0b",
    description: "サークル代表・バンド運営統括・進行指揮",
    isCompleted: newBandmaster.length > 0,
    previousAssignees: prevBandmaster,
    newAssignees: newBandmaster,
    roleId: "1",
  });

  // 3. コンマス (roles: 2)
  const prevConmaster = thirdYearUsers.filter((u) => u.roleId === "2");
  const newConmaster = secondYearUsers.filter((u) => u.roleId === "2");
  items.push({
    id: "role-2",
    title: "🎼 コンサートマスター",
    category: "executive",
    categoryLabel: "幹部",
    icon: "🎼",
    color: "#8b5cf6",
    description: "音楽監督・合奏指導・サウンドチューニング",
    isCompleted: newConmaster.length > 0,
    previousAssignees: prevConmaster,
    newAssignees: newConmaster,
    roleId: "2",
  });

  // 4. 各パートのパートリーダー (roles: 3)
  const sortedSections = [...sections].sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const sec of sortedSections) {
    const prevLeaders = thirdYearUsers.filter(
      (u) => u.sectionId === sec.id && u.roleId === "3"
    );
    const newLeaders = secondYearUsers.filter(
      (u) => u.sectionId === sec.id && u.roleId === "3"
    );

    items.push({
      id: `section-leader-${sec.id}`,
      title: `${getSectionIcon(sec.id)} ${sec.name} パートリーダー`,
      category: "part-leader",
      categoryLabel: "パート統括",
      icon: getSectionIcon(sec.id),
      color: sec.color || "#146081",
      description: `${sec.name}パートの練習進行・譜割り・パート内連絡`,
      isCompleted: newLeaders.length > 0,
      previousAssignees: prevLeaders,
      newAssignees: newLeaders,
      sectionId: sec.id,
      roleId: "3",
    });
  }

  // 進捗集計
  const totalCount = items.length;
  const completedCount = items.filter((item) => item.isCompleted).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const stats: HandoverStats = {
    totalCount,
    completedCount,
    progressPercent,
    thirdYearUsersCount: thirdYearUsers.length,
    secondYearUsersCount: secondYearUsers.length,
    academicYear: currentAcademicYear,
    nextAcademicYear: currentAcademicYear + 1,
    previousEnrollmentYear: currentAcademicYear - 2,
    newEnrollmentYear: currentAcademicYear - 1,
  };

  return {
    items,
    stats,
    secondYearUsers,
    thirdYearUsers,
  };
}
