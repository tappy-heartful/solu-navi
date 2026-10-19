import React from "react";
import { getEventsServer } from "@/features/event/api/event-server-actions";
import { CalendarView } from "@/features/calendar/components/CalendarView";
import { BaseLayout } from "@/components/Layout/BaseLayout";
import { adminDb } from "@/lib/firebase-admin";
import { toPlainObject } from "@/lib/firestore/utils";
import { Vote, Call } from "@/lib/firestore/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "カレンダー",
};

export const revalidate = 60;

export default async function CalendarPage() {
  const [events, votesSnap, callsSnap] = await Promise.all([
    getEventsServer(),
    adminDb.collection("votes").orderBy("acceptStartDate", "desc").limit(50).get(),
    adminDb.collection("calls").orderBy("acceptStartDate", "desc").limit(50).get(),
  ]);

  const votes = votesSnap.docs.map(toPlainObject) as Vote[];
  const calls = callsSnap.docs.map(toPlainObject) as Call[];

  return (
    <BaseLayout>
      <div className="page-header">
        <h1>
          <i className="fa-solid fa-calendar-days" style={{ marginRight: "0.5rem" }} />
          カレンダー
        </h1>
      </div>
      <div className="container">
        <CalendarView events={events} votes={votes} calls={calls} />
      </div>
    </BaseLayout>
  );
}
