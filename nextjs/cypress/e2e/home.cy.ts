describe('Home Page', () => {
  it('should redirect to login when accessing root without authentication', () => {
    cy.visit('/');
    // ルートにアクセスするとログインページにリダイレクトされる
    cy.url().should('include', '/login');
  });

  it('should redirect to login when accessing dashboard without authentication', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });

  it('should redirect to login when accessing protected routes without authentication', () => {
    const protectedRoutes = ['/projects', '/issues', '/schedules', '/customers', '/users'];

    protectedRoutes.forEach((route) => {
      cy.visit(route);
      cy.url().should('include', '/login');
    });
  });

  it('should have a proper page title', () => {
    cy.visit('/login');
    cy.title().should('not.be.empty');
  });

  it('should redirect authenticated users away from login page', () => {
    // ログイン
    cy.login('admin@example.com', 'password123');

    // ログイン後にログインページにアクセスするとダッシュボードにリダイレクトされる
    cy.visit('/login');
    cy.url().should('include', '/dashboard');
  });
});
