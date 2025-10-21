describe('Sign In', () => {
  before(() => {
    // Cypressのセッションキャッシュをすべてクリア
    Cypress.session.clearAllSavedSessions();
    // セッションをクリア
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display the sign in page', () => {
    cy.url().should('include', '/login');
    cy.contains('Set Plan').should('be.visible');
    cy.contains('メールアドレスとパスワードでログイン').should('be.visible');
  });

  it('should show sign in form with all required fields', () => {
    cy.get('input#email').should('be.visible').and('have.attr', 'type', 'email');
    cy.get('input#password').should('be.visible').and('have.attr', 'type', 'password');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'ログイン');
  });

  it('should require email and password (HTML5 validation)', () => {
    // HTML5の必須属性がある
    cy.get('input#email').should('have.attr', 'required');
    cy.get('input#password').should('have.attr', 'required');
  });

  it('should show error for invalid credentials', () => {
    cy.get('input#email').type('invalid@example.com');
    cy.get('input#password').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    // エラーメッセージが表示される
    cy.contains('メールアドレスまたはパスワードが正しくありません').should('be.visible');
  });

  it('should show error for non-existent user', () => {
    cy.get('input#email').type('nonexistent@example.com');
    cy.get('input#password').type('somepassword');
    cy.get('button[type="submit"]').click();

    // エラーメッセージが表示される
    cy.contains('メールアドレスまたはパスワードが正しくありません').should('be.visible');
  });

  // Note: ローディング状態のテストは実際のログイン処理が速すぎるため、
  // cy.interceptでレスポンスを遅延させる必要があります
  it('should disable form during submission', () => {
    // APIレスポンスを遅延させてローディング状態をキャプチャ
    cy.intercept('POST', '/api/auth/callback/credentials*', (req) => {
      req.continue((res) => {
        res.delay = 1000; // 1秒遅延
      });
    }).as('login');

    cy.get('input#email').type('admin@example.com');
    cy.get('input#password').type('password123');
    cy.get('button[type="submit"]').click();

    // ローディング中は入力フィールドとボタンが無効化される
    cy.get('input#email').should('be.disabled');
    cy.get('input#password').should('be.disabled');
    cy.get('button[type="submit"]').should('be.disabled').and('contain', 'ログイン中');

    // ログイン完了を待つ
    cy.wait('@login');
    cy.url().should('include', '/dashboard', { timeout: 10000 });
  });

  it('should sign in with valid credentials and redirect to dashboard', () => {
    cy.get('input#email').type('admin@example.com');
    cy.get('input#password').type('password123');
    cy.get('button[type="submit"]').click();

    // ダッシュボードにリダイレクトされる
    cy.url().should('include', '/dashboard', { timeout: 10000 });
    cy.url().should('not.include', '/login');
  });

  it('should sign in with yamada user', () => {
    cy.get('input#email').type('yamada@example.com');
    cy.get('input#password').type('password123');
    cy.get('button[type="submit"]').click();

    // ダッシュボードにリダイレクトされる
    cy.url().should('include', '/dashboard', { timeout: 10000 });
  });

  it('should handle callbackUrl parameter', () => {
    cy.visit('/login?callbackUrl=/projects');

    cy.get('input#email').type('admin@example.com');
    cy.get('input#password').type('password123');
    cy.get('button[type="submit"]').click();

    // callbackUrlで指定したページにリダイレクトされる
    cy.url().should('include', '/projects', { timeout: 10000 });
  });
});
