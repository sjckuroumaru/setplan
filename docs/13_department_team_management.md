# 部署・チーム管理機能 実装計画

## 概要
部署・チーム管理機能の追加と、それに関連する各種機能（発注書管理、案件管理、ユーザー管理、予定実績管理、ガントチャート）の拡張を行う。

## 1. データベーススキーマ変更

### 1.1 Departmentモデルの追加

```prisma
// 部署・チームテーブル
model Department {
  id          String    @id @default(uuid())
  name        String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  users       User[]
  projects    Project[]

  @@map("departments")
}
```

### 1.2 Userモデルの変更

```prisma
model User {
  // 既存フィールド...
  department      String?   // 使用しない（削除せず残す）
  departmentId    String?   // 新規追加

  // Relations追加
  departmentRef   Department? @relation(fields: [departmentId], references: [id])
}
```

### 1.3 Projectモデルの変更

```prisma
model Project {
  // 既存フィールド...
  departmentId      String?   // 新規追加
  purchaseOrderId   String?   // 新規追加

  // Relations追加
  department        Department?    @relation(fields: [departmentId], references: [id])
  purchaseOrder     PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])
}
```

### 1.4 PurchaseOrderモデルの変更

```prisma
model PurchaseOrder {
  // 既存フィールド...
  status    String    @default("draft") // draft -> sent -> approved -> rejected -> closed

  // Relations追加
  projects  Project[]
}
```

**マイグレーション手順:**
1. `schema.prisma`を更新
2. `npx prisma migrate dev --name add_department_management` を実行
3. 生成されたマイグレーションファイルを確認

## 2. API実装

### 2.1 Departments API (`nextjs/src/app/api/departments/`)

#### 2.1.1 `route.ts` (一覧取得・新規作成)

**GET `/api/departments`**
- クエリパラメータ:
  - `page`, `limit`: ページネーション
  - `search`: 部署名検索
- 全ユーザーがアクセス可能
- レスポンス: `{ departments: Department[], pagination: PaginationInfo }`

**POST `/api/departments`**
- 管理者のみ
- リクエストボディ: `{ name: string }`
- バリデーション: 部署名の必須チェック、重複チェック
- レスポンス: `{ department: Department }`

#### 2.1.2 `[id]/route.ts` (詳細取得・更新・削除)

**GET `/api/departments/[id]`**
- 全ユーザーがアクセス可能
- レスポンス: `{ department: Department }`

**PUT `/api/departments/[id]`**
- 管理者のみ
- リクエストボディ: `{ name: string }`
- レスポンス: `{ department: Department }`

**DELETE `/api/departments/[id]`**
- 管理者のみ
- 関連するユーザーや案件が存在する場合はエラー
- レスポンス: `{ message: string }`

### 2.2 Users API 更新

#### `route.ts` (GET)
- クエリパラメータに `departmentId` を追加
- レスポンスの `User` に `departmentRef` を含める（populate）

#### `route.ts` (POST) / `[id]/route.ts` (PUT)
- リクエストボディに `departmentId: string | null` を追加
- 既存の `department` フィールドは無視（後方互換性のため残す）
- バリデーション: `departmentId` が存在する場合、該当部署の存在確認

### 2.3 Projects API 更新

#### `route.ts` (GET)
- クエリパラメータに `departmentId` を追加
- レスポンスの `Project` に `department`, `purchaseOrder` を含める

#### `route.ts` (POST) / `[id]/route.ts` (PUT)
- リクエストボディに追加:
  - `departmentId: string | null`
  - `purchaseOrderId: string | null`
- バリデーション:
  - `departmentId` が存在する場合、該当部署の存在確認
  - `purchaseOrderId` が存在する場合、該当発注書の存在確認

### 2.4 PurchaseOrders API 更新

#### `[id]/route.ts` (PUT)
- リクエストボディに `status` フィールドを追加
- ステータス値: `draft`, `sent`, `approved`, `rejected`, `closed`
- バリデーション: 許可されたステータス値のみ受け付ける

