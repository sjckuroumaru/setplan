/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login
       * @example cy.login('test@example.com', 'password')
       */
      login(email: string, password: string): Chainable<void>;

      /**
       * Custom command to reset database
       * @example cy.resetDb()
       */
      resetDb(): Chainable<void>;

      /**
       * Custom command to seed database
       * @example cy.seedDb()
       */
      seedDb(): Chainable<void>;

      /**
       * Custom command to reset and seed database
       * @example cy.resetAndSeedDb()
       */
      resetAndSeedDb(): Chainable<void>;

      /**
       * Custom command to visit schedules page and wait for initial data load
       * @example cy.visitSchedulesAndWaitForData()
       * @example cy.visitSchedulesAndWaitForData(true) // with filtering all departments
       */
      visitSchedulesAndWaitForData(filterAllDepartments?: boolean): Chainable<void>;
    }
  }
}

// Custom command to login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      cy.visit('/login');
      cy.get('input#email').type(email);
      cy.get('input#password').type(password);
      cy.get('button[type="submit"]').click();
      cy.url().should('not.include', '/login', { timeout: 10000 });
      cy.url().should('include', '/dashboard');
    },
    {
      validate() {
        // Validate that the session is still valid
        cy.visit('/dashboard');
        cy.url().should('include', '/dashboard');
      },
    }
  );
});

// Custom command to reset database
Cypress.Commands.add('resetDb', () => {
  cy.log('Resetting test database...');
  // データベースリセット前に、古いセッションとクッキーをクリア
  Cypress.session.clearAllSavedSessions();
  cy.clearCookies();
  cy.clearAllSessionStorage();
  cy.clearAllLocalStorage();
  cy.task('resetDatabase', null, { timeout: 60000 });
});

// Custom command to seed database
Cypress.Commands.add('seedDb', () => {
  cy.log('Seeding test database...');
  cy.task('seedDatabase', null, { timeout: 60000 });
});

// Custom command to reset and seed database
Cypress.Commands.add('resetAndSeedDb', () => {
  cy.log('Resetting and seeding test database...');
  // データベースリセット前に、古いセッションとクッキーをクリア
  Cypress.session.clearAllSavedSessions();
  cy.clearCookies();
  cy.clearAllSessionStorage();
  cy.clearAllLocalStorage();
  cy.task('resetAndSeedDatabase', null, { timeout: 120000 });
});

// Custom command to visit schedules page and wait for initial data load
Cypress.Commands.add('visitSchedulesAndWaitForData', (filterAllDepartments = false) => {
  // 初期表示の部署フィルタリングAPIをインターセプト
  cy.intercept('GET', '/api/schedules*').as('getSchedules');

  cy.visit('/schedules');

  // 初期データの読み込みが完了するまで待つ
  // 初期表示時に2つのAPIリクエストが発生する：
  // 1. GET /api/schedules?page=1&limit=30
  // 2. GET /api/schedules?page=1&limit=30&departmentId=... (自動的な部署フィルタリング)
  cy.wait('@getSchedules'); // 1つ目のリクエスト
  cy.wait('@getSchedules'); // 2つ目のリクエスト（部署フィルタリング）

  cy.get('table tbody tr').should('exist');

  // オプションで部署フィルターで「すべて」を選択
  if (filterAllDepartments) {
    cy.get('#department-filter').should('be.visible').as('departmentFilter');
    cy.get('@departmentFilter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // フィルター変更後のデータが表示されるまで待つ
    // 注: 「すべて」を選択した場合、URLが初回ロード時と同じになるため、
    // SWRのdedupingInterval設定により新しいリクエストは発生しない（キャッシュが使用される）
    // そのため、cy.waitではなくテーブルの状態を確認する
    cy.get('table tbody tr').should('exist');
  }
});

export {};
