import { NextRequest, NextResponse } from "next/server";
import { getLineTokens, getLineProfile, checkLineFriendship, hashLineUid } from "@/lib/line";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { code, state } = await req.json();

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    // 1. state の検証と即時削除
    const stateDoc = await adminDb.collection("oauthStates").doc(state).get();
    if (!stateDoc.exists) {
      return NextResponse.json({ error: "Invalid or expired state" }, { status: 403 });
    }
    const stateData = stateDoc.data();
    await adminDb.collection("oauthStates").doc(state).delete();

    const redirectUri = `${req.nextUrl.origin}/callback`;

    // 2. Token 交換
    const tokenData = await getLineTokens(code, redirectUri);

    // 3. 友だち確認 (公式アカウント)
    const isFriend = await checkLineFriendship(tokenData.access_token);
    if (!isFriend) {
      return NextResponse.json(
        { error: "NOT_FRIEND", message: "公式アカウントを友だち追加してください" },
        { status: 403 }
      );
    }

    // 4. プロフィール取得
    const profile = await getLineProfile(tokenData.access_token);

    // 5. UID のソルト＋ペッパー ハッシュ化
    const hashedUid = hashLineUid(profile.userId);

    // 6. Firebase Custom Token 発行
    const customToken = await adminAuth.createCustomToken(hashedUid);

    // 7. users コレクションに基本プロフィール登録（未存在時）
    const userRef = adminDb.collection("users").doc(hashedUid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        uid: hashedUid,
        displayName: profile.displayName || "新規メンバー",
        pictureUrl: profile.pictureUrl || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // 8. PWA セッション同期（pwaSessionId がある場合）
    if (stateData?.pwaSessionId) {
      await adminDb.collection("pwaAuthSessions").doc(stateData.pwaSessionId).set({
        customToken,
        uid: hashedUid,
        status: "success",
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      customToken,
      uid: hashedUid,
      redirectAfterLogin: stateData?.redirectAfterLogin || "/",
    });
  } catch (err: unknown) {
    console.error("line login error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Error" },
      { status: 500 }
    );
  }
}
