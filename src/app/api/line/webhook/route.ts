import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getLineAccessTokenForTarget, formatConciergeMessage } from "@/lib/line";

export const dynamic = "force-dynamic";

/**
 * 環境変数フォールバック用アクセストークン
 */
function getEnvAccessToken(): string {
  return (
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    process.env.LINE_INDIV_ACCESS_TOKEN ||
    process.env.LINE_ACCESS_TOKEN ||
    ""
  );
}

/**
 * LINE Channel Secret 取得 (LINE_CLIENT_SECRET_NAVI を最優先で使用)
 */
function getLineChannelSecret(): string {
  return (
    process.env.LINE_CLIENT_SECRET_NAVI ||
    process.env.LINE_CHANNEL_SECRET ||
    process.env.LINE_CLIENT_SECRET ||
    ""
  );
}

/**
 * LINE署名検証
 */
function verifySignature(body: string, signature: string | null): boolean {
  const secret = getLineChannelSecret();
  if (!secret) return true;
  if (!signature) return false;

  const hash = crypto
    .createHmac("SHA256", secret)
    .update(body)
    .digest("base64");
  return hash === signature;
}

/**
 * LINEグループサマリー（グループ名・アイコン）を取得
 */
async function getGroupSummary(groupId: string, token: string): Promise<{ groupName: string; pictureUrl?: string } | null> {
  if (!token) return null;

  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.warn(`[LINE Webhook] Failed to get group summary (${res.status}) for ${groupId}`);
      return null;
    }

    const data = (await res.json()) as { groupName: string; pictureUrl?: string };
    return data;
  } catch (err) {
    console.error("[LINE Webhook] getGroupSummary error:", err);
    return null;
  }
}

/**
 * LINEグループに返信メッセージを送信 (replyToken使用)
 */
async function replyMessage(replyToken: string, text: string, token: string) {
  if (!token || !replyToken) return;

  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }],
      }),
    });
  } catch (err) {
    console.error("[LINE Webhook] replyMessage error:", err);
  }
}

/**
 * グループ名から全体LINEか各パートLINEかを判定（クエリパラメータがない場合のフォールバック）
 */
function detectGroupTarget(groupName: string): { type: "general" | "section"; sectionId?: string; label: string } {
  const lower = groupName.toLowerCase().replace(/\s+/g, "");

  // サックス (id: "1")
  if (
    lower.includes("サックス") ||
    lower.includes("sax") ||
    lower.includes("alto") ||
    lower.includes("tenor") ||
    lower.includes("bari")
  ) {
    return { type: "section", sectionId: "1", label: "サックスパート" };
  }

  // トランペット (id: "2")
  if (
    lower.includes("トランペット") ||
    lower.includes("trumpet") ||
    lower.includes("tp") ||
    lower.includes("ラッパ")
  ) {
    return { type: "section", sectionId: "2", label: "トランペットパート" };
  }

  // トロンボーン (id: "3")
  if (
    lower.includes("トロンボーン") ||
    lower.includes("trombone") ||
    lower.includes("tb") ||
    lower.includes("ボーン")
  ) {
    return { type: "section", sectionId: "3", label: "トロンボーンパート" };
  }

  // リズム (id: "4")
  if (
    lower.includes("リズム") ||
    lower.includes("rhythm") ||
    lower.includes("piano") ||
    lower.includes("bass") ||
    lower.includes("drums") ||
    lower.includes("guitar") ||
    lower.includes("rh")
  ) {
    return { type: "section", sectionId: "4", label: "リズムパート" };
  }

  // 全体
  return { type: "general", label: "全体LINE" };
}

/**
 * パート名マッピング
 */
const SECTION_NAMES: Record<string, string> = {
  "1": "サックスパート",
  "2": "トランペットパート",
  "3": "トロンボーンパート",
  "4": "リズムパート",
};

