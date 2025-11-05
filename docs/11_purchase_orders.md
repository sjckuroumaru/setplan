# 発注書管理機能仕様書

## 1. 概要
発注書管理機能は、外部業者への発注を管理するための機能です。請求書管理機能と同様の基本構造を持ちながら、発注特有の情報管理に対応します。

## 2. 機能要件

### 2.1 基本機能
- 発注書の作成・編集・削除
- 発注書の一覧表示・検索
- 発注書のPDF出力・ダウンロード
- 発注書の複製
- 見積書から発注書への変換

### 2.2 発注書のステータス管理
- **下書き (draft)**: 作成中の発注書
- **送付済み (sent)**: 業者に送付済み
- **受注確認済み (confirmed)**: 業者から受注確認済み
- **納品済み (delivered)**: 商品・サービスの納品完了
- **検収済み (accepted)**: 検収完了
- **キャンセル (cancelled)**: 発注キャンセル

### 2.3 権限管理
- 全ユーザーが全ての発注書を閲覧可能
- 作成者のみが編集・削除可能（下書きステータスのみ）
- 管理者は全ての発注書を編集・削除可能

## 3. データ構造

### 3.1 発注書テーブル (PurchaseOrder)
| フィールド名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| id | String (UUID) | ✓ | 主キー |
| orderNumber | String | ✓ | 発注書番号（PO-YYYYMM-0001形式） |
| supplierId | String | ✓ | 発注先業者ID（Customerテーブルを参照） |
| honorific | String | | 敬称（御中、様など） |
| subject | String | ✓ | 件名 |
| issueDate | DateTime | ✓ | 発注日 |
| deliveryDate | DateTime | | 納期 |
| completionPeriod | String | | 検収完了期間 |
| deliveryLocation | String | | 納入場所 |
| paymentTerms | String | | お支払い条件 |
| userId | String | ✓ | 作成者ID |
| taxType | String | ✓ | 税計算方式（inclusive/exclusive） |
| taxRate | Int | ✓ | 税率（%） |
| roundingType | String | ✓ | 端数処理（floor/ceil/round） |
| subtotal | Decimal | ✓ | 小計 |
| taxAmount | Decimal | ✓ | 消費税額 |
| taxAmount8 | Decimal | | 8%消費税額 |
| taxAmount10 | Decimal | | 10%消費税額 |
| totalAmount | Decimal | ✓ | 合計金額 |
| remarks | String | | 備考 |
| status | String | ✓ | ステータス |
| createdAt | DateTime | ✓ | 作成日時 |
| updatedAt | DateTime | ✓ | 更新日時 |

### 3.2 発注明細テーブル (PurchaseOrderItem)
| フィールド名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| id | String (UUID) | ✓ | 主キー |
| purchaseOrderId | String | ✓ | 発注書ID |
| name | String | ✓ | 項目名 |
| quantity | Decimal | ✓ | 数量 |
| unit | String | | 単位 |
| unitPrice | Decimal | ✓ | 単価 |
| taxType | String | ✓ | 税区分（taxable/non-taxable/tax-included） |
| taxRate | Int | | 税率（8/10/0） |
| amount | Decimal | ✓ | 金額 |
| remarks | String | | 備考 |
| displayOrder | Int | ✓ | 表示順 |
| createdAt | DateTime | ✓ | 作成日時 |
| updatedAt | DateTime | ✓ | 更新日時 |

## 4. API仕様

### 4.1 エンドポイント一覧
| メソッド | パス | 説明 |
|---------|-----|------|
| GET | /api/purchase-orders | 発注書一覧取得 |
| POST | /api/purchase-orders | 発注書新規作成 |
| GET | /api/purchase-orders/[id] | 発注書詳細取得 |
| PUT | /api/purchase-orders/[id] | 発注書更新 |
| DELETE | /api/purchase-orders/[id] | 発注書削除 |
| POST | /api/purchase-orders/[id]/duplicate | 発注書複製 |
| GET | /api/purchase-orders/[id]/pdf | PDF生成・ダウンロード |
| PUT | /api/purchase-orders/[id]/status | ステータス更新 |
| POST | /api/purchase-orders/from-estimate | 見積書から発注書作成 |

