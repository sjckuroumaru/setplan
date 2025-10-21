# Cypress E2E Testing ガイド

## 概要

このプロジェクトでは、Cypress を使用してE2Eテストを実行します。テスト用のデータベースを使用することで、本番環境のデータに影響を与えることなくテストを実行できます。

## セットアップ

### 1. テストDBの起動

テスト用のPostgreSQLデータベースは`docker-compose.yml`に定義されています。

```bash
# テストDB用のコンテナを起動
docker-compose up -d postgres-test
```

テストDBの設定:
- ホスト: `localhost`
- ポート: `5433`
- データベース名: `setplan_test_db`
- ユーザー名: `setplan_user`
- パスワード: `setplan_password`

### 2. 環境変数の設定

テスト用の環境変数は`.env.test.local`に定義されています。このファイルは`cypress.config.ts`で自動的に読み込まれます。

```env
DATABASE_URL="postgresql://setplan_user:setplan_password@localhost:5433/setplan_test_db?schema=public"
```

### 3. テストDBのマイグレーション

テストDBにスキーマを適用します。

```bash
# テストDB用の環境変数を読み込んでマイグレーション実行
DATABASE_URL="postgresql://setplan_user:setplan_password@localhost:5433/setplan_test_db?schema=public" npx prisma migrate deploy
```

### 4. テストデータのシード（必須）

**重要**: ほとんどのE2Eテストはテストデータに依存しているため、テストを実行する前に必ずシードデータを投入してください。

```bash
# テストDBにシードデータを投入
DATABASE_URL="postgresql://setplan_user:setplan_password@localhost:5433/setplan_test_db?schema=public" npm run db:seed-test
```

#### テストユーザー

シードスクリプトによって以下のテストユーザーが作成されます：

| メールアドレス | パスワード | 役割 | ステータス |
|---------------|-----------|------|-----------|
| admin@example.com | password123 | 管理者 | active |
| yamada@example.com | password123 | 一般ユーザー | active |
| suzuki@example.com | password123 | 一般ユーザー | active |
| tanaka@example.com | password123 | 一般ユーザー | active |
| watanabe@example.com | password123 | 一般ユーザー | inactive |

## Cypressテストの実行

### 前提条件

1. テストDBが起動していること
2. Next.jsアプリケーションが起動していること（`npm run dev`）
3. テストデータがシードされていること

### テスト実行の完全な手順

```bash
# 1. テストDBを起動
docker-compose up -d postgres-test

# 2. マイグレーション実行
DATABASE_URL="postgresql://setplan_user:setplan_password@localhost:5433/setplan_test_db?schema=public" npx prisma migrate deploy

# 3. テストデータをシード
DATABASE_URL="postgresql://setplan_user:setplan_password@localhost:5433/setplan_test_db?schema=public" npm run db:seed-test

# 4. Next.jsアプリケーションを起動（別のターミナルで）
npm run dev

# 5. Cypressテストを実行
npm run cypress:open  # インタラクティブモード
# または
npm run cypress:run   # ヘッドレスモード
```

### インタラクティブモード（開発時）

```bash
# Cypress Test Runnerを開く
npm run cypress:open
# または
npm run test:e2e:open
```

インタラクティブモードでは、ブラウザでテストを視覚的に確認しながら実行できます。デバッグに便利です。

### ヘッドレスモード（CI/CD）

```bash
# すべてのテストを実行
npm run cypress:run
# または
npm run test:e2e
```

ヘッドレスモードは、CI/CDパイプラインでの自動実行に適しています。

## ディレクトリ構成

```
nextjs/
├── cypress/
│   ├── e2e/                       # E2Eテストファイル
│   │   ├── home.cy.ts             # ホームページとリダイレクトのテスト
│   │   ├── dashboard.cy.ts        # ダッシュボードのテスト
│   │   ├── projects.cy.ts         # プロジェクト一覧のテスト
│   │   ├── database-reset.cy.ts   # DBリセット機能のテスト
│   │   └── auth/
│   │       └── signin.cy.ts       # ログイン機能のテスト
│   ├── fixtures/                  # テスト用の固定データ（JSONなど）
│   ├── support/                   # カスタムコマンドとサポートファイル
│   │   ├── commands.ts            # カスタムコマンド定義
│   │   └── e2e.ts                 # E2Eテストのセットアップ
│   ├── screenshots/               # テスト失敗時のスクリーンショット（gitignore）
│   ├── videos/                    # テスト実行時のビデオ（gitignore）
│   └── tsconfig.json              # Cypress用のTypeScript設定
├── cypress.config.ts              # Cypress設定ファイル（DBタスク定義を含む）
└── .env.test.local                # テスト用環境変数
```