/**
 * POST /api/line/webhook
 * 5つの公式アカウント（全体 + 4パート）に対応したWebhook
 * クエリ例:
 *   - /api/line/webhook?target=general
 *   - /api/line/webhook?sectionId=1
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature");

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const events = payload.events || [];

    // LINE Developersの「検証」ボタン（eventsが空配列）の場合は、即座に200 OKを返して疎通成功させる
    if (events.length === 0) {
      console.log("[LINE Webhook] Console verification request received. Returning 200 OK.");
      return NextResponse.json({ success: true, message: "Webhook verified successfully" });
    }

    // 署名検証（LINE_CLIENT_SECRET_NAVI等を使用）
    const isSignatureValid = verifySignature(rawBody, signature);
    if (!isSignatureValid) {
      console.warn("[LINE Webhook] Signature verification mismatch with LINE_CLIENT_SECRET_NAVI, proceeding with event processing.");
    }

    const querySectionId = req.nextUrl.searchParams.get("sectionId");
    const queryTarget = req.nextUrl.searchParams.get("target");

    // Firestoreから現在の設定（各公式LINEのアクセストークン等）を取得
    const settingsRef = adminDb.collection("settings").doc("general");
    const docSnap = await settingsRef.get();
    const settings = docSnap.exists ? docSnap.data() || {} : {};

    for (const event of events) {
      const isJoin = event.type === "join";
      const isMemberJoined = event.type === "memberJoined";
      const isLeave = event.type === "leave";

      // --- グループ退出 (leave) イベント: グループ登録を自動抹消 ---
      if (isLeave && (event.source?.type === "group" || event.source?.groupId)) {
        const groupId = event.source.groupId;
        if (!groupId) continue;

        // 該当のパートまたは全体を特定
        let targetType: "general" | "section" = "general";
        let targetSectionId: string | undefined = undefined;
        let targetLabel = "全体LINE";

        if (querySectionId) {
          targetType = "section";
          targetSectionId = querySectionId;
          targetLabel = SECTION_NAMES[querySectionId] || `パート${querySectionId}`;
        } else if (queryTarget === "general") {
          targetType = "general";
          targetLabel = "全体LINE";
        } else {
          // クエリパラメータがない場合は、Firestore上の既存登録と groupId を照合
          if (settings.generalLineGroupId === groupId) {
            targetType = "general";
            targetLabel = "全体LINE";
          } else if (settings.sectionLineGroupIds) {
            for (const [secId, gId] of Object.entries(settings.sectionLineGroupIds)) {
              if (gId === groupId) {
                targetType = "section";
                targetSectionId = secId;
                targetLabel = SECTION_NAMES[secId] || `パート${secId}`;
                break;
              }
            }
          }
        }

        // Firestore から登録を抹消
        if (targetType === "section" && targetSectionId) {
          const sectionLineGroupIds = { ...(settings.sectionLineGroupIds || {}) };
          delete sectionLineGroupIds[targetSectionId];
          const sectionLineGroupNames = { ...(settings.sectionLineGroupNames || {}) };
          delete sectionLineGroupNames[targetSectionId];
          const sectionLineGroupJoinedAt = { ...(settings.sectionLineGroupJoinedAt || {}) };
          delete sectionLineGroupJoinedAt[targetSectionId];

          await settingsRef.set(
            {
              sectionLineGroupIds,
              sectionLineGroupNames,
              sectionLineGroupJoinedAt,
              updatedAt: Date.now(),
              updatedBy: `LINE Webhook (${targetLabel}退出・登録抹消)`,
            },
            { merge: true }
          );
        } else {
          // 全体LINE
          await settingsRef.set(
            {
              generalLineGroupId: "",
              generalLineGroupName: "",
              generalLineGroupJoinedAt: null,
              updatedAt: Date.now(),
              updatedBy: "LINE Webhook (全体LINE退出・登録抹消)",
            },
            { merge: true }
          );
        }

        console.log(`[LINE Webhook] Cleared group registration for ${groupId} (${targetLabel}) on leave event`);
        continue;
      }

      // --- グループ参加 (join / memberJoined) イベント: グループ登録を自動上書き ---
      if ((isJoin || isMemberJoined) && event.source?.type === "group") {
        const groupId = event.source.groupId;
        const joinedAt = typeof event.timestamp === "number" ? event.timestamp : Date.now();
        if (!groupId) continue;

        // ターゲット（全体 or どのパートか）を判定
        let targetType: "general" | "section" = "general";
        let targetSectionId: string | undefined = undefined;
        let targetLabel = "全体LINE";

        if (querySectionId) {
          targetType = "section";
          targetSectionId = querySectionId;
          targetLabel = SECTION_NAMES[querySectionId] || `パート${querySectionId}`;
        } else if (queryTarget === "general") {
          targetType = "general";
          targetLabel = "全体LINE";
        }

        // 該当アカウント用のアクセストークンを環境変数（.env）から取得
        let token =
          getLineAccessTokenForTarget(targetType, targetSectionId) ||
          (targetType === "section" && targetSectionId ? settings.sectionChannelAccessTokens?.[targetSectionId] : undefined) ||
          settings.generalChannelAccessToken ||
          getEnvAccessToken();

        // グループ名を取得
        let summary = await getGroupSummary(groupId, token);
        let groupName = summary?.groupName;

        // もしクエリパラメータが指定されていない場合は、グループ名からパートを自動判定
        if (!querySectionId && !queryTarget) {
          const detected = detectGroupTarget(groupName || "");
          targetType = detected.type;
          targetSectionId = detected.sectionId;
          targetLabel = detected.label;

          // 再度該当パートの環境変数トークンを取得してサマリー再試行（必要に応じて）
          if (targetType === "section" && targetSectionId && !groupName) {
            const detectedToken = getLineAccessTokenForTarget(targetType, targetSectionId);
            if (detectedToken && detectedToken !== token) {
              token = detectedToken;
              summary = await getGroupSummary(groupId, token);
              groupName = summary?.groupName;
            }
          }
        }

        const finalGroupName = groupName || `${targetLabel} グループ`;

        // Firestore を更新
        let replyText = "";
        if (targetType === "section" && targetSectionId) {
          const sectionId = targetSectionId;
          const sectionLineGroupIds = { ...(settings.sectionLineGroupIds || {}), [sectionId]: groupId };
          const sectionLineGroupNames = { ...(settings.sectionLineGroupNames || {}), [sectionId]: finalGroupName };
          const sectionLineGroupJoinedAt = { ...(settings.sectionLineGroupJoinedAt || {}), [sectionId]: joinedAt };

          await settingsRef.set(
            {
              sectionLineGroupIds,
              sectionLineGroupNames,
              sectionLineGroupJoinedAt,
              updatedAt: Date.now(),
              updatedBy: `LINE Webhook (${targetLabel}自動登録)`,
            },
            { merge: true }
          );

          replyText = formatConciergeMessage(
            `グループ『${finalGroupName}』を【${targetLabel}】としてSolu Naviに自動登録しました！\n（グループID: ${groupId}）\n\n今後このグループ宛てにパート連絡やリマインドをお届けします✨`,
            "section",
            sectionId
          );
        } else {
          // 全体LINE
          await settingsRef.set(
            {
              generalLineGroupId: groupId,
              generalLineGroupName: finalGroupName,
              generalLineGroupJoinedAt: joinedAt,
              updatedAt: Date.now(),
              updatedBy: "LINE Webhook (全体LINE自動登録)",
            },
            { merge: true }
          );

          replyText = formatConciergeMessage(
            `グループ『${finalGroupName}』を【全体LINE】としてSolu Naviに自動登録しました！\n（グループID: ${groupId}）\n\n今後このグループ宛てに出欠・活動連絡や重要なお知らせをお届けします✨`,
            "general"
          );
        }

        // グループ宛てに自動返信メッセージ送信
        if (event.replyToken && token) {
          await replyMessage(event.replyToken, replyText, token);
        }

        console.log(`[LINE Webhook] Registered ${groupId} (${finalGroupName}) as ${targetLabel}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LINE Webhook] Error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
