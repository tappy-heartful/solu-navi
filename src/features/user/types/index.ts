import { UserDoc } from "@/lib/firestore/types";

export type { UserDoc };

export interface UserFormData {
  abbreviation: string;
  sectionId: string;
  roleId: string;
  instrumentIds: string[];
  enrollmentYear: number | "";
}
