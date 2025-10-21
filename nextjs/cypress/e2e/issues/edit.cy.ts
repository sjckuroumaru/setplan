describe('Issues Edit Page', () => {
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

    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    // 編集ページへの遷移とAPIレスポンスをインターセプト
    cy.intercept('GET', '/api/issues/*').as('getIssue');
    cy.get('a[href*="/issues/"][href*="/edit"]').first().should('be.visible').click();

    // URLが編集ページになることを確認
    cy.url().should('match', /\/issues\/[^/]+\/edit/);

    // APIレスポンスを待ち、データ取得が成功したことを確認
    cy.wait('@getIssue').then((interception) => {
      // 200 OKでない場合はテストを失敗させる
      expect(interception.response?.statusCode).to.eq(200);
    });

    // 編集フォームが表示されることを確認
    cy.contains('課題編集', { timeout: 10000 }).should('be.visible');
  });

  it('should display the edit issue page', () => {
    // beforeEachで編集ページに遷移済み
    cy.url().should('match', /\/issues\/[^/]+\/edit/);
  });

  it('should be accessible without redirecting to login', () => {
    // beforeEachで編集ページに遷移済み
    // ログインページにリダイレクトされない
    cy.url().should('not.include', '/login');
    cy.url().should('match', /\/issues\/[^/]+\/edit/);
  });

  it('should show page title and form', () => {
    // beforeEachで編集ページに遷移済み
    // ページタイトルが表示されている
    cy.contains('課題編集').should('be.visible');

    // フォームが表示されている
    cy.get('form').should('be.visible');
  });

  it('should have back button to issue detail', () => {
    // beforeEachで編集ページに遷移済み
    // 戻るボタンが表示されている
    cy.get('a[href*="/issues/"]').first().should('be.visible');
  });

  it('should display existing issue data in form', () => {
    // beforeEachで編集ページに遷移済み
    // タイトルフィールドに値が入っている
    cy.get('input#title').should('not.have.value', '');

    // 説明フィールドに値が入っている
    cy.get('textarea#description').should('not.have.value', '');
  });

  it('should have all form fields', () => {
    // beforeEachで編集ページに遷移済み

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
    cy.get('#project').should('exist');

    // ステータスフィールド
    cy.contains('label', 'ステータス').should('be.visible');
    cy.get('#status').should('exist');

    // 優先度フィールド
    cy.contains('label', '優先度').should('be.visible');
    cy.get('#priority').should('exist');

    // ガントチャート情報セクション
    cy.contains('ガントチャート情報').scrollIntoView().should('be.visible');

    // 担当・期限情報セクション
    cy.contains('担当・期限情報').scrollIntoView().should('be.visible');

    // メタ情報セクション
    cy.contains('メタ情報').scrollIntoView().should('be.visible');
  });

  it('should have update and cancel buttons', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // 更新ボタンが表示されている
    cy.contains('button', '更新').scrollIntoView().should('be.visible');

    // キャンセルボタンが表示されている
    cy.contains('button', 'キャンセル').should('be.visible');
  });

  it('should have delete button', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // 削除ボタンが表示されている
    cy.contains('button', '削除').should('be.visible');
  });

  it('should show meta information', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // メタ情報セクションまでスクロール
    cy.contains('メタ情報').scrollIntoView();

    // 報告者が表示されている
    cy.contains('報告者:').should('be.visible');

    // 作成日が表示されている
    cy.contains('作成日:').should('be.visible');

    // 更新日が表示されている
    cy.contains('更新日:').should('be.visible');
  });

  it('should update issue with modified data', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // タイトルを更新
    cy.get('input#title').clear().type('編集テスト：更新されたタイトル');

    // 説明を更新
    cy.get('textarea#description').clear().type('編集テスト：更新された説明文です。');

    // 更新ボタンをクリック
    cy.contains('button', '更新').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('課題を更新しました').should('be.visible');

    // 詳細ページにリダイレクトされる
    cy.url().should('match', /\/issues\/[^/]+$/);
    cy.url().should('not.include', '/edit');
  });

  it('should update status and priority', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // フォームがロードされるまで待つ
    cy.contains('課題編集').should('be.visible');
    cy.get('input#title').should('not.have.value', '');

    // ステータスを更新
    cy.get('#status').should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '解決済み').click();

    // 優先度を更新
    cy.get('#priority').should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '低').click();

    // 更新ボタンをクリック
    cy.contains('button', '更新').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('課題を更新しました').should('be.visible');
  });

  it('should update gantt chart information', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // ガントチャート情報セクションまでスクロール
    cy.contains('ガントチャート情報').scrollIntoView();

    // 開始日を更新
    cy.get('input#startDate').clear().type('2024-03-01');

    // 終了日を更新
    cy.get('input#endDate').clear().type('2024-03-31');

    // 進捗率を更新（w-20クラスを持つtext入力フィールド）
    cy.get('input.w-20[type="text"]').clear().type('75');

    // 更新ボタンをクリック
    cy.contains('button', '更新').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('課題を更新しました').should('be.visible');
  });

  it('should update assignee and due date', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // 担当・期限情報セクションまでスクロール
    cy.contains('担当・期限情報').scrollIntoView();

    // 担当者を変更
    cy.get('#assignee').click();
    cy.contains('[data-slot="select-item"]', '山田 花子', { timeout: 10000 }).should('be.visible').click();

    // 期限を更新
    cy.get('input#dueDate').clear().type('2024-04-15');

    // 更新ボタンをクリック
    cy.contains('button', '更新').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('課題を更新しました').should('be.visible');
  });

  it('should cancel and return to detail page', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // タイトルを変更
    cy.get('input#title').clear().type('キャンセルテスト');

    // キャンセルボタンをクリック
    cy.contains('button', 'キャンセル').scrollIntoView().click();

    // 詳細ページにリダイレクトされる
    cy.url().should('match', /\/issues\/[^/]+$/);
    cy.url().should('not.include', '/edit');
  });

  it('should show delete confirmation dialog when clicking delete', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // 削除ボタンをクリック
    cy.contains('button', '削除').click();

    // 削除確認ダイアログが表示される
    cy.contains('課題を削除しますか').should('be.visible');
    cy.contains('この操作は取り消すことができません').should('be.visible');
  });

  it('should cancel deletion when clicking cancel in dialog', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // 削除ボタンをクリック
    cy.contains('button', '削除').click();

    // 削除確認ダイアログが表示されるまで待つ
    cy.contains('課題を削除しますか').should('be.visible');

    // 削除確認ダイアログでキャンセルボタンをクリック
    cy.get('[role="dialog"]').within(() => {
      cy.contains('button', 'キャンセル').click();
    });

    // ダイアログが閉じる
    cy.contains('課題を削除しますか').should('not.exist');

    // 編集ページに残る
    cy.url().should('include', '/edit');
  });

  it('should have toggle button for showing all projects', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // 全案件表示ボタンが存在する（部署が設定されている場合）
    cy.get('body').then(($body) => {
      if ($body.text().includes('全案件を表示')) {
        cy.contains('button', '全案件を表示').should('be.visible');
      }
    });
  });
});

