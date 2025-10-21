describe('Issues New Page', () => {
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
    // ビューポートサイズを大きくしてスクロールを回避
    cy.viewport(1280, 1400);
    // テストユーザーでログイン
    cy.login('admin@example.com', 'password123');
  });

  it('should display the new issue page', () => {
    cy.visit('/issues/new');
    cy.url().should('include', '/issues/new');
  });

  it('should be accessible without redirecting to login', () => {
    cy.visit('/issues/new');

    // ログインページにリダイレクトされない
    cy.url().should('not.include', '/login');
    cy.url().should('include', '/issues/new');
  });

  it('should show page title and form', () => {
    cy.visit('/issues/new');

    // ページタイトルが表示されている
    cy.contains('新規課題登録').should('be.visible');
    cy.contains('新しい課題を登録します').should('be.visible');

    // フォームが表示されている
    cy.get('form').should('be.visible');
  });

  it('should have back button to issues list', () => {
    cy.visit('/issues/new');

    // 戻るボタンが表示されている
    cy.get('a[href="/issues"]').should('be.visible');
  });

  it('should navigate back to issues list when clicking back button', () => {
    cy.visit('/issues/new');

    // 戻るボタンをクリック
    cy.get('a[href="/issues"]').first().click();

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/issues');
    cy.url().should('not.include', '/new');
  });

  it('should have all required form fields', () => {
    cy.visit('/issues/new');

    // 基本情報セクション
    cy.contains('基本情報').should('be.visible');

    // 課題タイトルフィールド
    cy.contains('label', '課題タイトル').should('be.visible');
    cy.get('input#title').should('be.visible');

    // 詳細説明フィールド
    cy.contains('label', '詳細説明').should('be.visible');
    cy.get('textarea#description').should('be.visible');

    // 案件フィールド
    cy.contains('label', '案件').should('be.visible');
    cy.get('button[role="combobox"]').should('exist');

    // ステータスフィールド
    cy.contains('label', 'ステータス').should('be.visible');
    cy.get('#status').should('exist');

    // 優先度フィールド
    cy.contains('label', '優先度').should('be.visible');
    cy.get('#priority').should('exist');

    // ガントチャート情報セクション
    cy.contains('ガントチャート情報').scrollIntoView().should('be.visible');

    // 開始日フィールド
    cy.contains('label', '開始日').should('be.visible');
    cy.get('input#startDate').should('exist');

    // 終了日フィールド
    cy.contains('label', '終了日').should('be.visible');
    cy.get('input#endDate').should('exist');

    // 進捗率フィールド
    cy.contains('label', '進捗率').should('be.visible');

    // 担当・期限情報セクション
    cy.contains('担当・期限情報').scrollIntoView().should('be.visible');

    // 担当者フィールド
    cy.contains('label', '担当者').should('be.visible');
    cy.get('#assignee').should('exist');

    // 期限フィールド
    cy.contains('label', '期限').should('be.visible');
    cy.get('input#dueDate').should('exist');
  });

  it('should have submit and cancel buttons', () => {
    cy.visit('/issues/new');

    // 登録ボタンが表示されている
    cy.contains('button', '登録').scrollIntoView().should('be.visible');

    // キャンセルボタンが表示されている
    cy.contains('button', 'キャンセル').should('be.visible');
  });

  it('should have toggle button for showing all projects', () => {
    cy.visit('/issues/new');

    // 全案件表示ボタンが表示されている
    cy.contains('button', '全案件を表示').should('be.visible');
  });

  it('should toggle project filter when clicking show all projects button', () => {
    cy.visit('/issues/new');

    // 初期状態
    cy.contains('button', '全案件を表示').should('be.visible');

    // ボタンをクリック
    cy.contains('button', '全案件を表示').click();

    // ボタンのテキストが変わる
    cy.contains('button', '所属部署の案件のみ表示').should('be.visible');

    // もう一度クリック
    cy.contains('button', '所属部署の案件のみ表示').click();

    // 元に戻る
    cy.contains('button', '全案件を表示').should('be.visible');
  });

  it('should create new issue with minimum required data', () => {
    cy.visit('/issues/new');

    // タイトルを入力
    cy.get('input#title').type('新規課題のテスト');

    // 説明を入力
    cy.get('textarea#description').type('これは新規課題作成のテストです。');

    // 案件を選択
    cy.get('button[role="combobox"]').first().click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-001', { timeout: 10000 }).should('be.visible').click();

    // 登録ボタンをクリック
    cy.contains('button', '登録').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('課題を作成しました').should('be.visible');

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/issues', { timeout: 10000 });
    cy.url().should('not.include', '/new');
  });

  it('should create new issue with full data', () => {
    cy.visit('/issues/new');

    // タイトルを入力
    cy.get('input#title').type('フルデータ登録のテスト');

    // 説明を入力
    cy.get('textarea#description').type('これはフルデータでの課題作成テストです。\n\n詳細:\n- すべての項目を入力します');

    // 案件を選択
    cy.get('button[role="combobox"]').first().click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-001', { timeout: 10000 }).should('be.visible').click();

    // ステータスを選択
    cy.get('#status').click();
    cy.contains('[data-slot="select-item"]', '対応中').click();

    // 優先度を選択
    cy.get('#priority').click();
    cy.contains('[data-slot="select-item"]', '高').click();

    // ガントチャート情報セクションまでスクロール
    cy.contains('ガントチャート情報').scrollIntoView();

    // 開始日を入力
    cy.get('input#startDate').type('2024-02-01');

    // 終了日を入力
    cy.get('input#endDate').type('2024-02-28');

    // 進捗率を設定
    cy.get('input[type="text"]').clear().type('25');

    // 担当・期限情報セクションまでスクロール
    cy.contains('担当・期限情報').scrollIntoView();

    // 担当者を選択
    cy.get('#assignee').click();
    cy.contains('[data-slot="select-item"]', '山田 花子', { timeout: 10000 }).should('be.visible').click();

    // 期限を入力
    cy.get('input#dueDate').type('2024-03-15');

    // 登録ボタンをクリック
    cy.contains('button', '登録').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('課題を作成しました').should('be.visible');

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/issues', { timeout: 10000 });
    cy.url().should('not.include', '/new');
  });

  it('should validate required fields', () => {
    cy.visit('/issues/new');

    // 必須項目を入力せずに登録ボタンをクリック
    cy.contains('button', '登録').scrollIntoView().click();

    // フォームのバリデーションエラーが表示される（ブラウザのデフォルトバリデーション）
    cy.get('input#title:invalid').should('exist');
  });

  it('should cancel and return to issues list', () => {
    cy.visit('/issues/new');

    // データを入力
    cy.get('input#title').type('キャンセルテスト');

    // キャンセルボタンをクリック
    cy.contains('button', 'キャンセル').scrollIntoView().click();

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/issues');
    cy.url().should('not.include', '/new');
  });

  it('should set default status to in_progress', () => {
    cy.visit('/issues/new');

    // ステータスのデフォルト値が「対応中」になっている
    cy.get('#status').should('contain', '対応中');
  });

  it('should set default priority to medium', () => {
    cy.visit('/issues/new');

    // 優先度のデフォルト値が「中」になっている
    cy.get('#priority').should('contain', '中');
  });

  it('should set default assignee to current user', () => {
    cy.visit('/issues/new');

    // 担当・期限情報セクションまでスクロール
    cy.contains('担当・期限情報').scrollIntoView();

    // 担当者のデフォルト値が現在のユーザー（管理 太郎）になっている
    cy.get('#assignee').should('contain', '管理 太郎');
  });

  it('should allow progress slider to be adjusted', () => {
    cy.visit('/issues/new');

    // ガントチャート情報セクションまでスクロール
    cy.contains('ガントチャート情報').scrollIntoView();

    // 進捗率の数値入力フィールドに値を入力
    cy.get('input[type="text"]').clear().type('50');

    // 値が反映されている
    cy.get('input[type="text"]').should('have.value', '50');
    cy.contains('進捗率: 50%').should('be.visible');
  });

  it('should validate end date is after start date', () => {
    cy.visit('/issues/new');

    // ガントチャート情報セクションまでスクロール
    cy.contains('ガントチャート情報').scrollIntoView();

    // 開始日を入力
    cy.get('input#startDate').type('2024-03-01');

    // 終了日を開始日より前の日付に設定しようとする
    cy.get('input#endDate').type('2024-02-01');

    // 終了日のmin属性が開始日に設定されているため、ブラウザがバリデーションする
    cy.get('input#endDate').should('have.attr', 'min', '2024-03-01');
  });
});