#### `[id]/status/route.ts` (新規作成)

**PUT `/api/purchase-orders/[id]/status`**
- 管理者のみ
- リクエストボディ: `{ status: string }`
- ステータスのみを更新する軽量エンドポイント
- レスポンス: `{ purchaseOrder: PurchaseOrder }`

### 2.5 Schedules API 更新

#### `route.ts` (GET)
- クエリパラメータに `departmentId` を追加
- デフォルトフィルタロジック追加:
  - 管理者ユーザー: 自身の `departmentId` でフィルタ（存在する場合）
  - 一般ユーザー: 自身の `departmentId` でフィルタ + `userId` でフィルタ

### 2.6 Gantt API 更新

#### `route.ts` (GET)
- クエリパラメータに `departmentId` を追加
- デフォルトフィルタロジック追加（Schedulesと同様）

### 2.7 Chart API 更新

#### `nextjs/src/app/api/schedules/chart/route.ts`
- チーム別分析用のエンドポイントを追加または既存エンドポイントを拡張
- 部署ごとの実績時間集計
- 部署ごとのプロジェクト稼働率
- レスポンス: `{ departmentStats: Array<{ departmentId, departmentName, totalHours, projectCount }> }`

## 3. フロントエンド実装

### 3.1 部署・チーム管理画面

#### 3.1.1 一覧画面 (`nextjs/src/app/(main)/settings/departments/page.tsx`)

**機能:**
- 部署一覧をテーブル表示
- 検索機能（部署名）
- 新規作成ボタン（管理者のみ）
- 編集ボタン（各行、管理者のみ）
- 削除ボタン（各行、管理者のみ）
- ページネーション

**権限:**
- 管理者のみアクセス可能

**実装パターン:**
- `/users/page.tsx` を参考

#### 3.1.2 新規作成画面 (`nextjs/src/app/(main)/settings/departments/new/page.tsx`)

**機能:**
- 部署名入力フォーム
- 保存・キャンセルボタン

**権限:**
- 管理者のみアクセス可能

**実装パターン:**
- `/users/new/page.tsx` を参考

#### 3.1.3 編集画面 (`nextjs/src/app/(main)/settings/departments/[id]/edit/page.tsx`)

**機能:**
- 部署名編集フォーム
- 更新・キャンセルボタン

**権限:**
- 管理者のみアクセス可能

**実装パターン:**
- `/users/[id]/edit/page.tsx` を参考

#### 3.1.4 共通フォームコンポーネント (`nextjs/src/components/features/departments/department-form.tsx`)

**機能:**
- 新規作成と編集で共通利用
- React Hook Form + Zod によるバリデーション
- フィールド: `name` (必須)

**実装パターン:**
- `/components/features/users/user-form.tsx` を参考

### 3.2 設定メニュー更新

#### `nextjs/src/app/(main)/settings/layout.tsx` または該当ナビゲーション

- 「部署・チーム管理」メニュー項目を追加
- リンク先: `/settings/departments`
- 管理者のみ表示

### 3.3 ユーザー管理画面更新

#### 3.3.1 一覧画面 (`nextjs/src/app/(main)/users/page.tsx`)

**変更点:**
- 部署・チーム列の表示を `user.departmentRef?.name` に変更
- フィルターに部署選択を追加（Departments APIから取得）

#### 3.3.2 フォームコンポーネント (`nextjs/src/components/features/users/user-form.tsx`)

**変更点:**
- 既存の `department` テキスト入力フィールドを削除
- `departmentId` セレクトボックスを追加
- Departments APIからデータを取得
- 空白許可（必須ではない）
- バリデーションスキーマ更新:
  ```typescript
  departmentId: z.string().optional().nullable()
  ```

### 3.4 発注書管理画面更新

