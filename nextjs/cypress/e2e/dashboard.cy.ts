describe('Dashboard', () => {
  // テストデータベースにシードデータが必要
  // 実行前に: DATABASE_URL="..." npm run db:seed-test

  beforeEach(() => {
    // テストユーザーでログイン
    cy.login('admin@example.com', 'password123');
  });

  it('should display the dashboard after login', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/dashboard');
  });

  it('should show dashboard content and layout', () => {
    cy.visit('/dashboard');

    // ダッシュボードの基本要素が表示されている
    cy.get('main').should('be.visible');
  });

  it('should be accessible without redirecting to login', () => {
    cy.visit('/dashboard');

    // ログインページにリダイレクトされない
    cy.url().should('not.include', '/login');
    cy.url().should('include', '/dashboard');
  });

  it('should navigate to projects page', () => {
    cy.visit('/dashboard');

    // プロジェクトページへのリンクをクリック
    cy.get('a[href="/projects"]').first().click();
    cy.url().should('include', '/projects');
  });

  it('should navigate to issues page', () => {
    cy.visit('/dashboard');

    // 課題ページへのリンクをクリック
    cy.get('a[href="/issues"]').first().click();
    cy.url().should('include', '/issues');
  });

  it('should navigate to schedules page', () => {
    cy.visit('/dashboard');

    // スケジュールページへのリンクをクリック
    cy.get('a[href="/schedules"]').first().click();
    cy.url().should('include', '/schedules');
  });

  it('should navigate to performance ledger page', () => {
    cy.visit('/dashboard');

    // 実績台帳ページへのリンクをクリック
    cy.get('a[href="/performance-ledger"]').first().click();
    cy.url().should('include', '/performance-ledger');
  });
});
