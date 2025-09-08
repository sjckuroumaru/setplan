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
- 見積概要
  - 件名
  - 見積金額（税込）
  - 見積有効期限
- 請求元情報
  - 自社情報
  - 会社印
  - 担当者名
  - 担当者印
- 明細部
  - 項目一覧（表形式）
  - 小計
  - 消費税
  - 合計金額
- 備考欄

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
- `/estimates/[id]` - 見積書詳細
- `/estimates/[id]/edit` - 見積書編集
- `/estimates/[id]/pdf` - PDF出力

### 3. ユーザー設定
- `/users/[id]/edit` - 印鑑アップロードの追加

## UI/UX要件

### 見積書作成画面
- リアルタイム金額計算
- 明細行の動的追加・削除
- ドラッグ&ドロップによる明細順序変更
- 顧客選択時の自動情報入力
- 自動保存機能（下書き状態）

### 一覧画面
- カード形式またはテーブル形式の切り替え
- ステータスバッジ表示
- クイックアクション（PDF出力、複製、削除）
- 一括操作機能

## セキュリティ要件

- 認証済みユーザーのみアクセス可能
- 管理者のみ自社情報編集可能
- 自分が作成した見積書のみ編集可能（管理者は全て編集可能・閲覧・複製は全ユーザー可能）
- 画像アップロードサイズ制限（最大5MB）
- アップロード可能ファイル形式制限（PNG, JPG, JPEG）

## 技術要件

### 使用技術
- PDF生成：React PDF
- 画像ストレージ：Vercel Blob
- バリデーション：Zod

## 今後の拡張予定

- 請求書機能
- 納品書機能