#### 3.4.1 一覧画面 (`nextjs/src/app/(main)/purchase-orders/page.tsx`)

**変更点:**
- ステータス列を追加
- 操作列にステータス変更用のセレクトボックスを追加
  - ステータス選択肢: 下書き・送付済・承認済・却下・終了
  - 変更時に即座に API 呼び出し（`PUT /api/purchase-orders/[id]/status`）
- フィルターにステータス追加

#### 3.4.2 新規作成・編集フォーム

**変更点:**
- `status` セレクトボックスを追加
- 既存フォームに統合

**実装パターン:**
- 既存の発注書フォームを拡張

### 3.5 案件管理画面更新

#### 3.5.1 一覧画面 (`nextjs/src/app/(main)/projects/page.tsx`)

**変更点:**
- 担当部署・チーム列を追加
- 関連発注書列を追加
- フィルターに部署選択を追加

#### 3.5.2 新規作成・編集画面 (`nextjs/src/app/(main)/projects/new/page.tsx`, `[id]/edit/page.tsx`)

**変更点:**
- 担当部署・チーム: Departments APIから取得したデータをセレクトボックスで表示（空白許可）
- 関連発注書: PurchaseOrders APIから取得したデータをセレクトボックスで表示（空白許可）
  - 表示形式: `{orderNumber} - {subject}`

**実装:**
- フォームコンポーネント共通化を検討（`components/features/projects/project-form.tsx`）

### 3.6 予定実績管理画面更新

#### 3.6.1 一覧画面 (`nextjs/src/app/(main)/schedules/page.tsx`)

**変更点:**
- フィルターに部署・チームセレクトボックスを追加
- デフォルトフィルター適用:
  - 管理者: `useEffect` で自身の `departmentId` を初期値にセット
  - 一般ユーザー: 自身の `departmentId` + `userId` を初期値にセット
- Departments APIからデータ取得

#### 3.6.2 新規作成・編集画面 (`nextjs/src/app/(main)/schedules/new/page.tsx`, `[id]/edit/page.tsx`)

**変更点:**
- 案件セレクトボックスのデータ取得ロジック変更:
  - デフォルト: 自身の `departmentId` に紐づく案件（ステータスが `completed`, `suspended` でない）を取得
  - 「全案件取得」ボタンを追加
  - ボタン押下時: すべての案件（ステータスが `completed`, `suspended` でない）を取得
- 状態管理:
  ```typescript
  const [showAllProjects, setShowAllProjects] = useState(false)
  ```

#### 3.6.3 グラフ画面 (`nextjs/src/app/(main)/schedules/chart/page.tsx`)

**変更点:**
- チーム別分析タブを追加
- 部署ごとの実績時間を棒グラフで表示
- 部署ごとのプロジェクト稼働状況を表示
- Chart APIから部署別データを取得

**実装:**
- 既存のグラフライブラリ（Recharts等）を利用
- タブコンポーネントで切り替え

### 3.7 ガントチャート画面更新

#### `nextjs/src/app/(main)/gantt/page.tsx`

**変更点:**
- フィルターに部署・チームセレクトボックスを追加
- デフォルトフィルター適用（予定実績管理と同様）
- Departments APIからデータ取得

## 4. 実装順序

### Phase 1: データベース・API基盤
1. Prismaスキーマ更新
2. マイグレーション実行
3. Departments API 実装 (`/api/departments`)
   - `route.ts` (GET, POST)
   - `[id]/route.ts` (GET, PUT, DELETE)

### Phase 2: 部署・チーム管理画面
4. 部署フォームコンポーネント作成 (`components/features/departments/department-form.tsx`)
5. 部署一覧画面 (`settings/departments/page.tsx`)
6. 部署新規作成画面 (`settings/departments/new/page.tsx`)
7. 部署編集画面 (`settings/departments/[id]/edit/page.tsx`)
8. 設定メニューに部署管理を追加

