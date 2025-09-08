# SETPLAN - プロジェクト管理システム

## 概要

SETPLANは、チーム開発を支援するための統合プロジェクト管理システムです。日々のスケジュール管理、タスク追跡、ガントチャート表示など、プロジェクト管理に必要な機能を提供します。

## 主な機能

- **ユーザー管理**: ユーザー登録、認証、権限管理
- **プロジェクト管理**: プロジェクトの作成、編集、ステータス管理
- **スケジュール管理**: 日々の予定・実績の記録と管理
- **課題管理**: タスクの作成、追跡、コメント機能
- **ガントチャート**: プロジェクトの進捗を視覚的に表示
- **ダッシュボード**: 各種統計情報の表示

## 技術スタック

### フロントエンド
- **Next.js 15.5.2**: Reactベースのフルスタックフレームワーク
- **React 19.1.0**: UIライブラリ
- **TypeScript 5**: 型安全な開発
- **Tailwind CSS 4**: ユーティリティファーストのCSSフレームワーク
- **shadcn/ui**: 再利用可能なUIコンポーネント

### バックエンド
- **Next.js API Routes**: APIエンドポイント
- **Prisma 6.15.0**: TypeScript ORM
- **PostgreSQL**: リレーショナルデータベース
- **NextAuth.js 4.24.11**: 認証ライブラリ

### 開発ツール
- **Docker Compose**: コンテナオーケストレーション
- **ESLint**: コード品質チェック

## プロジェクト構造

```
setplan/
├── docker-compose.yml       # Docker設定
├── init.sql/               # データベース初期化スクリプト
├── docs/                   # ドキュメント
│   ├── 01_rdd.md          # 要件定義書
│   ├── 02_functional_requirements.md  # 機能要件
│   ├── 03_database_design.md         # データベース設計
│   ├── 04_mock_development_plan.md   # 開発計画
│   ├── 05_test_plan.md              # テスト計画
│   ├── 06_test_data_setup.md        # テストデータセットアップ
│   └── 07_security_audit.md         # セキュリティ監査レポート
└── nextjs/                 # Next.jsアプリケーション
    ├── prisma/            # Prisma設定とマイグレーション
    │   ├── schema.prisma  # データベーススキーマ
    │   └── seed-test-data.ts  # テストデータシーダー
    ├── src/
    │   ├── app/          # Next.js App Router
    │   │   ├── (auth)/   # 認証関連ページ
    │   │   ├── (main)/   # メインアプリケーション
    │   │   └── api/      # APIエンドポイント
    │   ├── components/   # Reactコンポーネント
    │   │   ├── ui/       # 基本UIコンポーネント
    │   │   ├── layout/   # レイアウトコンポーネント
    │   │   └── features/ # 機能別コンポーネント
    │   ├── lib/         # ユーティリティとライブラリ
    │   └── types/       # TypeScript型定義
    └── package.json     # 依存関係管理
```

## セットアップ手順

### 前提条件
- Node.js 20以上
- Docker Desktop
- Git

### インストール

1. **リポジトリのクローン**
```bash
git clone [repository-url]
cd setplan
```

2. **データベースの起動**
```bash
docker-compose up -d
```

3. **依存関係のインストール**
```bash
cd nextjs
npm install
```

4. **環境変数の設定**
```bash
cp .env.example .env.local
```

`.env.local`を編集して必要な環境変数を設定:
```env
DATABASE_URL="postgresql://setplan_user:setplan_password@localhost:5432/setplan_db?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # 本番環境では必ず変更
# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_AxZQdAQmxUCP182K_uFk8IIKwEmkdTMgRjwMyrcCCgaQnbE"
```

5. **データベースマイグレーション**
```bash
npx prisma migrate dev
```

6. **テストデータの投入（オプション）**
```bash
npm run db:seed
```

- 最初の管理者は admin@setplan.co.jp, password

7. **アプリケーションの起動**
```bash
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## 開発コマンド

```bash
# 開発サーバーの起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバーの起動
npm start

# Lintチェック
npm run lint

# データベースリセット
npm run db:reset

# テストデータ投入
npm run db:seed-test
```

## データベース管理

```bash
# Prisma Studio（GUI）の起動
npx prisma studio

# マイグレーション作成
npx prisma migrate dev --name [migration-name]

# データベースリセット
npx prisma migrate reset
```

## デフォルトログイン情報

テストデータを投入した場合、以下のアカウントが利用可能です:

**管理者アカウント**
- メールアドレス: admin@example.com
- パスワード: admin123

**一般ユーザーアカウント**
- メールアドレス: user1@example.com
- パスワード: user123

## 主要機能の使い方

### ダッシュボード
ログイン後、ダッシュボードで以下の情報を確認できます:
- プロジェクト統計
- 最新の課題
- 今日のスケジュール
- 稼働率グラフ

### プロジェクト管理
1. サイドバーから「案件管理」を選択
2. 「新規作成」ボタンをクリック
3. 必要な情報を入力して保存

### スケジュール管理
1. サイドバーから「予定実績」を選択
2. 日付を選択して予定・実績を入力
3. カレンダービューやグラフ表示で確認

### 課題管理
1. サイドバーから「課題管理」を選択
2. 「新規作成」で課題を登録
3. ステータス、優先度、担当者を設定

### ガントチャート
1. サイドバーから「ガントチャート」を選択
2. プロジェクトを選択
3. タスクの進捗状況を視覚的に確認

## セキュリティ考慮事項

本番環境への展開前に必ず以下を確認してください:

1. **環境変数の設定**
   - `NEXTAUTH_SECRET`を強力なランダム文字列に変更
   - データベースパスワードを強化

2. **依存関係の更新**
   - `npm audit`で脆弱性をチェック
   - 定期的な依存関係の更新

3. **セキュリティヘッダー**
   - next.config.tsでセキュリティヘッダーを設定

詳細は`docs/07_security_audit.md`を参照してください。

## トラブルシューティング

### データベース接続エラー
- Docker Desktopが起動していることを確認
- `docker-compose ps`でPostgreSQLコンテナが実行中か確認
- `.env.local`のDATABASE_URLが正しいか確認

### マイグレーションエラー
```bash
npx prisma migrate reset --force
```

### ポート競合
- 3000番ポートが他のアプリケーションで使用されていないか確認
- 5432番ポートがPostgreSQLで使用可能か確認

## ドキュメント

詳細なドキュメントは`docs/`ディレクトリを参照してください:

- [要件定義書](docs/01_rdd.md)
- [機能要件](docs/02_functional_requirements.md)
- [データベース設計](docs/03_database_design.md)
- [開発計画](docs/04_mock_development_plan.md)
- [テスト計画](docs/05_test_plan.md)
- [テストデータセットアップ](docs/06_test_data_setup.md)
- [セキュリティ監査](docs/07_security_audit.md)

## ライセンス

Released under the MIT license

---

© 2025 SETPLAN Project Team