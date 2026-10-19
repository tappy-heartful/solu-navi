# Solu Navi (愛媛大学軽音楽部 Sound Solution Orchestra) システム仕様書

本ドキュメントは、愛媛大学軽音楽部 Sound Solution Orchestra（愛大軽音楽部）向け活動ポータル「**Solu Navi**」の完全システム仕様書である。
極めて安定して稼働し高い再現性を持つ姉妹アプリ「Streak Navi」の堅牢なアーキテクチャ・設計思想・UI/UX・ロジック・コンポーネント構成を100%忠実に継承し、**本アプリ独自の調整や独自仕様は一切行わず、streak-navi を完全準拠・徹底模倣する**ことを開発・保守の最高原則とする。

---

## 1. システム全体概要

### 1.1. システム目的
愛媛大学軽音楽部 Sound Solution Orchestra の日常運営・部費/会計精算・ライブ制作・メンバー間の情報共有・出欠連絡を一元管理し、部員の負担軽減と円滑なサークル運営を実現する活動ポータルWebアプリケーション。

### 1.2. サークル基本情報 (参考情報)
- **団体名**: 愛媛大学軽音楽部 Sound Solution Orchestra (Sound Solution Orchestra / 愛大軽音楽部)
  - 愛媛大学の学生ビッグバンドサークル（社会人ビッグバンド Swing Streak Jazz Orchestra の母体組織）。
- **年間活動サイクル・世代交代**:
  - 5月頃: 新入生が入部
  - 12月: 3回生が引退（代替わり）
- **活動日時**: 毎週 月曜日・水曜日・金曜日 18:00〜21:00
- **活動場所**: 第3共用施設 2階 防音室1, 2
- **部費**: 月額 2,000円

### 1.3. 主要技術スタック
- **フロントエンド / サーバー**: Next.js 16 (App Router, Turbopack), React 19, TypeScript (Strict)
- **スタイリング**: CSS Modules (`*.module.css`), Tailwind CSS v4, Font Awesome 6
- **BaaS / データベース**: Firebase SDK / Cloud Firestore, Firebase Storage
- **認証**: LINE Login API v2.1 + Firebase Authentication Custom Token (PWAクロスコンテキスト同期)
- **サーバー管理**: Firebase Admin SDK (Node.js)
- **AIコンシェルジュ**: Groq SDK (`groq-sdk`, Llama 3)
- **定期実行**: Google Apps Script (GAS)
- **ホスティング**: Vercel
- **ローカル開発ポート**: `3003`（`next dev -p 3003` / 他アプリとのポート競合防止および LINE ログインコールバックURL `http://localhost:3003/callback` の固定化）

### 1.4. ブランディング & テーマカラー
- **基調カラーコード**: `#146081`（公式ロゴのディープティールブルー）
  - `--primary: #146081`
  - `--primary-hover: #0f4a64`
  - `--primary-light: #e8f4f8`
- **ロゴ画像**: `/public/sso-logo.jpg`（Sound Solution Orchestra 公式ロゴ・サークルエンブレム）
- **アプリアイコン**: `Solu Navi.png`（ディープティールブルー `#104861` 背景に「Solu Navi」のロゴタイプを配した公式アプリアイコン）
  - ブラウザ favicon: `favicon.ico`, `favicon.png` (32x32)
  - iOS ホーム画面追加 (Apple Touch Icon): `apple-touch-icon.png` (180x180)
  - PWA マニフェストアイコン: `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`
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
- **ヘッダー上部固定仕様 (`Header` & `Header.module.css`)**:
  - スクロール時も画面上部に常時固定（`position: sticky; top: 0; z-index: 1000;`）され、背景色白（`#ffffff`）、境界線（`border-bottom: 1px solid #e2e8f0`）、薄いシャドウ（`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05)`）を保持。
  - セーフエリア対応（`padding-top: calc(10px + env(safe-area-inset-top, 0px))`）により、iPhoneのノッチ・Dynamic Island環境下でもコンテンツと被らず安定表示。
- **ヘッダー一重化規約**:
  - `EditFormLayout` や `ConfirmLayout` などの内部で `BaseLayout` を呼び出すレイアウトコンポーネントを使用する画面では、親側でさらに `BaseLayout` を重複して囲わない（ヘッダー二重化の防止）。
- **前の画面に戻るボタン (`BackNavigation`)**:
  - 画面最下部に「フッター」という呼称ではなく独立したページナビゲーション（戻るボタン）として中央配置（`margin: 36px auto 56px auto`）。
  - 姉妹アプリ「streak-navi」と同一のデザイン構造およびアニメーション（`arrowPulse`）を踏襲し、Solu Naviのプライマリカラー（`#146081`、太さ2px枠線、ホバー時背景 `#e8f4f8`）を適用した押しやすい大きめのボタンスタイルを採用。
  - 全機能（曲募集、曲投票、イベント出欠、ユーザ一覧、マスタ管理等）の編集・確認・一覧・回答画面に横展開して統一。
- **テーブル第1列（最左列）固定仕様 (sticky column / streak-navi準拠)**:
  - イベント一覧（EventListClient）、部費管理（FeeConfirmClient）、曲投票・曲募集（SimpleTable）、譜面一覧（SearchableListLayout）等の横スクロールテーブルにおいて、最左列（イベント名、メンバー名、曲名等）に position: sticky; left: 0; を適用。
  - ヘッダーセル（	h:first-child）は z-index: 10; background-color: #f8fafc;、データセル（	d:first-child）は z-index: 5; background-color: #ffffff; とし、右境界線（order-right: 2px solid #cbd5e1;）および薄いドロップシャドウ（ox-shadow: 3px 0 6px -2px rgba(0, 0, 0, 0.08);）を付与。
  - スマートフォンの狭い画面で右側に横スクロールした際にもイベント名や曲名が画面左端に常時固定・視認可能となり、出欠回答や受付期間との照合が快適に行えるモバイルファーストUXを実現。
- **テーブルデータなし（Empty State）表示のスマホ見切れ防止規約**:
  - テーブル（`min-width: 600px`）が横スクロールするコンテナ（`.table-wrapper`）内に `<td colSpan={N}>メッセージ</td>` を配置すると、メッセージがテーブル全幅の中央に配置され、スマホ画面（幅360px〜400px）で右側が見切れて不要な水平スクロールが発生する。
  - そのため、表示するデータが0件の時は、横スクロールテーブルヘッダーを非表示とし、画面幅100%にフィットした独立した空状態カード（`.emptyCard` / `.table-empty-card`）を中央表示する仕様に統一。
  - `EventListClient` や共通の `SimpleTable`、`SearchableListLayout`（譜面一覧・メディア一覧）に適用し、スマホ閲覧時のメッセージ見切れや不自然な余白を完全に排除。
