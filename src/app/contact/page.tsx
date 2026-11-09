import React from "react";
import { Metadata } from "next";
import { getContactsServer } from "@/features/contact/api/contact-server-actions";
import { ContactListClient } from "@/features/contact/views/ContactListClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "お問い合わせ一覧 | Solu Navi",
  description: "システム管理者へのお問い合わせ・不具合報告・ご要望",
};

export default async function ContactPage() {
  // 初期表示用に全件取得（クライアント側でAuthContextの権限に合わせてフィルタリング・表示）
  const initialContacts = await getContactsServer(undefined, true);

  return <ContactListClient initialContacts={initialContacts} />;
}

