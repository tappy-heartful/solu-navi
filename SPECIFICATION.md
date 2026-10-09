# Solu Navi (愛媛大学軽音楽部 Sound Solition Orchestra) システム仕様書

本ドキュメントは、愛媛大学軽音楽部 Sound Solition Orchestra（愛大ソルソリ）向け活動ポータル「**Solu Navi**」の完全システム仕様書である。
先行して稼働している姉妹アプリ「Streak Navi」の堅牢なアーキテクチャ・設計思想をベースとし、愛大ソルソリの活動形態に合わせて最適化している。

---

## 1. システム全体概要

### 1.1. システム目的
愛媛大学軽音楽部 Sound Solition Orchestra の日常運営・部費/会計精算・ライブ制作・メンバー間の情報共有・出欠連絡を一元管理し、部員の負担軽減と円滑なサークル運営を実現する活動ポータルWebアプリケーション。

### 1.2. 主要技術スタック
- **フロントエンド / サーバー**: Next.js 16 (App Router, Turbopack), React 19, TypeScript (Strict)
- **スタイリング**: CSS Modules (`*.module.css`), Tailwind CSS v4, Font Awesome 6
- **BaaS / データベース**: Firebase SDK / Cloud Firestore, Firebase Storage
- **認証**: LINE Login API v2.1 + Firebase Authentication Custom Token (PWAクロスコンテキスト同期)
- **サーバー管理**: Firebase Admin SDK (Node.js)
- **AIコンシェルジュ**: Groq SDK (`groq-sdk`, Llama 3)
- **定期実行**: Google Apps Script (GAS)
- **ホスティング**: Vercel

### 1.3. ブランディング & テーマカラー
- **基調カラーコード**: `#146081`（公式ロゴのディープティールブルー）
  - `--primary: #146081`
  - `--primary-hover: #0f4a64`
  - `--primary-light: #e8f4f8`
- **ロゴ画像**: `/public/sso-logo.jpg`（Sound Solition Orchestra 公式ロゴ）
- **アクセント**: `#d97706` (Amber / 金管ブラスセクションの輝きと温かみ)
- **背景色**: `#f8fafc` (Slate 50)
- **モバイルファースト**: スマートフォンでの片手操作に最適化されたボトムバー・タッチターゲット・レスポンシブテーブル。

---

## 2. 管理者ロール・権限マトリクス (RBAC)

Solu Navi では、モジュールごとの細やかな権限分離（Role-Based Access Control）を採用している。
ユーザーコレクション（`users/{uid}`）内の各フラグによって、アクセスできる機能と操作権限が厳格に制御される。

### 2.1. 各種管理者ができることの一覧表

| 管理者ロール | 該当フラグ | できること（管理者権限） | 一般部員（権限なし時） |
| :--- | :--- | :--- | :--- |
| **特権管理者 (システム管理者)** | `isSystemAdmin` | **全機能の完全操作権限**（全モジュールの追加・編集・削除、全部員の権限付与・名簿編集・削除、システム設定、監査ログ閲覧） | - |
| **マスタ管理者** | `isMasterAdmin` | パート（セクション）マスタ・楽器マスタの新規追加・編集・削除・並び順変更・初期データシード投入 | **閲覧のみ**（一覧の閲覧は可能、編集・削除ボタンは非表示） |
| **部員名簿管理者** | `isUserAdmin` | 他メンバーの登録情報（パート、役職、楽器、略称、連絡先等）の代行編集・更新 | 自身のプロフィールの編集・登録のみ可（他メンバーは閲覧のみ） |
| **イベント管理者** | `isEventAdmin` | 練習・ライブ・イベントの新規作成・編集・削除・複製、全員の出欠/日程調整状況の集計・確認、録音リンクの代理削除 | 自身の出欠回答・日程調整回答の登録/修正/取消、録音リンクの追加、自身の録音リンク削除 |
| **曲募集管理者** | `isCallAdmin` | 選曲募集の新規作成・編集・削除・複製、全応募曲の集計確認・CSVエクスポート | 募集期間中の候補曲リクエスト応募・修正・取消 |
| **曲投票管理者** | `isVoteAdmin` | 投票（単一投票 / ボルダ得点法）の新規作成・編集・削除・複製、参考音源リンク一括編集、投票結果の集計確認 | 投票期間中の投票（順位付け / 単一選択）、投票取消 |
| **楽譜管理者** | `isScoreAdmin` | 楽譜マスタの新規登録・PDF URL更新・YouTube音源紐付け・削除 | 楽譜一覧・PDFの閲覧・ダウンロード、YouTube試聴 |
| **掲示板管理者** | `isBoardAdmin` | 全体掲示板・パート掲示板の投稿作成・編集・削除、添付ファイル管理 | 閲覧、自身の投稿の作成・編集・削除 |
| **お知らせ管理者** | `isNoticeAdmin` | 全体お知らせ（Notice）の作成・配信・ピン留め・削除 | お知らせの閲覧のみ |
| **ライブ管理者** | `isLiveAdmin` | 公演情報（Live）の作成・編集・チケット券種/上限設定、来場QR受付管理 | ライブ情報の閲覧、チケット予約 |
| **チケット管理者** | `isTicketAdmin` | チケット予約一覧の確認・承認・ステータス更新・取り消し | 自身のチケット予約・予約QRコード確認 |

