/**
 * ==============================================================================
 * SOLU NAVI 運用スクリプト (SoluNavi_EventNotice_Bot.js)
 * ==============================================================================
 * 
 * 【概要】
 * 愛媛大学軽音楽部 Sound Solution Orchestra (Solu Navi) 向け定期実行Botです。
 * トリガーで自動実行され、Solu Navi の定期通知API群を安全に呼び出します。
 * 
 * 【主な機能】
 * 1. イベント予告・出欠回答案内 (全体LINEグループ):
 *    - アプリ設定画面（/settings）で指定された曜日（N曜日）になると、全体LINEグループへ
 *      向こうM日分のイベント予定および出欠回答のお願いを一括送信します。
 * 2. 部費・集金 未払い催促通知 (個人宛てLINE):
 *    - 集金の支払期日のN日前になると、未納部員の個人LINEアカウントへ
 *      Solu Naviコンシェルジュから催促メッセージを自動送信します。
 *    - 「N日前（催促日数）」および有効/無効はアプリ設定画面（/settings）でいつでも変更可能。
 * 3. パート別イベント直前リマインド通知 (各パートLINEグループ):
 *    - イベント開始のN分前（デフォルト: 30分前）になると、各パートのLINEグループへ
 *      イベント概要およびパートメンバーの出欠状況一覧（出席・遅刻・欠席・未回答）を送信します。
 *    - 「N分前」や有効/無効はアプリ設定画面（/settings）でいつでも変更可能。
 * 
 * 【特徴】
 * ・外部ライブラリ（FirestoreApp等）の追加は不要です（GAS標準機能のみで動作）。
 * ・Firebase秘密鍵をGAS側に置く必要がなく、最高水準のセキュリティと最も簡単な導入を実現。
 * ・すべての条件（曜日・対象日数・催促日数N・イベントN分前等）はSolu Naviブラウザ上の
 * 　アプリ設定（/settings）からいつでも調整できます。
 * 
 * ------------------------------------------------------------------------------
 * 【設定するトリガー】
 * 1. execDailyNotification   : 【日ベースのタイマー】毎朝 8:00〜9:00 または 9:00〜10:00
 *    （全体LINEへのイベント予告 ＋ 個人宛て未払い集金催促）
 * 2. execSectionEventRemind  : 【分ベースのタイマー】10分おき または 15分おき
 *    （パートLINEへのイベント直前リマインド ＆ 出欠状況通知）
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
// 【定期実行関数】トリガーに設定する関数群
// ==============================================================================

/**
 * 毎朝定期実行するメイン日次統合関数
 * 推奨トリガー: 日ベースのタイマー（午前8:00〜9:00 または 午前9:00〜10:00）
 * イベント予告（全体LINE）と集金未払い催促（個人LINE）を順番に安全実行します。
 */
function execDailyNotification() {
  Logger.log('========== [Solu Navi] 日次定期通知バッチ処理 開始 ==========');
  
  // 1. イベント予告・出欠案内 (全体LINE)
  try {
    Logger.log('--- 1. イベント予告・出欠案内処理 ---');
    callEventNoticeApi(false);
  } catch (err) {
    Logger.log('❌ イベント予告実行エラー: ' + err.toString());
  }

  // 2. 部費・集金 未払い催促 (個人LINE)
  try {
    Logger.log('--- 2. 部費・集金 未払い催促処理 ---');
    callFeeRemindApi(false);
  } catch (err) {
    Logger.log('❌ 集金未払い催促実行エラー: ' + err.toString());
  }

  Logger.log('========== [Solu Navi] 日次定期通知バッチ処理 終了 ==========');
}

/**
 * パート別イベント直前リマインド定期実行関数
 * 推奨トリガー: 分ベースのタイマー（10分おき または 15分おき）
 * イベント開始N分前のパートLINE通知（出欠状況付き）を実行します。
 */
function execSectionEventRemind() {
  Logger.log('========== [Solu Navi] パート別イベント直前リマインド 定期実行 開始 ==========');
  try {
    callSectionEventRemindApi(false);
    Logger.log('========== [Solu Navi] パート別イベント直前リマインド 定期実行 終了 ==========');
  } catch (err) {
    Logger.log('❌ 実行エラー: ' + err.toString());
  }
}

/**
 * イベント予告のみを個別実行したい場合の関数
 */
function execEventNotice() {
  Logger.log('========== [Solu Navi] イベント予告 単独実行 開始 ==========');
  try {
    callEventNoticeApi(false);
    Logger.log('========== [Solu Navi] イベント予告 単独実行 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ 実行エラー: ' + err.toString());
  }
}

