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
- **モバイルファースト**: スマートフォンでの片手操作に最適化されたヘッダー・タッチターゲット・レスポンシブテーブル（ボトムフッターバーは廃止しコンテンツ領域を最大化）。
- **フォーム項目バッジ仕様 (`FormField` & `AppInput`)**:
  - 各入力項目のラベル右側に表示するバッジ（赤色の「必須」、グレーの「任意」）は、1項目につき必ず1つのみ表示される設計を厳格に保持。
  - `AppInput` は `label` プロパティが渡された場合のみ自身で `FormField` をラップし、親側で `<FormField label="...">` が明示されている場合は純粋な input / textarea のみをレンダリングすることで、バッジの二重重複（「必須」と「任意」の同時表示）を完全に防止。
  - 空のラベルや不要な `labelWrapper` の出力を防止する防衛的実装を `FormField` に適用。
- **入力要素の白背景・デザイン統一 (`input`, `textarea`, `select`)**:
  - CSSリセットによる背景透過を防ぐため、`globals.css` および各画面の CSS Modules において `textarea` を含む全フォーム要素の背景色を常に白（`background-color: #ffffff`）で統一。
  - 枠線（`border: 1.5px solid #94a3b8`）、角丸（`border-radius: 0.5rem`）、薄いシャドウ、フォーカス時のプライマリカラー発光を全フォーム要素で調和させて視認性を最大化。
- **ヘッダー一重化規約**:
  - `EditFormLayout` や `ConfirmLayout` などの内部で `BaseLayout` を呼び出すレイアウトコンポーネントを使用する画面では、親側でさらに `BaseLayout` を重複して囲わない（ヘッダー二重化の防止）。
- **前の画面に戻るボタン (`BackNavigation`)**:
  - 画面最下部に「フッター」という呼称ではなく独立したページナビゲーション（戻るボタン）として中央配置（`margin: 36px auto 56px auto`）。
  - 姉妹アプリ「streak-navi」と同一のデザイン構造およびアニメーション（`arrowPulse`）を踏襲し、Solu Naviのプライマリカラー（`#146081`、太さ2px枠線、ホバー時背景 `#e8f4f8`）を適用した押しやすい大きめのボタンスタイルを採用。
  - 全機能（曲募集、曲投票、イベント出欠、部員名簿、マスタ管理等）の編集・確認・一覧・回答画面に横展開して統一。

### 1.4. ログイン画面 (`/login`)
- **レイアウト**: ビューポート全体（`min-height: 100dvh` / `width: 100vw`）に対して、ディープティールグラデーション背景の中央に白いログインカードを上下左右完全中央（`display: flex; margin: auto;`）に配置。
- **モバイル & PC 最適化**: スマートフォンでは画面幅に応じた余白（パディング）を確保し、PC・大画面ディスプレイでも確実に左右・上下の中央に美しく収まるカード型デザイン。
- **認証連携**: LINE Login API v2.1 連携ボタン（部員向け公式LINE友だち追加必須案内）および開発・テスト用ログイン（管理者 / 一般部員）トグルを提供。

### 1.5. コールバック (`/callback`) & 利用規約 (`/agreement`) 画面
- **レイアウト**: ログイン画面と同様にビューポート全体（`min-height: 100dvh` / `width: 100vw`）を基準とし、カードコンポーネントを上下左右完全中央（`display: flex; margin: auto;`）に安定配置。
- **コールバック画面**: LINEログイン認証結果の待機スピナー表示および認証エラー時のメッセージと復帰ボタンを提供。
- **利用規約画面**: 最大幅 36rem のカード内に規約条項（スクロール領域）と同意チェックボックス、送信ボタンを配置し、初回ログイン時に強制表示。
- **規約条項の実態即応**: 氏名や電話番号、決済情報（PayPay等）の過度な個人情報は扱わず、譜割り用「略称（2文字以内）」と「入学年度（回生）」、LINE表示名によるプライバシー重視の部員情報管理、および出欠確認・日程調整・選曲募集・選曲投票等の実際の利用目的に合致した条項で構成。AGENTS.mdのルールに従い、実装修正と常に同期・維持される。

### 1.6. 共通フィードバックUI (`CommonDialog` & `Spinner`)
- **グローバルマウント (`ClientLayout`)**: `BaseLayout` だけでなく未ログイン・スタンドアロン画面（`/login`, `/callback`, `/agreement` 等）を含む全画面で確実に機能するよう、ルートクライアントシェル（`ClientLayout.tsx`）に一元配置。
- **共通ダイアログ (`CommonDialog`)**: 全画面完全中央配置（`display: flex; margin: auto;`）のカードモーダル。`type`（`success`, `warning`, `danger`, `info`）に応じた円形カラーバッジと Font Awesome アイコンを表示し、視認性と操作性を大幅に向上。
- **音楽特化スピナー (`Spinner`)**: ビューポート中央にサックスアニメーションとバンドメッセージを表示。Tailwind CSSユーティリティとのクラス名干渉を完全に防止。

