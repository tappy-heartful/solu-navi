# Solu Navi (愛媛大学軽音楽部 Sound Solition Orchestra) システム仕様書

本ドキュメントは、愛媛大学軽音楽部 Sound Solition Orchestra（愛大ソルソリ）向け活動ポータル「**Solu Navi**」のシステム仕様書である。
先行して稼働している姉妹アプリ「Streak Navi」の堅牢なアーキテクチャ・設計思想をベースとし、愛大ソルソリの活動形態に合わせて最適化している。

---

## 1. システム全体概要

### 1.1. システム目的
愛媛大学軽音楽部 Sound Solition Orchestra の日常運営・部費/会計精算・ライブ制作・メンバー間の情報共有・出欠連絡を一元管理し、部員の負担軽減と円滑なサークル運営を実現する活動ポータルWebアプリケーション。

### 1.2. 主要技術スタック
- **フロントエンド / サーバー**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **スタイリング**: CSS Modules (`*.module.css`), Tailwind CSS v4, Font Awesome 6
- **BaaS / データベース**: Firebase SDK / Cloud Firestore, Firebase Storage
- **認証**: LINE Login API v2.1 + Firebase Authentication Custom Token
- **サーバー管理**: Firebase Admin SDK (Node.js)
- **AIコンシェルジュ**: Groq SDK (`groq-sdk`, Llama 3)
- **定期実行**: Google Apps Script (GAS)
- **ホスティング**: Vercel

---

## 2. 認証・セキュリティ仕様

### 2.1. LINE ログイン & Firebase 連携
1. ユーザーが「LINEでログイン」を押下。
2. `/api/line/get-url` により一意の `state` を生成し、Firestore の `oauthStates` に一時保存（PWA対応の `pwaSessionId` も記録可能）。LINE認可画面へリダイレクト。
3. ユーザーが認可後、`/callback` から `/api/line/login` (POST) へコードと state を送信。
4. サーバー側で state の使い捨て検証を行い、LINE API からアクセストークンおよびユーザープロファイル（`sub`, `displayName`, `pictureUrl`）を取得。
5. **UID のソルト・ペッパー暗号化**:
   - LINEの生UID（`sub`）をそのまま利用せず、環境変数 `SALT` + `rawLineUid` + `PEPPER` を SHA-256 でハッシュ化した値を Firebase UID (`hashedUserId`) とする。
6. Firebase Admin SDK により `createCustomToken(hashedUserId)` を実行し、クライアントへ返却。
7. クライアント側で `signInWithCustomToken` を実行し、Firebase セッションを確立。

### 2.2. 利用規約同意 (`agreedAt`)
- 未ログインユーザーは `/login` へ誘導。
- ログイン後、`userData.agreedAt` が未設定の場合は `/agreement`（利用規約画面）へ強制リダイレクト。
- 規約同意後に `agreedAt`（タイムスタンプ）が Firestore `users/{uid}` に保存され、通常機能が利用可能となる。

### 2.3. プロフィール必須入力ガード
- 利用規約同意後、以下の必須プロフィールが未入力の場合は `/user/edit` へ強制リダイレクト：
  - `displayName`（氏名）
  - `sectionId`（所属パート）
  - `roleId`（役職）
  - `instrumentIds`（担当楽器）
  - `abbreviation`（略称・短縮名）
  - ※サックスパート（`sectionId === "1"`）所属の場合は精算受取用 `paypayId` も必須。

### 2.4. ロール & RBAC (Role-Based Access Control)
- `isSystemAdmin`: 特権管理者（全部員の編集、システム設定、全権限を保持）。
- モジュール別管理者フラグ（将来拡張）:
  - `isUserAdmin`, `isEventAdmin`, `isScoreAdmin`, `isNoticeAdmin`, `isLiveAdmin` 等。

---

## 3. 画面一覧・UI仕様

