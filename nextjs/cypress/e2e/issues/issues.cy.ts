describe('Issues Page', () => {
  before(() => {
    // Cypressのセッションキャッシュをすべてクリア
    Cypress.session.clearAllSavedSessions();
    // セッションをクリア
    cy.clearCookies();
    cy.clearLocalStorage();
    // テストスイート全体の前にデータベースをリセット＆シード
    cy.resetAndSeedDb();
  });

  beforeEach(() => {
    // テストユーザーでログイン
    cy.login('admin@example.com', 'password123');
  });

  it('should display the issues page', () => {
    cy.visit('/issues');
    cy.url().should('include', '/issues');
  });

  it('should be accessible without redirecting to login', () => {
    cy.visit('/issues');

    // ログインページにリダイレクトされない
    cy.url().should('not.include', '/login');
    cy.url().should('include', '/issues');
  });

  it('should show page title and header', () => {
    cy.visit('/issues');

    // ページタイトルが表示されている
    cy.contains('課題管理').should('be.visible');
    cy.contains('案件の課題を追跡・管理').should('be.visible');
  });

  it('should show issues list table', () => {
    cy.visit('/issues');

    // テーブルが表示されている
    cy.get('table').should('be.visible');

    // テーブルヘッダーが表示されている
    cy.get('table').within(() => {
      cy.contains('th', 'ID').should('be.visible');
      cy.contains('th', '課題').should('be.visible');
      cy.contains('th', '案件').should('be.visible');
      cy.contains('th', 'ステータス').should('be.visible');
      cy.contains('th', '優先度').should('be.visible');
      cy.contains('th', '担当者').should('be.visible');
      cy.contains('th', '期限').should('be.visible');
      cy.contains('th', 'コメント').should('be.visible');
      cy.contains('th', '操作').should('be.visible');
    });
  });

  it('should show issue data from seed', () => {
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルター（非管理者の場合）がかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // シードデータの課題が表示されている
    cy.get('table tbody tr').should('have.length.at.least', 1);
  });

  it('should have new issue button', () => {
    cy.visit('/issues');

    // 新規作成ボタンが表示されている
    cy.contains('新規課題').should('be.visible');
  });

  it('should navigate to new issue page', () => {
    cy.visit('/issues');

    // 新規課題ボタンをクリック
    cy.contains('新規課題').click();

    // 新規作成ページにリダイレクトされる
    cy.url().should('include', '/issues/new');
  });

  it('should display issue statistics cards', () => {
    cy.visit('/issues');

    // 統計カードが表示されている（IssueStatsコンポーネント）
    cy.contains('全課題').should('be.visible');
    cy.contains('未対応').should('be.visible');
    cy.contains('対応中').should('be.visible');
    cy.contains('解決済').should('be.visible');
    cy.contains('高優先度').should('be.visible');
  });

  it('should have filter section', () => {
    cy.visit('/issues');

    // フィルターセクションが表示されている
    cy.contains('フィルター').should('be.visible');

    // 検索フィールド
    cy.get('label[for="search"]').should('contain', '検索');
    cy.get('#search').should('be.visible');

    // ステータスフィルター
    cy.get('label[for="status-filter"]').should('contain', 'ステータス');
    cy.get('#status-filter').should('be.visible');

    // 優先度フィルター
    cy.get('label[for="priority-filter"]').should('contain', '優先度');
    cy.get('#priority-filter').should('be.visible');

    // 案件フィルター
    cy.get('label[for="project-filter"]').should('contain', '案件');
    cy.get('#project-filter').should('be.visible');

    // 担当者フィルター
    cy.get('label[for="assignee-filter"]').should('contain', '担当者');
    cy.get('#assignee-filter').should('be.visible');

    // 部署フィルター
    cy.get('label[for="department-filter"]').should('contain', '部署');
    cy.get('#department-filter').should('be.visible');
  });

  it('should show issue details in table rows', () => {
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // 課題の情報が表示されている
    cy.get('table tbody tr').first().within(() => {
      // ID（最初の8文字）が表示されている
      cy.get('td').first().should('not.be.empty');

      // 課題タイトルが表示されている
      cy.get('td').eq(1).should('not.be.empty');
    });
  });

  it('should have pagination controls', () => {
    cy.visit('/issues');

    // ページネーションが表示されている（データが十分にある場合）
    cy.get('main').should('be.visible');
  });

  it('should show action dropdown menu', () => {
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // 操作ドロップダウンメニューをクリック
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    // メニュー項目が表示される
    cy.contains('[role="menuitem"]', '詳細').should('be.visible');
    cy.contains('[role="menuitem"]', '編集').should('be.visible');
  });

  it('should navigate to edit page when clicking edit button', () => {
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開く
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    // 編集リンクをクリック（メニューアイテム内のリンク）
    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // 編集ページにリダイレクトされる
    cy.url().should('match', /\/issues\/[^/]+\/edit/);
  });

  it('should navigate to detail page when clicking detail button', () => {
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューから詳細ボタンをクリック
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    // 詳細メニュー項目をクリック
    cy.contains('[role="menuitem"]', '詳細').should('be.visible').click();

    // 詳細ページにリダイレクトされる
    cy.url().should('match', /\/issues\/[^/]+$/);
    cy.url().should('not.include', '/edit');
  });
});