/**
 * 集金未払い催促のみを個別実行したい場合の関数
 */
function execFeeRemind() {
  Logger.log('========== [Solu Navi] 集金未払い催促 単独実行 開始 ==========');
  try {
    callFeeRemindApi(false);
    Logger.log('========== [Solu Navi] 集金未払い催促 単独実行 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ 実行エラー: ' + err.toString());
  }
}


// ==============================================================================
// 【テスト用関数】条件をスキップして即時送信テストを行う関数群
// ==============================================================================

/**
 * イベント予告のテスト実行（曜日判定スキップ）
 */
function testEventNoticeExecution() {
  Logger.log('========== [Solu Navi] イベント予告 テスト実行 開始 ==========');
  try {
    callEventNoticeApi(true);
    Logger.log('========== [Solu Navi] イベント予告 テスト実行 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ テスト実行エラー: ' + err.toString());
  }
}

// 旧互換用エイリアス
function testExecution() {
  testEventNoticeExecution();
}

/**
 * 部費・集金未払い催促のテスト実行（期限条件スキップ）
 */
function testFeeRemindExecution() {
  Logger.log('========== [Solu Navi] 集金未払い催促 テスト実行 開始 ==========');
  try {
    callFeeRemindApi(true);
    Logger.log('========== [Solu Navi] 集金未払い催促 テスト実行 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ テスト実行エラー: ' + err.toString());
  }
}

/**
 * パート別イベント直前リマインドのテスト実行（日時条件スキップ）
 */
function testSectionEventRemindExecution() {
  Logger.log('========== [Solu Navi] パート別イベント直前リマインド テスト実行 開始 ==========');
  try {
    callSectionEventRemindApi(true);
    Logger.log('========== [Solu Navi] パート別イベント直前リマインド テスト実行 正常終了 ==========');
  } catch (err) {
    Logger.log('❌ テスト実行エラー: ' + err.toString());
  }
}


// ==============================================================================
// Solu Navi 定期通知 API 呼び出し処理
// ==============================================================================

/**
 * イベント予告 API 呼び出し (/api/cron/event-notice)
 * @param {boolean} isForce - 曜日判定をスキップするかどうか
 */
function callEventNoticeApi(isForce) {
  const cleanBaseUrl = BASE_URL.replace(/\/$/, "");
  const url = cleanBaseUrl + "/api/cron/event-notice" + (isForce ? "?force=true" : "");
  Logger.log("APIエンドポイントを呼び出します: " + url);

  const headers = {
    "User-Agent": "SoluNavi-GAS-Bot/2.0",
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

/**
 * 集金未払い催促 API 呼び出し (/api/cron/fee-remind)
 * @param {boolean} isForce - 期限日判定をスキップしてテスト送信するかどうか
 */
function callFeeRemindApi(isForce) {
  const cleanBaseUrl = BASE_URL.replace(/\/$/, "");
  const url = cleanBaseUrl + "/api/cron/fee-remind" + (isForce ? "?force=true" : "");
  Logger.log("APIエンドポイントを呼び出します: " + url);

  const headers = {
    "User-Agent": "SoluNavi-GAS-Bot/2.0",
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

    if (result.success) {
      Logger.log("✅ 未払い集金催促処理が正常に完了しました！（送信件数: " + (result.count || 0) + "名）");
    } else {
      Logger.log("ℹ️ " + (result.message || "送信スキップまたはエラー"));
    }
  } else {
    throw new Error("API呼び出しに失敗しました (HTTP " + statusCode + "): " + responseText);
  }
}

/**
 * パート別イベント直前リマインド API 呼び出し (/api/cron/section-event-remind)
 * @param {boolean} isForce - 開始時刻判定をスキップしてテスト送信するかどうか
 */
function callSectionEventRemindApi(isForce) {
  const cleanBaseUrl = BASE_URL.replace(/\/$/, "");
  const url = cleanBaseUrl + "/api/cron/section-event-remind" + (isForce ? "?force=true" : "");
  Logger.log("APIエンドポイントを呼び出します: " + url);

  const headers = {
    "User-Agent": "SoluNavi-GAS-Bot/2.0",
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

    if (result.success) {
      Logger.log("✅ パート別イベント直前リマインド処理が正常に完了しました！（送信件数: " + (result.sentCount || 0) + "件）");
    } else {
      Logger.log("ℹ️ " + (result.message || "送信スキップまたはエラー"));
    }
  } else {
    throw new Error("API呼び出しに失敗しました (HTTP " + statusCode + "): " + responseText);
  }
}
