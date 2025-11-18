# 20. 見積書ファイル添付機能仕様書

## 概要
見積書に関連ファイル（発注書など）を添付・管理する機能の仕様書です。
見積書の新規作成、編集画面でのファイルアップロード、および詳細画面でのダウンロード機能を提供します。

## ユースケース
- 顧客から受け取った発注書を見積書に添付して保管
- 関連する仕様書や参考資料の添付
- 契約書や合意書の添付
- 過去のやり取りに関する資料の保管

## 機能構成

### 1. ファイルアップロード機能

#### 1.1 対象画面
- 見積書新規作成画面（`/estimates/new`）
- 見積書編集画面（`/estimates/[id]/edit`）

#### 1.2 アップロード要件

**許可ファイル形式：**
- PDF（.pdf）
- Word文書（.doc, .docx）
- Excel文書（.xls, .xlsx）
- 画像（.jpg, .jpeg, .png）
- テキスト（.txt）

**制限事項：**
- 最大ファイルサイズ：10MB/ファイル
- 1つの見積書に添付できるファイル数：最大10個
- ファイル名：255文字まで

**UI要件：**
- ドラッグ&ドロップでのアップロード対応
- ファイル選択ダイアログでのアップロード対応
- アップロード進捗表示
- アップロード後のプレビュー表示（ファイル名、サイズ、アップロード日時）
- 個別削除ボタン

#### 1.3 アップロード処理フロー

1. クライアントでファイルバリデーション
   - ファイル形式チェック
   - ファイルサイズチェック
   - ファイル数チェック

2. サーバー側でファイルアップロード
   - Vercel Blobへのアップロード
   - データベースへのメタデータ保存
   - エラーハンドリング

3. アップロード完了後
   - ファイル一覧の更新
   - 成功メッセージ表示

### 2. ファイルダウンロード機能

#### 2.1 対象画面
- 見積書詳細画面（`/estimates/[id]`）
- 見積書編集画面（`/estimates/[id]/edit`）

#### 2.2 ダウンロード要件

**表示内容：**
- ファイル名
- ファイルサイズ
- アップロード日時
- アップロードユーザー名
- ダウンロードボタン

**ダウンロード処理：**
- ボタンクリックで即座にダウンロード開始
- 元のファイル名でダウンロード
- Content-Dispositionヘッダーで適切に処理

### 3. ファイル削除機能

#### 3.1 削除要件
- 編集画面からのみ削除可能
- 削除確認ダイアログ表示
- Vercel Blobとデータベースから削除
- 削除権限チェック（作成者または管理者のみ）

#### 3.2 削除処理フロー
1. 削除ボタンクリック
2. 確認ダイアログ表示
3. 確認後、APIリクエスト送信
4. Vercel Blobから物理削除
5. データベースレコード削除
6. ファイル一覧の更新

## データベース設計

### estimate_attachments（見積書添付ファイル）

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| id | UUID | NO | uuid() | 主キー |
| estimateId | UUID | NO | - | 見積書ID |
| fileName | VARCHAR(255) | NO | - | オリジナルファイル名 |
| fileSize | INTEGER | NO | - | ファイルサイズ（バイト） |
| mimeType | VARCHAR(100) | NO | - | MIMEタイプ |
| blobPath | VARCHAR(500) | NO | - | Vercel Blobのパス |
| blobUrl | TEXT | NO | - | Vercel BlobのURL |
| uploadedBy | UUID | NO | - | アップロードユーザーID |
| description | TEXT | YES | - | ファイルの説明 |
| createdAt | TIMESTAMP | NO | now() | 作成日時 |
| updatedAt | TIMESTAMP | NO | updatedAt | 更新日時 |

**インデックス：**
- PRIMARY KEY (id)
- INDEX (estimateId, createdAt)
- FOREIGN KEY (estimateId) REFERENCES estimates(id) ON DELETE CASCADE
- FOREIGN KEY (uploadedBy) REFERENCES User(id)

**リレーション：**
- 見積書（estimates） : 添付ファイル（estimate_attachments） = 1 : N
- ユーザー（User） : 添付ファイル（estimate_attachments） = 1 : N

**カスケード削除：**
- 見積書削除時、関連する添付ファイルも自動削除（物理削除とBlob削除）

## API設計

### ファイルアップロードAPI

**エンドポイント：** `POST /api/estimates/[id]/attachments`

**リクエスト：**
- Content-Type: multipart/form-data
- Body: FormData
  - file: File（必須）
  - description: string（任意）

**レスポンス（成功）：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "estimateId": "uuid",
    "fileName": "発注書.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "blobUrl": "https://...",
    "uploadedBy": "uuid",
    "uploadedByName": "山田太郎",
    "description": "○○株式会社からの発注書",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**エラーレスポンス：**
```json
{
  "success": false,
  "error": "ファイルサイズが上限を超えています"
}
```

