import { UserListClient } from "@/features/user/views/UserListClient";
import {
  getUsersServer,
  getSectionsServer,
  getRolesServer,
  getInstrumentsServer,
} from "@/features/user/api/user-server-actions";

export const metadata = {
  title: "部員名簿 | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solution Orchestra 部員一覧",
};

export const dynamic = "force-dynamic";

export default async function UserPage() {
  const [users, sections, roles, instruments] = await Promise.all([
    getUsersServer(),
    getSectionsServer(),
    getRolesServer(),
    getInstrumentsServer(),
  ]);

  return (
    <UserListClient
      initialData={{
        users,
        sections,
        roles,
        instruments,
      }}
    />
  );
}