## カスタムコマンド

### cy.login()

ユーザーログインを簡単に行うためのカスタムコマンドです。`cy.session`を使用してセッション管理を行い、テスト間でログイン状態を保持します。

```typescript
// 使用例
cy.login('admin@example.com', 'password123');
cy.visit('/dashboard'); // ログイン済みの状態でアクセス
```

**利用可能なテストユーザー**:
- `admin@example.com` / `password123` - 管理者
- `yamada@example.com` / `password123` - 一般ユーザー
- `suzuki@example.com` / `password123` - 一般ユーザー
- `tanaka@example.com` / `password123` - 一般ユーザー

### cy.resetDb()

テストデータベースをリセットするカスタムコマンドです。全てのデータを削除し、マイグレーションを再実行します。

```typescript
// データベースをリセット（データを全て削除）
cy.resetDb();
```

**用途**: テストの独立性を保つため、各テストスイートの前にデータベースをクリーンな状態にリセットします。

**注意**:
- このコマンドは`DATABASE_URL`に"test"が含まれる場合のみ動作します
- 実行には60秒のタイムアウトが設定されています

### cy.seedDb()

テストデータベースにシードデータを投入するカスタムコマンドです。

```typescript
// シードデータを投入
cy.seedDb();
```

**用途**: テストに必要なデータ（ユーザー、プロジェクト、課題など）をデータベースに投入します。

### cy.resetAndSeedDb()

データベースをリセットしてからシードデータを投入するカスタムコマンドです。最も一般的に使用されます。

```typescript
// データベースをリセットしてシード
cy.resetAndSeedDb();
```

**用途**: クリーンな状態から始めたい場合に使用します。

**使用例**:
```typescript
describe('User Management', () => {
  before(() => {
    // テストスイート全体の前にデータベースをリセット&シード
    cy.resetAndSeedDb();
  });

  it('should list all users', () => {
    cy.login('admin@example.com', 'password123');
    cy.visit('/users');
    // テストデータが存在することを前提にテスト
    cy.contains('admin@example.com').should('be.visible');
  });
});
```

## データベースリセットの仕組み

Cypressの`cy.task()`を使用してNode.js環境でPrismaコマンドを直接実行します。

**実装方法**:
- `cypress.config.ts`でタスクを定義
- カスタムコマンドからタスクを呼び出し
- Prisma CLIコマンドを実行してDBをリセット/シード

**メリット**:
- 高速（APIサーバーを経由しない）
- シンプルな実装
- セキュア（外部から呼び出せない）

**セキュリティ**:
- `DATABASE_URL`に"test"が含まれる場合のみ動作
- 本番データベースの誤削除を防止

## テストの書き方