**エラーコード：**
- 400: バリデーションエラー（ファイル形式、サイズ、ファイル数制限）
- 401: 認証エラー
- 403: 権限エラー
- 404: 見積書が見つからない
- 413: ファイルサイズ超過
- 500: サーバーエラー

### ファイル一覧取得API

**エンドポイント：** `GET /api/estimates/[id]/attachments`

**レスポンス：**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fileName": "発注書.pdf",
      "fileSize": 1024000,
      "mimeType": "application/pdf",
      "uploadedBy": "uuid",
      "uploadedByName": "山田太郎",
      "description": "○○株式会社からの発注書",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### ファイルダウンロードAPI

**エンドポイント：** `GET /api/estimates/[id]/attachments/[attachmentId]/download`

**レスポンス：**
- ファイルのバイナリデータ
- Content-Type: ファイルのMIMEタイプ
- Content-Disposition: attachment; filename="発注書.pdf"

### ファイル削除API

**エンドポイント：** `DELETE /api/estimates/[id]/attachments/[attachmentId]`

**レスポンス（成功）：**
```json
{
  "success": true,
  "message": "ファイルを削除しました"
}
```

**エラーレスポンス：**
```json
{
  "success": false,
  "error": "ファイルの削除に失敗しました"
}
```

## 画面設計

### 1. 見積書新規作成・編集画面

#### ファイル添付セクション

```
┌─────────────────────────────────────────┐
│ 関連ファイル                              │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ ファイルをドラッグ&ドロップ           │ │
│ │ または                                │ │
│ │ [ファイルを選択] ボタン               │ │
│ └─────────────────────────────────────┘ │
│                                           │
│ 添付ファイル一覧（2/10）                  │
│ ┌─────────────────────────────────────┐ │
│ │ 📄 発注書.pdf                         │ │
│ │    1.2 MB | 2024/01/01 10:00         │ │
│ │    アップロード: 山田太郎     [削除]  │ │
│ ├─────────────────────────────────────┤ │
│ │ 📄 仕様書.docx                        │ │
│ │    2.5 MB | 2024/01/01 11:00         │ │
│ │    アップロード: 山田太郎     [削除]  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 2. 見積書詳細画面

#### 関連ファイル表示セクション

```
┌─────────────────────────────────────────┐
│ 関連ファイル                              │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 📄 発注書.pdf                         │ │
│ │    1.2 MB | 2024/01/01 10:00         │ │
│ │    アップロード: 山田太郎             │ │
│ │    [ダウンロード]                     │ │
│ ├─────────────────────────────────────┤ │
│ │ 📄 仕様書.docx                        │ │
│ │    2.5 MB | 2024/01/01 11:00         │ │
│ │    アップロード: 山田太郎             │ │
│ │    [ダウンロード]                     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## セキュリティ要件

### 1. アクセス制御
- 認証済みユーザーのみファイルアップロード可能
- 見積書の閲覧権限があるユーザーのみダウンロード可能
- 見積書の編集権限があるユーザー、またはファイルのアップロード者のみ削除可能
- 管理者は全てのファイルを削除可能

### 2. ファイルバリデーション
- ファイル拡張子のホワイトリストチェック
- MIMEタイプの検証（拡張子との一致確認）
- ファイルサイズの制限（10MB）
- ファイル数の制限（最大10個）
- ファイル名のサニタイズ（特殊文字の除去）

### 3. ストレージセキュリティ
- Vercel Blobの署名付きURLを使用
- 直接URL推測によるアクセスを防止
- ファイルダウンロード時の認証・認可チェック
- URLの有効期限設定（1時間）

### 4. エラーハンドリング
- 詳細なエラー情報の非公開（攻撃者への情報漏洩防止）
- 適切なHTTPステータスコードの返却
- ログへのエラー詳細記録

## 技術要件

### 使用技術
- ファイルストレージ：Vercel Blob
- ファイルアップロード：FormData API
- バリデーション：Zod
- UI：react-dropzone（ドラッグ&ドロップ）
- アイコン：lucide-react
- API：Next.js App Router API Routes

### Vercel Blob設定
```typescript
// blob設定例
import { put, del } from '@vercel/blob';

// アップロード
const blob = await put(file.name, file, {
  access: 'public',
  token: process.env.BLOB_READ_WRITE_TOKEN,
});

// 削除
await del(blobUrl, {
  token: process.env.BLOB_READ_WRITE_TOKEN,
});
```

## 実装上の注意点

### 1. ファイル名の取り扱い
- 日本語ファイル名の正しいエンコーディング
- 特殊文字のエスケープ処理
- 重複ファイル名の処理（タイムスタンプ付加）

### 2. トランザクション処理
- ファイルアップロード失敗時のロールバック
  1. Vercel Blobへのアップロード
  2. データベースへの保存
  3. いずれか失敗時は、既にアップロードしたBlobを削除

