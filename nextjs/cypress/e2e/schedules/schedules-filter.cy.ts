describe('Schedules Page - Filter Apply Button', () => {
  before(() => {
    Cypress.session.clearAllSavedSessions();
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.resetAndSeedDb();
  });

  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
    cy.intercept('GET', '/api/schedules?*').as('getSchedules');
  });

  const visitSchedules = () => {
    cy.visit('/schedules');
    cy.wait('@getSchedules');
  };

  const selectOption = (selector: string, optionLabel: string) => {
    cy.get(selector).click();
    cy.contains('[data-slot="select-item"]', optionLabel, { timeout: 10000 })
      .should('be.visible')
      .click();
  };

  const clickApplyButton = () => {
    cy.contains('button', '適用').should('not.be.disabled').click();
    cy.wait('@getSchedules');
  };

  it('applies user filter only after clicking the apply button', () => {
    visitSchedules();

    // ベースラインとして部署フィルターを「すべて」に設定
    selectOption('#department-filter', 'すべて');
    clickApplyButton();

    // 初期表示では管理 太郎のスケジュールが確認できる
    cy.get('table tbody').should('contain', '管理 太郎');

    // ユーザーフィルターで山田 花子を選択するが、適用前は結果が変わらない
    selectOption('#user-filter', '山田 花子');
    cy.get('table tbody').should('contain', '管理 太郎');

    // 適用ボタンを押すと山田 花子のデータに絞り込まれる
    clickApplyButton();
    cy.get('table tbody').should('contain', '山田 花子');
    cy.get('table tbody').should('not.contain', '管理 太郎');
  });

  it('applies department filter only after clicking the apply button', () => {
    visitSchedules();

    selectOption('#department-filter', 'すべて');
    clickApplyButton();
    cy.get('table tbody').should('contain', '管理 太郎');

    // 部署フィルターを営業部に変更しても、適用までは結果が変わらない
    selectOption('#department-filter', '営業部');
    cy.get('table tbody').should('contain', '管理 太郎');

    clickApplyButton();
    cy.get('table tbody').should('contain', '鈴木 一郎');
    cy.get('table tbody').should('not.contain', '管理 太郎');
  });

  it('applies date range filter only after clicking the apply button', () => {
    visitSchedules();

    selectOption('#department-filter', 'すべて');
    clickApplyButton();
    cy.get('table tbody').should('contain', '2024/1/16');

    cy.get('#start-date').clear().type('2024-01-15');
    cy.get('#end-date').clear().type('2024-01-15');

    // 適用前は他の日付が引き続き表示される
    cy.get('table tbody').should('contain', '2024/1/16');

    clickApplyButton();
    cy.get('table tbody').should('contain', '2024/1/15');
    cy.get('table tbody').should('not.contain', '2024/1/16');
    cy.get('table tbody').should('not.contain', '2024/1/17');
  });
});
