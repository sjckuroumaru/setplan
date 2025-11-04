describe('Schedules Edit Page', () => {
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

    // スケジュール一覧から編集ページへ移動
    cy.visitSchedulesAndWaitForData(true);

    // 編集ページへの遷移とAPIレスポンスをインターセプト
    cy.intercept('GET', '/api/schedules/*').as('getSchedule');
    cy.get('table tbody tr').first().find('a[href*="/schedules/"][href*="/edit"]').should('be.visible').click();

    // URLが編集ページになることを確認
    cy.url().should('match', /\/schedules\/[^/]+\/edit/);

    // APIレスポンスを待ち、データ取得が成功したことを確認
    cy.wait('@getSchedule').then((interception) => {
      // 200 OKでない場合はテストを失敗させる
      expect(interception.response?.statusCode).to.eq(200);
    });

    // 編集フォームが表示されることを確認
    cy.contains('予定実績編集', { timeout: 10000 }).should('be.visible');
  });

  it('should display the edit schedule page', () => {
    // beforeEachで編集ページに遷移済み
    cy.url().should('match', /\/schedules\/[^/]+\/edit/);
  });

  it('should be accessible without redirecting to login', () => {
    // beforeEachで編集ページに遷移済み
    // ログインページにリダイレクトされない
    cy.url().should('not.include', '/login');
    cy.url().should('match', /\/schedules\/[^/]+\/edit/);
  });

  it('should show page title and form', () => {
    // beforeEachで編集ページに遷移済み
    // ページタイトルが表示されている
    cy.contains('予定実績編集').should('be.visible');
    cy.contains('予定実績を編集します').should('be.visible');

    // フォームが表示されている
    cy.get('form').should('be.visible');
  });

  it('should have back button to schedules list', () => {
    // beforeEachで編集ページに遷移済み
    // 戻るボタンが表示されている
    cy.get('a[href="/schedules"]').should('be.visible');
  });

  it('should navigate back to schedules list when clicking back button', () => {
    // beforeEachで編集ページに遷移済み
    // 戻るボタンをクリック
    cy.get('a[href="/schedules"]').first().click();

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/schedules');
    cy.url().should('not.include', '/edit');
  });

  it('should display existing schedule data in form', () => {
    // beforeEachで編集ページに遷移済み

    // 日付フィールドに値が入っている
    cy.get('input[type="date"]').should('not.have.value', '');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 予定のtextareaが表示されている
    cy.get('textarea[name="plans.0.content"]').should('exist');
  });

  it('should have all form fields', () => {
    // beforeEachで編集ページに遷移済み
    // 日付フィールド
    cy.contains('label', '日付').should('be.visible');
    cy.get('input[type="date"]').should('be.visible');

    // 出社時刻フィールド
    cy.contains('label', '出社時刻').should('be.visible');

    // 退社時刻フィールド
    cy.contains('label', '退社時刻').should('be.visible');

    // 振り返りフィールド
    cy.contains('label', '振り返り').should('exist');

    // 予定項目セクション
    cy.contains('予定').should('exist');

    // 実績項目セクション
    cy.contains('実績').should('exist');
  });

  it('should have update and cancel buttons', () => {
    // beforeEachで編集ページに遷移済み
    // 更新ボタンが表示されている
    cy.contains('button', '更新').scrollIntoView().should('be.visible');

    // キャンセルボタンが表示されている
    cy.contains('button', 'キャンセル').should('be.visible');
  });

  it('should update schedule with modified data', () => {
    // beforeEachで編集ページに遷移済み
    // 振り返りを更新
    cy.get('textarea[name="reflection"]').scrollIntoView().clear().type('編集テスト：更新内容');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 予定内容を更新
    cy.get('textarea[name="plans.0.content"]').should('be.visible').clear().type('予定内容を更新');

    // 実績セクションまでスクロール
    cy.contains('実績').scrollIntoView();

    // 実績内容を確認（存在する場合は更新）
    cy.get('body').then(($body) => {
      if ($body.find('textarea[name="actuals.0.content"]').length > 0) {
        cy.get('textarea[name="actuals.0.content"]').should('be.visible').clear().type('実績内容を更新');
        cy.contains('label', '実績時間').first().parent().find('input[type="text"]').clear().type('5');
      }
    });

    // 更新ボタンをクリック
    cy.contains('button', '更新').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('予定実績を更新しました').should('be.visible');

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/schedules', { timeout: 10000 });
    cy.url().should('not.include', '/edit');
  });

  it('should add new plan item', () => {
    // beforeEachで編集ページに遷移済み
    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 初期状態の予定項目数を確認
    cy.get('textarea[name^="plans."][name$=".content"]').its('length').then((initialCount) => {
      // 予定項目を追加ボタンをクリック
      cy.contains('button', '予定を追加').should('be.visible').should('be.enabled').scrollIntoView().click();

      // DOMの更新を待つ
      cy.wait(500);

      // 予定項目が増えていることを確認（DOMの更新を待つ）
      cy.get('textarea[name^="plans."][name$=".content"]', { timeout: 10000 }).should('have.length', initialCount + 1);
    });
  });

  it('should remove plan item when there are multiple items', () => {
    // beforeEachで編集ページに遷移済み
    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 初期状態の予定項目数を確認
    cy.get('textarea[name^="plans."][name$=".content"]').its('length').then((initialCount) => {
      // 予定項目を追加ボタンをクリック
      cy.contains('button', '予定を追加').should('be.visible').should('be.enabled').scrollIntoView().click();

      // DOMの更新を待つ
      cy.wait(500);

      // 予定項目が増えている
      cy.get('textarea[name^="plans."][name$=".content"]', { timeout: 10000 }).should('have.length', initialCount + 1);

      // 最後の予定項目を削除（赤いゴミ箱アイコンのボタンの最後）
      cy.get('button.text-red-600').last().should('be.visible').scrollIntoView().click({ force: true });

      // DOMの更新を待つ
      cy.wait(500);

      // 予定項目が元の数に戻っている
      cy.get('textarea[name^="plans."][name$=".content"]', { timeout: 10000 }).should('have.length', initialCount);
    });
  });

  it('should add new actual item', () => {
    // beforeEachで編集ページに遷移済み
    // 実績セクションまでスクロール
    cy.contains('実績').scrollIntoView();

    // 初期状態の実績項目数を確認
    cy.get('textarea[name^="actuals."][name$=".content"]').its('length').then((initialCount) => {
      // 実績項目を追加ボタンをクリック
      cy.contains('button', '実績を追加').should('be.visible').should('be.enabled').scrollIntoView().click();

      // DOMの更新を待つ（少し待機）
      cy.wait(500);

      // 実績項目が増えていることを確認（DOMの更新を待つ）
      cy.get('textarea[name^="actuals."][name$=".content"]', { timeout: 10000 }).should('have.length', initialCount + 1);
    });
  });

  it('should remove actual item when there are multiple items', () => {
    // beforeEachで編集ページに遷移済み
    // 実績セクションまでスクロール
    cy.contains('実績').scrollIntoView();

    // 初期状態の実績項目数を確認
    cy.get('textarea[name^="actuals."][name$=".content"]').its('length').then((initialCount) => {
      // 実績項目を追加ボタンをクリック
      cy.contains('button', '実績を追加').should('be.visible').should('be.enabled').scrollIntoView().click();

      // DOMの更新を待つ
      cy.wait(500);

      // 実績項目が増えている
      cy.get('textarea[name^="actuals."][name$=".content"]', { timeout: 10000 }).should('have.length', initialCount + 1);

      // 最後の実績項目を削除（赤いゴミ箱アイコンのボタンの最後）
      cy.get('button.text-red-600').last().should('be.visible').scrollIntoView().click({ force: true });

      // DOMの更新を待つ
      cy.wait(500);

      // 実績項目が元の数に戻っている
      cy.get('textarea[name^="actuals."][name$=".content"]', { timeout: 10000 }).should('have.length', initialCount);
    });
  });

  it('should cancel and return to schedules list', () => {
    // beforeEachで編集ページに遷移済み
    // 振り返りを更新
    cy.get('textarea[name="reflection"]').scrollIntoView().clear().type('キャンセルテスト');

    // キャンセルボタンをクリック
    cy.contains('button', 'キャンセル').scrollIntoView().click();

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/schedules');
    cy.url().should('not.include', '/edit');
  });

  it('should have toggle button for showing all projects', () => {
    // beforeEachで編集ページに遷移済み
    // 全案件表示ボタンが表示されている
    cy.contains('button', '全案件を表示').should('be.visible');
  });

  it('should toggle project filter when clicking show all projects button', () => {
    // beforeEachで編集ページに遷移済み
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

  it('should update check-in and check-out times', () => {
    // beforeEachで編集ページに遷移済み
    // 出社時刻のラベルを探してcomboboxを特定
    cy.contains('label', '出社時刻').parent().find('button[role="combobox"]').scrollIntoView().should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '10:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 退社時刻のラベルを探してcomboboxを特定
    cy.contains('label', '退社時刻').parent().find('button[role="combobox"]').scrollIntoView().should('be.visible').click();
    cy.contains('[data-slot="select-item"]', '19:00', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 予定内容を更新（必須項目のため）
    cy.get('textarea[name="plans.0.content"]').should('be.visible').clear().type('時間変更テスト');

    // 更新ボタンをクリック
    cy.contains('button', '更新').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('予定実績を更新しました').should('be.visible');

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/schedules', { timeout: 10000 });
  });
});

describe('Schedules Edit Page - Project Selection', () => {
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

  it('should change project for plan item', () => {
    // APIリクエストをインターセプト
    cy.intercept('GET', '/api/projects*').as('getProjects');

    cy.visitSchedulesAndWaitForData(true);
    cy.get('table tbody tr').first().find('a[href*="/schedules/"][href*="/edit"]').click();

    // プロジェクトリストの読み込みが完了するまで待つ
    cy.wait('@getProjects');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 予定の案件を変更（最初の「案件」ラベル）
    cy.contains('label', '案件').first().parent().find('button[role="combobox"]').as('planProjectButton');
    cy.get('@planProjectButton').scrollIntoView().click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-002', { timeout: 10000 }).should('be.visible').click();

    // 選択した案件が表示される
    cy.contains('PRJ-2024-002').should('be.visible');

    // 予定内容を入力（必須項目のため）
    cy.get('textarea[name="plans.0.content"]').should('be.visible').clear().type('案件変更テスト');

    // 更新ボタンをクリック
    cy.contains('button', '更新').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('予定実績を更新しました').should('be.visible');
  });

  it('should change project for actual item', () => {
    // APIリクエストをインターセプト
    cy.intercept('GET', '/api/projects*').as('getProjects');

    cy.visitSchedulesAndWaitForData(true);
    cy.get('table tbody tr').first().find('a[href*="/schedules/"][href*="/edit"]').click();

    // プロジェクトリストの読み込みが完了するまで待つ
    cy.wait('@getProjects');

    // 実績セクションまでスクロール
    cy.contains('実績').scrollIntoView();

    // 実績の案件を変更（ページ全体で2番目の「案件」ラベル）
    cy.contains('label', '案件').last().parent().find('button[role="combobox"]').as('actualProjectButton');
    cy.get('@actualProjectButton').scrollIntoView().click();
    cy.contains('[data-slot="select-item"]', 'PRJ-2024-002', { timeout: 10000 }).should('be.visible').click();

    // 選択した案件が表示される
    cy.contains('PRJ-2024-002').should('be.visible');

    // 実績内容を更新（必須項目のため）
    cy.get('textarea[name="actuals.0.content"]').should('be.visible').clear().type('案件変更テスト');

    // 更新ボタンをクリック
    cy.contains('button', '更新').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('予定実績を更新しました').should('be.visible');
  });
});

describe('Schedules Edit Page - Permission Check', () => {
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
  });

  it('should allow owner to edit their own schedule', () => {
    // 山田ユーザーでログイン
    cy.login('yamada@example.com', 'password123');

    cy.visitSchedulesAndWaitForData();

    // ユーザーフィルターで山田花子を選択
    cy.get('#user-filter').click();
    cy.contains('[data-slot="select-item"]', '山田 花子', { timeout: 10000 }).should('be.visible').click();

    // 山田のスケジュールを編集
    cy.get('table tbody tr').first().find('a[href*="/schedules/"][href*="/edit"]').click();

    // 編集ページが表示される
    cy.contains('予定実績編集').should('be.visible');

    // 更新ボタンが表示される（編集可能）
    cy.contains('button', '更新').should('exist');
  });

  it('should allow admin to edit any schedule', () => {
    // 管理者でログイン
    cy.login('admin@example.com', 'password123');

    cy.visitSchedulesAndWaitForData(true);

    // ユーザーフィルターで山田花子を選択
    cy.get('#user-filter').click();
    cy.contains('[data-slot="select-item"]', '山田 花子', { timeout: 10000 }).should('be.visible').click();

    // 山田のスケジュールを編集（管理者として）
    cy.get('table tbody tr').first().find('a[href*="/schedules/"][href*="/edit"]').click();

    // 編集ページが表示される
    cy.contains('予定実績編集').should('be.visible');

    // 更新ボタンが表示される（編集可能）
    cy.contains('button', '更新').should('exist');
  });
});