- **検索機能付き一覧共通レイアウト (`SearchableListLayout` & `SearchableListLayout.module.css`)**:
  - 譜面一覧（`/score`）およびメディア・音源一覧（`/media`）に適用されるモダンな統一検索・一覧レイアウト。
  - **画面ヘッダー**: 統一フォントサイズ（`1.25rem` / `700`）のアイコン付きタイトルおよび件数バッジ。管理者権限保持時には右端に「＋ 新規作成」ボタンをスマートに配置。
  - **絞り込み検索カード**: 白背景・角丸（`12px`）・枠線・薄いシャドウの独立カード内に見出し（左アクセントバー `#146081` 付き「絞り込み検索」）と `ListFilterGrid` を格納。
  - **レスポンシブフィルターグリッド**: モバイル端末では1列、タブレット以上では自動複数列（`repeat(auto-fit, minmax(200px, 1fr))`）に整然と配置され、`input` / `select` の高さ・角丸・枠線・フォーカス発光を完全統一。
  - **フィルターアクション**: 「クリア」（`faRotateLeft`）および「検索」ボタンを右寄せで配置。
  - **データ一覧カード & Empty State**: 件数バッジおよび追加アクション（YouTubeプレイリストバッジ等）をヘッダーに持ち、0件時は画面幅100%の `.table-empty-card` を表示して見切れを防止。1件以上時は第1列（タイトル）固定の横スクロールテーブルを表示。カード最下部にも管理者用新規作成ボタンを中央配置。
  - **戻るナビゲーション**: 画面最下部に `<BackNavigation href="/" label="ホーム" />` を標準配置。
- **パンくずリスト & ページアクションバー (`BaseLayout` / streak-navi準拠)**:
  - 画面上部（ヘッダー直下、最大幅 768px 中央揃え）にパンくずリストおよび共通アクションボタン（再読み込みボタン `faRotateRight`、共有ボタン `faShareNodes`）を配置。
  - **ホーム画面における挙動**: ホーム画面ではパンくずナビゲーションは非表示としつつ、他画面と同様に再読み込みボタンと共有ボタンを右端に常時表示（`showBreadcrumbs={false}`, `showActions={true}`）。
  - **再読み込みボタン**: `router.refresh()` とスピナー表示による視覚的フィードバックを行い、最新のデータを即時再取得。
  - **共有ボタン**: Web Share API（未対応ブラウザではクリップボードコピー＋ダイアログ通知）により、現在画面のURLをLINEや他アプリへワンタップで共有可能。
- **回答メニュー & 管理メニューボタン統一規約 (`AnswerConfirmLayout`, `DetailActionButtons`)**:
  - 詳細・確認画面の「回答メニュー」および「管理メニュー」のボタンスタイルを完全統一。
  - **回答・編集ボタン（Primary）**: プライマリカラー（`#146081`）、白文字、アイコン付き（`fa-pen-to-square` 等）、角丸（`6px`）、ホバー時アニメーション（`translateY(-1px)`）。
  - **取消・削除ボタン（Danger）**: 薄い赤背景（`#fee2e2`）、赤い文字（`#dc2626`）、赤い枠線（`#fca5a5`）、アイコン付き（`fa-trash-can`）、角丸（`6px`）。
  - 各ボタンは `flex: 1` で等幅・モバイルフレキシブルに配置し、素のリンクや非装飾ボタンの混入を完全に排除。

### 1.5. ログイン画面 (`/login`)
- **レイアウト & 背景ビジュアル (streak-navi スタイル踏襲)**:
  - 白いカードや枠線、余分な説明ピル、テスト用ログインを全廃。ビューポート全体（`100dvh` / `100vw`）に広がる深淵なディープティール＋ナイトジャズグラデーション（`#05141d` 〜 `#104861`）とアンビエント光彩を配置。
  - 背後にサークルの公式エンブレムロゴ（`/sso-logo.jpg`）を巨大かつ薄く透かし（ウォーターマーク、呼吸アニメーション）として配置し、バンドの世界観と期待感を最大化。
- **上部タイトル配置**:
  - 画面上部に公式アプリアイコンバッジ（`/icons/icon-192.png`）を配置し、その直下に `Solu Navi`（Nがアンバーゴールド `#f59e0b` に輝くタイポグラフィ）、サブタイトル `Sound Solution Orchestra`、および `愛媛大学軽音楽部 活動ポータル` をスタイリッシュにレイアウト。
- **下部認証アクション配置**:
  - 画面最下部に「LINEでログイン」ボタン（立体グラデーション＆プレミアムグロー）をすっきり配置。
  - PWA スタンドアロン起動時は、外部ブラウザでのログイン待機ガイドと復帰ボタン（「ログインを完了して進む」）をスムーズに表示。

### 1.6. コールバック (`/callback`) & 利用規約 (`/agreement`) 画面
- **レイアウト**: ログイン画面と同様にビューポート全体（`min-height: 100dvh` / `width: 100vw`）を基準とし、カードコンポーネントを上下左右完全中央（`display: flex; margin: auto;`）に安定配置。
- **コールバック画面**: LINEログイン認証結果の待機スピナー表示および認証エラー時のメッセージと復帰ボタンを提供。
- **利用規約画面**: 最大幅 36rem のカード内に規約条項（スクロール領域）を配置。初回ログイン・未同意時は同意チェックボックスと登録ボタンを表示し、初回同意後もホーム画面やメニューからいつでも自由に再閲覧が可能。同意済みの部員が閲覧した際は「利用規約に同意済みです」のバッジと同意日、および「ホームに戻る」ナビゲーションを表示。
- **規約条項の実態即応**: 氏名や電話番号、決済情報（PayPay等）の過度な個人情報は扱わず、譜割り用「略称（2文字以内）」と「入学年度（回生）」、LINE表示名によるプライバシー重視の部員情報管理、および出欠確認・日程調整・選曲募集・選曲投票等の実際の利用目的に合致した条項で構成。AGENTS.mdのルールに従い、実装修正と常に同期・維持される。

