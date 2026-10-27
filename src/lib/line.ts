import "server-only";
import crypto from "crypto";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";
const LINE_FRIENDSHIP_URL = "https://api.line.me/friendship/v1/status";

function getClientId(): string {
  return process.env.LINE_CLIENT_ID || process.env.LINE_CLIENT_ID_NAVI || "";
}

function getClientSecret(): string {
  return process.env.LINE_CLIENT_SECRET || process.env.LINE_CLIENT_SECRET_NAVI || "";
}

/**
 * 5つの公式アカウントに対応したチャンネルアクセストークン取得（環境変数から読み取り）
 * @param targetType "general" | "section"
 * @param sectionId "1"(サックス), "2"(トランペット), "3"(トロンボーン), "4"(リズム)
 */
export function getLineAccessTokenForTarget(
  targetType: "general" | "section" = "general",
  sectionId?: string
): string {
  if (targetType === "section" && sectionId) {
    if (sectionId === "1") {
      // サックス
      return (
        process.env.LINE_CHANNEL_ACCESS_TOKEN_SAX ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN_SECTION_1 ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN_GENERAL ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN ||
        process.env.LINE_INDIV_ACCESS_TOKEN ||
        ""
      );
    }
    if (sectionId === "2") {
      // トランペット
      return (
        process.env.LINE_CHANNEL_ACCESS_TOKEN_TP ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN_TRUMPET ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN_SECTION_2 ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN_GENERAL ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN ||
        process.env.LINE_INDIV_ACCESS_TOKEN ||
        ""
      );
    }
    if (sectionId === "3") {
      // トロンボーン
      return (
        process.env.LINE_CHANNEL_ACCESS_TOKEN_TB ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN_TROMBONE ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN_SECTION_3 ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN_GENERAL ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN ||
        process.env.LINE_INDIV_ACCESS_TOKEN ||
        ""
      );
    }
    if (sectionId === "4") {
      // リズム
      return (
        process.env.LINE_CHANNEL_ACCESS_TOKEN_RHYTHM ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN_SECTION_4 ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN_GENERAL ||
        process.env.LINE_CHANNEL_ACCESS_TOKEN ||
        process.env.LINE_INDIV_ACCESS_TOKEN ||
        ""
      );
    }
  }

  // 全体公式LINE
  return (
    process.env.LINE_CHANNEL_ACCESS_TOKEN_GENERAL ||
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    process.env.LINE_INDIV_ACCESS_TOKEN ||
    process.env.LINE_ACCESS_TOKEN ||
    ""
  );
}

/**
 * LINE生UIDをソルト+ペッパーでSHA-256ハッシュ化し、安全なFirebase UIDを生成
 */
export function hashLineUid(rawLineUid: string): string {
  const salt = process.env.SALT || "default_salt";
  const pepper = process.env.PEPPER || "default_pepper";
  const hash = crypto.createHash("sha256");
  hash.update(salt + rawLineUid + pepper);
  return hash.digest("hex");
}

/**
 * LINE Login 認可URLを生成
 */
export function generateLineAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: redirectUri,
    state,
    scope: "profile openid",
    bot_prompt: "aggressive", // 友だち追加を促す
  });

  return `${LINE_AUTH_URL}?${params.toString()}`;
}

/**
 * 認可コードからアクセストークンを取得
 */
export async function getLineTokens(code: string, redirectUri: string) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: getClientId(),
    client_secret: getClientSecret(),
  });

  const res = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`LINE token error (${res.status}): ${errorBody}`);
  }

  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    id_token?: string;
  }>;
}

/**
 * アクセストークンからユーザープロフィールを取得
 */
export async function getLineProfile(accessToken: string) {
  const res = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`LINE profile error (${res.status}): ${errorBody}`);
  }

  return res.json() as Promise<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  }>;
}

/**
 * 公式アカウントとの友だち関係を確認
 */
export async function checkLineFriendship(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(LINE_FRIENDSHIP_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.warn("Friendship status API non-200:", res.status);
      return true; // 判定失敗時はログインを塞がない安全フォールバック
    }

    const data = (await res.json()) as { friendFlag: boolean };
    return data.friendFlag === true;
  } catch (err) {
    console.error("checkLineFriendship error:", err);
    return true;
  }
}

/**
 * LINE Messaging API: 単一ユーザーへのプッシュメッセージ送信
 */
export async function sendLinePushMessage(
  to: string,
  messages: Array<{ type: string; text?: string; [key: string]: any }>,
  customToken?: string
) {
  const token =
    customToken ||
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    process.env.LINE_INDIV_ACCESS_TOKEN ||
    process.env.LINE_ACCESS_TOKEN;
  if (!token) {
    console.warn("LINE_CHANNEL_ACCESS_TOKEN is not set. Skipping push notification.");
    return;
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`sendLinePushMessage failed (${res.status}):`, err);
    }
  } catch (err) {
    console.error("sendLinePushMessage error:", err);
  }
}

/**
 * LINE Messaging API: 複数ユーザー（最大500件）へのマルチキャストメッセージ一括送信
 */
export async function sendLineMulticastMessage(
  toUids: string[],
  messages: Array<{ type: string; text?: string; [key: string]: any }>,
  customToken?: string
): Promise<{ successCount: number; failCount: number }> {
  const token =
    customToken ||
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    process.env.LINE_INDIV_ACCESS_TOKEN ||
    process.env.LINE_ACCESS_TOKEN;
  if (!token || toUids.length === 0) {
    console.warn("LINE token not set or toUids is empty. Skipping multicast.");
    return { successCount: 0, failCount: toUids.length };
  }

  // 500件ごとにchunk分割
  const chunkSize = 500;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toUids.length; i += chunkSize) {
    const chunk = toUids.slice(i, i + chunkSize);
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/multicast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: chunk, messages }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`sendLineMulticastMessage failed (${res.status}):`, err);
        failCount += chunk.length;
      } else {
        successCount += chunk.length;
      }
    } catch (err) {
      console.error("sendLineMulticastMessage error:", err);
      failCount += chunk.length;
    }
  }

  return { successCount, failCount };
}

