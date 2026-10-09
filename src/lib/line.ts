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