### 1.7. 共通フィードバックUI (`CommonDialog` & `Spinner`)
- **グローバルマウント (`ClientLayout`)**: `BaseLayout` だけでなく未ログイン・スタンドアロン画面（`/login`, `/callback`, `/agreement` 等）を含む全画面で確実に機能するよう、ルートクライアントシェル（`ClientLayout.tsx`）に一元配置。
- **共通ダイアログ (`CommonDialog`)**: 全画面完全中央配置（`display: flex; margin: auto;`）のカードモーダル。`type`（`success`, `warning`, `danger`, `info`）に応じた円形カラーバッジと Font Awesome アイコンを表示し、視認性と操作性を大幅に向上。
- **音楽特化スピナー (`Spinner`)**: ビューポート中央にサックスアニメーションとバンドメッセージを表示。Tailwind CSSユーティリティとのクラス名干渉を完全に防止。ルート変更（`pathname` / `searchParams`）検知によるページ遷移完了時の自動非表示、最大10秒の安全タイムアウトタイマー、および各編集・確認・回答画面マウント時（`useEffect`）の非表示保証を備え、スピナーの残留バグを100%防止する堅牢なフェイルセーフ機構を実装。

### 1.8. ホーム画面 (`/`) & PWA ホーム画面追加案内
- **表示順序・レイアウト構成 (最新アップデート)**:
  0. **画面タイトル (`h1`, 中央揃え)**: 画面最上部に Font Awesome 家アイコン（`faHouse`、`#146081`）と「ホーム」タイトルを中央揃えで配置。
  1. **お知らせセクション (`HomeAnnouncementSection`)**:
     - 受付中の曲投票や曲募集など、部員が真っ先に対応すべき情報を最上部に表示。
     - **PWA ホーム画面追加案内 (`PwaInstallHint`)**: お知らせリストの最下位（一番下）にアコーディオン形式（初期折りたたみ）で内包。ワンタップで iPhone / Android の追加手順が展開。
  2. **新着譜面セクション (streak-navi準拠)**: 直近登録された譜面（最大6件）のカードグリッド、YouTube連続再生プレイリストリンク、譜面一覧（`/score`）へのショートカットを表示。
  3. **サークルカレンダー (`CalendarView`)**: 直近の練習日程や月間スケジュールをひと目で把握。
  4. **各種メニュー (`welcomeCard` + `quickGrid`)**:
     - ユーザーウェルカムカード（welcomeCard: 現在はコメントアウトで非表示化中）。
     - 活動・音楽メニュー（イベント、譜面、メディア、部費、曲募集、曲投票、マスタ管理）。
- **サイドメニュー (ドロワーメニュー / streak-navi準拠)**:
 - **ホーム**: 最上部に独立したフル幅カードとして配置。
 - **活動メニュー（大きい2列グリッド `mainGrid`）**: 頻繁にアクセスされる主要4機能（イベント・出欠、譜面管理、録音・メディア、部費・集金）を2×2で配置。
 - **その他の機能・設定（小さい3列グリッド `subGrid`）**: 曲募集、曲投票、ユーザ一覧、マスタ管理、マイプロフ、情報変更、利用規約を3列カードでコンパクトに配置。
 - **カレンダー画面の集約**: 単独画面（`/calendar`）はホーム画面のカレンダー（`CalendarView`）に集約し、`/calendar` へのアクセス時はホームへ自動リダイレクト。
     - ユーザ・サークル設定メニュー（ユーザ一覧、マイプロフィール、登録変更、利用規約）。
- **お知らせセクション (`HomeAnnouncementSection` / streak-navi 準拠デザイン)**:
  - **表示条件**: ホーム画面最上部に常時表示。現在受付期間中（`isInTerm`）の曲投票（`votes`）または曲募集（`calls`）が存在する場合はリンクカードを表示し、対象がない場合は streak-navi 準拠で「お知らせはありません🍀」の空状態メッセージを表示。
  - **デザイン構造**:
    - ヘッダー: 「📢 お知らせ」（Font Awesome メガホンアイコン付き）。
    - 注目メッセージ (`.pendingMessage`): オレンジ・アンバーの注意バッジ（`faCircleExclamation` 付き）で「曲投票、受付中です！」「候補曲、募集中です！」を明快に通知。
    - 遷移リンクカード (`.notificationLink`): streak-navi のカードスタイルを踏襲し、左側にジャンル別アイコン（投票: `faCheckToSlot`、募集: `faMusic`）、中央にタイトル（スマホでの折り返し崩れを防ぐ truncate 表示）、右側に `faChevronRight` 矢印を配置。ホバー時にスムーズな右スライドと枠線強調アニメーションを提供。
    - 未設定・空状態 (`.emptyMessage`): streak-navi 準拠の「お知らせはありません🍀」を清潔感のあるカード内に中央表示。
    - PWA ホーム画面追加ヒント: リストの最下部にスッキリ収まるスマートな折りたたみカードとして配置。タップで開閉可能。
- **見出しタイトルデザイン統一仕様 (メニュー共通デザイン)**:
  - ホーム画面上の全セクション（お知らせ、新着譜面、サークルカレンダー、活動・音楽メニュー、ユーザ・サークル設定）の見出しは、すべて共通の左アクセントバー（`border-left: 3.5px solid #146081`）、インデント（`padding-left: 0.5rem`）、太字（`font-weight: 800`）、フォントサイズ（`0.9375rem`）、絵文字アイコン＋タイトルテキストの統一デザインを適用。
- **新着譜面セクション (`ScoreSection` / streak-navi準拠)**:
  - **タイトルカード外出し**: タイトル行（「🎼 新着譜面」および右側の「YouTube プレイリスト」ボタン）を白いカードの外に独立した見出し行として配置し、カード内部は純粋な譜面グリッドともっと見るリンクのみでスッキリと構成。
  - 直近登録された最新譜面（最大6件）を2列グリッドカードでコンパクトに表示。
  - YouTube動画IDが存在する譜面を自動抽出し、「YouTube プレイリスト」ボタンからワンタップで全曲連続再生ページへアクセス可能。
  - 下部に「もっと見る」ボタンを配置し、譜面一覧（`/score`）へスムーズに遷移可能。
- **クイックアクセスメニュー（視認性向上・認知負荷軽減デザイン）**:
  - 姉妹アプリ「streak-navi」を参考に、目的の機能に一瞬でアクセスできるようカテゴリ別に整理し、スマホ画面でも2列グリッド（`repeat(2, 1fr)`）を維持。文字情報の認知負荷を徹底削減したスマート設計。
  - **「🎷 活動・音楽メニュー」**:
    - **イベント・出欠**（ティールブルー / 練習日程・回答）
    - **曲募集**（アンバーゴールド / リクエスト応募）
    - **曲投票**（パープル / 選曲・順位投票）
    - **マスタ管理**（エメラルド / パート・楽器設定）
  - **「👥 ユーザ・サークル設定」**:
    - **ユーザ**（ブルー / ユーザ一覧）
    - **マイプロフィール**（シアン / 登録情報確認）
    - **登録情報変更**（インディゴ / パート・楽器変更）
    - **サークル利用規約**（スレート / 活動ルールと規程）
  - 各カードは高コントラストな角丸アプリアイコンバッジ、太字タイトル、要約キーワード、および背面の微細なウォーターマーク（透かし）アイコンを備え、アクティブ時の微小アニメーションで心地よい操作感を提供。
