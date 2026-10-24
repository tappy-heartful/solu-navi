import { User, SectionDoc, RoleDoc } from "@/lib/firestore/types";

export type HandoverCategory = "executive" | "part-leader";

export interface HandoverItem {
  id: string;
  title: string;
  category: HandoverCategory;
  categoryLabel: string;
  icon: string;
  color?: string;
  description: string;
  isCompleted: boolean;
  previousAssignees: User[]; // 3回生の担当者
  newAssignees: User[];      // 2回生の担当者
  sectionId?: string;
  roleId?: string;
}

export interface HandoverStats {
  totalCount: number;
  completedCount: number;
  progressPercent: number;
  thirdYearUsersCount: number;
  secondYearUsersCount: number;
  academicYear: number;           // 現在の活動年度 (例: 2026)
  nextAcademicYear: number;       // 次の活動年度 (例: 2027)
  previousEnrollmentYear: number; // 3回生の入学年度 (例: 2024)
  newEnrollmentYear: number;      // 2回生の入学年度 (例: 2025)
}
