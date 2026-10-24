import { HandoverClient } from "@/features/handover/views/HandoverClient";
import {
  getUsersServer,
  getSectionsServer,
  getRolesServer,
} from "@/features/user/api/user-server-actions";

export const metadata = {
  title: "引継ぎ進捗確認 | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solution Orchestra 3回生から2回生への引継ぎ進捗確認",
};

export const dynamic = "force-dynamic";

export default async function HandoverPage() {
  const [users, sections, roles] = await Promise.all([
    getUsersServer(),
    getSectionsServer(),
    getRolesServer(),
  ]);

  return <HandoverClient users={users} sections={sections} roles={roles} />;
}
