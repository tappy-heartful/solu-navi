import React, { Suspense } from "react";
import { UserEditClient } from "@/features/user/views/UserEditClient";

export const metadata = {
  title: "プロフィール編集 | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solition Orchestra プロフィール編集",
};

export default function UserEditPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <UserEditClient />
    </Suspense>
  );
}
