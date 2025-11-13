# SaaS化変革プラン

## 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [マルチテナント化の技術設計](#2-マルチテナント化の技術設計)
3. [新規必須機能](#3-新規必須機能)
4. [既存機能の強化](#4-既存機能の強化)
5. [UI/UX変革](#5-uiux変革)
6. [料金プラン提案](#6-料金プラン提案)
7. [セキュリティ強化](#7-セキュリティ強化)
8. [API・外部連携](#8-api外部連携)
9. [開発ロードマップ](#9-開発ロードマップ)
10. [成功指標（KPI）](#10-成功指標kpi)

---

## 1. エグゼクティブサマリー

### 1.1 プロダクトビジョン

**「中小企業の業務管理を一つに統合する、シンプルで強力なプラットフォーム」**

Set Planは、予定実績管理、勤怠管理、課題管理、見積・請求書管理、実績台帳を統合した、中小企業向けの総合業務管理SaaSです。

### 1.2 ターゲット市場

**中小企業（従業員数20〜200名）**

- **ペインポイント**：
  - 複数のツールを使い分ける手間とコスト
  - Excelでの管理による属人化とミス
  - 予実と実績、勤怠、請求の連動が取れない
  - 高額なエンタープライズツールは導入できない

- **競合優位性**：
  - **統合性**: 予実・勤怠・課題・請求を一つで管理
  - **シンプル**: 直感的なUI、短期間で導入可能
  - **柔軟性**: 業種を問わず利用可能
  - **コスパ**: フリーミアムモデルで始めやすい

### 1.3 収益モデル

**フリーミアムモデル**

- **Free**: 基本機能を無料で提供（ユーザー数制限）
- **Pro**: 中規模チーム向けの高度な機能
- **Business**: 大規模チーム向けのエンタープライズ機能

### 1.4 競合分析と差別化

| サービス | 強み | 弱み | Set Planの差別化 |
|---------|------|------|-----------------|
| **Backlog** | 課題管理が強力、ガントチャート | 勤怠・請求書管理なし | 業務管理を統合、実績と請求の連動 |
| **freee/マネーフォワード** | 会計・請求書管理が強力 | プロジェクト管理・勤怠が弱い | 予実管理と請求の一体化 |
| **ジョブカン勤怠** | 勤怠管理が強力 | プロジェクト管理なし | 勤怠と予実・案件の連動 |
| **Notion/Asana** | 柔軟なワークスペース | 業界特化機能なし | プロジェクト型業務に最適化 |

**Set Planの独自価値**: 「予実・勤怠・案件・請求を一つで管理し、データが自動連携する」

---

## 2. マルチテナント化の技術設計

### 2.1 データベース設計変更

#### 2.1.1 新規テーブル

```prisma
model Organization {
  id            String   @id @default(uuid())
  name          String
  subdomain     String   @unique // example.setplan.com
  plan          PlanType @default(FREE)
  status        Status   @default(ACTIVE)

  // プラン制限
  maxUsers      Int      @default(5)
  maxProjects   Int      @default(10)
  maxStorage    Int      @default(1048576) // 1GB in KB

  // 課金情報
  stripeCustomerId    String?
  stripeSubscriptionId String?
  currentPeriodStart   DateTime?
  currentPeriodEnd     DateTime?

  // 設定
  settings      Json?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // リレーション
  users         User[]
  projects      Project[]
  customers     Customer[]
  departments   Department[]
  issues        Issue[]
  estimates     Estimate[]
  invoices      Invoice[]
  purchaseOrders PurchaseOrder[]
  orderConfirmations OrderConfirmation[]
  deliveryNotes DeliveryNote[]
  dailySchedules DailySchedule[]
  company       Company?
}

enum PlanType {
  FREE
  PRO
  BUSINESS
  ENTERPRISE
}

enum Status {
  ACTIVE
  SUSPENDED
  TRIAL
  CANCELLED
}

model Invitation {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  email          String
  role           String   @default("USER")
  invitedBy      String
  inviter        User     @relation("InvitedBy", fields: [invitedBy], references: [id])

  token          String   @unique
  expiresAt      DateTime
  acceptedAt     DateTime?

  createdAt      DateTime @default(now())

  @@unique([organizationId, email])
  @@index([token])
}

model AuditLog {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  userId         String
  user           User     @relation(fields: [userId], references: [id])

  action         String   // CREATE, UPDATE, DELETE, LOGIN, etc.
  entityType     String   // User, Project, Invoice, etc.
  entityId       String?

  metadata       Json?    // 変更内容の詳細
  ipAddress      String?
  userAgent      String?

  createdAt      DateTime @default(now())

  @@index([organizationId, createdAt])
  @@index([userId])
}

model UsageMetrics {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  date           DateTime @db.Date

  activeUsers    Int      @default(0)
  totalProjects  Int      @default(0)
  totalIssues    Int      @default(0)
  totalSchedules Int      @default(0)
  storageUsed    Int      @default(0) // KB

  createdAt      DateTime @default(now())

  @@unique([organizationId, date])
  @@index([organizationId, date])
}
```

#### 2.1.2 既存テーブルへのorganizationId追加

すべての主要テーブルに `organizationId` を追加：

```prisma
model User {
  // ...existing fields
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}

model Project {
  // ...existing fields
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
}

// Customer, Department, Issue, DailySchedule, Estimate, Invoice,
// PurchaseOrder, OrderConfirmation, DeliveryNote も同様
```

#### 2.1.3 Company テーブルの変更

```prisma
model Company {
  // ...existing fields
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

### 2.2 データ分離戦略

#### 2.2.1 Row-Level Security（行レベルセキュリティ）

- すべてのクエリに `organizationId` フィルターを自動適用
- Prismaミドルウェアで実装

```typescript
// lib/prisma-middleware.ts
prisma.$use(async (params, next) => {
  const organizationId = getOrganizationIdFromContext();

  if (!organizationId) {
    throw new Error('Organization ID is required');
  }

  // Read operations
  if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'findUnique') {
    params.args.where = {
      ...params.args.where,
      organizationId,
    };
  }

  // Write operations
  if (params.action === 'create') {
    params.args.data = {
      ...params.args.data,
      organizationId,
    };
  }

  return next(params);
});
```

#### 2.2.2 コンテキスト管理

セッションに `organizationId` を含める：

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  // ...
  callbacks: {
    session: async ({ session, token }) => {
      return {
        ...session,
        user: {
          ...session.user,
          organizationId: token.organizationId,
          organizationPlan: token.organizationPlan,
        },
      };
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.organizationId = user.organizationId;
        token.organizationPlan = user.organization?.plan;
      }
      return token;
    },
  },
};
```

### 2.3 パフォーマンス最適化

#### 2.3.1 インデックス戦略

```prisma
// 複合インデックスの追加
@@index([organizationId, createdAt])
@@index([organizationId, status])
@@index([organizationId, userId, scheduleDate])
```

#### 2.3.2 データベース接続プーリング

- Neonのサーバーレス接続プール活用
- 接続数の最適化

#### 2.3.3 キャッシング戦略

- Redis導入（組織情報、プラン情報）
- SWRのキャッシュ最適化

---

## 3. 新規必須機能

### 3.1 セルフサービスサインアップ

#### 3.1.1 組織作成フロー

**画面遷移**:
```
1. ランディングページ
   ↓
2. サインアップフォーム（メール入力）
   ↓
3. メール認証
   ↓
4. 組織情報入力（組織名、サブドメイン）
   ↓
5. 管理者情報入力（氏名、パスワード）
   ↓
6. プラン選択（Free/Pro/Business）
   ↓
7. 初期セットアップウィザード
   ↓
8. ダッシュボード
```

#### 3.1.2 初期セットアップウィザード

**ステップ1: 自社情報入力**
- 会社名、住所、電話番号
- 会社印のアップロード
- 適格請求書発行事業者登録番号

**ステップ2: 部署・チーム作成**
- 最低1つの部署を作成
- 複数部署の追加可能

**ステップ3: メンバー招待**
- メールアドレスで招待
- ロール選択（管理者/一般ユーザー）
- 後でスキップ可能

**ステップ4: サンプルデータ読み込み（オプション）**
- サンプル案件、課題、予定実績
- すぐに使い方を理解できる

#### 3.1.3 メール認証システム

- **サインアップ時**: メール認証リンク送信
- **パスワードリセット**: リセットリンク送信
- **メンバー招待**: 招待リンク送信
- **重要な変更通知**: プラン変更、支払い失敗など

**使用技術**: Resend または SendGrid

### 3.2 プラン管理システム

#### 3.2.1 プラン比較ページ

```typescript
// 料金プラン定義
const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    limits: {
      users: 5,
      projects: 10,
      storage: 1, // GB
      features: [
        '予定実績管理',
        '基本的な勤怠管理',
        '課題管理（50件まで）',
        'ガントチャート',
        '見積書・請求書作成（月10件まで）',
      ],
      disabled: [
        '実績台帳',
        '高度な分析',
        'API アクセス',
        '優先サポート',
      ],
    },
  },
  PRO: {
    name: 'Pro',
    price: 9800, // 円/月
    pricePerUser: 980, // 円/ユーザー/月（6人目以降）
    limits: {
      users: 50,
      projects: 100,
      storage: 50, // GB
      features: [
        'Freeの全機能',
        '実績台帳',
        '高度な分析・レポート',
        '承認ワークフロー',
        '無制限の見積書・請求書',
        '外部連携（Slack等）',
        'メールサポート',
      ],
    },
  },
  BUSINESS: {
    name: 'Business',
    price: 29800, // 円/月
    pricePerUser: 800, // 円/ユーザー/月（11人目以降）
    limits: {
      users: 200,
      projects: -1, // 無制限
      storage: 200, // GB
      features: [
        'Proの全機能',
        'API アクセス',
        'SSO（シングルサインオン）',
        '監査ログ',
        'データエクスポート',
        '専任サポート',
        'SLA保証',
        'カスタム開発相談',
      ],
    },
  },
};
```

#### 3.2.2 機能制限の実装

```typescript
// lib/plan-limits.ts
export function checkFeatureAccess(
  organizationPlan: PlanType,
  feature: string
): boolean {
  const limits = PLAN_LIMITS[organizationPlan];
  return limits.features.includes(feature);
}

export function checkResourceLimit(
  organizationPlan: PlanType,
  resource: 'users' | 'projects' | 'storage',
  currentUsage: number
): { allowed: boolean; limit: number } {
  const limit = PLAN_LIMITS[organizationPlan].limits[resource];
  return {
    allowed: limit === -1 || currentUsage < limit,
    limit,
  };
}

// 使用例
// API route内で
const { allowed, limit } = checkResourceLimit(
  session.user.organizationPlan,
  'projects',
  currentProjectCount
);

if (!allowed) {
  return NextResponse.json(
    { error: `プロジェクト数の上限（${limit}件）に達しています。プランのアップグレードを検討してください。` },
    { status: 403 }
  );
}
```

#### 3.2.3 プランアップグレードフロー

```
1. 制限到達の通知表示
   ↓
2. プラン比較ページ表示
   ↓
3. プラン選択
   ↓
4. 支払い情報入力（Stripe）
   ↓
5. 確認画面
   ↓
6. アップグレード完了
   ↓
7. 機能解放
```

### 3.3 課金・決済統合

#### 3.3.1 Stripe統合

**実装機能**:
- サブスクリプション管理
- クレジットカード登録
- 自動課金
- 請求書発行
- ダウングレード・キャンセル

**Webhookイベント処理**:
```typescript
// api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

  switch (event.type) {
    case 'customer.subscription.created':
      // サブスクリプション作成
      await handleSubscriptionCreated(event.data.object);
      break;

    case 'customer.subscription.updated':
      // プラン変更
      await handleSubscriptionUpdated(event.data.object);
      break;

    case 'customer.subscription.deleted':
      // キャンセル
      await handleSubscriptionDeleted(event.data.object);
      break;

    case 'invoice.payment_failed':
      // 支払い失敗
      await handlePaymentFailed(event.data.object);
      break;
  }
}
```

#### 3.3.2 請求管理画面

**機能**:
- 現在のプランと次回請求日表示
- 請求履歴
- 請求書ダウンロード
- 支払い方法変更
- プラン変更・キャンセル

### 3.4 組織設定・招待機能

#### 3.4.1 組織設定画面

**タブ構成**:
- **基本情報**: 組織名、サブドメイン、ロゴ
- **メンバー管理**: メンバー一覧、招待、削除、ロール変更
- **部署管理**: 既存機能を統合
- **プラン・課金**: プラン情報、使用状況、請求管理
- **セキュリティ**: 2FA設定、セッション管理、監査ログ
- **統合**: 外部サービス連携設定
- **詳細設定**: データエクスポート、組織削除

#### 3.4.2 メンバー招待機能

**招待フロー**:
```typescript
// 招待の作成
async function createInvitation(
  organizationId: string,
  email: string,
  role: string,
  invitedBy: string
) {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7日後

  const invitation = await prisma.invitation.create({
    data: {
      organizationId,
      email,
      role,
      invitedBy,
      token,
      expiresAt,
    },
  });

  // メール送信
  await sendInvitationEmail(email, token, organizationName);

  return invitation;
}

// 招待の受諾
async function acceptInvitation(token: string, userData: UserData) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation || invitation.expiresAt < new Date()) {
    throw new Error('Invalid or expired invitation');
  }

  // ユーザー作成
  const user = await prisma.user.create({
    data: {
      ...userData,
      organizationId: invitation.organizationId,
      isAdmin: invitation.role === 'ADMIN',
    },
  });

  // 招待を受諾済みにマーク
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });

  return user;
}
```

### 3.5 使用量ダッシュボード

#### 3.5.1 組織ダッシュボード（管理者向け）

**表示項目**:
- 現在のプランと制限
- 使用状況（ユーザー数、プロジェクト数、ストレージ）
- 進捗バー（制限に対する使用率）
- 月次アクティビティ（アクティブユーザー数、作成された課題数など）
- アップグレード促進CTA

```typescript
// components/OrganizationUsageDashboard.tsx
interface UsageData {
  currentPlan: PlanType;
  limits: {
    users: { current: number; limit: number };
    projects: { current: number; limit: number };
    storage: { current: number; limit: number }; // MB
  };
  monthlyActivity: {
    activeUsers: number;
    createdIssues: number;
    createdSchedules: number;
    generatedInvoices: number;
  };
}
```

#### 3.5.2 使用量計測

日次バッチで集計し、`UsageMetrics` テーブルに保存：

```typescript
// scripts/calculate-daily-usage.ts
async function calculateDailyUsage() {
  const organizations = await prisma.organization.findMany();

  for (const org of organizations) {
    const activeUsers = await prisma.user.count({
      where: {
        organizationId: org.id,
        status: 'ACTIVE',
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 過去30日
        },
      },
    });

    const totalProjects = await prisma.project.count({
      where: { organizationId: org.id },
    });

    // ストレージ使用量計算（画像ファイルサイズの合計）
    const storageUsed = await calculateStorageUsage(org.id);

    await prisma.usageMetrics.upsert({
      where: {
        organizationId_date: {
          organizationId: org.id,
          date: new Date(),
        },
      },
      update: {
        activeUsers,
        totalProjects,
        storageUsed,
      },
      create: {
        organizationId: org.id,
        date: new Date(),
        activeUsers,
        totalProjects,
        storageUsed,
      },
    });
  }
}
```

---

## 4. 既存機能の強化

### 4.1 勤怠管理機能の充実

現在の予定実績管理を勤怠管理としても強化：

#### 4.1.1 打刻機能の改善

**現在の機能**:
- 出勤・退勤ボタンで時刻記録
- 10分単位で切り捨て

**追加機能**:
- **ワンクリック打刻**: ダッシュボードに大きな打刻ボタン配置
- **休憩開始・終了**: 休憩時間を複数回記録可能
- **外出・戻り**: 外出時間の記録
- **打刻修正申請**: 打刻忘れ時の修正申請と承認
- **GPS打刻**: モバイルアプリで位置情報付き打刻（オプション）
- **顔認証打刻**: 不正打刻防止（上位プラン）

#### 4.1.2 休暇管理

**新規テーブル**:
```prisma
model LeaveRequest {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  userId         String
  user           User     @relation(fields: [userId], references: [id])

  leaveType      LeaveType
  startDate      DateTime @db.Date
  endDate        DateTime @db.Date
  days           Float    // 0.5（半休）、1（全休）など

  reason         String?
  status         ApprovalStatus @default(PENDING)

  approverId     String?
  approver       User?    @relation("Approver", fields: [approverId], references: [id])
  approvedAt     DateTime?
  rejectedReason String?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId, userId])
  @@index([status])
}

enum LeaveType {
  PAID_LEAVE      // 有給休暇
  SICK_LEAVE      // 病欠
  SPECIAL_LEAVE   // 特別休暇
  UNPAID_LEAVE    // 無給休暇
  HALF_DAY        // 半休
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}
```

**機能**:
- 休暇申請フォーム
- 承認者への通知
- 承認・却下機能
- 有給残日数管理
- カレンダー表示

#### 4.1.3 承認ワークフロー

- 上長承認フロー
- 複数段階承認（部署長→役員）
- 代理承認者設定
- 承認待ち一覧
- 通知（メール・アプリ内）

#### 4.1.4 勤怠集計レポート

**月次勤怠レポート**:
- 出勤日数、欠勤日数
- 総労働時間、残業時間
- 遅刻・早退回数
- 有給取得日数

**エクスポート機能**:
- CSV出力
- PDF出力（給与計算用）

### 4.2 ダッシュボードの改善

#### 4.2.1 パーソナライズド・ダッシュボード

**現在のダッシュボード**: 静的な表示

**改善後のダッシュボード**:
- **ウィジェット形式**: ドラッグ&ドロップでカスタマイズ
- **ロール別デフォルト**: 管理者と一般ユーザーで異なる表示

**ウィジェット例**:
1. **今日の予定**: 本日の予定実績
2. **打刻ボタン**: ワンクリック出退勤
3. **自分のタスク**: 担当課題一覧（期限順）
4. **承認待ち**: 承認が必要な項目（管理者）
5. **最近の活動**: チームの最近の更新
6. **売上サマリー**: 今月の売上・粗利（管理者）
7. **稼働率**: 自分・チームの稼働状況
8. **通知**: 未読通知一覧

#### 4.2.2 データビジュアライゼーション

**チャート追加**:
- 月次売上推移（折れ線グラフ）
- 案件別稼働率（円グラフ）
- 部署別実績比較（棒グラフ）
- 予実達成率（ゲージチャート）

**使用ライブラリ**: Recharts（既存） + Chart.js

### 4.3 レポート・分析機能

#### 4.3.1 新規レポート

**1. 労働時間レポート**
- ユーザー別・部署別の月次労働時間
- 残業時間の推移
- 休暇取得率

**2. 案件収益レポート**
- 既存の実績台帳を強化
- 期間比較（前月比、前年比）
- 収益性ランキング
- 予算達成率

**3. 生産性レポート**
- ユーザー別生産性（売上/工数）
- 部署別生産性
- 案件種別別の平均工数

**4. 請求・入金レポート**
- 月次請求額
- 入金状況（入金済み/未入金）
- 売掛金残高
- 入金遅延アラート

#### 4.3.2 カスタムレポートビルダー（Business プラン）

- ドラッグ&ドロップでレポート作成
- フィルター・グループ化・集計のカスタマイズ
- 定期レポート自動配信（メール）

### 4.4 モバイル対応

#### 4.4.1 レスポンシブデザイン

**現状**: デスクトップ中心の設計

**改善**:
- Tailwind CSSのレスポンシブクラス活用
- モバイルファーストUI
- タッチ操作最適化

**優先対応ページ**:
1. ダッシュボード
2. 打刻画面
3. 予定実績一覧・編集
4. 課題一覧・詳細
5. 承認画面

#### 4.4.2 PWA対応

**機能**:
- オフライン対応（Service Worker）
- ホーム画面追加
- プッシュ通知
- バックグラウンド同期

#### 4.4.3 ネイティブアプリ（将来的）

- React Native（iOS/Android）
- GPS打刻
- 顔認証
- カメラ連携（レシート撮影など）

### 4.5 通知システム

#### 4.5.1 通知種別

| 通知種別 | トリガー | 配信方法 |
|---------|---------|---------|
| **課題アサイン** | 課題が自分に割り当て | アプリ内 + メール |
| **課題更新** | 担当課題のコメント・ステータス変更 | アプリ内 |
| **承認依頼** | 休暇申請・打刻修正依頼 | アプリ内 + メール |
| **期限リマインダー** | 課題期限3日前、当日 | アプリ内 + メール |
| **請求書送付** | 請求書ステータスが「送付済」 | アプリ内 |
| **入金確認** | 請求書が「入金済」 | アプリ内 + メール |
| **システム通知** | メンテナンス、機能追加 | アプリ内 + メール |

#### 4.5.2 通知設定

**ユーザーごとの設定**:
- 通知種別ごとのON/OFF
- メール通知のON/OFF
- 通知時間帯設定（勤務時間外は通知しない）

**実装**:
```prisma
model NotificationSetting {
  id             String   @id @default(uuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  emailEnabled   Boolean  @default(true)
  pushEnabled    Boolean  @default(true)

  notificationTypes Json   // { "ISSUE_ASSIGNED": true, "APPROVAL_REQUEST": true, ... }
  quietHours     Json?    // { start: "22:00", end: "08:00" }

  updatedAt      DateTime @updatedAt
}

model Notification {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type           String   // ISSUE_ASSIGNED, APPROVAL_REQUEST, etc.
  title          String
  message        String
  link           String?  // 通知をクリックした時の遷移先

  isRead         Boolean  @default(false)
  readAt         DateTime?

  createdAt      DateTime @default(now())

  @@index([organizationId, userId, isRead])
  @@index([createdAt])
}
```

---

## 5. UI/UX変革

### 5.1 マーケティングサイト

#### 5.1.1 サイト構成

```
https://setplan.com/
├── / (ランディングページ)
├── /features (機能紹介)
├── /pricing (料金プラン)
├── /use-cases (業種別事例)
│   ├── /it-consulting (IT・コンサル)
│   ├── /creative (制作・デザイン)
│   └── /professional-services (士業)
├── /blog (ブログ)
├── /docs (ヘルプドキュメント)
├── /about (会社概要)
├── /contact (お問い合わせ)
├── /login (ログイン)
└── /signup (サインアップ)
```

**アプリ部分**:
```
https://app.setplan.com/
または
https://<subdomain>.setplan.com/
```

#### 5.1.2 ランディングページ構成

**セクション構成**:

1. **ヒーローセクション**
   - キャッチコピー: 「業務管理、もっとシンプルに。」
   - サブコピー: 「予実・勤怠・案件・請求を一つに。中小企業のための統合業務管理プラットフォーム」
   - CTA: 「無料で始める」「デモを見る」
   - ヒーロー画像: ダッシュボードのスクリーンショット

2. **課題提起セクション**
   - 「こんな悩みはありませんか？」
   - Excelでの管理が限界
   - 複数ツールの使い分けが煩雑
   - 予実と請求が連動しない

3. **機能紹介セクション**
   - 予定実績管理
   - 勤怠管理
   - 課題管理
   - 見積・請求書管理
   - 実績台帳
   各機能にスクリーンショット + 説明

4. **統合の価値セクション**
   - データが自動連携
   - 二重入力不要
   - リアルタイム集計

5. **料金プランセクション**
   - 3プランの比較表
   - 「まずは無料で始める」CTA

6. **導入事例セクション**（将来的）
   - 顧客の声
   - 導入効果（工数削減○%など）

7. **よくある質問**
   - FAQ形式

8. **CTAセクション**
   - 「今すぐ無料で始める」

#### 5.1.3 デザインシステム

**ブランドカラー**:
- Primary: `#3B82F6` (青 - 信頼・効率)
- Secondary: `#10B981` (緑 - 成長・成功)
- Accent: `#F59E0B` (オレンジ - アクション)

**フォント**:
- 見出し: Inter（既存）
- 本文: Noto Sans JP

**トーン＆マナー**:
- シンプルで親しみやすい
- プロフェッショナルだが堅苦しくない
- 具体的な価値を明示

### 5.2 サインアップ・オンボーディングフロー

#### 5.2.1 サインアップページ

**フォーム項目**:
```typescript
// Step 1: メールアドレス
- メールアドレス
- [次へ] ボタン

// Step 2: メール認証
- 「確認メールを送信しました」
- メール内のリンクをクリック

// Step 3: 組織・管理者情報
- 組織名 *
- サブドメイン * (example.setplan.com)
- 氏名（姓・名）*
- パスワード *
- パスワード確認 *
- 利用規約・プライバシーポリシーへの同意 *
- [組織を作成] ボタン

// Step 4: プラン選択
- Free / Pro / Business
- [このプランで始める] ボタン

// Proまたは Businessの場合
// Step 5: 支払い情報
- Stripe Checkout

// Step 6: 初期セットアップウィザード
（前述の内容）
```

#### 5.2.2 オンボーディングチェックリスト

初回ログイン後、ダッシュボードにチェックリスト表示：

```
✅ アカウント作成完了
□ 自社情報を設定
□ 部署を作成
□ メンバーを招待
□ 最初の案件を作成
□ 最初の予定実績を登録
□ 最初の課題を作成
```

各項目クリックで該当画面に遷移。全完了で非表示。

#### 5.2.3 インタラクティブチュートリアル（オプション）

- Intro.js や Shepherd.js を使用
- 初回訪問時に主要機能をガイド
- スキップ可能

### 5.3 組織切り替え機能

#### 5.3.1 複数組織への所属

**ユースケース**:
- フリーランスが複数企業のSetPlanに参加
- 親会社・子会社の両方で使用

**実装**:
```prisma
model OrganizationMember {
  id             String   @id @default(uuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  role           String   @default("USER")
  isAdmin        Boolean  @default(false)

  joinedAt       DateTime @default(now())

  @@unique([userId, organizationId])
  @@index([userId])
  @@index([organizationId])
}
```

**User テーブル調整**:
```prisma
model User {
  // organizationId は削除
  // organizations リレーションに変更
  organizations  OrganizationMember[]

  currentOrganizationId String? // 現在選択中の組織
}
```

#### 5.3.2 組織切り替えUI

**ヘッダーに組織セレクター**:
```
┌─────────────────────────────────────┐
│ [会社A ▼]  ダッシュボード  予定実績 ... │
└─────────────────────────────────────┘
```

ドロップダウンで切り替え:
```
会社A ✓
会社B
─────────
+ 組織を作成
```

### 5.4 プラン管理画面

**パス**: `/settings/billing`

**セクション**:

1. **現在のプラン**
   - プラン名、価格
   - 次回請求日
   - [プランを変更] ボタン

2. **使用状況**
   - ユーザー数: 5 / 50
   - プロジェクト数: 12 / 100
   - ストレージ: 2.5GB / 50GB
   各項目に進捗バー表示

3. **支払い方法**
   - カード情報（下4桁のみ表示）
   - [支払い方法を変更] ボタン

4. **請求履歴**
   - 日付、金額、ステータス、ダウンロード
   テーブル形式で表示

5. **プランの変更・キャンセル**
   - [プランをアップグレード] ボタン
   - [プランをダウングレード] ボタン
   - [サブスクリプションをキャンセル] リンク

### 5.5 設定画面の再構成

**現在の設定**: 散在している

**新しい設定構造**:

```
/settings/
├── /organization (組織設定)
│   ├── 基本情報
│   ├── ブランディング（ロゴ、カラー）
│   └── 組織の削除
├── /members (メンバー管理)
│   ├── メンバー一覧
│   ├── 招待
│   └── ロール管理
├── /departments (部署管理)
├── /billing (プラン・課金)
├── /company (自社情報) ← 既存
├── /security (セキュリティ)
│   ├── 2FA設定
│   ├── セッション管理
│   └── 監査ログ
├── /integrations (外部連携)
│   ├── Slack
│   ├── Google Calendar
│   └── API
├── /notifications (通知設定)
└── /profile (プロフィール)
    ├── 個人情報
    ├── パスワード変更
    └── 通知設定
```

**ナビゲーション**: サイドバータブ形式

---

## 6. 料金プラン提案

### 6.1 プラン詳細

#### Free プラン

**価格**: ¥0 / 月

**制限**:
- ユーザー数: 5名まで
- プロジェクト数: 10件まで
- ストレージ: 1GB
- 見積・請求書: 月10件まで
- 課題: 50件まで

**機能**:
- ✅ 予定実績管理
- ✅ 基本的な勤怠管理（打刻、休暇申請）
- ✅ 課題管理（Backlog風）
- ✅ ガントチャート
- ✅ 見積書・請求書作成
- ✅ 発注書・発注請書・納品書
- ✅ 顧客管理
- ✅ 部署管理
- ❌ 実績台帳
- ❌ 高度な分析
- ❌ 承認ワークフロー
- ❌ 外部連携
- ❌ API アクセス

**サポート**: コミュニティフォーラム

**ターゲット**: スタートアップ、小規模チーム

---

#### Pro プラン

**価格**: ¥9,800 / 月（5ユーザー込み）+ ¥980 / ユーザー / 月（6人目以降）

**制限**:
- ユーザー数: 50名まで
- プロジェクト数: 100件まで
- ストレージ: 50GB
- 見積・請求書: 無制限
- 課題: 無制限

**機能**:
- ✅ Freeプランの全機能
- ✅ **実績台帳**（収益性分析）
- ✅ **高度な分析・レポート**
- ✅ **承認ワークフロー**（休暇、打刻修正、経費）
- ✅ **外部連携**（Slack、Google Calendar）
- ✅ **カスタムフィールド**
- ✅ **データエクスポート**（CSV、Excel）
- ✅ **時間外労働アラート**
- ❌ API アクセス
- ❌ SSO
- ❌ 監査ログ

**サポート**: メールサポート（24時間以内返信）

**ターゲット**: 成長企業、中規模チーム

---

#### Business プラン

**価格**: ¥29,800 / 月（10ユーザー込み）+ ¥800 / ユーザー / 月（11人目以降）

**制限**:
- ユーザー数: 200名まで
- プロジェクト数: 無制限
- ストレージ: 200GB
- すべて無制限

**機能**:
- ✅ Proプランの全機能
- ✅ **REST API アクセス**
- ✅ **Webhook**
- ✅ **SSO（シングルサインオン）**（Google、Microsoft、SAML）
- ✅ **監査ログ**
- ✅ **IP制限**
- ✅ **カスタムロール**
- ✅ **優先サポート**（1営業日以内返信）
- ✅ **SLA保証**（99.9%）
- ✅ **専任CSM**（カスタマーサクセスマネージャー）
- ✅ **オンボーディング支援**
- ✅ **カスタム開発相談**

**サポート**: 専任サポート、電話・チャットサポート

**ターゲット**: 大規模チーム、エンタープライズ

---

#### Enterprise プラン（将来的）

**価格**: 個別見積もり

**機能**:
- ✅ Businessプランの全機能
- ✅ **オンプレミス・プライベートクラウド対応**
- ✅ **カスタマイズ開発**
- ✅ **専用サーバー**
- ✅ **24/7サポート**
- ✅ **トレーニング・導入支援**

---

### 6.2 価格設定の考え方

#### 6.2.1 市場調査

| サービス | 価格帯 |
|---------|--------|
| Backlog | スタンダード: ¥12,980/月（30ユーザー） |
| freee | ミニマム: ¥2,680/月、ベーシック: ¥5,280/月 |
| ジョブカン勤怠 | ¥400/ユーザー/月 |
| Notion | 無料〜¥1,200/ユーザー/月 |

**Set Planのポジショニング**:
- 統合性により、複数ツール契約より安価
- 中小企業が無理なく導入できる価格帯
- ユーザー数課金で公平

#### 6.2.2 収益シミュレーション

**想定シナリオ**:

| プラン | 顧客数 | ARPU（月間） | MRR | ARR |
|--------|--------|-------------|-----|-----|
| Free | 1,000 | ¥0 | ¥0 | ¥0 |
| Pro | 100 | ¥15,000 | ¥1,500,000 | ¥18,000,000 |
| Business | 20 | ¥50,000 | ¥1,000,000 | ¥12,000,000 |
| **合計** | **1,120** | - | **¥2,500,000** | **¥30,000,000** |

**コンバージョン率想定**:
- Free → Pro: 10%
- Pro → Business: 20%

### 6.3 アップグレード促進戦略

#### 6.3.1 制限到達時のUI

**制限に近づいた時**:
```
⚠️ プロジェクト数が上限に近づいています（9/10）
新しいプロジェクトを作成するには、Proプランへのアップグレードをご検討ください。
[プランを比較] [今すぐアップグレード]
```

**制限到達時**:
```
🚫 プロジェクト数が上限に達しました（10/10）
新しいプロジェクトを作成できません。
[プランをアップグレード]
```

#### 6.3.2 機能ティザー

Freeプランユーザーに上位機能を見せる:
- 実績台帳ページに「Proプランで利用可能」バッジ
- グレーアウト表示＋ツールチップ
- 「無料トライアルを開始」CTA

#### 6.3.3 無料トライアル

- Pro/Businessプランを14日間無料トライアル
- クレジットカード登録必要
- トライアル期限3日前にリマインダー

---

## 7. セキュリティ強化

### 7.1 2FA（二要素認証）

#### 7.1.1 対応方式

- **TOTP（Time-based OTP）**: Google Authenticator、Authyなど
- **SMS認証**（オプション）

#### 7.1.2 実装

**テーブル追加**:
```prisma
model User {
  // ...existing fields

  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String? // TOTP secret
  backupCodes      Json?   // Array of backup codes
}
```

**ライブラリ**: `speakeasy`, `qrcode`

**フロー**:
```
1. 設定画面で2FAを有効化
2. QRコードを表示
3. ユーザーがAuthenticatorアプリでスキャン
4. 確認コード入力
5. バックアップコード生成・保存
6. 次回ログインから2FAコード要求
```

### 7.2 監査ログ（Business プラン）

#### 7.2.1 記録対象イベント

**ユーザー操作**:
- ログイン・ログアウト
- パスワード変更
- 2FA設定変更

**データ操作**:
- 作成・更新・削除（User, Project, Invoice等）
- エクスポート実行
- 設定変更

**管理操作**:
- メンバー招待・削除
- ロール変更
- 組織設定変更

#### 7.2.2 監査ログ画面

**パス**: `/settings/security/audit-logs`

**表示項目**:
- タイムスタンプ
- ユーザー
- アクション
- エンティティ種別
- エンティティID
- IPアドレス
- 詳細（JSON）

**フィルター**:
- 日付範囲
- ユーザー
- アクション種別

**エクスポート**: CSV形式でダウンロード

### 7.3 SSO（Business プラン）

#### 7.3.1 対応プロバイダー

- **Google Workspace**
- **Microsoft Azure AD**
- **SAML 2.0**（汎用）

#### 7.3.2 実装

**NextAuth.js プロバイダー追加**:
```typescript
// lib/auth.ts
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';

export const authOptions: NextAuthOptions = {
  providers: [
    // 既存の Credentials Provider

    // SSO Providers（Business プランのみ有効化）
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      // SSOログイン時の処理
      if (account?.provider !== 'credentials') {
        // メールドメインから組織を特定
        const organization = await findOrganizationByDomain(user.email);

        // Business プランかチェック
        if (organization?.plan !== 'BUSINESS') {
          return false; // SSOは利用不可
        }

        // ユーザーが組織に所属しているかチェック
        const membership = await findMembership(user.email, organization.id);
        if (!membership) {
          // 自動プロビジョニング or 拒否
          return false;
        }
      }
      return true;
    },
  },
};
```

**ログインページの変更**:
```tsx
// Business プランの組織のみ表示
{organization.plan === 'BUSINESS' && (
  <>
    <Button onClick={() => signIn('google')}>
      Googleでログイン
    </Button>
    <Button onClick={() => signIn('azure-ad')}>
      Microsoftでログイン
    </Button>
  </>
)}
```

### 7.4 その他のセキュリティ対策

#### 7.4.1 IP制限（Business プラン）

**設定**:
```prisma
model Organization {
  // ...
  allowedIps Json? // ["192.168.1.0/24", "10.0.0.1"]
}
```

**ミドルウェアでチェック**:
```typescript
// middleware.ts
if (organization.allowedIps) {
  const clientIp = getClientIp(request);
  if (!isIpAllowed(clientIp, organization.allowedIps)) {
    return new Response('Access denied', { status: 403 });
  }
}
```

#### 7.4.2 セッション管理

**設定画面で表示**:
- アクティブセッション一覧
- デバイス、ブラウザ、IPアドレス、最終アクセス
- 個別ログアウト機能
- 全セッションログアウト

#### 7.4.3 データエクスポート

**GDPR対応**:
- ユーザーが自分のデータをエクスポート可能
- JSON形式でダウンロード
- 個人情報、作成データすべて含む

#### 7.4.4 パスワードポリシー

**要件**:
- 最小8文字
- 大文字・小文字・数字・記号を含む
- よくあるパスワードを禁止
- パスワード履歴（過去5回と同じNG）

**実装**: `zod` スキーマで検証

---

## 8. API・外部連携

### 8.1 REST API（Business プラン）

#### 8.1.1 API設計

**ベースURL**: `https://api.setplan.com/v1`

**認証**: Bearer Token（JWT）

**主要エンドポイント**:

```
# ユーザー管理
GET    /users
POST   /users
GET    /users/:id
PUT    /users/:id
DELETE /users/:id

# プロジェクト管理
GET    /projects
POST   /projects
GET    /projects/:id
PUT    /projects/:id
DELETE /projects/:id

# 課題管理
GET    /issues
POST   /issues
GET    /issues/:id
PUT    /issues/:id
DELETE /issues/:id
POST   /issues/:id/comments

# 予定実績
GET    /schedules
POST   /schedules
GET    /schedules/:id
PUT    /schedules/:id
DELETE /schedules/:id

# 見積書
GET    /estimates
POST   /estimates
GET    /estimates/:id
PUT    /estimates/:id
DELETE /estimates/:id
GET    /estimates/:id/pdf

# 請求書
GET    /invoices
POST   /invoices
GET    /invoices/:id
PUT    /invoices/:id
DELETE /invoices/:id
GET    /invoices/:id/pdf

# 実績台帳
GET    /performance-ledger

# レポート
GET    /reports/labor-hours
GET    /reports/revenue
GET    /reports/productivity
```

#### 8.1.2 API認証

**APIトークン管理画面**: `/settings/integrations/api`

**機能**:
- APIトークン生成
- トークン一覧（名前、作成日、最終使用日）
- トークン削除（取り消し）
- スコープ設定（読み取りのみ、読み書き）

**実装**:
```prisma
model ApiToken {
  id             String   @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name           String   // トークンの識別名
  token          String   @unique // ハッシュ化して保存

  scopes         Json     // ["read:projects", "write:issues"]

  lastUsedAt     DateTime?
  expiresAt      DateTime?

  createdBy      String
  creator        User     @relation(fields: [createdBy], references: [id])
  createdAt      DateTime @default(now())

  @@index([organizationId])
  @@index([token])
}
```

#### 8.1.3 Rate Limiting

- 1000リクエスト/時間（Business プラン）
- レスポンスヘッダーで残数通知
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 998
  X-RateLimit-Reset: 1625097600
  ```

### 8.2 Webhook（Business プラン）

#### 8.2.1 Webhook設定画面

**パス**: `/settings/integrations/webhooks`

**設定項目**:
- Webhook URL
- 購読イベント（複数選択）
- シークレット（署名検証用）
- 有効/無効

**イベント種別**:
```typescript
enum WebhookEvent {
  // プロジェクト
  PROJECT_CREATED = 'project.created',
  PROJECT_UPDATED = 'project.updated',
  PROJECT_DELETED = 'project.deleted',

  // 課題
  ISSUE_CREATED = 'issue.created',
  ISSUE_UPDATED = 'issue.updated',
  ISSUE_DELETED = 'issue.deleted',
  ISSUE_COMMENT_ADDED = 'issue.comment.added',

  // 請求書
  INVOICE_CREATED = 'invoice.created',
  INVOICE_SENT = 'invoice.sent',
  INVOICE_PAID = 'invoice.paid',

  // ユーザー
  USER_JOINED = 'user.joined',
  USER_LEFT = 'user.left',
}
```

#### 8.2.2 Webhookペイロード

```json
{
  "event": "issue.created",
  "timestamp": "2025-11-12T10:30:00Z",
  "organization_id": "org_123",
  "data": {
    "id": "issue_456",
    "title": "新しい課題",
    "status": "OPEN",
    "priority": "HIGH",
    "assignee": {
      "id": "user_789",
      "name": "田中太郎"
    },
    "created_at": "2025-11-12T10:30:00Z"
  }
}
```

#### 8.2.3 署名検証

```typescript
// Webhook受信側での検証
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return signature === `sha256=${digest}`;
}
```

### 8.3 外部サービス連携

#### 8.3.1 Slack連携

**機能**:
- 課題作成・更新時に通知
- 承認依頼の通知
- 請求書送付・入金通知
- Slashコマンド対応（`/setplan create issue`）

**設定画面**: `/settings/integrations/slack`

**実装**:
- Slack Incoming Webhook
- Slack Bot（OAuth2）

#### 8.3.2 Google Calendar連携

**機能**:
- 予定実績をGoogleカレンダーに同期
- ガントチャートのタスクをカレンダー表示
- 双方向同期（オプション）

**実装**:
- Google Calendar API
- OAuth2認証

#### 8.3.3 会計ソフト連携（将来的）

**対象**:
- freee
- マネーフォワード クラウド会計
- 弥生会計

**機能**:
- 請求書データの自動連携
- 入金データの取り込み
- 経費データの連携

---

## 9. 開発ロードマップ

### 9.1 フェーズ1: 基盤構築（3ヶ月）

**目標**: マルチテナント対応＋セルフサービスサインアップ

#### マイルストーン1.1: データベース・認証基盤（4週間）

**Week 1-2: データベース設計変更**
- [ ] Organizationテーブル、関連テーブル作成
- [ ] 既存テーブルにorganizationId追加
- [ ] マイグレーションスクリプト作成
- [ ] Prismaミドルウェア実装（RLS）
- [ ] 既存データのマイグレーション計画

**Week 3-4: 認証システム更新**
- [ ] NextAuth設定更新（organizationId追加）
- [ ] セッション管理の変更
- [ ] 既存APIへのorganizationId適用
- [ ] 権限チェックの実装

#### マイルストーン1.2: サインアップ・オンボーディング（4週間）

**Week 5-6: サインアップフロー**
- [ ] メール認証システム（Resend統合）
- [ ] 組織作成フロー実装
- [ ] サブドメイン管理
- [ ] 招待システム実装

**Week 7-8: 初期セットアップウィザード**
- [ ] 自社情報入力画面
- [ ] 部署作成画面
- [ ] メンバー招待画面
- [ ] オンボーディングチェックリスト

#### マイルストーン1.3: プラン管理（4週間）

**Week 9-10: プラン・制限管理**
- [ ] プラン定義とデータモデル
- [ ] 機能制限チェック実装
- [ ] 使用量計測システム
- [ ] プラン比較ページ

**Week 11-12: Stripe統合**
- [ ] Stripe設定
- [ ] サブスクリプション作成フロー
- [ ] Webhook処理（支払い成功・失敗等）
- [ ] 請求管理画面

#### マイルストーン1.4: テスト・デプロイ（1週間）

**Week 13: 統合テスト・本番デプロイ**
- [ ] E2Eテスト（Cypress）
- [ ] パフォーマンステスト
- [ ] セキュリティ監査
- [ ] ステージング環境デプロイ
- [ ] 本番環境デプロイ

---

### 9.2 フェーズ2: 機能強化（3ヶ月）

**目標**: 勤怠管理強化＋分析機能＋UI改善

#### マイルストーン2.1: 勤怠管理強化（4週間）

**Week 1-2: 休暇管理**
- [ ] 休暇申請・承認機能
- [ ] 有給残日数管理
- [ ] カレンダー表示

**Week 3-4: 承認ワークフロー**
- [ ] 承認フロー設定
- [ ] 通知システム基盤
- [ ] 承認待ち一覧

#### マイルストーン2.2: 分析・レポート機能（4週間）

**Week 5-6: レポート実装**
- [ ] 労働時間レポート
- [ ] 案件収益レポート強化
- [ ] 生産性レポート
- [ ] 請求・入金レポート

**Week 7-8: ダッシュボード改善**
- [ ] パーソナライズドダッシュボード
- [ ] ウィジェット実装
- [ ] チャート強化

#### マイルストーン2.3: UI/UX改善（3週間）

**Week 9-10: レスポンシブ対応**
- [ ] モバイルUI最適化
- [ ] タッチ操作改善
- [ ] PWA対応

**Week 11: 通知システム**
- [ ] アプリ内通知
- [ ] メール通知
- [ ] 通知設定画面

#### マイルストーン2.4: テスト・デプロイ（1週間）

**Week 12: テスト・デプロイ**
- [ ] E2Eテスト
- [ ] ユーザビリティテスト
- [ ] 本番デプロイ

---

### 9.3 フェーズ3: エンタープライズ機能（2ヶ月）

**目標**: Business プラン機能の実装

#### マイルストーン3.1: セキュリティ強化（3週間）

**Week 1: 2FA**
- [ ] TOTP実装
- [ ] バックアップコード
- [ ] 設定画面

**Week 2: 監査ログ**
- [ ] 監査ログ記録
- [ ] 監査ログ画面
- [ ] エクスポート機能

**Week 3: SSO**
- [ ] Google/Microsoft連携
- [ ] SAML 2.0対応
- [ ] 設定画面

#### マイルストーン3.2: API・連携（3週間）

**Week 4-5: REST API**
- [ ] API設計・実装
- [ ] API認証（トークン管理）
- [ ] ドキュメント作成（OpenAPI）

**Week 6: Webhook・外部連携**
- [ ] Webhook実装
- [ ] Slack連携
- [ ] Google Calendar連携

#### マイルストーン3.3: マーケティングサイト（2週間）

**Week 7-8: ランディングページ**
- [ ] LP設計・実装
- [ ] 機能紹介ページ
- [ ] 料金ページ
- [ ] ブログ基盤
- [ ] SEO対策

#### マイルストーン3.4: テスト・正式ローンチ（1週間）

**Week 9: ローンチ準備**
- [ ] 最終テスト
- [ ] ドキュメント整備
- [ ] サポート体制構築
- [ ] プレスリリース
- [ ] 正式ローンチ

---

### 9.4 フェーズ4以降: 継続的改善

**今後の展開**:
- カスタムレポートビルダー
- モバイルアプリ（React Native）
- AI機能（工数予測、異常検知）
- 会計ソフト連携
- Enterpriseプラン機能
- ホワイトラベル対応
- 多言語対応

---

## 10. 成功指標（KPI）

### 10.1 ビジネスKPI

| 指標 | 目標（6ヶ月後） | 目標（1年後） |
|------|----------------|--------------|
| **総登録組織数** | 500 | 2,000 |
| **有料組織数** | 50 | 200 |
| **MRR** | ¥500,000 | ¥2,500,000 |
| **ARR** | ¥6,000,000 | ¥30,000,000 |
| **Free→Pro コンバージョン率** | 5% | 10% |
| **チャーンレート** | <5% | <3% |
| **NPS** | >40 | >50 |

### 10.2 プロダクトKPI

| 指標 | 目標 |
|------|------|
| **DAU/MAU比** | >30% |
| **週次アクティブユーザー率** | >60% |
| **機能別利用率** | |
| - 予定実績管理 | >80% |
| - 勤怠管理 | >70% |
| - 課題管理 | >60% |
| - 見積・請求書 | >50% |
| - 実績台帳（Pro+） | >40% |
| **オンボーディング完了率** | >70% |
| **初回価値到達時間** | <30分 |

### 10.3 技術KPI

| 指標 | 目標 |
|------|------|
| **ページロード時間** | <2秒 |
| **API応答時間（P95）** | <500ms |
| **稼働率** | >99.5% |
| **エラー率** | <0.1% |
| **セキュリティインシデント** | 0件 |

---

## 11. まとめ

### 11.1 SaaS化の主要変更点

1. **マルチテナント対応**: 複数組織の独立運用
2. **セルフサービス**: サインアップから利用開始まで自動化
3. **プラン・課金**: フリーミアムモデルの実装
4. **勤怠管理強化**: 休暇、承認ワークフローの追加
5. **分析機能**: レポート・ダッシュボードの強化
6. **エンタープライズ機能**: 2FA、SSO、API、監査ログ
7. **UI/UX改善**: マーケティングサイト、モバイル対応
8. **外部連携**: Slack、Google Calendar等

### 11.2 競合優位性の確立

**統合性 × シンプルさ × コスパ**

- 予実・勤怠・案件・請求を一つで管理（統合性）
- 直感的なUI、短期間で導入可能（シンプルさ）
- 複数ツール契約より安価（コスパ）

### 11.3 次のアクション

1. **フェーズ1の開発開始**: マルチテナント化とサインアップ
2. **ユーザーインタビュー**: ターゲット顧客のニーズ検証
3. **ベータテスター募集**: 初期ユーザーからフィードバック収集
4. **マーケティング戦略**: SEO、コンテンツマーケティング、広告
5. **サポート体制構築**: ドキュメント、FAQ、サポートチーム

---

**Set PlanをSaaSとして成功させるために、このプランを段階的に実行していきましょう。**