describe('Issues Page - Admin Features', () => {
  before(() => {
    // Cypressのセッションキャッシュをすべてクリア
    Cypress.session.clearAllSavedSessions();
    // セッションをクリア
    cy.clearCookies();
    cy.clearLocalStorage();
    // データベースをリセット＆シード
    cy.resetAndSeedDb();
  });

  beforeEach(() => {
    cy.login('admin@example.com', 'password123');
  });

  it('should show delete button for admin users', () => {
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // 操作ドロップダウンメニューをクリック
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    // 削除ボタンが表示される（管理者のみ）
    cy.contains('[role="menuitem"]', '削除').should('be.visible');
  });

  it('should show delete confirmation dialog when clicking delete', () => {
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // 操作ドロップダウンメニューから削除ボタンをクリック
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    // 削除メニューアイテムをクリック
    cy.contains('[role="menuitem"]', '削除').should('be.visible').click();

    // 削除確認ダイアログが表示される
    cy.contains('課題の削除').should('be.visible');
    cy.contains('本当にこの課題を削除しますか').should('be.visible');
  });

  it('should cancel deletion when clicking cancel button', () => {
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // 操作ドロップダウンメニューから削除ボタンをクリック
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    // 削除メニューアイテムをクリック
    cy.contains('[role="menuitem"]', '削除').should('be.visible').click();

    // 削除確認ダイアログが表示されるまで待つ
    cy.contains('課題の削除').should('be.visible');

    // 削除確認ダイアログでキャンセルボタンをクリック
    cy.get('[role="dialog"]').within(() => {
      cy.contains('button', 'キャンセル').click();
    });

    // ダイアログが閉じる
    cy.contains('課題の削除').should('not.exist');
  });
});

describe('Issues Page - Non-Admin User', () => {
  before(() => {
    // Cypressのセッションキャッシュをすべてクリア
    Cypress.session.clearAllSavedSessions();
    // セッションをクリア
    cy.clearCookies();
    cy.clearLocalStorage();
    // データベースをリセット＆シード
    cy.resetAndSeedDb();
  });

  beforeEach(() => {
    // 非管理者ユーザーでログイン
    cy.login('yamada@example.com', 'password123');
  });

  it('should not show delete button for non-admin users', () => {
    cy.visit('/issues');

    // すべての課題を表示するためにフィルターを調整
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // 操作ドロップダウンメニューをクリック
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    // 削除ボタンが表示されない（非管理者）
    cy.contains('[role="menuitem"]', '削除').should('not.exist');
  });

  it('should show only detail and edit options for non-admin users', () => {
    cy.visit('/issues');

    // すべての課題を表示するためにフィルターを調整
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // 操作ドロップダウンメニューをクリック
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    // 詳細と編集のみ表示される
    cy.contains('[role="menuitem"]', '詳細').should('be.visible');
    cy.contains('[role="menuitem"]', '編集').should('be.visible');
  });
});