describe('Issues New Page - Project Selection', () => {
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
    cy.viewport(1280, 1400);
    cy.login('admin@example.com', 'password123');
  });

  it('should select project from dropdown', () => {
    cy.visit('/issues/new');

    // 案件を選択
    cy.get('button[role="combobox"]').first().click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-001', { timeout: 10000 }).should('be.visible').click();

    // 選択した案件が表示される
    cy.contains('PRJ-2024-001').should('be.visible');
  });

  it('should show different projects when toggling department filter', () => {
    cy.visit('/issues/new');

    // 初期状態での案件リスト
    cy.get('button[role="combobox"]').first().click();

    // 案件が表示される
    cy.get('[data-slot="select-item"]').should('exist');

    // ドロップダウンを閉じる
    cy.get('body').type('{esc}');

    // 全案件表示ボタンをクリック
    cy.contains('button', '全案件を表示').click();

    // 案件リストを再度開く
    cy.get('button[role="combobox"]').first().click();

    // 案件が表示される（全案件）
    cy.get('[data-slot="select-item"]').should('exist');
  });

  it('should create issue with selected project', () => {
    cy.visit('/issues/new');

    // タイトルを入力
    cy.get('input#title').type('案件付き課題のテスト');

    // 説明を入力
    cy.get('textarea#description').type('案件を指定した課題作成のテストです。');

    // 案件を選択
    cy.get('button[role="combobox"]').first().click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-002', { timeout: 10000 }).should('be.visible').click();

    // 登録ボタンをクリック
    cy.contains('button', '登録').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('課題を作成しました').should('be.visible');

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/issues', { timeout: 10000 });
  });
});

