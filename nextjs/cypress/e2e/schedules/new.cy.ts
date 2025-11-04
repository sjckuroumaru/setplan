describe('Schedules New Page', () => {
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

  it('should display the new schedule page', () => {
    cy.visit('/schedules/new');
    cy.url().should('include', '/schedules/new');
  });

  it('should be accessible without redirecting to login', () => {
    cy.visit('/schedules/new');

    // ログインページにリダイレクトされない
    cy.url().should('not.include', '/login');
    cy.url().should('include', '/schedules/new');
  });

  it('should show page title and form', () => {
    cy.visit('/schedules/new');

    // ページタイトルが表示されている
    cy.contains('新規予定実績登録').should('be.visible');
    cy.contains('新しい予定実績を登録します').should('be.visible');

    // フォームが表示されている
    cy.get('form').should('be.visible');
  });

  it('should have back button to schedules list', () => {
    cy.visit('/schedules/new');

    // 戻るボタンが表示されている
    cy.get('a[href="/schedules"]').should('be.visible');
  });

  it('should navigate back to schedules list when clicking back button', () => {
    cy.visit('/schedules/new');

    // 戻るボタンをクリック
    cy.get('a[href="/schedules"]').first().click();

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/schedules');
    cy.url().should('not.include', '/new');
  });

  it('should have all required form fields', () => {
    cy.visit('/schedules/new');

    // 日付フィールド
    cy.contains('label', '日付').should('be.visible');
    cy.get('input[type="date"]').should('be.visible');

    // 出社時刻フィールド
    cy.contains('label', '出社時刻').should('be.visible');

    // 退社時間フィールド
    cy.contains('label', '退社時刻').should('be.visible');

    // 振り返りフィールド（スクロールが必要な場合があるため存在確認）
    cy.contains('label', '振り返り').should('exist');

    // 予定項目セクション
    cy.contains('予定').should('exist');

    // 実績項目セクション
    cy.contains('実績').should('exist');
  });

  it('should have submit and cancel buttons', () => {
    cy.visit('/schedules/new');

    // 登録ボタンが表示されている
    cy.contains('button', '登録').scrollIntoView().should('be.visible');

    // キャンセルボタンが表示されている
    cy.contains('button', 'キャンセル').should('be.visible');
  });

  it('should create new schedule with minimum required data', () => {
    cy.visit('/schedules/new');

    // 日付を入力
    cy.get('input[type="date"]').clear().type('2024-02-01');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 予定内容を入力（最初の予定項目）
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('新規予定のテスト');

    // 実績は入力しない（任意）

    // 登録ボタンをクリック
    cy.contains('button', '登録').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/schedules', { timeout: 10000 });
    cy.url().should('not.include', '/new');
  });

  it('should create new schedule with full data', () => {
    cy.visit('/schedules/new');

    // 日付を入力
    cy.get('input[type="date"]').clear().type('2024-02-02');

    // 出社時間を選択
    cy.get('button[role="combobox"]').first().click();
    cy.contains('[data-slot="select-item"]', '09:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 退社時間を選択
    cy.get('button[role="combobox"]').eq(1).click();
    cy.contains('[data-slot="select-item"]', '18:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 振り返りを入力
    cy.get('textarea[name="reflection"]').scrollIntoView().type('テストの振り返り');

    // 予定内容を入力
    cy.contains('予定').scrollIntoView();
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('フルデータ登録テスト');
    cy.get('input[name="plans.0.details"]').type('予定の詳細内容');

    // 実績項目を入力
    cy.contains('実績').scrollIntoView();
    cy.get('textarea[name="actuals.0.content"]').should('be.visible').type('実績内容のテスト');
    cy.contains('label', '実績時間').first().parent().find('input[type="text"]').clear().type('8');
    cy.get('input[name="actuals.0.details"]').type('実績の詳細内容');

    // 登録ボタンをクリック
    cy.contains('button', '登録').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/schedules', { timeout: 10000 });
    cy.url().should('not.include', '/new');
  });

  it('should add new plan item', () => {
    cy.visit('/schedules/new');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 初期状態で1つの予定項目が表示されている
    cy.get('textarea[name="plans.0.content"]').should('exist');

    // 予定項目を追加
    cy.contains('button', '予定を追加').scrollIntoView().click();

    // 2つ目の予定項目が表示される
    cy.get('textarea[name="plans.1.content"]').should('exist');
  });

  it('should remove plan item', () => {
    cy.visit('/schedules/new');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 予定項目を追加
    cy.contains('button', '予定を追加').scrollIntoView().click();
    cy.get('textarea[name="plans.1.content"]').should('exist');

    // 2つ目の予定項目を削除（赤いゴミ箱アイコンのボタン）
    cy.get('button.text-red-600').last().scrollIntoView().click();

    // 2つ目の予定項目が削除される
    cy.get('textarea[name="plans.1.content"]').should('not.exist');
  });

  it('should add new actual item', () => {
    cy.visit('/schedules/new');

    // 実績セクションまでスクロール
    cy.contains('実績').scrollIntoView();

    // 初期状態で1つの実績項目が表示されている
    cy.get('textarea[name="actuals.0.content"]').should('exist');

    // 実績項目を追加
    cy.contains('button', '実績を追加').scrollIntoView().click();

    // 2つ目の実績項目が表示される
    cy.get('textarea[name="actuals.1.content"]').should('exist');
  });

  it('should remove actual item', () => {
    cy.visit('/schedules/new');

    // 実績セクションまでスクロール
    cy.contains('実績').scrollIntoView();

    // 実績項目を追加
    cy.contains('button', '実績を追加').scrollIntoView().click();
    cy.get('textarea[name="actuals.1.content"]').should('exist');

    // 2つ目の実績項目を削除（赤いゴミ箱アイコンのボタン）
    cy.get('button.text-red-600').last().scrollIntoView().click();

    // 2つ目の実績項目が削除される
    cy.get('textarea[name="actuals.1.content"]').should('not.exist');
  });

  it('should cancel and return to schedules list', () => {
    cy.visit('/schedules/new');

    // データを入力
    cy.get('input[type="date"]').clear().type('2024-02-03');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('キャンセルテスト');

    // キャンセルボタンをクリック
    cy.contains('button', 'キャンセル').scrollIntoView().click();

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/schedules');
    cy.url().should('not.include', '/new');
  });

  it('should have toggle button for showing all projects', () => {
    cy.visit('/schedules/new');

    // 全案件表示ボタンが表示されている
    cy.contains('button', '全案件を表示').should('be.visible');
  });

  it('should toggle project filter when clicking show all projects button', () => {
    cy.visit('/schedules/new');

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

  it('should have default date value as today', () => {
    cy.visit('/schedules/new');

    // 今日の日付がデフォルトで入力されている
    const today = new Date().toISOString().split('T')[0];
    cy.get('input[type="date"]').should('have.value', today);
  });

  it('should have default check-in time', () => {
    cy.visit('/schedules/new');

    // デフォルトの出社時間が設定されている（現在時刻を15分単位で切り上げ）
    cy.get('button[role="combobox"]').first().should('not.contain', '選択してください');
  });
});

describe('Schedules New Page - Project Selection', () => {
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

  it('should select project for plan item', () => {
    cy.visit('/schedules/new');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 「案件」ラベルの後にあるコンボボックスを探す（予定セクション内）
    cy.contains('label', '案件').parent().find('button[role="combobox"]').first().scrollIntoView().click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-001', { timeout: 10000 }).should('be.visible').click();

    // 選択した案件が表示される
    cy.contains('PRJ-2024-001').should('be.visible');
  });

  it('should select project for actual item', () => {
    cy.visit('/schedules/new');

    // 実績セクションまでスクロール
    cy.contains('実績').scrollIntoView();

    // 実績の案件を選択（ページ全体で2番目の「案件」ラベル）
    cy.contains('label', '案件').last().parent().find('button[role="combobox"]').scrollIntoView().click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-001', { timeout: 10000 }).should('be.visible').click();

    // 選択した案件が表示される
    cy.contains('PRJ-2024-001').should('be.visible');
  });

  it('should create schedule with project assigned', () => {
    cy.visit('/schedules/new');

    // 日付を入力
    cy.get('input[type="date"]').clear().type('2024-02-04');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 予定の案件を選択（最初の「案件」ラベル）
    cy.contains('label', '案件').first().parent().find('button[role="combobox"]').scrollIntoView().click();
    cy.contains('[role="option"]', 'PRJ-2024-001').click();

    // 予定内容を入力
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('案件付き予定');

    // 実績セクションまでスクロール
    cy.contains('実績').scrollIntoView();

    // 実績の案件を選択（ページ全体で2番目の「案件」ラベル）
    cy.contains('label', '案件').last().parent().find('button[role="combobox"]').scrollIntoView().click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-001', { timeout: 10000 }).should('be.visible').click();

    // 実績内容を入力
    cy.get('textarea[name="actuals.0.content"]').should('be.visible').type('案件付き実績');
    cy.contains('label', '実績時間').first().parent().find('input[type="text"]').clear().type('5');

    // 登録ボタンをクリック
    cy.contains('button', '登録').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/schedules', { timeout: 10000 });
  });
});
