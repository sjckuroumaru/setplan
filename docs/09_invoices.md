# 09. 請求書作成・管理機能仕様書

## 概要
請求書の作成、管理、PDF出力機能を提供するシステムの仕様書です。
見積書システムの実装パターンを踏襲し、請求書は新規作成と見積書からの変換の2種類の方法で作成可能とします。

## 機能構成

### 1. 請求書管理機能

#### 1.1 請求書作成
請求書を新規作成、または見積書から変換して作成する機能です。

**基本情報：**
- 請求書番号（自動採番：INV-YYYYMM-0001形式）
- 請求日（デフォルト：当日）
- 支払期限（デフォルト：翌月末日）
- 顧客選択（ドロップダウン）
- 敬称（テキスト入力、デフォルト：御中）
- 件名（必須）
- 担当者（ログインユーザー）
- ステータス（draft/sent/paid/overdue/cancelled）
- 元見積書ID（見積書から変換の場合）

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
- 備考欄（デフォルト：「お振り込み手数料はお客様ご負担にてお願いいたします。」）
- 請求元情報（自社情報から自動取得）
- 振込先情報（自社情報から自動取得）
- 適格請求書番号（自社情報から自動取得）
- 会社印（自社情報から取得）

#### 1.2 請求書管理
作成した請求書を管理する機能です。

**機能要件：**
- 請求書一覧表示
  - ステータス別フィルタ（下書き/送付済/入金済/期限超過/キャンセル）
  - 顧客別フィルタ
  - 期間指定検索
  - ページネーション
- 請求書詳細表示
- 請求書編集（下書きステータスのみ）
- 請求書複製機能
- 請求書削除（管理者のみ）
- ステータス更新機能
  - 送付済みマーク
  - 入金済みマーク
  - キャンセル

#### 1.3 見積書からの変換機能
見積書から請求書を生成する機能です。

**変換ルール：**
- 見積書の明細情報をそのまま引き継ぎ
- 顧客情報を引き継ぎ
- 件名を引き継ぎ
- 請求書番号は新規採番
- ステータスは「draft」で作成
- 元見積書との紐付けを保持

#### 1.4 PDF出力機能
請求書をPDF形式で出力する機能です。

**出力内容：**
- ヘッダー部
  - 「請求書」タイトル
  - 請求書番号
  - 請求日
  - 支払期限
- 宛先情報
  - 顧客名 + 敬称
  - 顧客住所
- 請求概要
  - 件名
  - 請求金額（税込）
- 請求元情報
  - 自社情報（会社名、住所、電話番号、FAX番号）
  - 適格請求書発行事業者登録番号
  - 会社印（右上にオーバーレイ表示）
- 明細部
  - 項目一覧（表形式）
    - 項目名
    - 数量（中央揃え）
    - 単位（中央揃え）
    - 単価（右揃え）
    - 金額（右揃え）
  - 小計（右揃え）
  - 消費税額（税率別に表示）
  - 合計金額（右揃え、強調表示）
- 振込先情報
  - 銀行名
  - 支店名
  - 口座種別
  - 口座番号
  - 口座名義
- 備考欄

**PDF生成方式：**
- サーバーサイドで@react-pdf/rendererを使用して生成
- 直接ダウンロード方式（画面遷移なし）
- 日本語フォント（Noto Sans JP）対応

### 2. 自社情報管理の拡張

#### 2.1 追加管理項目
請求書機能のため、自社情報に以下の項目を追加します。

**適格請求書発行事業者情報：**
- 適格請求書発行事業者登録番号（例：T8180301018526）

**振込先口座情報：**
- 銀行名
- 支店名
- 口座種別（普通/当座）
- 口座番号
- 口座名義

### 3. 支払い管理機能（簡易版）

#### 3.1 入金ステータス管理
- 請求書ごとの入金状態を管理
- 入金日の記録
- 入金額の記録（部分入金対応）

## データベース設計

### 新規テーブル

#### invoices（請求書）
```sql
- id (UUID, PK)
- invoice_number (String, ユニーク, 必須)
- estimate_id (UUID, FK, nullable) // 元見積書との紐付け
- customer_id (UUID, FK, 必須)
- honorific (String, デフォルト: 御中)
- subject (String, 必須)
- issue_date (Date, 必須)
- due_date (Date, 必須)
- user_id (UUID, FK, 必須)
- tax_type (String) // inclusive/exclusive
- tax_rate (Integer, デフォルト: 10)
- rounding_type (String) // floor/ceil/round
- subtotal (Decimal)
- tax_amount (Decimal)
- tax_amount_8 (Decimal) // 8%税額
- tax_amount_10 (Decimal) // 10%税額
- total_amount (Decimal)
- remarks (Text)
- status (String, デフォルト: draft)
- paid_amount (Decimal, デフォルト: 0) // 入金済み金額
- paid_date (Date, nullable) // 入金日
- created_at (DateTime)
- updated_at (DateTime)
```