describe('Issues New Page - Status and Priority Selection', () => {
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
    cy.viewport(1280, 1400);
    cy.login('admin@example.com', 'password123');
  });

  it('should select different status options', () => {
    cy.visit('/issues/new');

    // ステータスを選択
    cy.get('#status').click();

    // ステータスオプションが表示される
    cy.contains('[data-slot="select-item"]', '未着手').should('be.visible');
    cy.contains('[data-slot="select-item"]', '対応中').should('be.visible');
    cy.contains('[data-slot="select-item"]', '解決済み').should('be.visible');
    cy.contains('[data-slot="select-item"]', '完了').should('be.visible');

    // 「未着手」を選択
    cy.contains('[data-slot="select-item"]', '未着手').click();

    // 選択した値が表示される
    cy.get('#status').should('contain', '未着手');
  });

  it('should select different priority options', () => {
    cy.visit('/issues/new');

    // 優先度を選択
    cy.get('#priority').click();

    // 優先度オプションが表示される
    cy.contains('[data-slot="select-item"]', '緊急').should('be.visible');
    cy.contains('[data-slot="select-item"]', '高').should('be.visible');
    cy.contains('[data-slot="select-item"]', '中').should('be.visible');
    cy.contains('[data-slot="select-item"]', '低').should('be.visible');

    // 「緊急」を選択
    cy.contains('[data-slot="select-item"]', '緊急').click();

    // 選択した値が表示される
    cy.get('#priority').should('contain', '緊急');
  });

  it('should create issue with different status and priority', () => {
    cy.visit('/issues/new');

    // タイトルを入力
    cy.get('input#title').type('緊急課題のテスト');

    // 説明を入力
    cy.get('textarea#description').type('緊急優先度での課題作成テストです。');

    // 案件を選択
    cy.get('button[role="combobox"]').first().click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-001', { timeout: 10000 }).should('be.visible').click();

    // ステータスを選択
    cy.get('#status').click();
    cy.contains('[data-slot="select-item"]', '未着手').click();

    // 優先度を選択
    cy.get('#priority').click();
    cy.contains('[data-slot="select-item"]', '緊急').click();

    // 登録ボタンをクリック
    cy.contains('button', '登録').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('課題を作成しました').should('be.visible');

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/issues', { timeout: 10000 });
  });
});
