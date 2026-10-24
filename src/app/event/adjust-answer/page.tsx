import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventAdjustAnswerPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId } = await searchParams;
  if (eventId) {
    redirect(`/?eventId=${encodeURIComponent(eventId)}`);
  }
  redirect("/");
}
