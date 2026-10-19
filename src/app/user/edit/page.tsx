import React, { Suspense } from "react";
import { UserEditClient } from "@/features/user/views/UserEditClient";
import {
  getRolesServer,
  getSectionsServer,
  getInstrumentsServer,
} from "@/features/user/api/user-server-actions";

export const metadata = {
  title: "プロフィール編集 | Solu Navi",
  description: "愛媛大学軽音楽部 Sound Solution Orchestra プロフィール編集",
};

export const dynamic = "force-dynamic";

export default async function UserEditPage() {
  const [roles, sections, instruments] = await Promise.all([
    getRolesServer(),
    getSectionsServer(),
    getInstrumentsServer(),
  ]);

  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <UserEditClient
        initialData={{
          roles,
          sections,
          instruments,
        }}
      />
    </Suspense>
  );
}