※ `isSystemAdmin === true` を保持するユーザーは、上記すべての管理者権限を自動的に内包する。

---

## 3. 実装済み機能仕様

### 3.1. マスタ管理 (`/master`) 【新設】
- **目的**: ビッグバンドの編成に必要なパート（セクション）および担当楽器のマスタデータを集中管理する。
- **URL**: `/master`
- **権限制御**:
  - `isMasterAdmin === true` または `isSystemAdmin === true`: **フル編集可能**（追加、編集、削除、初期データ投入）
  - それ以外のユーザー: **閲覧のみモード**（追加・編集・削除アクションは非表示）
- **機能一覧**:
  1. **パート (セクション) マスタ**:
     - ID（例: `1`）、パート名（例: `Saxophone (サックス)`）、略称（例: `Sax`）、テーマカラー（カラーピッカー）、並び順
  2. **楽器マスタ**:
     - ID（例: `as`, `tp`）、楽器名（例: `Alto Saxophone`）、所属パート（セレクトボックス連動）、並び順
  3. **初期データ一括投入 (Seed)**:
     - 初回導入時やデータ再構築時に、標準マスタデータをワンクリックで Firestore へバッチ登録。

### 3.2. 曲募集機能 (`/call`)
- **目的**: 定期演奏会や学園祭ライブに向けた候補曲のリクエストをメンバーから募集する。
- **画面構成**:
  - 一覧: `/call` (受付中 / 終了 / 全てのフィルタ、検索)
  - 作成・編集: `/call/edit` (管理者専用: タイトル、受付期間、募集ジャンル、匿名募集可否、その他備考)
  - 詳細・回答確認: `/call/confirm?callId=xxx` (応募状況の集計、応募曲一覧、YouTubeリンク、CSVエクスポート)
  - 応募フォーム: `/call/answer?callId=xxx` (メンバーによる曲名、参考音源URL、楽譜状況、購入要否、備考の登録)

### 3.3. 曲投票機能 (`/vote`)
- **目的**: 募集された候補曲から、演奏曲を民主的かつ高精度に決定する。
- **投票方式**:
  - **単一選択投票 (`single`)**: 各項目から1曲を選択。
  - **ボルダ得点法 (`borda`)**: 最大希望順位（例: 3位まで）を指定し、順位に応じたポイント（傾斜配点 / 等差配点）でリアルタイム集計。
- **画面構成**:
  - 一覧: `/vote` (受付中 / 終了 / 全てのフィルタ、検索)
  - 作成・編集: `/vote/edit` (管理者専用: タイトル、投票方式、配点ルール、候補曲リスト)
  - 詳細・集計結果: `/vote/confirm?voteId=xxx` (順位別・得点順集計グラフ/テーブル、YouTube埋め込み再生)
  - 投票フォーム: `/vote/answer?voteId=xxx` (選択肢のワンタップ順位割り当て)
  - 音源リンク一括編集: `/vote/link-edit?voteId=xxx` (管理者専用)

### 3.4. イベント・出欠・日程調整機能 (`/event`)
- **目的**: 練習、合宿、本番、総会などの日程連絡、出欠確認、日程調整、施設アクセス、録音共有を一元管理。
- **種別**:
  - **出欠確認 (`attendance`)**: 特定日の出席・欠席・保留を回答。
  - **日程調整 (`schedule`)**: 複数の候補日に対する可否をマトリクス形式で回答。
