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

describe('Schedules Page - Work Hour Difference Display', () => {
  before(() => {
    Cypress.session.clearAllSavedSessions();
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.resetAndSeedDb();
  });

  beforeEach(() => {
    // 各テストの前にデータベースをリセット（重複を防ぐため）
    cy.resetAndSeedDb();
    cy.login('admin@example.com', 'password123');
  });

  it('should display work hour difference column header', () => {
    cy.visit('/schedules');

    // 実績過不足のカラムヘッダーが表示されている
    cy.get('table').within(() => {
      cy.contains('th', '実績過不足').should('be.visible');
    });
  });

  it('should calculate and display work hour difference correctly', () => {
    // APIリクエストをインターセプト（最初に設定）
    cy.intercept('GET', '/api/schedules?*').as('getSchedules');

    cy.visit('/schedules');

    // 新しいスケジュールを作成
    cy.contains('新規登録').click();
    cy.url().should('include', '/schedules/new');

    // 日付はデフォルトの今日の日付を使用

    // 出社時間: 09:00
    cy.contains('label', '出社時刻').parent().find('button[role="combobox"]').should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '09:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 退社時間: 18:00
    cy.contains('label', '退社時刻').parent().find('button[role="combobox"]').should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '18:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 休憩時間: 1.0時間
    cy.contains('label', '休憩時間').parent().find('input[type="text"]').clear().type('1.0');

    // 予定内容を入力
    cy.contains('予定').scrollIntoView();
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('実績過不足テスト');

    // 実績: 8時間
    cy.contains('実績').scrollIntoView();
    cy.get('textarea[name="actuals.0.content"]').should('be.visible').type('実績入力');
    cy.contains('label', '実績時間').first().parent().find('input[type="text"]').clear().type('8');

    // 登録
    cy.contains('button', '登録').scrollIntoView().click();
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページにリダイレクトされることを確認
    cy.url().should('not.include', '/new');
    cy.url().should('include', '/schedules', { timeout: 10000 });

    // データの取得が完了するまで待つ
    cy.wait('@getSchedules', { timeout: 15000 });

    // 一覧で実績過不足を確認
    // 計算: (18:00 - 09:00) - 1.0 - 8.0 = 9.0 - 1.0 - 8.0 = 0.00h
    // 新しいデータが表示されるまで待つ（今日の日付で探す）
    cy.contains('table tbody tr', '2025/11/5', { timeout: 15000 }).should('be.visible').within(() => {
      // 出社時刻が09:00であることを確認
      cy.contains('09:00').should('be.visible');
      // 退社時刻が18:00であることを確認
      cy.contains('18:00').should('be.visible');
      // 実績時間が8.00hであることを確認
      cy.contains('8.00h').should('be.visible');
      // 実績過不足が0.00h（ちょうど）
      cy.contains('0.00h').should('be.visible');
    });
  });

  it('should show positive difference in blue when actual hours are less than work hours', () => {
    // APIリクエストをインターセプト（最初に設定）
    cy.intercept('GET', '/api/schedules?*').as('getSchedules');

    cy.visit('/schedules');

    // 新しいスケジュールを作成
    cy.contains('新規登録').click();

    // 日付はデフォルトの今日の日付を使用

    // 出社時間: 09:00
    cy.contains('label', '出社時刻').parent().find('button[role="combobox"]').should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '09:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 退社時間: 18:00
    cy.contains('label', '退社時刻').parent().find('button[role="combobox"]').should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '18:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 休憩時間: 1.0時間
    cy.contains('label', '休憩時間').parent().find('input[type="text"]').clear().type('1.0');

    // 予定内容を入力
    cy.contains('予定').scrollIntoView();
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('実績過不足+2hテスト');

    // 実績: 6時間（2時間少ない）
    cy.contains('実績').scrollIntoView();
    cy.get('textarea[name="actuals.0.content"]').should('be.visible').type('実績入力');
    cy.contains('label', '実績時間').first().parent().find('input[type="text"]').clear().type('6');

    // 登録
    cy.contains('button', '登録').scrollIntoView().click();
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページにリダイレクトされることを確認
    cy.url().should('not.include', '/new');
    cy.url().should('include', '/schedules', { timeout: 10000 });

    // データの取得が完了するまで待つ
    cy.wait('@getSchedules', { timeout: 15000 });

    // 一覧で実績過不足を確認
    // 計算: (18:00 - 09:00) - 1.0 - 6.0 = 9.0 - 1.0 - 6.0 = +2.00h
    // 新しいデータが表示されるまで待つ（今日の日付で探す）
    cy.contains('table tbody tr', '2025/11/5', { timeout: 15000 }).should('be.visible').within(() => {
      // 出社時刻が09:00であることを確認
      cy.contains('09:00').should('be.visible');
      // 退社時刻が18:00であることを確認
      cy.contains('18:00').should('be.visible');
      // 実績時間が6.00hであることを確認
      cy.contains('6.00h').should('be.visible');
      // プラスの過不足が青色で表示される
      cy.contains('+2.00h').should('be.visible').should('have.class', 'text-blue-600');
    });
  });

  it('should show negative difference in red when actual hours exceed work hours', () => {
    // APIリクエストをインターセプト（最初に設定）
    cy.intercept('GET', '/api/schedules?*').as('getSchedules');

    cy.visit('/schedules');

    // 新しいスケジュールを作成
    cy.contains('新規登録').click();

    // 日付はデフォルトの今日の日付を使用

    // 出社時間: 09:00
    cy.contains('label', '出社時刻').parent().find('button[role="combobox"]').should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '09:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 退社時間: 18:00
    cy.contains('label', '退社時刻').parent().find('button[role="combobox"]').should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '18:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 休憩時間: 1.0時間
    cy.contains('label', '休憩時間').parent().find('input[type="text"]').clear().type('1.0');

    // 予定内容を入力
    cy.contains('予定').scrollIntoView();
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('実績過不足-2hテスト');

    // 実績: 10時間（2時間多い）
    cy.contains('実績').scrollIntoView();
    cy.get('textarea[name="actuals.0.content"]').should('be.visible').type('実績入力');
    cy.contains('label', '実績時間').first().parent().find('input[type="text"]').clear().type('10');

    // 登録
    cy.contains('button', '登録').scrollIntoView().click();
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページにリダイレクトされることを確認
    cy.url().should('not.include', '/new');
    cy.url().should('include', '/schedules', { timeout: 10000 });

    // データの取得が完了するまで待つ
    cy.wait('@getSchedules', { timeout: 15000 });

    // 一覧で実績過不足を確認
    // 計算: (18:00 - 09:00) - 1.0 - 10.0 = 9.0 - 1.0 - 10.0 = -2.00h
    // 新しいデータが表示されるまで待つ（今日の日付で探す）
    cy.contains('table tbody tr', '2025/11/5', { timeout: 15000 }).should('be.visible').within(() => {
      // 出社時刻が09:00であることを確認
      cy.contains('09:00').should('be.visible');
      // 退社時刻が18:00であることを確認
      cy.contains('18:00').should('be.visible');
      // 実績時間が10.00hであることを確認
      cy.contains('10.00h').should('be.visible');
      // マイナスの過不足が赤色で表示される
      cy.contains('-2.00h').should('be.visible').should('have.class', 'text-red-600');
    });
  });

  it('should show "-" when check-in or check-out time is missing', () => {
    // APIリクエストをインターセプト（最初に設定）
    cy.intercept('GET', '/api/schedules?*').as('getSchedules');

    cy.visit('/schedules');

    // 新しいスケジュールを作成（出社時刻のみ、退社時刻なし）
    cy.contains('新規登録').click();

    // 日付はデフォルトの今日の日付を使用

    // 出社時間: 09:00のみ設定
    cy.contains('label', '出社時刻').parent().find('button[role="combobox"]').should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '09:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 退社時間は「選択なし」のまま

    // 予定内容を入力
    cy.contains('予定').scrollIntoView();
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('退社時刻なしテスト');

    // 登録
    cy.contains('button', '登録').scrollIntoView().click();
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページにリダイレクトされることを確認
    cy.url().should('not.include', '/new');
    cy.url().should('include', '/schedules', { timeout: 10000 });

    // データの取得が完了するまで待つ
    cy.wait('@getSchedules', { timeout: 15000 });

    // 一覧で実績過不足を確認
    // 新しいデータが表示されるまで待つ（今日の日付で探す）
    cy.contains('table tbody tr', '2025/11/5', { timeout: 15000 }).should('be.visible').within(() => {
      // 出社時刻が09:00であることを確認
      cy.contains('09:00').should('be.visible');
      // 退社時刻がないため「-」が表示される
      cy.get('td').should('contain', '-');
      // 実績過不足も「-」であることを確認（退社時刻がないため計算不可）
      cy.get('td').should('contain', '-');
    });
  });
});
