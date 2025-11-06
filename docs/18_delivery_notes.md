# 18. 納品書作成・管理機能仕様書

## 概要
納品書の作成、管理、PDF出力機能を提供するシステムの仕様書です。
請求書システムの実装パターンを踏襲し、納品書は新規作成と見積書からの変換の2種類の方法で作成可能とします。

## 機能構成

### 1. 納品書管理機能

#### 1.1 納品書作成
納品書を新規作成、または見積書から変換して作成する機能です。

**基本情報：**
- 納品書番号（自動採番：YYYY-MM-NNN形式、例：2025-01-001）
- 納品日（デフォルト：当日）
- 顧客選択（ドロップダウン）
- 敬称（テキスト入力、デフォルト：御中）
- 件名（必須）
- 担当者（ログインユーザー）
- ステータス（draft/sent）
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
- 備考欄（任意）
- 納品元情報（自社情報から自動取得）
- 適格請求書番号（自社情報から自動取得）
- 会社印（自社情報から取得）

#### 1.2 納品書管理
作成した納品書を管理する機能です。

**機能要件：**
- 納品書一覧表示
  - ステータス別フィルタ（下書き/送付済）
  - 顧客別フィルタ
  - 期間指定検索
  - ページネーション
- 納品書詳細表示
- 納品書編集（下書きステータスのみ）
- 納品書複製機能
- 納品書削除（管理者のみ）
- ステータス更新機能
  - 送付済みマーク

#### 1.3 見積書からの変換機能
見積書から納品書を生成する機能です。

**変換ルール：**
- 見積書の明細情報をそのまま引き継ぎ
- 顧客情報を引き継ぎ
- 件名を引き継ぎ
- 納品書番号は新規採番
- ステータスは「draft」で作成
- 元見積書との紐付けを保持

#### 1.4 PDF出力機能
納品書をPDF形式で出力する機能です。

**出力内容：**
- ヘッダー部
  - 「納品書」タイトル
  - 納品書番号
  - 納品日
- 宛先情報
  - 顧客名 + 敬称
  - 顧客住所
- 納品概要
  - 件名
  - 納品金額（税込）
  - メッセージ：「下記の通り納品いたしました。」
- 納品元情報
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
- 備考欄

**PDF生成方式：**
- サーバーサイドで@react-pdf/rendererを使用して生成
- 直接ダウンロード方式（画面遷移なし）
- 日本語フォント（Noto Sans JP）対応

## データベース設計

### 新規テーブル

#### delivery_notes（納品書）
```sql
- id (UUID, PK)
- delivery_note_number (String, ユニーク, 必須)
- estimate_id (UUID, FK, nullable) // 元見積書との紐付け
- customer_id (UUID, FK, 必須)
- honorific (String, デフォルト: 御中)
- subject (String, 必須)
- delivery_date (Date, 必須)
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
- created_at (DateTime)
- updated_at (DateTime)
```

#### delivery_note_items（納品明細）
```sql
- id (UUID, PK)
- delivery_note_id (UUID, FK, 必須)
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

#### companies（自社情報）
納品書機能で使用する項目は既に請求書機能で追加済み：
- qualified_invoice_number (String) // 適格請求書発行事業者登録番号
- seal_image_path (String) // 会社印画像パス

#### estimates（見積書）に追加
```sql
- delivery_note_id (UUID, FK, nullable) // 変換後の納品書ID
```

## 画面構成

### 納品書管理画面
- `/delivery-notes` - 納品書一覧
- `/delivery-notes/new` - 納品書新規作成
- `/delivery-notes/[id]` - 納品書詳細（PDF直接ダウンロード機能付き）
- `/delivery-notes/[id]/edit` - 納品書編集
- `/delivery-notes/from-estimate/[estimateId]` - 見積書から納品書作成

## API エンドポイント

### 納品書API
- `GET /api/delivery-notes` - 納品書一覧取得
- `POST /api/delivery-notes` - 納品書新規作成
- `GET /api/delivery-notes/[id]` - 納品書詳細取得
- `PUT /api/delivery-notes/[id]` - 納品書更新
- `DELETE /api/delivery-notes/[id]` - 納品書削除
- `GET /api/delivery-notes/[id]/pdf` - PDF生成・ダウンロード
- `POST /api/delivery-notes/[id]/duplicate` - 納品書複製
- `POST /api/delivery-notes/from-estimate` - 見積書から納品書作成
- `PUT /api/delivery-notes/[id]/status` - ステータス更新

## UI/UX要件

### 納品書作成画面
- 見積書・請求書作成画面と同様のUI
- リアルタイム金額計算
- 明細行の動的追加・削除
- 顧客選択時の自動情報入力
- 税率別の税額表示（8%、10%別）
- 自動保存機能（下書き状態）

### 納品書詳細画面
- 納品書情報の表示
- PDF直接ダウンロード機能（ページ遷移なし）
- 編集・複製・削除のアクション
- ステータス管理（送付済みマーク）

### 一覧画面
- テーブル形式での表示
- ステータスバッジ表示
  - draft: グレー
  - sent: 青
- クイックアクション（PDF出力、複製、ステータス変更）
- ページネーション機能
- 検索・フィルタ機能

### 見積書からの変換フロー
1. 見積書詳細画面に「納品書作成」ボタン追加
2. ボタンクリックで納品書作成画面へ遷移（データ引き継ぎ）
3. 必要に応じて編集後、保存

## セキュリティ要件

- 認証済みユーザーのみアクセス可能
- 管理者のみ自社情報編集可能
- 自分が作成した納品書のみ編集可能（管理者は全て編集可能）
- ステータスが「sent」以降の納品書は編集不可（管理者除く）
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
- 納品書詳細画面から直接ダウンロード
- blob URLを使用したクライアントサイドダウンロード

#### 適格請求書対応
- 税率ごとの消費税額を明記
- 適格請求書発行事業者登録番号の表示
- インボイス制度に準拠したフォーマット

## PDFレイアウトの主な変更点

請求書PDFとの相違点：

| 項目 | 請求書 | 納品書 |
|-----|-------|--------|
| タイトル | 請　求　書 | 納　品　書 |
| メッセージ | 下記の通り、ご請求申し上げます。 | 下記の通り納品いたしました。 |
| 金額ラベル | ご請求金額： | ご納品金額： |
| 支払期限 | 表示 | **削除（非表示）** |
| 振込先情報 | 表示 | **削除（非表示）** |
| 備考欄デフォルト | お振り込み手数料はお客様ご負担にてお願いいたします。 | なし（空欄） |

## メニュー構成

納品書管理は、書類管理メニュー内の発注請書管理の下に追加：

```
書類管理
├── 見積書管理
├── 発注書管理
├── 発注請書管理
├── 納品書管理  ← 新規追加
└── 請求書管理
```

## テスト要件

### 単体テスト
- 金額計算ロジック（税額、合計金額）
- 納品書番号の自動採番
- ステータス遷移ロジック

### 統合テスト
- 納品書CRUD操作
- 見積書からの変換
- PDF生成・ダウンロード

## 今後の拡張予定

- 定期納品書機能
- 納品書の一括送信機能
- メール送信機能
- 納品レポート機能
- 会計ソフト連携（CSV/API）
- 電子インボイス対応（Peppol等）
- 請求書との連携機能（納品書から請求書作成）

## 参考資料
- 請求書管理機能仕様書（09_invoices.md）
- 見積書管理機能仕様書（08_estimates.md）
- 発注書管理機能仕様書（11_purchase_orders.md）
- 発注請書管理機能仕様書（17_order_confirmations.md）