- **ヘッダーバー & レイアウト幅 (`Header.module.css`, `globals.css` / streak-navi準拠)**:
  - ヘッダーバーの幅を画面全体（100vw）に伸ばさず、`max-width: 768px; margin: 0 auto;` に制限。PC・タブレット表示時もコンテンツ幅と完全に一致する美しいセンタリングレイアウトを実現。
  - 公式エンブレムロゴ（`/sso-logo.jpg`）と「Solu Navi」のスタイリッシュなブランドタイポグラフィ、ユーザーアバター、ハンバーガーボタンを集約。
- **スライドメニュー（ドロワーメニュー / Header）**:
  - streak-navi のグリッド設計を継承し、従来の縦1列リストから「ホーム（1列・フル幅カード）」「メインメニュー（2列グリッド）」「設定・マスタ（3列グリッド）」の3層グリッド構造へ全面刷新。
  - 各メニュー項目タップ時に即座に音楽的ローディングスピナー（`showSpinner()`）を発火し、快適な画面遷移フィードバックを提供。
- **パンくずリスト & クイックアクションバー (`BaseLayout.tsx`, `BaseLayout.module.css`)**:
  - `max-width: 768px; margin: 0 auto;` のコンテナ内に配置。
  - 右端に streak-navi 準拠の「画面更新（リフレッシュ：`router.refresh()`）」ボタンおよび「共有（シェア：Web Share API / URLコピー）」ボタンを常設。
- **音楽的ローディングスピナー (`musical-loading` / streak-navi完全準拠・独自調整なし)**:
  - streak-navi の実装およびUIデザインを100%忠実に移植・準拠（このアプリ独自の改変や独自調整は一切排除）。
  - FontAwesome 6 の音楽アイコン（音符 `fa-music`, 楽譜 `fa-note-sticky`, ギター `fa-guitar`, ドラム `fa-drum`）が、爽やかなグリーン（`#4caf50`）で上下にリズミカルにピョンピョン跳ねる `noteBounce` アニメーションを展開。
  - 「チューニングしています...」「リードの調子を確認しています...」「アドリブを練っています...」など全20種類のビッグバンド特化メッセージが1.0秒おきにランダムローテーション。
  - **自然なライフサイクル**: 不自然な遅延（タイマー遅延）を一切排除し、内部リンククリック時（`ClientLayout` の内部リンク監視およびナビゲーション要素）に即座に表示され、ページ遷移完了時にシームレスにフェードアウト。
  - ページ遷移完了（`RouteChangeSpinnerCloser`）または最大安全タイマー（10秒）で自動的に非表示化。
- **PWA ホーム画面アイコン追加ヒントカード (`PwaInstallHint`)**:
  - **配置**: クイックアクセス一覧の下部（ページ下部）に配置。
  - **専門用語の平易化**: 「PWA」という単語を使わず、「スマホのホーム画面にアイコンを追加しよう！」「アプリのようにワンタップで起動でき、全画面でサクサク使えます」と誰にでも直感的に理解できる表現を採用。
  - **OS自動判別 & 手順ガイド**: User-Agent による自動判定およびタブ切り替え（iPhone / Android）を備え、アイコン付きの3ステップで追加手順（共有ボタン → ホーム画面に追加 / メニュー → ホーム画面に追加）を明快に図解。
  - **LINEアプリ内ブラウザ対策**: LINEで開いた場合の外部ブラウザ起動手順（「Safariで開く」「Chromeで開く」）を注意書きとして提示。
  - **表示制御（streak-navi準拠のPWA検知）**: `streak-navi` の方式に準拠し、`window.matchMedia('(display-mode: standalone)').matches` や `(navigator as any).standalone`、`fullscreen`、`minimal-ui` による包括的なスタンドアロン判定を実施。すでにPWAアプリとして起動している時は確実に非表示とし、スマートフォン実機およびブラウザのモバイル画面幅（<= 768px）アクセス時に確実に案内カードを表示。

### 1.9. PWA (Progressive Web Apps) 完全稼働仕様
- **Web App Manifest (`src/app/manifest.ts` & `public/manifest.json`)**:
  - `name`: "Solu Navi | 愛大軽音楽部活動ポータル"
  - `short_name`: "Solu Navi"
  - `display`: "standalone"
  - `orientation`: "portrait"
  - `background_color`: "#104861"
  - `theme_color`: "#104861"
  - `icons`: 192x192, 512x512（通常およびマスク対応 maskable アイコン、公式 `Solu Navi.png` より高解像度生成、セーフエリア保護）
- **iOS Safari (Apple Web App) メタデータ統合**:
  - `appleWebApp: { capable: true, statusBarStyle: "default", title: "Solu Navi" }`
  - `apple-touch-icon`: 180x180（`Solu Navi.png` より生成した角丸対応アプリアイコン）
  - `viewport`: `viewportFit: "cover"`, `themeColor: "#104861"`
  - 各種レイアウト（`Header.module.css`, `BaseLayout.module.css`）で `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` によるノッチ・ホームバー干渉防止。
- **Service Worker (`public/sw.js` & `ServiceWorkerRegister.tsx`)**:
  - キャッシュ名 `solu-navi-cache-v2` による主要アセット（マニフェスト、ロゴ、アイコン、favicon、フォールバック等）のプリキャッシュ。
  - APIルート（`/api/*`）、Firebase、LINE認証、ホットリロードは完全に除外してネットワーク直送。
  - 静的アセット（画像、フォント等）はキャッシュ優先（Cache First）、ページ遷移は最新優先（Network First）でオフライン耐性を確保。
  - ルートクライアントシェル（`ClientLayout.tsx`）から自動登録およびバックグラウンド更新検知。
- **PWA × OAuth クロスコンテキスト自動同期機構 (`pwaAuthSessions`)**:
  - PWA スタンドアロン起動時、一意の `pwaSessionId` を自動生成し、LINE認可URL（`bot_prompt=aggressive` 付き）を外部ブラウザ（Safari等）で起動。
  - PWA アプリ画面上には「外部ブラウザでログイン中」の案内ボックスと手動復帰ボタン（「ログインを完了して進む」）を表示。
  - **ブラウザ側セッションの完全分離**: 外部ブラウザ側コールバック（`/callback`）は `isPwaLogin` を検知すると、ブラウザ側でのログインを明示的に遮断（`logout()` で既存セッションを破棄）し、「ログイン成功！Solu Naviアプリにお戻りください」のメッセージとダイアログを表示して待機（ブラウザ側でホーム画面に遷移させない）。
  - **公開パスの強制リダイレクト防止 (`AuthGuard`)**: `streak-navi` の設計に完全準拠し、公開パス（`/login`, `/callback`, `/agreement`, `/about`）での勝手なホーム画面への自動リダイレクトを排除。
  - Firestore の `pwaAuthSessions/{pwaSessionId}` ドキュメント（`status: "completed"`, `customToken`）を PWA 側がリアルタイム監視（`onSnapshot`）およびフォアグラウンド復帰時（`visibilitychange`/`focus`）に即時直接取得（`getDoc`）し、PWA アプリ本体が `customToken` で自動サインインしてホームへシームレスに遷移。

