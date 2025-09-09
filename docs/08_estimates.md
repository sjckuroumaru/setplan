# 08. 見積書作成・管理機能仕様書

## 概要
見積書の作成、管理、PDF出力機能を提供するシステムの仕様書です。
Misocaのような使いやすいUIを目指し、自社情報、顧客情報、見積書の管理を統合的に行います。

## 機能構成

### 1. マスタ管理機能

#### 1.1 自社情報管理
自社の基本情報を管理する機能です。見積書の請求元情報として使用されます。

**管理項目：**
- 会社名（必須）
- 郵便番号
- 住所
- ビル名
- 代表者名
- 電話番号
- FAX番号
- 備考
- 会社印画像（Vercel Blobのpathname）

**機能要件：**
- 自社情報は1件のみ登録可能（更新のみ）
- 会社印画像のアップロード機能
- 画像はVercel Blobに保存
- 管理者権限のあるユーザーのみメニューに表示・修正等が可能

### 2. 顧客管理機能

#### 2.1 顧客情報管理
見積書の宛先となる顧客情報を管理します。

**管理項目：**
- 顧客ID（自動採番）
- 会社名（必須）
- 郵便番号
- 住所
- ビル名
- 代表者名
- 電話番号
- FAX番号
- 備考
- ステータス（active/inactive）
- 登録日時
- 更新日時

**機能要件：**
- 顧客一覧表示（検索・ソート機能付き）
- 顧客情報の新規登録
- 顧客情報の編集
- 顧客情報の削除
- 顧客名での検索機能

### 3. 見積書作成・管理機能

#### 3.1 見積書作成
見積書を新規作成する機能です。

**基本情報：**
- 見積書番号（自動採番：YYYYMM-0001形式）
- 作成日（デフォルト：当日）
- 顧客選択（ドロップダウン）
- 敬称（テキスト入力、デフォルト：御中）
- 件名（必須）
- 見積有効期限（デフォルト：1ヶ月後）
- 担当者（ログインユーザー）
- ステータス（draft/sent/accepted/rejected/expired）

**明細情報：**
- 項目名（必須）
- 数量（デフォルト：1）
- 単位（個、式、時間など）
- 単価
- 税区分（税込/税別/非課税）
- 金額（自動計算）
- 備考
- 表示順

**計算設定：**
- 税計算方法（税別/税込）
- 消費税率（10%/8%/0%）
- 端数処理（切り捨て/切り上げ/四捨五入）

**その他：**
- 備考欄（デフォルト：「大幅な内容変更が生じた際には、再度お見積りさせて頂きます。」）
- 請求元情報（自社情報から自動取得）
- 担当者印（ユーザー情報から取得）
- 会社印（自社情報から取得）

#### 3.2 見積書管理
作成した見積書を管理する機能です。

**機能要件：**
- 見積書一覧表示
  - ステータス別フィルタ
  - 顧客別フィルタ
  - 期間指定検索
  - ページネーション
- 見積書詳細表示
- 見積書編集
- 見積書複製機能
- 見積書削除

#### 3.3 PDF出力機能
見積書をPDF形式で出力する機能です。

**出力内容：**
- ヘッダー部
  - 「御見積書」タイトル
  - 見積書番号
  - 作成日
- 宛先情報
  - 顧客名 + 敬称
  - 顧客住所
- 見積概要
  - 件名
  - 見積金額（税込）
  - 見積有効期限
- 請求元情報
  - 自社情報（会社名、住所、電話番号、FAX番号）
  - 会社印（右上にオーバーレイ表示）
  - 担当者名
  - 担当者印（右下にオーバーレイ表示）
- 明細部
  - 項目一覧（表形式）
    - 項目名
    - 数量（中央揃え）
    - 単位（中央揃え）
    - 単価（右揃え）
    - 金額（右揃え）
  - 小計（右揃え）
  - 消費税（右揃え）
  - 合計金額（右揃え、強調表示）
- 見積条件・備考欄

**PDF生成方式：**
- サーバーサイドでReact PDFを使用して生成
- 直接ダウンロード方式（画面遷移なし）
- 日本語フォント（Noto Sans JP）対応

### 4. ユーザー情報拡張

#### 4.1 担当者印管理
ユーザーごとの担当者印を管理します。

**追加項目：**
- 担当者印画像（Vercel Blobのpathname）

**機能要件：**
- ユーザープロフィール画面に印鑑アップロード機能追加
- 画像形式：PNG/JPG
- 推奨サイズ：200x200px
- 背景透過推奨

## データベース設計

### テーブル構成

#### companies（自社情報）
```sql
- id (UUID, PK)
- name (String, 必須)
- postal_code (String)
- address (String)
- building (String)
- representative (String)
- phone (String)
- fax (String)
- remarks (Text)
- seal_image_path (String)
- created_at (DateTime)
- updated_at (DateTime)
```

