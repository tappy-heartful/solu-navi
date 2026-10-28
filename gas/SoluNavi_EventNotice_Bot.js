/**
 * ==============================================================================
 * SOLU NAVI 運用スクリプト (SoluNavi_EventNotice_Bot.js)
 * ==============================================================================
 * 
 * 【概要】
 * 愛媛大学軽音楽部 Sound Solution Orchestra (Solu Navi) 向け定期実行Botです。
 * 1日1回トリガーで自動実行され、Solu Navi の定期通知API（/api/cron/event-notice）を安全に呼び出します。
 * アプリ設定画面（/settings）で指定された曜日（N曜日）になると、全体LINEグループへ
 * 向こうM日分のイベント予定および出欠回答のお願いを一括送信します。
 * 
 * 【特徴】
 * ・外部ライブラリ（FirestoreApp等）の追加は不要です（GAS標準機能のみで動作）。
 * ・Firebase秘密鍵をGAS側に置く必要がなく、最高水準のセキュリティと最も簡単な導入を実現。
 * ・「送信する曜日（N曜日）」および「向こう何日分（M日分）」は、Solu Naviアプリ設定
 * 　（/settings）からいつでもブラウザ上で自由に変更・調整できます。
 * ・出欠確認イベント、日程調整イベントに加え、「予定のみ（回答不要）」イベントにも完全対応。
 * ・1日1回動かす関数は【 execDailyNotification 】の1つのみです。
 * 
 * ------------------------------------------------------------------------------
 * 【設定するトリガー（1つのみ）】
 * 1. execDailyNotification : 【日ベースのタイマー】毎朝 8:00〜9:00 または 9:00〜10:00
 * 
 * 【スクリプトプロパティ（PropertiesService）の設定項目】
 * GAS画面左メニューの歯車アイコン「プロジェクトの設定」→「スクリプト プロパティ」で登録します：
 * - BASE_URL    : Solu Navi の公開URL (例: https://solu-navi.vercel.app)
 * - CRON_SECRET : APIエンドポイント保護用の認証シークレットトークン（Vercelの環境変数と同一）
 * ==============================================================================
 */

// ==========================================
// 共通定数・スクリプトプロパティの取得
// ==========================================
const props = PropertiesService.getScriptProperties();
const BASE_URL = props.getProperty('BASE_URL') || "https://solu-navi.vercel.app";
const CRON_SECRET = props.getProperty('CRON_SECRET') || "";


// ==============================================================================
// 【メイン関数】1日1回実行する関数 (トリガーに設定する関数)
// ==============================================================================
/**
 * 毎朝定期実行するメイン関数
 * トリガー: 日ベースのタイマー（午前8:00〜9:00 または 午前9:00〜10:00）
 */
function execDailyNotification() {
  Logger.log('========== [Solu Navi] 日次イベント予告・出欠催促通知 開始 ==========');
  try {
    callEventNoticeApi(false);
    Logger.log('========== [Solu Navi] 日次イベント予告・出欠催促通知 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ 実行エラー: ' + err.toString());
  }
}

/**
 * ==============================================================================
 * 【テスト用関数】曜日チェックをスキップして即時送信テストを行う関数
 * ==============================================================================
 * GASエディタ上部の関数ドロップダウンから本関数を選んで「実行」すると、
 * 曜日判定をスキップして今すぐ全体LINEへ送信テストができます。
 */
function testExecution() {
  Logger.log('========== [Solu Navi] テスト実行（曜日判定スキップ） 開始 ==========');
  try {
    callEventNoticeApi(true);
    Logger.log('========== [Solu Navi] テスト実行 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ テスト実行エラー: ' + err.toString());
  }
}


// ==============================================================================
// Solu Navi 定期通知 API 呼び出し処理
// ==============================================================================
/**
 * Solu Navi サーバーAPIを安全に呼び出す処理 (POST 送信)
 * @param {boolean} isForce - 曜日判定をスキップするかどうか
 */
function callEventNoticeApi(isForce) {
  const cleanBaseUrl = BASE_URL.replace(/\/$/, "");
  const url = cleanBaseUrl + "/api/cron/event-notice" + (isForce ? "?force=true" : "");
  Logger.log("APIエンドポイントを呼び出します: " + url);

  const headers = {
    "User-Agent": "SoluNavi-GAS-Bot/1.0",
    "Content-Type": "application/json",
  };
  if (CRON_SECRET) {
    headers["Authorization"] = "Bearer " + CRON_SECRET;
    headers["x-cron-secret"] = CRON_SECRET;
  }

  const options = {
    method: "POST",
    muteHttpExceptions: true,
    headers: headers,
    payload: JSON.stringify({ isForce: isForce, timestamp: new Date().toISOString() }),
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  Logger.log("HTTPステータスコード: " + statusCode);
  Logger.log("レスポンス内容: " + responseText);

  if (statusCode >= 200 && statusCode < 300) {
    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { message: responseText };
    }

    if (result.sent) {
      Logger.log("✅ 全体LINEへのイベント予告通知が正常に送信されました！（対象: " + (result.eventCount || 0) + "件）");
    } else {
      Logger.log("ℹ️ " + (result.message || "送信スキップまたは対象なし"));
    }
  } else {
    throw new Error("API呼び出しに失敗しました (HTTP " + statusCode + "): " + responseText);
  }
}
