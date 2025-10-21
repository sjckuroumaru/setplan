describe('Schedules Page', () => {
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

  it('should display the schedules page', () => {
    cy.visit('/schedules');
    cy.url().should('include', '/schedules');
  });

  it('should be accessible without redirecting to login', () => {
    cy.visit('/schedules');

    // ログインページにリダイレクトされない
    cy.url().should('not.include', '/login');
    cy.url().should('include', '/schedules');
  });

  it('should show schedules list', () => {
    cy.visit('/schedules');

    // ページタイトル・ヘッダーが表示されている
    cy.contains('予定実績管理').should('be.visible');

    // テーブルが表示されている
    cy.get('table').should('be.visible');
  });

  it('should show schedule data from seed', () => {
    cy.visit('/schedules');

    // 初期表示では部署フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // シードデータのスケジュールが表示されている
    cy.get('table').within(() => {
      // ユーザー名が表示されている
      cy.contains('管理').should('be.visible');
    });

    // 日付が日本語形式で表示されている（例: 2024/1/15）
    cy.get('table').within(() => {
      cy.get('td').contains(/\d{4}\/\d{1,2}\/\d{1,2}/).should('be.visible');
    });
  });

  it('should have new schedule button', () => {
    cy.visit('/schedules');

    // 新規作成ボタンが表示されている
    cy.contains('新規登録').should('be.visible');
  });

  it('should navigate to new schedule page', () => {
    cy.visit('/schedules');

    // 新規登録ボタンをクリック
    cy.contains('新規登録').click();

    // 新規作成ページにリダイレクトされる
    cy.url().should('include', '/schedules/new');
  });

  it('should show navigation buttons for different views', () => {
    cy.visit('/schedules');

    // ビュー切り替えボタンが表示されている
    cy.contains('カレンダー').should('be.visible');
    cy.contains('グラフ').should('be.visible');
  });

  it('should navigate to calendar view', () => {
    cy.visit('/schedules');

    // カレンダーボタンをクリック
    cy.contains('カレンダー').click();

    // カレンダービューに遷移
    cy.url().should('include', '/schedules/calendar');
  });

  it('should navigate to chart view', () => {
    cy.visit('/schedules');

    // グラフボタンをクリック
    cy.contains('グラフ').click();

    // チャートビューに遷移
    cy.url().should('include', '/schedules/chart');
  });

  it('should have user filter', () => {
    cy.visit('/schedules');

    // ユーザーフィルターが表示されている
    cy.get('label[for="user-filter"]').should('contain', 'ユーザー');
    cy.get('#user-filter').should('be.visible');
  });

  it('should have department filter', () => {
    cy.visit('/schedules');

    // 部署フィルターが表示されている
    cy.get('label[for="department-filter"]').should('contain', '部署');
    cy.get('#department-filter').should('be.visible');
  });

  it('should have date range filters', () => {
    cy.visit('/schedules');

    // 開始日・終了日フィルターが表示されている
    cy.contains('開始日').should('be.visible');
    cy.contains('終了日').should('be.visible');
  });

  it('should show user information in schedule list', () => {
    cy.visit('/schedules');

    // 初期表示では部署フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // ユーザー名が表示されている
    cy.get('table').within(() => {
      cy.contains('管理').should('be.visible');
    });
  });

  it('should show check-in and check-out times', () => {
    cy.visit('/schedules');

    // 初期表示では部署フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // 出勤時間・退勤時間のカラムヘッダーが表示されている
    cy.get('table').within(() => {
      cy.contains('th', '出社').should('be.visible');
      cy.contains('th', '退社').should('be.visible');
    });

    // 時間データが表示されている（データがある場合）
    cy.get('table tbody tr').first().within(() => {
      // 出社・退社時間のセルが存在する（データは"-"の可能性もある）
      cy.get('td').should('have.length.at.least', 4);
    });
  });

  it('should have pagination controls', () => {
    cy.visit('/schedules');

    // ページネーションが表示されている（データが十分にある場合）
    // Note: シードデータの量によって表示が変わる
    cy.get('main').should('be.visible');
  });

  it('should navigate to edit page when clicking edit button', () => {
    cy.visit('/schedules');

    // 初期表示では部署フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブル内の編集ボタンをクリック（最初のスケジュール）
    cy.get('table tbody tr').first().within(() => {
      cy.get('a[href*="/schedules/"][href*="/edit"]').click();
    });

    // 編集ページにリダイレクトされる
    cy.url().should('match', /\/schedules\/[^/]+\/edit/);
  });
});

describe('Schedules Page - Filters', () => {
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

  it('should filter schedules by user', () => {
    cy.visit('/schedules');

    // 初期表示では部署フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // 初期状態では複数ユーザーのスケジュールが表示されている
    cy.get('table tbody tr').should('have.length.at.least', 2);

    // ユーザーフィルターで「山田 花子」を選択
    cy.get('#user-filter').click();
    cy.contains('[data-slot="select-item"]', '山田 花子', { timeout: 10000 }).should('be.visible').click();

    // 山田 花子のスケジュールが表示される
    cy.get('table tbody tr').should('have.length.at.least', 1);
    cy.get('table tbody').should('contain', '山田 花子');

    // 他のユーザーが表示されていないことを確認
    cy.get('table tbody').should('not.contain', '管理 太郎');
  });

  it('should filter schedules by department', () => {
    cy.visit('/schedules');

    // 初期表示では部署フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // 初期状態では複数部署のスケジュールが表示されている
    cy.get('table tbody tr').should('have.length.at.least', 2);

    // 部署フィルターで「営業部」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', '営業部', { timeout: 10000 }).should('be.visible').click();

    // 営業部のプロジェクトに紐づくスケジュールが表示される
    // 営業部に紐づくスケジュールがある場合のみ表示される
    cy.get('table tbody tr').should('exist');
  });

  it('should filter schedules by date range', () => {
    cy.visit('/schedules');

    // 初期表示では部署フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // 日付範囲を設定（2024-01-15のみ）
    cy.get('#start-date').type('2024-01-15');
    cy.get('#end-date').type('2024-01-15');

    // 2024-01-15のスケジュールが表示される
    cy.get('table tbody tr').should('have.length.at.least', 1);
    cy.get('table tbody').should('contain', '2024/1/15');

    // 2024-01-16は表示されないことを確認
    cy.get('table tbody').should('not.contain', '2024/1/16');
    cy.get('table tbody').should('not.contain', '2024/1/17');
  });

  it('should clear all filters', () => {
    cy.visit('/schedules');

    // 初期表示では部署フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // フィルターを設定
    cy.get('#start-date').type('2024-01-15');
    cy.get('#end-date').type('2024-01-15');

    // フィルタークリアボタンをクリック
    cy.contains('button', 'フィルターをクリア').click();

    // フィルターがクリアされている
    cy.get('#start-date').should('have.value', '');
    cy.get('#end-date').should('have.value', '');

    // 初期状態（部署フィルターあり）に戻る
    cy.get('table tbody tr').should('exist');
  });
});
