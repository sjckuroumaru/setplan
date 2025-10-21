# データベースリセット機能ガイド

## 概要

Cypress E2Eテストでテストデータベースをリセット・シードするための機能を提供します。この機能により、各テストを独立した状態で実行できます。

## 実装されている機能

### 1. Cypressカスタムコマンド

Cypressテスト内で使用できるカスタムコマンドです。

#### cy.resetDb()
データベースを完全にリセットします（全データ削除 + マイグレーション再実行）。

```typescript
cy.resetDb();
```

#### cy.seedDb()
テストデータをデータベースに投入します。

```typescript
cy.seedDb();
```

#### cy.resetAndSeedDb()
データベースをリセットしてからシードデータを投入します（最も一般的に使用）。

```typescript
cy.resetAndSeedDb();
```

### 2. Cypressタスク

`cypress.config.ts`で定義されているNode.jsタスクです。カスタムコマンドから内部的に呼び出されます。

- `resetDatabase` - データベースリセット
- `seedDatabase` - データシード
- `resetAndSeedDatabase` - リセット＆シード

これらのタスクはPrisma CLIコマンドを実行してデータベース操作を行います。


## 使用例

### パターン1: テストスイート全体で1回リセット

```typescript
describe('User Management', () => {
  before(() => {
    // テストスイート全体の前に一度だけリセット&シード
    cy.resetAndSeedDb();
  });

  it('should list all users', () => {
    cy.login('admin@example.com', 'password123');
    cy.visit('/users');
    cy.contains('admin@example.com').should('be.visible');
  });

  it('should create a new user', () => {
    cy.login('admin@example.com', 'password123');
    cy.visit('/users/new');
    // ユーザー作成テスト
  });
});
```

### パターン2: 各テストの前にリセット（完全な独立性）

```typescript
describe('Project Management', () => {
  beforeEach(() => {
    // 各テストの前にリセット&シード
    cy.resetAndSeedDb();
  });

  it('should create a project', () => {
    cy.login('admin@example.com', 'password123');
    cy.visit('/projects/new');
    // プロジェクト作成テスト
  });

  it('should delete a project', () => {
    cy.login('admin@example.com', 'password123');
    cy.visit('/projects');
    // プロジェクト削除テスト
  });
});
```

### パターン3: 特定のテストでのみリセット

```typescript
describe('Data Import', () => {
  it('should import data from CSV', () => {
    // このテストの前にクリーンな状態にする
    cy.resetDb();

    cy.login('admin@example.com', 'password123');
    cy.visit('/import');
    // インポートテスト
  });

  it('should validate imported data', () => {
    // 前のテストのデータを使用
    cy.login('admin@example.com', 'password123');
    cy.visit('/data');
    // 検証テスト
  });
});
```

## セキュリティ

### 保護機能

1. **テストDB確認**
   - `DATABASE_URL`に"test"が含まれない場合、実行を拒否します
   - 誤って本番DBを削除することを防ぎます

2. **Cypress内部実行のみ**
   - これらの機能はCypressテスト内からのみ実行可能
   - 外部からのHTTPリクエストでは呼び出せません

### 使用上の注意

- `.env.test.local`には必ずテストDB用の接続文字列を設定してください
- `DATABASE_URL`に必ず"test"という文字列を含めてください
- テストDB以外での使用は厳禁です

## トラブルシューティング

### タイムアウトエラー

```
Error: cy.task('resetDatabase') timed out
```

**原因**: データベースのリセットに60秒以上かかっている

**解決策**:
- データベースの接続を確認
- テストDBが起動しているか確認
- 必要に応じて`cypress.config.ts`でタイムアウトを延長

### DATABASE_URLエラー

```
Error: DATABASE_URL must contain "test"
```

**原因**: 環境変数が正しく設定されていない

**解決策**:
1. `.env.test.local`が存在するか確認
2. `DATABASE_URL`に"test"が含まれているか確認
3. Cypressを再起動

## パフォーマンス

### 実行時間の目安

- `cy.resetDb()`: 約10-20秒
- `cy.seedDb()`: 約20-30秒
- `cy.resetAndSeedDb()`: 約30-50秒

### 最適化のヒント

1. **テストスイート単位でリセット**
   - `beforeEach`ではなく`before`を使用
   - テスト実行時間を大幅に短縮

2. **必要な場合のみシード**
   - リセットのみが必要な場合は`cy.resetDb()`を使用
   - シードが不要なテストではスキップ

3. **並列実行の考慮**
   - 並列実行時は各ワーカーでDBリセットが必要
   - 分離されたテストDBを使用することを推奨

## 関連ドキュメント

- [Cypress E2E Testing ガイド](./cypress-e2e-testing-guide.md) - E2Eテストの全体的なガイド
- [SWR実装ガイド](./swr-implementation-guide.md) - APIとの統合