---

## 2. 管理者ロール・権限マトリクス (RBAC)

Solu Navi では、モジュールごとの細やかな権限分離（Role-Based Access Control）を採用している。
ユーザーコレクション（`users/{uid}`）内の各フラグによって、アクセスできる機能と操作権限が厳格に制御される。

### 2.1. 各種管理者ができることの一覧表

| 管理者ロール | 該当フラグ | できること（管理者権限） | 一般部員（権限なし時） |
| :--- | :--- | :--- | :--- |
| **特権管理者 (システム管理者)** | `isSystemAdmin` | **全機能の完全操作権限**（全モジュールの追加・編集・削除、全ユーザの権限付与・ユーザ情報編集・削除、システム設定、監査ログ閲覧） | - |
| **マスタ管理者** | `isMasterAdmin` | パート（セクション）マスタ・楽器マスタの新規追加・編集・削除・並び順変更・初期データシード投入 | **閲覧のみ**（一覧の閲覧は可能、編集・削除ボタンは非表示） |
| **ユーザ管理者** | `isUserAdmin` | 他ユーザの登録情報（パート、役職、楽器、略称、連絡先等）の代行編集・更新 | 自身のプロフィールの編集・登録のみ可（他ユーザは閲覧のみ） |
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

### 3.1. マスタ管理 (`/master`) 【全9マスタ対応・JSON一元管理】
- **目的**: ビッグバンド運営に必要なマスタデータ（編成、役職、楽器、出欠・日程調整ステータス、選曲ジャンル・譜面状況、地域情報）を集中管理する。
- **URL**: `/master`
- **権限制御**:
  - `isMasterAdmin === true` または `isSystemAdmin === true`: **フル編集可能**（追加、編集、削除、初期データ投入）
  - それ以外のユーザー: **閲覧のみモード**（追加・編集・削除アクションは非表示）
- **管理対象マスタ (全9タブ構成)**:
  1. **パート (セクション) マスタ (`sections`)**: ID（`1`〜）、パート名（サックス、トランペット等）、略称、テーマカラー、並び順
  2. **役職 マスタ (`roles`)**: ID（`1`〜）、役職名（👑バンマス、🎼コンマス、✨パートリーダー、🎵メンバー、🎉ゲスト等）、説明、並び順
  3. **楽器 マスタ (`instruments`)**: ID（`as`, `tp`等）、楽器名、所属パート、並び順
  4. **出欠ステータス マスタ (`attendanceStatuses`)**: ID（`1`: `✋出ます！`, `2`: `💤おやすみ`）、並び順
  5. **日程調整ステータス マスタ (`eventAdjustStatus`)**: ID（`1`〜`3`）、記号/名称（◯, △, ×）、説明（参加可能、未定/条件付き、不参加）、並び順
  6. **音楽ジャンル マスタ (`genres`)**: ID（`1`〜`7`）、ジャンル名（Swing, Latin, Funk / Fusion, Ballad, Modern / Contemporary, Rock / Pop, Shuffle / Groove）、並び順
  7. **譜面状況 マスタ (`scoreStatus`)**: ID（`1`〜`5`）、状況名（部室・部費所持譜面あり、部費で購入希望、私物譜面あり、耳コピ必要、その他）、並び順
  8. **都道府県 マスタ (`prefectures`)**: 全国47都道府県（コード・名称・地方並び順）
  9. **市区町村 マスタ (`municipalities`)**: 全国1,892市区町村（コード・名称・都道府県連動、検索フィルター付き）
- **初期データ一括投入 (Seed)**:
  - `src/data/master/*.json`（単一情報源）に基づき、全マスタ（計1,973件）をワンクリックで Firestore へバッチ登録。

- **モバイル対応テーブル & 操作ボタン**:
  - 横スクロールコンテナ、タブバーの横スクロール対応、各マスタ専用の編集・追加モーダルを提供。


### 3.2. 曲募集機能 (`/call`)
- **目的**: 定期演奏会や学園祭ライブに向けた候補曲のリクエストをメンバーから募集する。
- **画面構成**:
  - 一覧: `/call` (受付中 / 終了 / 全てのフィルタ、検索。受付期間は開始・終了を同一行に並べて表示)
  - 作成・編集: `/call/edit` (管理者専用: タイトル、説明、受付期間、募集ジャンル、匿名募集可否、その他備考。受付期間は streak-navi 準拠の同一行インライン横並び入力)
  - 詳細・回答確認: `/call/confirm?callId=xxx` (応募状況の集計、応募曲一覧、YouTubeリンク、CSVエクスポート)
  - 応募フォーム: `/call/answer?callId=xxx` (メンバーによる曲名、参考音源URL、楽譜状況、購入要否、備考の登録)

### 3.3. 曲投票機能 (`/vote`)
- **目的**: 募集された候補曲から、演奏曲を民主的かつ高精度に決定する。
- **投票方式**:
  - **単一選択投票 (`single`)**: 各項目から1曲を選択。
  - **ボルダ得点法 (`borda`)**: 最大希望順位（例: 3位まで）を指定し、順位に応じたポイント（傾斜配点 / 等差配点）でリアルタイム集計。
- **画面構成**:
  - 一覧: `/vote` (受付中 / 終了 / 全てのフィルタ、検索。受付期間は開始・終了を同一行に並べて表示)
  - 作成・編集: `/vote/edit` (管理者専用: タイトル、投票方式、配点ルール、受付期間、候補曲リスト。受付期間は streak-navi 準拠の同一行インライン横並び入力)
  - 詳細・集計結果: `/vote/confirm?voteId=xxx` (順位別・得点順集計グラフ/テーブル、YouTube埋め込み再生)
  - 投票フォーム: `/vote/answer?voteId=xxx` (選択肢のワンタップ順位割り当て)
  - 音源リンク一括編集: `/vote/link-edit?voteId=xxx` (管理者専用)

