/**
 * ==============================================================================
 * Solu Navi イベント予告＆出欠催促 LINE自動通知 BOT (Google Apps Script)
 * ==============================================================================
 * 
 * 【概要】
 * 愛媛大学軽音楽部 Sound Solution Orchestra (Solu Navi) 向け定期実行Botです。
 * 1日1回トリガーで自動実行され、アプリ設定で指定された曜日（N曜日）になると、
 * 全体LINEグループへ向こうM日分のイベント予定および出欠回答のお願いを一括送信します。
 * 
 * 【特徴】
 * ・「送信する曜日（N曜日）」および「向こう何日分（M日分）」は、Solu Naviアプリ設定
 * 　（/settings）からいつでもブラウザ上で自由に変更・調整できます。
 * ・出欠確認イベント、日程調整イベントに加え、「予定のみ（回答不要）」イベントにも
 * 　完全対応しています。
 * ・1日1回動かす関数は【 execDailyNotification 】の1つのみです。
 * 
 * 【GASのトリガー設定手順】
 * 1. 本コードを Google Apps Script (https://script.google.com/) の新規プロジェクトに貼り付けます。
 * 2. 画面左側の時計アイコン「トリガー」をクリックします。
 * 3. 右下の「トリガーを追加」ボタンをクリックします。
 *    - 実行する関数: 【 execDailyNotification 】
 *    - イベントのソース: 【 時間主導型 】
 *    - タイプ: 【 日ベースのタイマー 】
 *    - 時間帯: 【 午前 8 時〜9 時 】（またはお好みの時間）
 * 4. 保存をクリックします（初回はGoogleアカウントのアクセス承認を行ってください）。
 * 
 * 【テスト実行方法】
 * GASエディタ上部の関数選択ドロップダウンから【 testExecution 】を選んで「実行」を
 * 押すと、曜日チェックをスキップして今すぐ全体LINEグループへの送信テストが行えます。
 * ==============================================================================
 */

// ==============================================================================
// 1. 設定項目 (環境に合わせて設定してください)
// ==============================================================================
var CONFIG = {
  // Solu Navi の公開URL
  APP_URL: "https://solu-navi.vercel.app",

  // 連携モード:
  // "API"       : Solu Navi のサーバーAPIを呼び出して送信する推奨モード（設定が1番簡単で確実です）
  // "FIRESTORE" : GASから直接FirestoreとLINE Messaging APIに接続して送信するモード
  MODE: "API",

  // [MODE === "FIRESTORE" の場合のみ使用]
  // Firebase サービスアカウント秘密鍵 (SETUP_GUIDE.md または .env.local 参照)
  FIREBASE_PROJECT_ID: "solu-navi-prod",
  FIREBASE_CLIENT_EMAIL: "",
  FIREBASE_PRIVATE_KEY: "",

  // [MODE === "FIRESTORE" の場合のみ使用]
  // LINE Messaging API チャネルアクセストークン (全体公式LINE用)
  LINE_CHANNEL_ACCESS_TOKEN: "",

  // タイムゾーン
  TIMEZONE: "Asia/Tokyo",
};

// 曜日名称マッピング
var WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * ==============================================================================
 * 【メイン関数】1日1回実行する関数 (トリガーに設定する関数)
 * ==============================================================================
 */
function execDailyNotification() {
  console.log("=== [Solu Navi] 日次イベント予告・出欠催促通知処理 開始 ===");
  try {
    if (CONFIG.MODE === "API") {
      runViaApi(false);
    } else {
      runViaFirestore(false);
    }
    console.log("=== [Solu Navi] 日次イベント予告・出欠催促通知処理 正常終了 ===");
  } catch (err) {
    console.error("❌ [Solu Navi] 実行中にエラーが発生しました:", err);
  }
}

/**
 * ==============================================================================
 * 【テスト用関数】曜日チェックをスキップして即時送信テストを行う関数
 * ==============================================================================
 */