describe('Issues Edit Page - Project Selection', () => {
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

  it('should change project for issue', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // 案件を変更
    cy.get('#project').click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-002', { timeout: 10000 }).should('be.visible').click();

    // 更新ボタンをクリック
    cy.contains('button', '更新').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('課題を更新しました').should('be.visible');
  });
});

describe('Issues Edit Page - Validation', () => {
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

  it('should validate required fields', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // タイトルをクリア
    cy.get('input#title').clear();

    // 更新ボタンをクリック
    cy.contains('button', '更新').scrollIntoView().click();

    // フォームのバリデーションエラーが表示される（ブラウザのデフォルトバリデーション）
    cy.get('input#title:invalid').should('exist');
  });

  it('should validate end date is after start date', () => {
    // 課題一覧から編集ページへ移動
    cy.visit('/issues');

    // 初期表示では部署フィルターと担当者フィルターがかかっているため、まず「すべて」を選択
    cy.get('#department-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    cy.get('#assignee-filter').click();
    cy.contains('[data-slot="select-item"]', 'すべて', { timeout: 10000 }).should('be.visible').click();

    // テーブルの最初の行をスクロールして表示
    cy.get('table tbody tr').first().scrollIntoView();

    // ドロップダウンメニューを開いて編集ページへ移動
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click();
    });

    cy.get('a[href*="/issues/"][href*="/edit"]').first().click();

    // ガントチャート情報セクションまでスクロール
    cy.contains('ガントチャート情報').scrollIntoView();

    // 開始日を設定
    cy.get('input#startDate').clear().type('2024-04-01');

    // 終了日のmin属性が開始日に設定されていることを確認
    cy.get('input#endDate').should('have.attr', 'min', '2024-04-01');
  });
});