### 3.4. イベント・出欠・日程調整機能 (`/event`)
- **目的**: 練習、合宿、本番、総会などの日程連絡、出欠確認、日程調整、施設アクセス、録音共有を一元管理。
- **種別**:
  - **出欠確認 (`attendance`)**: 特定日の出席・欠席・保留を回答（`date`: "yyyy.MM.dd", `candidateDates`: []）。
  - **日程調整 (`schedule`)**: 複数の候補日に対する可否をマトリクス形式で回答（`date`: "", `candidateDates`: ["yyyy.MM.dd", ...]）。
- **Firestore書き込み安全性（undefined完全防止機構）**:
  - Firestore SDK の `Unsupported field value: undefined` エラーを未然に防止するため、クライアントサービス層（`addEvent`, `updateEvent`, `submitAttendanceAnswer`, `submitAdjustAnswer`, `addRecording`）および編集画面ビュー（`EventEditClient`）において、共通ユーティリティ `removeUndefined` による再帰的サニタイズ処理を適用。
  - 出欠タイプ登録時は `candidateDates` を空配列 `[]` に、日程調整タイプ登録時は `date` を空文字 `""` に初期化し、オプショナルな楽器IDや備考コメントの `undefined` 混入を二重防壁で完全に遮断。
- **画面構成**:
  - 一覧: `/event` (日付順、都道府県/市区町村バッジ、出欠ステータス)
  - 作成・編集: `/event/edit` (タイトル、日時/候補日、受付期間（streak-navi 準拠の同一行インライン横並び入力）、場所・Google Map・アクセス、施設利用時間、会場押さえ状況、セットリスト、楽器構成 ※会場費・部費・参加費項目は不要のため廃止)
  - 詳細・確認: `/event/confirm?eventId=xxx` (日付/候補日・出欠受付期間・タイトルのDisplayFieldデザイン統一、出欠内訳・未回答者モーダル、日程調整マトリクス集計、録音・録画リンク追加/削除、YouTubeタイムスタンプ再生 ※会場費・部費・参加費項目は非表示)
  - 出欠回答: `/event/attendance-answer?eventId=xxx`
  - 日程調整回答: `/event/adjust-answer?eventId=xxx`

### 3.5. ユーザー・プロフィール管理 (`/user`)
- ユーザ一覧: `/user` (パート別タブフィルター、略称検索、回生バッジ)
  - **パート別見出しグループ化 & 厳格な多段階ソート**: 「すべて」表示時、パート順（`sections.order` 昇順）→ 回生の高い順（`enrollmentYear` 昇順 = 4回生→3回生→2回生→1回生）→ 役職の高い順（`roles.order` 昇順 = バンマス→コンマス→パートリーダー→メンバー→ゲスト）で整列。パートごとにパートカラーバー、パート名、所属人数バッジの見出しを配置し、サークルの編成がひと目で把握できる視覚的レイアウトを実現。
  - **SSR・サーバー事前フェッチ（streak-navi準拠）**: `src/app/user/page.tsx`（Server Component）にて `getUsersServer`、`getSectionsServer`、`getRolesServer`、`getInstrumentsServer` を `Promise.all` でサーバーサイド事前取得し、クライアントへ初期データ（`initialData`）として即座に受け渡し。クライアント側での Firestore 通信待ちを完全に排除し、iPhone Safari / PWA における初期ロード時間を劇的に短縮。
  - **アバター画像描画の最適化 (`UserAvatar`)**: Next.js の `<Image>` コンポーネントによる大量のフック・IntersectionObserver 生成を廃止し、プロジェクト規約（`user_global` 2.7節）および `streak-navi` に準拠した軽量ネイティブ `<img>`（`loading="lazy"`, `decoding="async"`）に刷新。画面外の画像リクエストを遅延させ、Safari のメインスレッド占有とフリーズを完全解消。
  - **DOM レンダリング最適化 (`content-visibility: auto`)**: リストカード（`.userCard`）に CSS `content-visibility: auto; contain-intrinsic-size: 0 76px;` を適用し、画面外要素のレイアウト計算をスキップして60fpsのスムーズスクロールを実現。
  - **即時スケルトンUI (`loading.tsx`)**: サーバー通信中に自動表示される軽量スケルトンUIを提供。
- マイプロフィール: `/user/detail` (自身の登録情報の詳細確認、入学年度と自動判定された回生表示)
- 登録変更: `/user/edit` (略称、役職、パート、担当楽器、入学年度)
  - **項目順序**: 「略称」→「役職」→「所属パート」→「担当楽器」→「入学年度」の順で入力・表示。
  - **マスタ完全連携**: 役職プルダウン（`roles`）、所属パート（`sections`）、担当楽器（`instruments`）はハードコードではなく、マスタコレクションから動的取得した最新データでレンダリング（役職は `order` 昇順で整列）。
  - **表示名 (LINE表示名優先)**: ホーム画面、ヘッダー（ドロワーメニュー）、ユーザ一覧、プロフィール確認画面など全ページにおいて、部員本人のLINE表示名（`displayName`）をメインの名称として表示（略称はサークル内での呼び名・検索用として保持）。
  - **入学年度 (必須) & 4月1日自動進級切り替え**: プルダウンは現役生向け（新入生および1回生〜4回生）に限定し、それ以前のOB/OGは「その他」から西暦年を直接入力可能。日本標準時（`Asia/Tokyo`）基準の学年暦（4月1日 00:00:00〜翌年3月31日 23:59:59）に基づき、毎年4月1日を迎えた瞬間に自動的に「1回生」「2回生」「3回生」「4回生」「OB/OG」が進級・切り替わる（Intl APIによるタイムゾーン安全設計）。未入力は保存不可。
  - **アバターアイコン (LINEアイコン優先 & 抽象音楽アイコン共通フォールバック)**: ホーム画面（ウェルカムカード）、ヘッダー、ユーザ一覧、プロフィール確認等で、部員本人のLINEプロフィール画像（`pictureUrl`）を円形アバター表示。未設定時または外部画像読み込みエラー時は、ビッグバンドのホーンベル・音波・星の輝きをモチーフにした共通の抽象音楽団体ベクターアイコン（`/default-avatar.svg`）に全画面で統一して安全フォールバック。
  - **役職**: `👑バンマス`, `🎼コンマス`, `✨パートリーダー`, `🎵メンバー`, `🎉ゲスト` の5種類。
  - **パート名称**: 英語表記を廃止し、すべて日本語表記（サックス、トランペット、トロンボーン、リズムの4パート）に統一。
  - **氏名・ふりがな・旧学年/所属・電話番号・PayPay ID**: 不要のため廃止。

