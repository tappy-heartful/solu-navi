import React, { Suspense } from "react";
import { UserConfirmClient } from "@/features/user/views/UserConfirmClient";

export const metadata = {
  title: "ユーザ確認 | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solution Orchestra ユーザ確認",
};

export default function UserDetailPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <UserConfirmClient />
    </Suspense>
  );
}