### 3. 削除処理の整合性
- 見積書削除時の添付ファイル削除
  1. データベースから添付ファイル一覧を取得
  2. 各ファイルをVercel Blobから削除
  3. データベースレコードを削除（CASCADE）

### 4. エラー処理
- ネットワークエラー時のリトライ
- タイムアウト処理
- ユーザーへの適切なエラーメッセージ表示

### 5. パフォーマンス
- 大容量ファイルのチャンクアップロード（将来拡張）
- アップロード進捗の表示
- サムネイル生成（画像ファイルの場合）

## UI/UX要件

### アップロード体験
- ドラッグ&ドロップエリアの視覚的フィードバック
- アップロード中の進捗バー表示
- 成功・失敗の明確な通知
- 複数ファイルの同時アップロード対応

### ファイル一覧表示
- ファイルタイプに応じたアイコン表示
- ファイルサイズの人間が読みやすい形式（1.2 MB）
- 日時の相対表示（「2時間前」など）
- ホバー時のツールチップ表示

### エラー表示
- フィールドレベルのエラー表示
- 全体エラーの通知
- エラー時の再試行ボタン

## Prisma スキーマ定義

```prisma
model EstimateAttachment {
  id          String   @id @default(uuid())
  estimateId  String
  fileName    String   @db.VarChar(255)
  fileSize    Int
  mimeType    String   @db.VarChar(100)
  blobPath    String   @db.VarChar(500)
  blobUrl     String   @db.Text
  uploadedBy  String
  description String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  estimate    Estimate @relation(fields: [estimateId], references: [id], onDelete: Cascade)
  uploader    User     @relation(fields: [uploadedBy], references: [id])

  @@index([estimateId, createdAt])
  @@map("estimate_attachments")
}

// Estimateモデルに追加
model Estimate {
  // 既存のフィールド...
  attachments EstimateAttachment[]
}

// Userモデルに追加
model User {
  // 既存のフィールド...
  estimateAttachments EstimateAttachment[]
}
```

## マイグレーション

### マイグレーションファイル例

```sql
-- CreateTable
CREATE TABLE "estimate_attachments" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "blobPath" VARCHAR(500) NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_attachments_estimateId_createdAt_idx"
    ON "estimate_attachments"("estimateId", "createdAt");

-- AddForeignKey
ALTER TABLE "estimate_attachments"
    ADD CONSTRAINT "estimate_attachments_estimateId_fkey"
    FOREIGN KEY ("estimateId")
    REFERENCES "estimates"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_attachments"
    ADD CONSTRAINT "estimate_attachments_uploadedBy_fkey"
    FOREIGN KEY ("uploadedBy")
    REFERENCES "users"("id")
    ON UPDATE CASCADE;
```

## テストシナリオ

### 1. ファイルアップロードテスト
- [ ] 許可された形式のファイルをアップロード成功
- [ ] 許可されていない形式のファイルをアップロード失敗
- [ ] 10MBを超えるファイルをアップロード失敗
- [ ] 10個を超えるファイルをアップロード失敗
- [ ] 同名ファイルのアップロード処理
- [ ] ドラッグ&ドロップでのアップロード
- [ ] 複数ファイルの同時アップロード

### 2. ファイルダウンロードテスト
- [ ] 添付ファイルのダウンロード成功
- [ ] 元のファイル名でダウンロード
- [ ] 権限のないユーザーによるダウンロード失敗

### 3. ファイル削除テスト
- [ ] 自分がアップロードしたファイルの削除成功
- [ ] 他人がアップロードしたファイルの削除失敗（一般ユーザー）
- [ ] 管理者による全ファイルの削除成功
- [ ] 見積書削除時の添付ファイル一括削除

### 4. エラーハンドリングテスト
- [ ] ネットワークエラー時の処理
- [ ] Vercel Blobアップロード失敗時の処理
- [ ] データベース保存失敗時のロールバック
- [ ] 存在しないファイルのダウンロード試行

## 今後の拡張予定

### 1. 機能拡張
- ファイルのプレビュー機能（PDF、画像）
- ファイルの説明欄編集機能
- ファイルの並び替え機能
- ファイルの一括ダウンロード（ZIP）
- サムネイル表示（画像ファイル）
- バージョン管理（同名ファイルの履歴管理）

### 2. 他機能への展開
- 請求書への添付機能
- 発注書への添付機能
- 納品書への添付機能
- 注文請書への添付機能
- プロジェクトへの添付機能

### 3. パフォーマンス改善
- チャンクアップロード対応（大容量ファイル）
- 画像の自動圧縮
- CDN配信の最適化

### 4. セキュリティ強化
- ウイルススキャン
- ファイル内容の検証
- 暗号化ストレージ
- アクセスログの記録
