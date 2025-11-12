describe('Issues Page - Filter Apply Button', () => {
  before(() => {
    Cypress.session.clearAllSavedSessions();
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.resetAndSeedDb();
  });

  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
    cy.intercept('GET', '/api/issues?*').as('getIssues');
  });

  const visitIssues = () => {
    cy.visit('/issues');
    cy.wait('@getIssues');
  };

  const selectOption = (selector: string, optionLabel: string) => {
    cy.get(selector).click();
    cy.contains('[data-slot="select-item"]', optionLabel, { timeout: 10000 })
      .should('be.visible')
      .click();
  };

  const clickApplyButton = () => {
    cy.contains('button', '適用').should('not.be.disabled').click();
    cy.wait('@getIssues');
  };

  it('applies search filter only after clicking the apply button', () => {
    visitIssues();

    selectOption('#department-filter', 'すべて');
    clickApplyButton();

    // ベースライン: ログイン課題が表示されている
    cy.get('table tbody').should('contain', 'ログイン画面の実装');

    // 検索語を入力しても適用までは変化しない
    cy.get('#search').clear().type('セキュリティ');
    cy.get('table tbody').should('contain', 'ログイン画面の実装');

    // 適用後に絞り込み
    clickApplyButton();
    cy.get('table tbody').should('contain', 'セキュリティ脆弱性の修正');
    cy.get('table tbody').should('not.contain', 'レスポンシブデザインの対応');
  });

  it('applies status filter only after clicking the apply button', () => {
    visitIssues();

    selectOption('#department-filter', 'すべて');
    clickApplyButton();

    // ステータスを「未対応」に変更、適用前は従来のデータが残る
    selectOption('#status-filter', '未対応');
    cy.get('table tbody').should('contain', 'ログイン画面の実装');

    clickApplyButton();
    cy.get('table tbody').should('contain', 'レスポンシブデザインの対応');
    cy.get('table tbody').should('not.contain', 'データベース設計の見直し');
  });

  it('clears filters and restores defaults', () => {
    visitIssues();

    selectOption('#department-filter', 'すべて');
    clickApplyButton();

    cy.get('#search').clear().type('ログイン');
    selectOption('#status-filter', '対応中');
    selectOption('#priority-filter', '高');
    clickApplyButton();
    cy.get('table tbody').should('contain', 'ログイン画面の実装');

    cy.contains('button', 'クリア').click();
    cy.wait('@getIssues');

    cy.get('#search').should('have.value', '');
    cy.get('#status-filter').should('contain', 'すべて');
    cy.get('#department-filter').should('contain', '開発部');
  });
});