### Phase 3: ユーザー管理更新
9. Users API 更新 (departmentId 対応)
10. ユーザーフォームコンポーネント更新 (セレクトボックス化)
11. ユーザー一覧画面更新 (部署表示・フィルター)

### Phase 4: 発注書管理更新
12. PurchaseOrders API 更新 (status フィールド追加)
13. PurchaseOrders Status API 実装 (`[id]/status/route.ts`)
14. 発注書フォーム更新 (ステータスセレクトボックス)
15. 発注書一覧画面更新 (ステータス列・操作欄更新)

### Phase 5: 案件管理更新
16. Projects API 更新 (departmentId, purchaseOrderId 対応)
17. 案件フォームコンポーネント作成/更新
18. 案件新規作成・編集画面更新
19. 案件一覧画面更新

### Phase 6: 予定実績管理更新
20. Schedules API 更新 (departmentId フィルタ・デフォルト値)
21. 予定実績一覧画面更新 (フィルター・デフォルト値)
22. 予定実績新規作成・編集画面更新 (案件セレクトボックスロジック)

### Phase 7: グラフ・ガントチャート更新
23. Chart API 更新 (チーム別分析)
24. グラフ画面更新 (チーム別タブ追加)
25. Gantt API 更新 (departmentId フィルタ・デフォルト値)
26. ガントチャート画面更新 (フィルター・デフォルト値)

## 5. 技術的考慮事項

### 5.1 バリデーション
- Zodスキーマを各APIエンドポイントで定義
- フロントエンドでも同様のバリデーションを実施（React Hook Form + Zod）

### 5.2 エラーハンドリング
- 部署削除時に関連データが存在する場合は適切なエラーメッセージを返す
- フロントエンドでトーストメッセージ表示

### 5.3 パフォーマンス
- Departments一覧は件数が少ないと想定されるため、基本的にページネーション不要
- ただし将来的な拡張を考慮してページネーション対応
- セレクトボックス用のデータ取得は軽量化（IDとNameのみ）

### 5.4 後方互換性
- Userモデルの既存 `department` フィールドは削除せず残す
- 既存データのマイグレーションは不要（`departmentId` はnullable）

### 5.5 セキュリティ
- 管理者権限チェックをミドルウェアまたは各APIで実施
- 不正なdepartmentId, purchaseOrderIdの参照を防ぐ

## 6. テストケース

### 6.1 API テスト
- Departments CRUD操作
- 関連データ存在時の削除エラー
- 権限チェック（管理者のみ）
- フィルタリング・検索機能

### 6.2 UI テスト
- 部署管理画面の操作（作成・編集・削除）
- ユーザー管理でのセレクトボックス選択
- 発注書ステータス変更
- 案件の部署・発注書紐付け
- 予定実績のフィルタリング・デフォルト値
- ガントチャートのフィルタリング

### 6.3 統合テスト
- 部署作成 → ユーザーに紐付け → 案件に紐付け → 予定実績作成 → フィルタリング確認

## 7. ドキュメント更新
- API仕様書更新
- ユーザーマニュアル更新（部署・チーム管理の使い方）
- データベーススキーマドキュメント更新

## 8. 実装時の注意点

### 8.1 共通化
- フォームコンポーネントは新規作成と編集で共通化
- セレクトボックスのデータ取得ロジックは共通化

### 8.2 UI/UX
- セレクトボックスは検索可能にする（shadcn/ui Combobox）
- ローディング状態を適切に表示
- エラーメッセージは具体的に

### 8.3 既存機能への影響
- マイグレーション時にエラーが発生しないか確認
- 既存のユーザーデータが正しく表示されるか確認
- 既存の案件・予定実績データが正しく動作するか確認

## 9. 完了定義
- すべてのAPI実装完了
- すべてのフロントエンド画面実装完了
- マイグレーション実行成功
- 既存機能に影響なし
- 基本的なテストケース実施完了
- ドキュメント更新完了
