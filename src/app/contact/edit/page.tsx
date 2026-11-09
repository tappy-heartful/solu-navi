import React from "react";
import { Metadata } from "next";
import { ContactEditClient } from "@/features/contact/views/ContactEditClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "新規お問い合わせ | Solu Navi",
  description: "システム管理者へのお問い合わせ・不具合報告・ご要望の作成",
};

export default function ContactEditPage() {
  return <ContactEditClient />;
}

