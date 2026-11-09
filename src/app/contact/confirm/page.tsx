import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContactDetailServer } from "@/features/contact/api/contact-server-actions";
import { ContactConfirmClient } from "@/features/contact/views/ContactConfirmClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "お問い合わせ確認 | Solu Navi",
  description: "システム管理者とのお問い合わせチャット・確認",
};

interface ContactConfirmPageProps {
  searchParams: Promise<{ contactId?: string }>;
}

export default async function ContactConfirmPage({
  searchParams,
}: ContactConfirmPageProps) {
  // 規約2.5: searchParams は必ず await する
  const params = await searchParams;
  const contactId = params.contactId;

  if (!contactId) {
    notFound();
  }

  const { contact, messages } = await getContactDetailServer(contactId);

  if (!contact) {
    notFound();
  }

  return (
    <ContactConfirmClient
      initialContact={contact}
      initialMessages={messages}
    />
  );
}