#### customers（顧客）
```sql
- id (UUID, PK)
- name (String, 必須)
- postal_code (String)
- address (String)
- building (String)
- representative (String)
- phone (String)
- fax (String)
- remarks (Text)
- status (String, デフォルト: active)
- created_at (DateTime)
- updated_at (DateTime)
```

#### estimates（見積書）
```sql
- id (UUID, PK)
- estimate_number (String, ユニーク)
- customer_id (UUID, FK)
- honorific (String, デフォルト: 御中)
- subject (String, 必須)
- issue_date (Date)
- valid_until (Date)
- user_id (UUID, FK)
- tax_type (String) // inclusive/exclusive
- tax_rate (Integer, デフォルト: 10)
- rounding_type (String) // floor/ceil/round
- subtotal (Decimal)
- tax_amount (Decimal)
- total_amount (Decimal)
- remarks (Text)
- status (String, デフォルト: draft)
- created_at (DateTime)
- updated_at (DateTime)
```

#### estimate_items（見積明細）
```sql
- id (UUID, PK)
- estimate_id (UUID, FK)
- name (String, 必須)
- quantity (Decimal, デフォルト: 1)
- unit (String)
- unit_price (Decimal)
- tax_type (String) // taxable/non-taxable/tax-included
- amount (Decimal)
- remarks (Text)
- display_order (Integer)
- created_at (DateTime)
- updated_at (DateTime)
```

#### users（既存テーブルに追加）
```sql
- seal_image_path (String) // 追加カラム
```

## 画面構成

### 1. マスタ管理
- `/settings/company` - 自社情報設定
- `/customers` - 顧客一覧
- `/customers/new` - 顧客新規登録
- `/customers/[id]/edit` - 顧客編集

### 2. 見積書管理
- `/estimates` - 見積書一覧
- `/estimates/new` - 見積書新規作成
- `/estimates/[id]` - 見積書詳細（PDF直接ダウンロード機能付き）
- `/estimates/[id]/edit` - 見積書編集

### 3. ユーザー設定
- `/users/[id]/edit` - 印鑑アップロードの追加

## API エンドポイント

### 見積書API
- `GET /api/estimates` - 見積書一覧取得
- `POST /api/estimates` - 見積書新規作成
- `GET /api/estimates/[id]` - 見積書詳細取得
- `PUT /api/estimates/[id]` - 見積書更新
- `DELETE /api/estimates/[id]` - 見積書削除
- `GET /api/estimates/[id]/pdf` - PDF生成・ダウンロード
- `POST /api/estimates/[id]/duplicate` - 見積書複製

### 顧客API
- `GET /api/customers` - 顧客一覧取得
- `POST /api/customers` - 顧客新規作成
- `GET /api/customers/[id]` - 顧客詳細取得
- `PUT /api/customers/[id]` - 顧客更新
- `DELETE /api/customers/[id]` - 顧客削除

### 自社情報API
- `GET /api/company` - 自社情報取得
- `PUT /api/company` - 自社情報更新
- `POST /api/company/seal` - 会社印アップロード
- `DELETE /api/company/seal` - 会社印削除

### ユーザー印鑑API
- `POST /api/users/[id]/seal` - ユーザー印鑑アップロード
- `DELETE /api/users/[id]/seal` - ユーザー印鑑削除

## UI/UX要件

### 見積書作成画面
- リアルタイム金額計算
- 明細行の動的追加・削除
- 顧客選択時の自動情報入力
- 自動保存機能（下書き状態）
- 見積条件のデフォルトテキスト設定

### 見積書詳細画面
- 見積書情報の表示
- PDF直接ダウンロード機能（ページ遷移なし）
- 編集・複製・削除のアクション
- ステータス管理

### 一覧画面
- テーブル形式での表示
- ステータスバッジ表示
- クイックアクション（PDF出力、複製、削除）
- ページネーション機能
- 検索・フィルタ機能

## セキュリティ要件

- 認証済みユーザーのみアクセス可能
- 管理者のみ自社情報編集可能
- 自分が作成した見積書のみ編集可能（管理者は全て編集可能・閲覧・複製は全ユーザー可能）
- 画像アップロードサイズ制限（最大5MB）
- アップロード可能ファイル形式制限（PNG, JPG, JPEG）

## 技術要件

### 使用技術
- PDF生成：@react-pdf/renderer（サーバーサイド生成）
- 画像ストレージ：Vercel Blob
- バリデーション：Zod
- フォーム管理：React Hook Form
- 状態管理：React hooks
- API：Next.js App Router API Routes
- 認証：NextAuth.js

## 実装上の注意点

### Next.js 15対応
- 動的ルートのparamsがPromiseとして扱われる
- API RouteでのZodError処理は`error.flatten()`を使用
- フォームバリデーションでzodResolverに型アサーション必要

### PDFダウンロード
- 見積書詳細画面から直接ダウンロード
- `/estimates/[id]/pdf`ページは廃止
- blob URLを使用したクライアントサイドダウンロード

## 今後の拡張予定

- 請求書機能
- 納品書機能
- 見積書テンプレート機能
- メール送信機能
- 承認ワークフロー