function testExecution() {
  console.log("=== [Solu Navi] テスト実行（曜日判定スキップ） 開始 ===");
  try {
    if (CONFIG.MODE === "API") {
      runViaApi(true);
    } else {
      runViaFirestore(true);
    }
    console.log("=== [Solu Navi] テスト実行 正常終了 ===");
  } catch (err) {
    console.error("❌ [Solu Navi] テスト実行エラー:", err);
  }
}

// ==============================================================================
// 方式 1: Solu Navi API 経由での実行 (推奨・最も簡単でメンテフリー)
// ==============================================================================
function runViaApi(isForce) {
  var url = CONFIG.APP_URL + "/api/cron/event-notice" + (isForce ? "?force=true" : "");
  console.log("APIエンドポイントを呼び出します: " + url);

  var options = {
    method: "GET",
    muteHttpExceptions: true,
    headers: {
      "User-Agent": "SoluNavi-GAS-Bot/1.0",
    },
  };

  var response = UrlFetchApp.fetch(url, options);
  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();

  console.log("HTTPステータスコード: " + statusCode);
  console.log("レスポンス内容: " + responseText);

  if (statusCode >= 200 && statusCode < 300) {
    var result = JSON.parse(responseText);
    if (result.sent) {
      console.log("✅ 全体LINEへのイベント予告通知が正常に送信されました！（対象: " + result.eventCount + "件）");
    } else {
      console.log("ℹ️ " + result.message);
    }
  } else {
    throw new Error("API呼び出しに失敗しました (ステータス: " + statusCode + "): " + responseText);
  }
}

