import { NextRequest, NextResponse } from "next/server";
import { sendUpcomingEventsNoticeToGeneralLine } from "@/features/event/api/event-notification-server-actions";

export const dynamic = "force-dynamic";

/**
 * GET/POST /api/cron/event-notice
 * GASまたは外部Cronから呼び出されるイベント予告LINE通知エンドポイント
 * クエリ例:
 *   - /api/cron/event-notice (通常の日次判定実行)
 *   - /api/cron/event-notice?force=true (曜日判定をバイパスしたテスト実行)
 */
export async function GET(req: NextRequest) {
  try {
    const isForce = req.nextUrl.searchParams.get("force") === "true";
    const res = await sendUpcomingEventsNoticeToGeneralLine(isForce);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error("[API /api/cron/event-notice] GET error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isForce = req.nextUrl.searchParams.get("force") === "true";
    const res = await sendUpcomingEventsNoticeToGeneralLine(isForce);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error("[API /api/cron/event-notice] POST error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
