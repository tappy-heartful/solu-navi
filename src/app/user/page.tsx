import { UserListClient } from "@/features/user/views/UserListClient";

export const metadata = {
  title: "部員名簿 | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solition Orchestra 部員一覧",
};

export default function UserPage() {
  return <UserListClient />;
}