// ==============================================================================
// 方式 2: GAS 単体・Firestore 直接接続での実行
// ==============================================================================
function runViaFirestore(isForce) {
  console.log("Firestore直接接続モードで実行します。");

  // 1. Google OAuth2 アクセストークン取得 (JWT署名)
  var token = getGoogleOAuth2Token();

  // 2. settings/general からアプリ設定を取得
  var settingsUrl = "https://firestore.googleapis.com/v1/projects/" + CONFIG.FIREBASE_PROJECT_ID + "/databases/(default)/documents/settings/general";
  var settingsRes = UrlFetchApp.fetch(settingsUrl, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true,
  });

  if (settingsRes.getResponseCode() !== 200) {
    throw new Error("settings/general の取得に失敗しました: " + settingsRes.getContentText());
  }

  var settingsData = parseFirestoreFields(JSON.parse(settingsRes.getContentText()).fields || {});

  // 通知有効チェック
  var enableNotice = settingsData.enableEventNotice !== false;
  if (!enableNotice && !isForce) {
    console.log("ℹ️ イベント予告通知はアプリ設定で無効化されています。スキップします。");
    return;
  }

  var generalGroupId = settingsData.generalLineGroupId;
  if (!generalGroupId) {
    throw new Error("全体LINEグループIDが設定されていません。アプリ設定画面でLINEグループを登録してください。");
  }

  // 3. 曜日チェック (JST)
  var now = new Date();
  var todayDayOfWeek = now.getDay(); // 0:日, 1:月, ...
  var allowedDays = Array.isArray(settingsData.eventNoticeDaysOfWeek)
    ? settingsData.eventNoticeDaysOfWeek
    : [1]; // デフォルト: 月曜日

  if (!isForce && allowedDays.indexOf(todayDayOfWeek) === -1) {
    var allowedNames = allowedDays.map(function(d) { return WEEKDAY_NAMES[d]; }).join(", ");
    console.log("ℹ️ 本日は送信対象曜日ではありません（送信設定: [" + allowedNames + "], 本日: " + WEEKDAY_NAMES[todayDayOfWeek] + "曜日）。スキップします。");
    return;
  }

  // 4. 対象期間の計算 (向こうM日分)
  var targetDays = Number(settingsData.eventNoticeTargetDays) || 7;
  var todayStr = Utilities.formatDate(now, CONFIG.TIMEZONE, "yyyy.MM.dd");
  var limitDate = new Date(now.getTime() + targetDays * 24 * 60 * 60 * 1000);
  var limitStr = Utilities.formatDate(limitDate, CONFIG.TIMEZONE, "yyyy.MM.dd");

  console.log("対象期間: " + todayStr + " 〜 " + limitStr + " （向こう" + targetDays + "日分）");

  // 5. events コレクションからイベントを取得
  var eventsUrl = "https://firestore.googleapis.com/v1/projects/" + CONFIG.FIREBASE_PROJECT_ID + "/databases/(default)/documents/events?pageSize=300";
  var eventsRes = UrlFetchApp.fetch(eventsUrl, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true,
  });

  if (eventsRes.getResponseCode() !== 200) {
    throw new Error("events コレクションの取得に失敗しました: " + eventsRes.getContentText());
  }

  var eventsDocs = JSON.parse(eventsRes.getContentText()).documents || [];
  var targetEvents = [];

  eventsDocs.forEach(function(doc) {
    var rawFields = doc.fields || {};
    var ev = parseFirestoreFields(rawFields);
    var docId = doc.name.split("/").pop();
    ev.id = docId;

    var attType = ev.attendanceType || "attendance";
    var isInRange = false;
    var primaryDate = "";

    if (attType === "schedule") {
      var cDates = Array.isArray(ev.candidateDates) ? ev.candidateDates : [];
      var matches = cDates.filter(function(d) { return d >= todayStr && d <= limitStr; });
      if (matches.length > 0) {
        isInRange = true;
        primaryDate = matches[0];
      }
    } else {
      var d = ev.date || ev.startDate || "";
      if (d >= todayStr && d <= limitStr) {
        isInRange = true;
        primaryDate = d;
      }
    }

    if (isInRange) {
      ev.primaryDate = primaryDate;
      targetEvents.push(ev);
    }
  });

  // 日付順にソート
  targetEvents.sort(function(a, b) {
    return (a.primaryDate || "").localeCompare(b.primaryDate || "");
  });

  if (targetEvents.length === 0) {
    console.log("ℹ️ 対象期間内のイベントはありませんでした（送信スキップ）。");
    return;
  }

  // 6. LINE送信メッセージの構築 (規約20「Solu Naviコンシェルジュ」準拠)
  var msg = "【Solu Naviコンシェルジュ（全体用）】\n";
  msg += "向こう" + targetDays + "日間のイベント予告とお知らせです🎷\n";
  msg += "内容をご確認の上、期日までの出欠回答にご協力をお願いします✨\n";

  targetEvents.forEach(function(ev) {
    var attType = ev.attendanceType || "attendance";
    msg += "\n━━━━━━━━━━━━━━━\n";

    if (attType === "schedule") {
      var cDatesStr = (ev.candidateDates || []).join(", ");
      msg += "📌【日程調整】" + ev.title + "\n";
      msg += "📅 候補日程: " + (cDatesStr || "未定") + "\n";
      if (ev.placeName) msg += "📍 場所: " + ev.placeName + "\n";
      if (ev.acceptEndDate) msg += "⏳ 回答締切: " + ev.acceptEndDate + "\n";
      msg += "👉 日程調整の回答はこちら:\n" + CONFIG.APP_URL + "/event/confirm?eventId=" + ev.id + "\n";
    } else if (attType === "none") {
      msg += "📌【予定のみ】" + ev.title + "\n";
      msg += "📅 日時: " + (ev.date || ev.startDate || "未定");
      if (ev.startTime) msg += " " + ev.startTime + "〜" + (ev.endTime || "");
      msg += "\n";
      if (ev.placeName) msg += "📍 場所: " + ev.placeName + "\n";
      msg += "※このイベントは出欠・日程調整の回答不要です\n";
      msg += "👉 詳細確認はこちら:\n" + CONFIG.APP_URL + "/event/confirm?eventId=" + ev.id + "\n";
    } else {
      msg += "📌【出欠確認】" + ev.title + "\n";
      msg += "📅 日時: " + (ev.date || ev.startDate || "未定");
      if (ev.startTime) msg += " " + ev.startTime + "〜" + (ev.endTime || "");
      msg += "\n";
      if (ev.placeName) msg += "📍 場所: " + ev.placeName + "\n";
      if (ev.acceptEndDate) msg += "⏳ 出欠締切: " + ev.acceptEndDate + "\n";
      msg += "👉 出欠回答はこちら:\n" + CONFIG.APP_URL + "/event/confirm?eventId=" + ev.id + "\n";
    }
  });

  msg += "\n▼ Solu Navi ホーム画面はこちら\n" + CONFIG.APP_URL + "/";

  // 7. LINE Messaging API (Push) 送信
  var lineToken = settingsData.generalChannelAccessToken || CONFIG.LINE_CHANNEL_ACCESS_TOKEN;
  if (!lineToken) {
    throw new Error("LINE公式アカウントのチャネルアクセストークンが設定されていません。");
  }

  var pushPayload = {
    to: generalGroupId,
    messages: [{ type: "text", text: msg }],
  };

  var lineRes = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + lineToken,
    },
    payload: JSON.stringify(pushPayload),
    muteHttpExceptions: true,
  });

  if (lineRes.getResponseCode() === 200) {
    console.log("✅ 全体LINEグループへ " + targetEvents.length + " 件のイベント予告通知を直接送信しました！");
  } else {
    throw new Error("LINEへのメッセージ送信に失敗しました: " + lineRes.getContentText());
  }
}