### 3.6. マスタ管理 (`/master`)
- **概要**:
  - パート、役職、楽器、都道府県、市区町村のサークル活動の基盤となる全マスタデータを一元管理・編集できる管理画面。
  - マスタ管理者（`isMasterAdmin`）またはシステム管理者（`isSystemAdmin`）のみが追加・編集・削除・初期データ投入を実行可能（一般部員は閲覧のみ）。
- **タブ切り替え（モバイルファースト横スクロール設計）**:
  - **パート (`sections`)**: ID、パート名、略称、表示色（カラーピッカー）、並び順
  - **役職 (`roles`)**: ID、役職名、説明、並び順
  - **楽器 (`instruments`)**: ID、楽器名、所属パート、並び順
  - **都道府県 (`prefectures`)**: 都道府県コード（2桁）、都道府県名、並び順
  - **市区町村 (`municipalities`)**: 市区町村コード（5桁）、市区町村名、所属都道府県（都道府県選択プルダウンおよびキーワード検索フィルター付き、全1,892件対応）
- **初期データ管理 (`src/data/master/` JSON Single Source of Truth)**:
  - サークル初期構築時およびリセット時用の初期マスタを JSON ファイルとして保管・管理：
    - `sections.json`: 標準パート定義（5件）
    - `roles.json`: 標準役職定義（5件）
    - `instruments.json`: 標準ビッグバンド楽器定義（15件）
    - `prefectures.json`: 全国47都道府県（47件）
    - `municipalities.json`: 全国市区町村（1,892件）
    - `grades.json`: 学年表記リスト（8件）
  - `@/lib/firestore/constants.ts` はこれら JSON ファイルを直接インポートして定数エクスポートを行い、コードと初期データの完全同期を保証。
- **全マスタ一括初期投入 (`seedMasterData`)**:
  - 管理画面ヘッダーの「初期データ投入」ボタンより、上記 JSON に定義された全マスタ（パート・役職・楽器・都道府県・市区町村：計1,959件）を Firestore に一括投入可能。
  - 市区町村データ（1,892件）は Firestore の `writeBatch` 上限（500件）を超えないよう400件単位でチャンク分割コミットを行い、処理中のプログレスメッセージ表示および監査ログ（`logs`）への記録を自動実行。

### 3.7. 譜面管理機能 (`/score`) (streak-navi準拠)
- **目的**: 紙の原譜コピーによる劣化・紛失・コンマスの印刷負担を解消し、楽譜PDFをクラウドで一元データ管理。
- **特徴**:
  - タイトル、譜面PDF（Firebase Storage アップロードまたは Google Drive / 外部URL）、YouTube参考音源URL、ジャンルマスタ複数紐付け、略称（譜割用）、備考、ホーム表示設定。
  - **YouTube 参考音源プレイリスト自動生成**: 表示中の譜面一覧から YouTube ID を抽出し、ワンクリックで全曲連続再生可能な `youtube.com/watch_videos?video_ids=...` リンクを自動生成。
  - アニメーション付き「譜面を見る ♪」ボタンから別タブでPDFを直接閲覧。
- **画面構成**:
  - 一覧: `/score` (検索、ジャンルフィルター、イベントフィルター、並び替え、プレイリストボタン)
  - 詳細: `/score/confirm?scoreId=xxx` (YouTubeインライン再生、譜面リンク、管理用編集・コピー・削除)
  - 作成・編集: `/score/edit` (PDFファイルアップロード、Google Drive URL、ジャンル追加・削除UI)

### 3.8. 音源・動画共有機能 (`/media`) (streak-navi準拠)
- **目的**: LINEでの練習録音やYouTubeアーカイブの保存期限切れ・チャット埋もれを解消し、永続ストック・共有。
- **特徴**:
  - 日付、タイトル、YouTube動画（インライン埋め込み再生）、Google Drive / 練習録音ファイル（プレビュー再生および直接ダウンロード）、Instagram投稿埋め込み（`InstagramEmbed`）、ホーム表示設定。
  - 練習録音ファイル（MP3等）を Firebase Storage（`medias/...`）へ直接アップロード可能。
- **画面構成**:
  - 一覧: `/media` (検索、新着順ソート)
  - 詳細: `/media/confirm?mediaId=xxx` (YouTubeインラインプレイヤー、録音埋め込みプレイヤー、Instagram埋め込み)
  - 作成・編集: `/media/edit` (音声ファイルアップロード、YouTube URL入力等)

### 3.9. サークルカレンダー & LINE自動通知リマインド (`/calendar`, `/event`, ホーム埋め込み)
- **目的**: TimeTreeでの出欠管理負担を解消。月間カレンダーによる直感的なスケジュール・出欠確認と、未回答者に対するLINE自動通知リマインド。
- **カレンダー仕様 (streak-navi準拠)**:
  - 月間グリッド表示（前月/次月ナビゲーション、今日ボタン、表示対象「全体 / 自分のみ」切り替え、凡例）。
  - 日付セル内にイベント（青）、日程調整（橙）、曲投票（オレンジ）、曲募集（紫）、欠席（グレー）をコンパクトなピルとして表示。
  - 日付タップでボトムシート型アジェンダモーダル（`DailyAgendaModal`）が開き、当日の詳細スケジュール一覧表示および新規イベント登録へのショートカットを提供。
  - ホーム画面（`/`）および専用ページ（`/calendar`）の双方に配置。
- **未回答者へのLINE自動通知リマインド**:
  - イベント確認画面（`EventConfirmClient`）において、管理者が未回答者一覧を確認し、ワンタップで「LINEリマインド送信」を実行可能。
  - 出欠未回答者（`sendAttendanceRemindAction`）および日程調整未回答者（`sendAdjustRemindAction`）の `lineMessagingIds` から LINE UID を自動照合し、LINE Messaging API（マルチキャスト一括送信）により個別リマインドを配信。

### 3.10. 部費・集金管理 & 未払い者LINE催促通知 (`/fee`)
- **目的**: 月額部費（2,000円）や合宿・イベント集金の支払管理、催促、会計係の精神的負担を大幅軽減。
- **特徴**:
  - タイトル（例: 2026年5月度 部費、夏合宿集金）、金額（円）、支払期日、振込・PayPay案内。
  - **全体の納入進捗表示**: プログレスバー（「24/30人 納入済 (80%)」）を一覧および詳細に表示。
  - **部員自身のステータス確認**: ホーム画面や部費一覧カードで「納入済（緑）」「未納（赤）」を一目で確認。
  - **部員別納入管理テーブル（会計係・管理者専用）**:
    - 全部員の納入状況（未払い / 支払済 / 免除）をプルダウンでワンクリック更新。
  - **未払い者へのLINE催促通知一括送信**:
    - 「未払い者へLINE催促通知を送る」ボタンをワンタップするだけで、未納の部員のみを自動抽出し、LINE Messaging API で催促通知（金額、期日、Solu Navi確認リンク）を一括自動送信。
