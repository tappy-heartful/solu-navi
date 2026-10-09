import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { generateLineAuthUrl } from "@/lib/line";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const origin = req.nextUrl.origin;
    const searchParams = req.nextUrl.searchParams;
    const redirectAfterLogin = searchParams.get("redirect") || "/";
    const pwaSessionId = searchParams.get("pwaSessionId") || null;

    // 16バイトのランダム hex state
    const state = crypto.randomBytes(16).toString("hex");
    const redirectUri = `${origin}/callback`;

    // oauthStates に state を保存 (使い捨て検証用)
    await adminDb.collection("oauthStates").doc(state).set({
      state,
      origin,
      redirectAfterLogin,
      pwaSessionId,
      createdAt: new Date(),
    });

    const authUrl = generateLineAuthUrl(state, redirectUri);

    return NextResponse.json({ url: authUrl, state });
  } catch (err: unknown) {
    console.error("line get-url error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Error" },
      { status: 500 }
    );
  }
}