### 1.7. ホーム画面 (`/`) & PWA ホーム画面追加案内
- **ウェルカムカード**:
  - Sound Solition Orchestra 公式ロゴ（`/public/sso-logo.jpg`）を表示。ヘッダー右側にユーザー自身のLINEアバター画像（`UserAvatar`）を表示。
  - 表示名は略称ではなく、通常画面（ホーム、部員名簿、ヘッダー、詳細確認等）では常に LINE の表示名（`displayName`）を使用（※略称は譜割り専用のため通常画面では非表示・2文字以内制限）。
  - 役職バッジ（👑バンマス、🎼コンマス、✨パートリーダー、🎵メンバー、🎉ゲスト）、パートバッジ、回生バッジ（毎年4月1日 JST 00:00:00 に自動進級切り替え）、担当楽器を表示。
- **PWA ホーム画面アイコン追加ヒントカード (`PwaInstallHint`)**:
  - **専門用語の平易化**: 「PWA」という単語を使わず、「スマホのホーム画面にアイコンを追加しよう！」「アプリのようにワンタップで起動でき、全画面でサクサク使えます」と誰にでも直感的に理解できる表現を採用。
  - **OS自動判別 & 手順ガイド**: User-Agent による自動判定およびタブ切り替え（iPhone / Android）を備え、アイコン付きの3ステップで追加手順（共有ボタン → ホーム画面に追加 / メニュー → ホーム画面に追加）を明快に図解。
  - **LINEアプリ内ブラウザ対策**: LINEで開いた場合の外部ブラウザ起動手順（「Safariで開く」「Chromeで開く」）を注意書きとして提示。
  - **表示制御（PC・PWA時の非表示）**: PCで開いている時、またはすでにスマホのPWA（スタンドアロンモード）から開いている時は一切表示せず（非表示）、スマホの通常ブラウザ（Safari, Chrome, LINE内ブラウザ等）で開いている場合のみカードを表示。
- **クイックアクセス**: 出欠、曲募集、曲投票、マスタ管理、部員名簿、マイプロフィール、登録情報変更、サークル利用規約への直感的なカードリンクを配置。

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
  4. **モバイル対応テーブル & 操作ボタン**:
     - 略称列（幅130px以上）や表示色、並び順列の幅を確保し、`white-space: nowrap` とテーブル最小幅（`min-width: 680px`）によりスマホ閲覧時の不自然な文字縦折り返しを完全防止。
     - 操作列は「編集」「削除」ともに FontAwesome アイコンとラベルテキストを併記し、ボタンの押しつぶれや枠線のみのレイアウト崩れを解消。横スクロールコンテナによりスマホでも安全・快適に操作可能。

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
- 名簿一覧: `/user` (パート別タブフィルター、略称検索、回生バッジ)
- マイプロフィール: `/user/detail` (自身の登録情報の詳細確認、入学年度と自動判定された回生表示)
- 登録変更: `/user/edit` (略称、役職、パート、担当楽器、入学年度)
  - **項目順序**: 「略称」→「役職」→「所属パート」→「担当楽器」→「入学年度」の順で入力・表示。
  - **表示名 (LINE表示名優先)**: ホーム画面、ヘッダー（ドロワーメニュー）、名簿一覧、プロフィール確認画面など全ページにおいて、部員本人のLINE表示名（`displayName`）をメインの名称として表示（略称はサークル内での呼び名・検索用として保持）。
  - **入学年度 (必須) & 4月1日自動進級切り替え**: プルダウンは現役生向け（新入生および1回生〜4回生）に限定し、それ以前のOB/OGは「その他」から西暦年を直接入力可能。日本標準時（`Asia/Tokyo`）基準の学年暦（4月1日 00:00:00〜翌年3月31日 23:59:59）に基づき、毎年4月1日を迎えた瞬間に自動的に「1回生」「2回生」「3回生」「4回生」「OB/OG」が進級・切り替わる（Intl APIによるタイムゾーン安全設計）。未入力は保存不可。
  - **アバターアイコン (LINEアイコン優先 & 抽象音楽アイコン共通フォールバック)**: ホーム画面（ウェルカムカード）、ヘッダー、名簿一覧、プロフィール確認等で、部員本人のLINEプロフィール画像（`pictureUrl`）を円形アバター表示。未設定時または外部画像読み込みエラー時は、ビッグバンドのホーンベル・音波・星の輝きをモチーフにした共通の抽象音楽団体ベクターアイコン（`/default-avatar.svg`）に全画面で統一して安全フォールバック。
  - **役職**: `👑バンマス`, `🎼コンマス`, `✨パートリーダー`, `🎵メンバー`, `🎉ゲスト` の5種類。
  - **パート名称**: 英語表記を廃止し、すべて日本語表記（サックス、トランペット、トロンボーン、リズム、OB・OG / その他）に統一。
  - **氏名・ふりがな・旧学年/所属・電話番号・PayPay ID**: 不要のため廃止。

---

## 4. データモデル (Cloud Firestore)

| コレクション名 | ドキュメントID | 主なフィールド | 読み取り | 書き込み/編集 |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `uid` | `displayName`, `abbreviation`, `sectionId`, `roleId`, `instrumentIds`, `enrollmentYear`, `agreedAt`, `isSystemAdmin`, 各種 `is*Admin` | 認証済部員 | 本人 / `isUserAdmin` |
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
