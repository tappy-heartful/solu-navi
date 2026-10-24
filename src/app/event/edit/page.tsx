import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventEditPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; eventId?: string; type?: string; date?: string }>;
}) {
  const { eventId } = await searchParams;
  if (eventId) {
    redirect(`/?eventId=${encodeURIComponent(eventId)}`);
  }
  redirect("/?newEvent=true");
}
