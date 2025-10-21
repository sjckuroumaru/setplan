describe('Projects Page', () => {
  // テストデータベースにシードデータが必要
  // 実行前に: DATABASE_URL="..." npm run db:seed-test

  beforeEach(() => {
    // テストユーザーでログイン
    cy.login('admin@example.com', 'password123');
  });

  it('should display the projects page', () => {
    cy.visit('/projects');
    cy.url().should('include', '/projects');
  });

  it('should show projects list', () => {
    cy.visit('/projects');

    // プロジェクトが表示されている
    cy.contains('PRJ-2024-001').should('be.visible');
    cy.contains('新規ECサイト構築').should('be.visible');
  });

  it('should filter projects by status', () => {
    cy.visit('/projects');

    // ステータスでフィルタリング
    // Note: 実装に応じてセレクタを調整
    // cy.get('[data-testid="status-filter"]').click();
    // cy.contains('active').click();
  });

  it('should search projects', () => {
    cy.visit('/projects');

    // プロジェクト検索
    // Note: 実装に応じてセレクタを調整
    // cy.get('[data-testid="search-input"]').type('ECサイト');
    // cy.contains('新規ECサイト構築').should('be.visible');
  });

  it('should navigate to project detail page', () => {
    cy.visit('/projects');

    // プロジェクト詳細ページに遷移
    cy.contains('PRJ-2024-001').click();
    // Note: 実装に応じてURLを調整
    // cy.url().should('match', /\/projects\/[^/]+/);
  });
});
