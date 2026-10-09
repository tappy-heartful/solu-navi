import { UserDoc } from "@/lib/firestore/types";

export type { UserDoc };

export interface UserFormData {
  displayName: string;
  kana: string;
  abbreviation: string;
  sectionId: string;
  roleId: string;
  instrumentIds: string[];
  grade: string;
  phoneNumber: string;
  paypayId: string;
}