- **画面構成**:
  - 一覧: `/fee` (集金案件カード、全体の納入率プログレスバー、自身のステータスバッジ)
  - 詳細・管理: `/fee/confirm?feeId=xxx` (部員別支払管理テーブル、ステータス即時変更、LINE催促一括送信ボタン)
  - 作成・編集: `/fee/edit` (タイトル、金額、期日、案内・備考)

---

## 4. データモデル (Cloud Firestore)

| コレクション名 | ドキュメントID | 主なフィールド | 読み取り | 書き込み/編集 |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `uid` | `displayName`, `abbreviation`, `sectionId`, `roleId`, `instrumentIds`, `enrollmentYear`, `agreedAt`, `isSystemAdmin`, 各種 `is*Admin` | 認証済部員 | 本人 / `isUserAdmin` |
| `sections` | `id` (例: `1`) | `name`, `shortName`, `order`, `color` | 認証済部員 | `isMasterAdmin` |
| `instruments` | `id` (例: `as`) | `name`, `sectionId`, `order` | 認証済部員 | `isMasterAdmin` |
| `roles` | `id` (例: `1`) | `name`, `order`, `description` | 認証済部員 | `isMasterAdmin` |
| `prefectures` | `id` (例: `38`) | `name`, `order` | 認証済部員 | `isMasterAdmin` |
| `municipalities` | `id` (例: `38201`) | `name`, `prefectureCode` | 認証済部員 | `isMasterAdmin` |
| `events` | 自動採番 | `title`, `attendanceType`, `date`, `candidateDates`, `placeName`, `prefectureId`, `municipalityId`, `website`, `googleMap`, `access`, `rentTimeRanges`, `isVenueReserved`, `schedule`, `dress`, `bring`, `rent`, `youtubeUrl`, `youtubeTimestamps`, `setlist`, `instrumentConfig`, `acceptStartDate`, `acceptEndDate` | 認証済部員 | `isEventAdmin` |
| `eventAttendanceAnswers` | `{eventId}_{uid}` | `eventId`, `uid`, `status`, `comment` | 認証済部員 | 本人 / `isEventAdmin` |
| `eventAdjustAnswers` | `{eventId}_{uid}` | `eventId`, `uid`, `answers` (`{ [date]: statusId }`), `comment` | 認証済部員 | 本人 / `isEventAdmin` |
| `eventRecordings` | 自動採番 | `eventId`, `uid`, `title`, `url` | 認証済部員 | 本人 / `isEventAdmin` (削除) |
| `calls` | 自動採番 | `title`, `acceptStartDate`, `acceptEndDate`, `items` (募集ジャンル配列), `isAnonymous`, `other` | 認証済部員 | `isCallAdmin` |
| `callAnswers` | `{callId}_{uid}` | `callId`, `uid`, `answers` (`{ [genre]: CallAnswerSong[] }`) | 認証済部員 | 本人 / `isCallAdmin` |
| `votes` | 自動採番 | `name`, `description`, `type` (single/borda), `bordaConfig`, `items` (選択肢配列), `acceptStartDate`, `acceptEndDate` | 認証済部員 | `isVoteAdmin` |
| `voteAnswers` | `{voteId}_{uid}` | `voteId`, `uid`, `answers` | 認証済部員 | 本人 / `isVoteAdmin` |
| `scores` | 自動採番 | `title`, `abbreviation`, `scoreUrl`, `genres`, `referenceTrack`, `youtubeId`, `note`, `isDispTop` | 認証済部員 | `isScoreAdmin` |
| `medias` | 自動採番 | `title`, `date`, `youtubeUrl`, `driveUrl`, `instagramUrl`, `isDispTop` | 認証済部員 | `isMediaAdmin` |
| `fees` | 自動採番 | `title`, `amount`, `dueDate`, `description`, `targetGrades` | 認証済部員 | `isFeeAdmin` |
| `feePayments` | `{feeId}_{uid}` | `feeId`, `uid`, `status`, `paidAt`, `paidMethod`, `note` | 認証済部員 | `isFeeAdmin` / 本人(更新) |
| `archives` | 自動採番 | 論理削除退避データ (`{collection}_{docId}_{timestamp}`) | `isSystemAdmin` | 認証済部員 (作成) |
| `logs` / `errorLogs` | 自動採番 | `uid`, `userName`, `action`, `dataId`, `status`, `errorDetail`, `createdAt` | `isSystemAdmin` | 認証済部員 |

---

## 5. 監査・エラーログ仕様 (`logs` / `errorLogs` / streak-navi 準拠)

- **概要**:
  - 全機能（イベント出欠・日程調整、曲募集、曲投票、譜面管理、メディア共有、部費管理、部員プロフィール、マスタ管理、認証コールバック、利用規約同意、ログアウト等）において、データ登録・更新・削除・取得失敗などの例外発生時に、ブラウザのコンソールログ（`console.error`）へ詳細を出力するとともに、Firestore の `errorLogs` コレクションへ監査・障害追跡ログを自動永続化する。
- **ログ記録ヘルパー (`writeLog` / `writeErrorLog`)**:
  - `writeLog`: `status === 'success'` の場合は `logs` コレクションに、`status === 'error'` の場合は `errorLogs` コレクションへ振り分け保存。`status !== 'success'` の際は内部で自動的に `console.error("[ErrorLog] action=... dataId=... user=...:", errorDetail)` を出力。
  - `writeErrorLog`: 例外オブジェクト（`Error`）を受け取り、エラーメッセージとスタックトレースを抽出して `console.error` 出力および `errorLogs` 保存を一括実行する共通ヘルパー。
- **クライアント側での二重防護**:
  - 各画面の catch ブロックにおいて、`console.error("[コンポーネント名] アクション名エラー:", error)` を明示的に出力し、スタックトレースと発生コンテキストを確実に捕捉。
  - 続けて `await writeLog({ dataId, action, status: "error", errorDetail: { message: error.message } })` を実行し、ユーザーへのダイアログ表示（「保存に失敗しました」等）とスピナー解除を行う。

---

## 6. 今後の拡張予定機能ロードマップ
1. **譜割り管理 (`/assign`)**: 担当楽器連動型譜割り編集、プレイリスト自動生成
2. **AIコンシェルジュ (`/api/chat`)**: Groq Llama 3 超高速推論、Firestore RLS尊重 REST API連携
3. **ライブチケット管理 (`/live`, `/ticket`)**: チケット予約、入場QRコード読み取り受付