| 画面名 | パス | 説明 | アクセス制御 |
| :--- | :--- | :--- | :--- |
| **ログイン** | `/login` | SSOロゴ、LINEログインボタン、開発用ログイン | 公開 |
| **OAuthコールバック** | `/callback` | LINEログイン完了後のトークン交換処理 | 公開 |
| **利用規約同意** | `/agreement` | サークル規約の確認と同意チェック | ログイン済必須 |
| **ホーム** | `/` | 歓迎メッセージ、クイックメニュー、お知らせ一覧 | 認証 & 同意済 |
| **ユーザー一覧** | `/user` | パート別フィルター、名前検索、メンバー一覧表示 | 認証 & 同意済 |
| **ユーザー詳細** | `/user/detail?uid=xxx` | メンバーの役職・パート・楽器・連絡先表示 | 認証 & 同意済 |
| **プロフィール編集** | `/user/edit` | 自身のプロフィールの編集・登録 | 認証 & 同意済 |

### 3.1. ブランディング & ロゴ
- ロゴ画像: `/public/sso-logo.jpg`（Sound Solition Orchestra 公式ロゴ）
- カラーパレット:
  - メインカラー: `#1e3a8a` (Deep Blue / クラシックなビッグバンドの信頼感と知性)
  - アクセント: `#d97706` (Amber / ブラスセクションの輝きと温かみ)
  - 背景: `#f8fafc` (Slate 50)
  - サーフェス: `#ffffff` (カード・モーダル)
- 全画面モバイルファースト設計、スマートフォンでの片手操作に最適化されたボトムバー・タッチターゲット。

---

## 4. データモデル (Cloud Firestore)

### 4.1. `users` コレクション
ドキュメントID: `uid`（SHA-256 ハッシュ化UID）

| フィールド | 型 | 必須 | 説明 |
| :--- | :--- | :---: | :--- |
| `uid` | string | ○ | ユーザーID |
| `displayName` | string | ○ | 氏名 (例: 愛大 太郎) |
| `kana` | string | - | ふりがな (例: あいだ たろう) |
| `abbreviation` | string | ○ | 略称・短縮名 (例: タロウ) |
| `pictureUrl` | string | - | アイコン画像URL |
| `sectionId` | string | ○ | 所属パートID (1: Sax, 2: Tmp, 3: Trb, 4: Rhythm 等) |
| `roleId` | string | ○ | 役職ID (1: 代表, 2: バンマス, 3: コンマス, 4: メンバー 等) |
| `instrumentIds` | string[] | ○ | 担当楽器ID配列 |
| `grade` | string | - | 学年 (例: B1, B2, B3, B4, M1, OB/OG) |
| `phoneNumber` | string | - | 連絡先電話番号 |
| `paypayId` | string | - | PayPay ID (会計受取用) |
| `agreedAt` | number / Timestamp | ○ | 利用規約同意日時 |
| `isSystemAdmin` | boolean | - | 特権管理者フラグ |
| `createdAt` | number / Timestamp | ○ | 作成日時 |
| `updatedAt` | number / Timestamp | ○ | 更新日時 |

### 4.2. `oauthStates` コレクション
ドキュメントID: `state`（ランダム文字列）
- `state`: string
- `pwaSessionId`: string (任意)
- `createdAt`: Timestamp

### 4.3. マスタデータ (静的定義 & 将来Firestore同期)
- **パート (`sections`)**:
  - `1`: Saxophone
  - `2`: Trumpet
  - `3`: Trombone
  - `4`: Rhythm
  - `5`: Guest / OBOG
- **役職 (`roles`)**:
  - `1`: 代表
  - `2`: バンドマスター (バンマス)
  - `3`: コンサートマスター (コンマス)
  - `4`: 会計マネージャー
  - `5`: パートリーダー
  - `6`: メンバー
- **楽器 (`instruments`)**:
  - Alto Sax, Tenor Sax, Baritone Sax, Trumpet, Trombone, Bass Trombone, Piano, Guitar, Bass, Drums, Percussion 等

---

## 5. 今後の拡張予定機能
1. **イベント・練習出欠管理 (`/event`)** (出欠回答、日程調整、LINE自動催促)
2. **楽譜管理 (`/score`)** (楽譜PDFリンク、YouTube参考音源、譜割り連携)
3. **譜割り管理 (`/assign`)** (担当楽器連動型セクション譜割り編集)
4. **選曲募集 & 投票 (`/call`, `/vote`)** (ボルダ得点法集計)
5. **部費・会計清算 (`/balance`, `/expense`)** (頭割り相殺計算、PayPay送金承認)
6. **AIコンシェルジュ (`/api/chat`)** (Groq SDK RLS連携)