// ==============================================================================
// 内部補助ユーティリティ (JWTトークン生成 & Firestoreフィールド展開)
// ==============================================================================
function getGoogleOAuth2Token() {
  if (!CONFIG.FIREBASE_CLIENT_EMAIL || !CONFIG.FIREBASE_PRIVATE_KEY) {
    throw new Error("FIREBASE_CLIENT_EMAIL または FIREBASE_PRIVATE_KEY が未設定です。");
  }

  var header = { alg: "RS256", typ: "JWT" };
  var now = Math.floor(Date.now() / 1000);
  var claim = {
    iss: CONFIG.FIREBASE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  var encodedHeader = Utilities.base64EncodeWebSafe(JSON.stringify(header));
  var encodedClaim = Utilities.base64EncodeWebSafe(JSON.stringify(claim));
  var signatureInput = encodedHeader + "." + encodedClaim;

  var formattedKey = CONFIG.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  var signature = Utilities.computeRsaSha256Signature(signatureInput, formattedKey);
  var encodedSignature = Utilities.base64EncodeWebSafe(signature);
  var jwt = signatureInput + "." + encodedSignature;

  var res = UrlFetchApp.fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    payload: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + jwt,
    muteHttpExceptions: true,
  });

  if (res.getResponseCode() !== 200) {
    throw new Error("Google OAuth2 トークンの取得に失敗しました: " + res.getContentText());
  }

  return JSON.parse(res.getContentText()).access_token;
}

function parseFirestoreFields(fields) {
  var obj = {};
  for (var key in fields) {
    var valObj = fields[key];
    if (valObj.stringValue !== undefined) obj[key] = valObj.stringValue;
    else if (valObj.integerValue !== undefined) obj[key] = parseInt(valObj.integerValue, 10);
    else if (valObj.doubleValue !== undefined) obj[key] = parseFloat(valObj.doubleValue);
    else if (valObj.booleanValue !== undefined) obj[key] = valObj.booleanValue;
    else if (valObj.arrayValue !== undefined) {
      obj[key] = (valObj.arrayValue.values || []).map(function(item) {
        if (item.stringValue !== undefined) return item.stringValue;
        if (item.integerValue !== undefined) return parseInt(item.integerValue, 10);
        return item;
      });
    } else if (valObj.mapValue !== undefined) {
      obj[key] = parseFirestoreFields(valObj.mapValue.fields || {});
    }
  }
  return obj;
}