#### invoice_items（請求明細）
```sql
- id (UUID, PK)
- invoice_id (UUID, FK, 必須)
- name (String, 必須)
- quantity (Decimal, デフォルト: 1)
- unit (String)
- unit_price (Decimal)
- tax_type (String) // taxable/non-taxable/tax-included
- tax_rate (Integer) // 8/10/0
- amount (Decimal)
- remarks (Text)
- display_order (Integer)
- created_at (DateTime)
- updated_at (DateTime)
```

### 既存テーブルの更新

#### companies（自社情報）に追加
```sql
- invoice_prefix (String, デフォルト: INV) // 請求書番号接頭辞
- qualified_invoice_number (String) // 適格請求書発行事業者登録番号
- bank_name (String) // 銀行名
- branch_name (String) // 支店名
- account_type (String) // 口座種別
- account_number (String) // 口座番号
- account_holder (String) // 口座名義
```

#### estimates（見積書）に追加
```sql
- invoice_id (UUID, FK, nullable) // 変換後の請求書ID
```

## 画面構成

### 請求書管理画面
- `/invoices` - 請求書一覧
- `/invoices/new` - 請求書新規作成
- `/invoices/[id]` - 請求書詳細（PDF直接ダウンロード機能付き）
- `/invoices/[id]/edit` - 請求書編集
- `/invoices/from-estimate/[estimateId]` - 見積書から請求書作成

### 設定画面の更新
- `/settings/company` - 自社情報設定（振込先情報、適格請求書番号追加）

## API エンドポイント

### 請求書API
- `GET /api/invoices` - 請求書一覧取得
- `POST /api/invoices` - 請求書新規作成
- `GET /api/invoices/[id]` - 請求書詳細取得
- `PUT /api/invoices/[id]` - 請求書更新
- `DELETE /api/invoices/[id]` - 請求書削除
- `GET /api/invoices/[id]/pdf` - PDF生成・ダウンロード
- `POST /api/invoices/[id]/duplicate` - 請求書複製
- `POST /api/invoices/from-estimate` - 見積書から請求書作成
- `PUT /api/invoices/[id]/status` - ステータス更新
- `PUT /api/invoices/[id]/payment` - 入金情報更新

### 自社情報API（更新）
- `GET /api/company` - 自社情報取得（振込先情報含む）
- `PUT /api/company` - 自社情報更新（振込先情報含む）

## UI/UX要件

### 請求書作成画面
- 見積書作成画面と同様のUI
- リアルタイム金額計算
- 明細行の動的追加・削除
- 顧客選択時の自動情報入力
- 税率別の税額表示（8%、10%別）
- 自動保存機能（下書き状態）

### 請求書詳細画面
- 請求書情報の表示
- PDF直接ダウンロード機能（ページ遷移なし）
- 編集・複製・削除のアクション
- ステータス管理（送付済み、入金済みマーク）
- 入金情報の記録

### 一覧画面
- テーブル形式での表示
- ステータスバッジ表示
  - draft: グレー
  - sent: 青
  - paid: 緑
  - overdue: 赤
  - cancelled: 黒
- クイックアクション（PDF出力、複製、ステータス変更）
- 期限超過の自動判定と表示
- ページネーション機能
- 検索・フィルタ機能

### 見積書からの変換フロー
1. 見積書詳細画面に「請求書作成」ボタン追加
2. ボタンクリックで請求書作成画面へ遷移（データ引き継ぎ）
3. 必要に応じて編集後、保存

## セキュリティ要件

- 認証済みユーザーのみアクセス可能
- 管理者のみ自社情報編集可能（振込先情報含む）
- 自分が作成した請求書のみ編集可能（管理者は全て編集可能）
- ステータスが「sent」以降の請求書は編集不可（管理者除く）
- 削除は管理者のみ可能

## 技術要件

### 使用技術
- PDF生成：@react-pdf/renderer（サーバーサイド生成）
- バリデーション：Zod
- フォーム管理：React Hook Form
- 状態管理：React hooks
- API：Next.js App Router API Routes
- 認証：NextAuth.js
- データベース：Prisma + PostgreSQL

### 実装上の注意点

#### Next.js 15対応
- 動的ルートのparamsがPromiseとして扱われる
- API RouteでのZodError処理は`error.flatten()`を使用
- フォームバリデーションでzodResolverに型アサーション必要

#### PDFダウンロード
- 請求書詳細画面から直接ダウンロード
- blob URLを使用したクライアントサイドダウンロード

#### 適格請求書対応
- 税率ごとの消費税額を明記
- 適格請求書発行事業者登録番号の表示
- インボイス制度に準拠したフォーマット

## テスト要件

### 単体テスト
- 金額計算ロジック（税額、合計金額）
- 請求書番号の自動採番
- ステータス遷移ロジック
- 期限超過判定ロジック

### 統合テスト
- 請求書CRUD操作
- 見積書からの変換
- PDF生成・ダウンロード
- 入金処理フロー

## 今後の拡張予定

- 定期請求書機能
- 請求書の一括送信機能
- メール送信機能
- 支払いリマインダー機能
- 売上レポート機能
- 会計ソフト連携（CSV/API）
- 電子インボイス対応（Peppol等）