### 基本的なテスト

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.visit('/path');
  });

  it('should do something', () => {
    cy.get('selector').should('be.visible');
  });
});
```

### 認証が必要なテスト

```typescript
describe('Protected Page', () => {
  beforeEach(() => {
    // ログインコマンドでセッションを確立
    cy.login('admin@example.com', 'password123');
  });

  it('should access protected content', () => {
    cy.visit('/protected-page');
    cy.url().should('include', '/protected-page');
  });

  it('should display user-specific data', () => {
    cy.visit('/protected-page');
    // ユーザー固有のデータが表示される
    cy.contains('管理').should('be.visible');
  });
});
```

### フォームのテスト

```typescript
describe('Login Form', () => {
  it('should submit form with valid data', () => {
    cy.visit('/login');

    // フォームフィールドに入力
    cy.get('input#email').type('admin@example.com');
    cy.get('input#password').type('password123');

    // 送信ボタンをクリック
    cy.get('button[type="submit"]').click();

    // リダイレクトを確認
    cy.url().should('include', '/dashboard');
  });

  it('should show validation error', () => {
    cy.visit('/login');

    cy.get('input#email').type('invalid@example.com');
    cy.get('input#password').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    // エラーメッセージが表示される
    cy.contains('メールアドレスまたはパスワードが正しくありません').should('be.visible');
  });
});
```

### APIリクエストのインターセプト

```typescript
describe('API Test', () => {
  it('should intercept API calls', () => {
    // APIリクエストをインターセプト
    cy.intercept('POST', '/api/auth/callback/credentials*').as('login');

    cy.visit('/login');
    cy.get('input#email').type('admin@example.com');
    cy.get('input#password').type('password123');
    cy.get('button[type="submit"]').click();

    // APIリクエストを待機
    cy.wait('@login').its('response.statusCode').should('eq', 200);
  });
});
```

## ベストプラクティス

1. **テストの独立性**: 各テストは独立して実行できるようにする
   ```typescript
   // Good: 各テストで必要な状態を設定
   beforeEach(() => {
     cy.login('admin@example.com', 'password123');
   });
   ```

2. **セレクタの選択**
   - 優先順位: `id` > `data-testid` > `class` > タグ名
   ```typescript
   // Good: IDセレクタを使用
   cy.get('input#email')

   // Better: data-testid属性を使用（将来的に追加推奨）
   cy.get('[data-testid="email-input"]')

   // Avoid: CSSクラス（スタイル変更で壊れやすい）
   cy.get('.input-field')
   ```

3. **待機の適切な使用**
   ```typescript
   // Good: 要素の状態を待つ
   cy.get('button').should('be.visible')

   // Bad: 固定時間の待機
   cy.wait(5000)

   // Good: APIレスポンスを待つ
   cy.intercept('POST', '/api/**').as('apiCall')
   cy.wait('@apiCall')
   ```

4. **エラーハンドリング**
   ```typescript
   // エラーメッセージの確認
   cy.contains('メールアドレスまたはパスワードが正しくありません')
     .should('be.visible')
   ```

5. **テストデータの管理**
   - シードデータを使用して一貫した状態を保つ
   - テスト間でデータを共有しない
   - 必要に応じてデータをリセット

6. **認証状態の管理**
   ```typescript
   // Good: cy.sessionを使用してセッションを再利用
   cy.login('admin@example.com', 'password123')

   // Bad: 毎回ログインフォームから認証
   ```

7. **タイムアウトの設定**
   ```typescript
   // 特定のアサーションにタイムアウトを設定
   cy.url().should('include', '/dashboard', { timeout: 10000 })
   ```

## トラブルシューティング

### テストDBに接続できない

```bash
# PostgreSQLコンテナが起動しているか確認
docker ps | grep setplan-postgres-test

# コンテナを再起動
docker-compose restart postgres-test
```

### マイグレーションエラー

```bash
# テストDBをリセット
DATABASE_URL="postgresql://setplan_user:setplan_password@localhost:5433/setplan_test_db?schema=public" npx prisma migrate reset --force
```

### Cypressのバージョン問題

Cypressのバージョンは15.4.0以上を使用してください。

```bash
# Cypressのバージョン確認
npx cypress version

# アップデート
npm install --save-dev cypress@latest
```

## CI/CD統合

GitHub ActionsやGitLab CIなどのCI/CDパイプラインでテストを実行する場合は、以下のステップを含めてください：

1. テストDBコンテナの起動
2. データベースマイグレーション
3. Next.jsアプリケーションの起動
4. Cypressテストの実行

例（GitHub Actions）:

```yaml
- name: Start test database
  run: docker-compose up -d postgres-test

- name: Run migrations
  run: DATABASE_URL="postgresql://setplan_user:setplan_password@localhost:5433/setplan_test_db?schema=public" npx prisma migrate deploy

- name: Start Next.js app
  run: npm run dev &

- name: Run E2E tests
  run: npm run test:e2e
```

## 参考資料

- [Cypress公式ドキュメント](https://docs.cypress.io/)
- [Next.jsとCypressの統合](https://nextjs.org/docs/testing#cypress)
- [Prismaテストガイド](https://www.prisma.io/docs/guides/testing)