### 4.2 リクエスト/レスポンス形式
請求書APIと同様のJSON形式を使用

## 5. UI仕様

### 5.1 画面構成
1. **発注書一覧画面** (/purchase-orders)
   - 発注書の一覧表示
   - ステータスフィルタ
   - 検索機能
   - ページネーション

2. **発注書詳細画面** (/purchase-orders/[id])
   - 発注書内容の表示
   - PDF出力ボタン
   - 編集・複製・削除ボタン（権限に応じて）
   - ステータス変更機能

3. **発注書作成画面** (/purchase-orders/new)
   - 発注先選択
   - 基本情報入力
   - 明細入力
   - 納期・納入場所等の追加情報入力

4. **発注書編集画面** (/purchase-orders/[id]/edit)
   - 既存発注書の編集（下書きのみ）

5. **見積書から発注書作成画面** (/purchase-orders/from-estimate)
   - 見積書選択
   - 内容確認・編集
   - 発注書への変換

### 5.2 入力フィールド
#### 基本情報
- 発注先（セレクトボックス）
- 敬称（テキスト）
- 件名（テキスト）
- 発注日（日付選択）
- **納期**（日付選択）
- **検収完了期間**（テキスト）
- **納入場所**（テキスト）
- **お支払い条件**（テキスト）

#### 明細
- 項目名（テキスト）
- 数量（数値）
- 単位（テキスト）
- 単価（数値）
- 税区分（セレクトボックス）
- 税率（セレクトボックス）
- 金額（自動計算）

#### その他
- 備考（テキストエリア）
- ステータス（セレクトボックス）

## 6. PDF出力仕様

### 6.1 レイアウト
請求書PDFと同様の基本レイアウトを使用し、以下の変更を適用：

#### ヘッダー部
- タイトル：「発 注 書」
- 右上：発注日、発注書番号

#### 本文部
- **左側**：発注先情報（顧客情報）
  - 会社名
  - 住所
  - 電話番号
  - FAX番号
  
#### 追加情報セクション
- 納期
- 検収完了期間
- 納入場所
- お支払い条件

#### 明細テーブル
- 請求書と同様の形式

#### フッター
- 小計・税額・合計金額
- 備考欄

### 6.2 出力形式
- A4サイズ
- 日本語フォント対応（Noto Sans JP）
- カラー印刷対応

## 7. バリデーション

### 7.1 入力値検証
- 発注先：必須、存在チェック
- 件名：必須、最大100文字
- 発注日：必須、日付形式
- 納期：任意、日付形式、発注日以降
- 検収完了期間：任意、最大100文字
- 納入場所：任意、最大200文字
- お支払い条件：任意、最大500文字
- 明細：最低1件必須
- 数量：必須、正の数
- 単価：必須、0以上
- 金額：自動計算、編集不可

### 7.2 ビジネスルール
- 発注書番号は自動採番（重複不可）
- 送付済み以降のステータスでは編集不可
- 削除は下書きステータスのみ可能
- ステータス変更は順次遷移のみ許可

## 8. セキュリティ要件

### 8.1 アクセス制御
- 認証済みユーザーのみアクセス可能
- 作成者と管理者のみ編集・削除可能
- 全ユーザーが閲覧可能

### 8.2 データ保護
- SQLインジェクション対策
- XSS対策
- CSRF対策

## 9. パフォーマンス要件
- 一覧表示：最大100件/ページ
- PDF生成：5秒以内
- 検索レスポンス：2秒以内

## 10. 今後の拡張予定
- 承認ワークフロー機能
- 発注書テンプレート機能
- 自動メール送信機能
- 納品書との連携
- 在庫管理との連携
- 支払管理との連携
- 複数通貨対応
- 電子署名対応