- **画面構成**:
  - 一覧: `/event` (日付順、都道府県/市区町村バッジ、出欠ステータス)
  - 作成・編集: `/event/edit` (タイトル、日時/候補日、場所・Google Map・アクセス、施設利用時間、会場押さえ状況、セットリスト、楽器構成)
  - 詳細・確認: `/event/confirm?eventId=xxx` (出欠内訳・未回答者モーダル、日程調整マトリクス集計、録音・録画リンク追加/削除、YouTubeタイムスタンプ再生)
  - 出欠回答: `/event/attendance-answer?eventId=xxx`
  - 日程調整回答: `/event/adjust-answer?eventId=xxx`

### 3.5. ユーザー・プロフィール管理 (`/user`)
- 名簿一覧: `/user` (パート別タブフィルター、名前・略称検索、連絡先確認)
- マイプロフィール: `/user/detail` (自身の登録情報の詳細確認)
- 登録変更: `/user/edit` (氏名、ふりがな、略称、パート、役職、担当楽器、学年、電話番号、PayPay ID)

---

## 4. データモデル (Cloud Firestore)

| コレクション名 | ドキュメントID | 主なフィールド | 読み取り | 書き込み/編集 |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `uid` | `displayName`, `kana`, `abbreviation`, `sectionId`, `roleId`, `instrumentIds`, `grade`, `phoneNumber`, `paypayId`, `agreedAt`, `isSystemAdmin`, 各種 `is*Admin` | 認証済部員 | 本人 / `isUserAdmin` |
| `sections` | `id` (例: `1`) | `name`, `shortName`, `order`, `color` | 認証済部員 | `isMasterAdmin` |
| `instruments` | `id` (例: `as`) | `name`, `sectionId`, `order` | 認証済部員 | `isMasterAdmin` |
| `roles` | `id` (例: `1`) | `name`, `order`, `description` | 認証済部員 | `isMasterAdmin` |
| `events` | 自動採番 | `title`, `attendanceType`, `date`, `candidateDates`, `placeName`, `prefectureId`, `municipalityId`, `website`, `googleMap`, `access`, `rentTimeRanges`, `isVenueReserved`, `schedule`, `dress`, `bring`, `rent`, `youtubeUrl`, `youtubeTimestamps`, `setlist`, `instrumentConfig`, `acceptStartDate`, `acceptEndDate` | 認証済部員 | `isEventAdmin` |
| `eventAttendanceAnswers` | `{eventId}_{uid}` | `eventId`, `uid`, `status`, `comment` | 認証済部員 | 本人 / `isEventAdmin` |
| `eventAdjustAnswers` | `{eventId}_{uid}` | `eventId`, `uid`, `answers` (`{ [date]: statusId }`), `comment` | 認証済部員 | 本人 / `isEventAdmin` |
| `eventRecordings` | 自動採番 | `eventId`, `uid`, `title`, `url` | 認証済部員 | 本人 / `isEventAdmin` (削除) |
| `calls` | 自動採番 | `title`, `acceptStartDate`, `acceptEndDate`, `items` (募集ジャンル配列), `isAnonymous`, `other` | 認証済部員 | `isCallAdmin` |
| `callAnswers` | `{callId}_{uid}` | `callId`, `uid`, `answers` (`{ [genre]: CallAnswerSong[] }`) | 認証済部員 | 本人 / `isCallAdmin` |
| `votes` | 自動採番 | `name`, `description`, `type` (single/borda), `bordaConfig`, `items` (選択肢配列), `acceptStartDate`, `acceptEndDate` | 認証済部員 | `isVoteAdmin` |
| `voteAnswers` | `{voteId}_{uid}` | `voteId`, `uid`, `answers` | 認証済部員 | 本人 / `isVoteAdmin` |
| `scores` | 自動採番 | `title`, `abbreviation`, `scoreUrl`, `genres`, `youtubeId` | 認証済部員 | 認証済部員 |
| `logs` / `errorLogs` | 自動採番 | `uid`, `userName`, `action`, `dataId`, `status`, `errorDetail`, `createdAt` | `isSystemAdmin` | 認証済部員 |

---

## 5. 今後の拡張予定機能ロードマップ
1. **楽譜管理 (`/score`)**: 楽譜PDFのプレビュー、YouTube音源自動再生、演奏回数・タグ検索
2. **譜割り管理 (`/assign`)**: 担当楽器連動型譜割り編集、プレイリスト自動生成
3. **部費・会計清算 (`/balance`, `/expense`)**: 季節別頭割り相殺計算、PayPay送金スクリーンショット承認フロー
4. **AIコンシェルジュ (`/api/chat`)**: Groq Llama 3 超高速推論、Firestore RLS尊重 REST API連携
5. **ライブチケット管理 (`/live`, `/ticket`)**: チケット予約、入場QRコード読み取り受付
