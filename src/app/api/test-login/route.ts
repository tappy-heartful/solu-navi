import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { role } = await req.json();

    const isSystemAdmin = role === "admin";
    const testUid = isSystemAdmin ? "test_admin_user" : "test_regular_user";
    const displayName = isSystemAdmin ? "テスト管理者 (愛大)" : "テスト部員 (愛大)";

    // Custom Token 生成
    const customToken = await adminAuth.createCustomToken(testUid);

    // users ドキュメント初期化
    const userRef = adminDb.collection("users").doc(testUid);
    const snap = await userRef.get();

    if (!snap.exists) {
      await userRef.set({
        uid: testUid,
        displayName,
        abbreviation: isSystemAdmin ? "管理者" : "テスト",
        sectionId: "1", // Sax
        roleId: isSystemAdmin ? "1" : "6", // 代表 or メンバー
        instrumentIds: ["as"],
        agreedAt: Date.now(),
        isSystemAdmin,
        enrollmentYear: 2024,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      await userRef.set(
        {
          enrollmentYear: 2024,
        },
        { merge: true }
      );
    }

    return NextResponse.json({ customToken, uid: testUid });
  } catch (err: unknown) {
    console.error("test-login error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Error" },
      { status: 500 }
    );
  }
}
