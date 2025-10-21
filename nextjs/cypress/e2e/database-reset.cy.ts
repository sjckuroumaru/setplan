describe('Database Reset', () => {
  // このテストはデータベースリセット機能のデモンストレーションです
  // 実際のテストスイートでは、beforeEach や before でこれらのコマンドを使用します

  it('should reset database using cy.task', () => {
    cy.log('Testing database reset via Cypress task');
    cy.resetDb();
    cy.log('Database reset completed');
  });

  it('should seed database using cy.task', () => {
    cy.log('Testing database seeding via Cypress task');
    cy.seedDb();
    cy.log('Database seeding completed');
  });

  it('should reset and seed database using cy.task', () => {
    cy.log('Testing database reset and seed via Cypress task');
    cy.resetAndSeedDb();
    cy.log('Database reset and seeding completed');
  });

  it('should verify seeded data exists after reset and seed', () => {
    // データベースをリセットしてシード
    cy.resetAndSeedDb();

    // ログインして確認
    cy.visit('/login');
    cy.get('input#email').type('admin@example.com');
    cy.get('input#password').type('password123');
    cy.get('button[type="submit"]').click();

    // ダッシュボードにアクセスできることを確認
    cy.url().should('include', '/dashboard', { timeout: 10000 });
  });
});
