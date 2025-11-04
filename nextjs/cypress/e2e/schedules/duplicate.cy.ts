describe('Schedules Duplicate Feature', () => {
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

  it('should show duplicate button in schedules list', () => {
    cy.visit('/schedules');

    // 複製ボタンが表示されている（Copyアイコン）
    cy.get('button[title="複製"]').should('exist');
  });

  it('should navigate to new page with duplicate parameter when clicking duplicate button', () => {
    cy.visit('/schedules');

    // 最初の複製ボタンをクリック
    cy.get('button[title="複製"]').first().click();

    // 新規作成ページに遷移
    cy.url().should('include', '/schedules/new');
    cy.url().should('include', 'duplicate=true');
  });

  it('should duplicate schedule with today\'s date', () => {
    cy.visit('/schedules');

    // 最初の複製ボタンをクリック
    cy.get('button[title="複製"]').first().click();

    // 新規作成ページに遷移
    cy.url().should('include', '/schedules/new?duplicate=true');

    // 日付が今日の日付になっている
    const today = new Date().toISOString().split('T')[0];
    cy.get('input[type="date"]').should('have.value', today);
  });

  it('should duplicate check-in time but not check-out time', () => {
    // テスト用のスケジュールを作成
    cy.visit('/schedules/new');

    // 日付を入力
    cy.get('input[type="date"]').clear().type('2024-02-10');

    // 出社時間を選択
    cy.get('button[role="combobox"]').first().click();
    cy.contains('[data-slot="select-item"]', '09:30', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 退社時間を選択
    cy.get('button[role="combobox"]').eq(1).click();
    cy.contains('[data-slot="select-item"]', '18:30', { timeout: 10000 }).scrollIntoView().should('be.visible').click();

    // 予定内容を入力
    cy.contains('予定').scrollIntoView();
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('複製テスト用予定');

    // 登録
    cy.contains('button', '登録').scrollIntoView().click();
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページに戻る
    cy.url().should('include', '/schedules', { timeout: 10000 });
    cy.url().should('not.include', '/new');

    // ページが完全にロードされるまで待つ
    cy.contains('予定実績管理').should('be.visible');

    // フィルターをクリアして全スケジュールを表示
    cy.contains('button', 'フィルターをクリア').click();

    // フィルターで今日作成したスケジュールを表示
    cy.get('input[type="date"]').first().should('not.be.disabled').clear().type('2024-02-10');
    cy.get('input[type="date"]').eq(1).should('not.be.disabled').clear().type('2024-02-10');

    // 複製ボタンをクリック
    cy.get('button[title="複製"]').first().click();

    // 新規作成ページに遷移
    cy.url().should('include', '/schedules/new?duplicate=true');

    // 出社時刻が複製されている（09:30が選択されている）
    cy.get('button[role="combobox"]').first().should('contain', '09:30');

    // 退社時刻が空欄（選択なしになっている）
    cy.get('button[role="combobox"]').eq(1).should('contain', '選択なし');
  });

  it('should duplicate plan items with all details', () => {
    // テスト用のスケジュールを作成（複数の予定項目）
    cy.visit('/schedules/new');

    // 日付を入力
    cy.get('input[type="date"]').clear().type('2024-02-11');

    // 予定セクション
    cy.contains('予定').scrollIntoView();

    // 1つ目の予定
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('予定1の内容');
    cy.get('input[name="plans.0.details"]').type('予定1の備考');

    // 2つ目の予定を追加
    cy.contains('button', '予定を追加').scrollIntoView().click();
    cy.get('textarea[name="plans.1.content"]').should('be.visible').type('予定2の内容');
    cy.get('input[name="plans.1.details"]').type('予定2の備考');

    // 登録
    cy.contains('button', '登録').scrollIntoView().click();
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページに戻る
    cy.url().should('include', '/schedules', { timeout: 10000 });
    cy.url().should('not.include', '/new');

    // ページが完全にロードされるまで待つ
    cy.contains('予定実績管理').should('be.visible');

    // フィルターをクリアして全スケジュールを表示
    cy.contains('button', 'フィルターをクリア').click();

    // フィルターで今日作成したスケジュールを表示
    cy.get('input[type="date"]').first().should('not.be.disabled').clear().type('2024-02-11');
    cy.get('input[type="date"]').eq(1).should('not.be.disabled').clear().type('2024-02-11');

    // 複製ボタンをクリック
    cy.get('button[title="複製"]').first().click();

    // 新規作成ページに遷移
    cy.url().should('include', '/schedules/new?duplicate=true');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 1つ目の予定が複製されている
    cy.get('textarea[name="plans.0.content"]').should('have.value', '予定1の内容');
    cy.get('input[name="plans.0.details"]').should('have.value', '予定1の備考');

    // 2つ目の予定が複製されている
    cy.get('textarea[name="plans.1.content"]').should('have.value', '予定2の内容');
    cy.get('input[name="plans.1.details"]').should('have.value', '予定2の備考');
  });

  it('should duplicate actual items with all details including hours', () => {
    // テスト用のスケジュールを作成（複数の実績項目）
    cy.visit('/schedules/new');

    // 日付を入力
    cy.get('input[type="date"]').clear().type('2024-02-12');

    // 予定内容を入力（必須）
    cy.contains('予定').scrollIntoView();
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('実績複製テスト用予定');

    // 実績セクション
    cy.contains('実績').scrollIntoView();

    // 1つ目の実績
    cy.get('textarea[name="actuals.0.content"]').should('be.visible').type('実績1の内容');
    // 実績時間フィールド（「実績時間」ラベルの次のinput）
    cy.contains('label', '実績時間').first().parent().find('input[type="text"]').clear().type('3.5');
    cy.get('input[name="actuals.0.details"]').type('実績1の備考');

    // 2つ目の実績を追加
    cy.contains('button', '実績を追加').scrollIntoView().click();
    cy.get('textarea[name="actuals.1.content"]').should('be.visible').type('実績2の内容');
    // 2つ目の実績時間フィールド（親カードからスクロールして探す）
    cy.get('textarea[name="actuals.1.content"]').parents('.p-4').within(() => {
      cy.contains('label', '実績時間').parent().find('input[type="text"]').scrollIntoView().clear().type('4.5');
    });
    cy.get('input[name="actuals.1.details"]').type('実績2の備考');

    // 登録
    cy.contains('button', '登録').scrollIntoView().click();
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページに戻る
    cy.url().should('include', '/schedules', { timeout: 10000 });
    cy.url().should('not.include', '/new');

    // ページが完全にロードされるまで待つ
    cy.contains('予定実績管理').should('be.visible');

    // フィルターをクリアして全スケジュールを表示
    cy.contains('button', 'フィルターをクリア').click();

    // フィルターで今日作成したスケジュールを表示
    cy.get('input[type="date"]').first().should('not.be.disabled').clear().type('2024-02-12');
    cy.get('input[type="date"]').eq(1).should('not.be.disabled').clear().type('2024-02-12');

    // 複製ボタンをクリック
    cy.get('button[title="複製"]').first().click();

    // 新規作成ページに遷移
    cy.url().should('include', '/schedules/new?duplicate=true');

    // 実績セクションまでスクロール
    cy.contains('実績').scrollIntoView();

    // 1つ目の実績が複製されている
    cy.get('textarea[name="actuals.0.content"]').should('have.value', '実績1の内容');
    cy.contains('label', '実績時間').first().parent().find('input[type="text"]').should('have.value', '3.5');
    cy.get('input[name="actuals.0.details"]').should('have.value', '実績1の備考');

    // 2つ目の実績が複製されている
    cy.get('textarea[name="actuals.1.content"]').should('have.value', '実績2の内容');
    // 2つ目の実績時間フィールド（親カードから探す）
    cy.get('textarea[name="actuals.1.content"]').parents('.p-4').within(() => {
      cy.contains('label', '実績時間').parent().find('input[type="text"]').should('have.value', '4.5');
    });
    cy.get('input[name="actuals.1.details"]').should('have.value', '実績2の備考');
  });

  it('should not duplicate reflection field', () => {
    // テスト用のスケジュールを作成（所感あり）
    cy.visit('/schedules/new');

    // 日付を入力
    cy.get('input[type="date"]').clear().type('2024-02-13');

    // 予定内容を入力
    cy.contains('予定').scrollIntoView();
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('所感複製テスト用予定');

    // 所感を入力
    cy.get('textarea[name="reflection"]').scrollIntoView().type('これは所感のテストです');

    // 登録
    cy.contains('button', '登録').scrollIntoView().click();
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページに戻る
    cy.url().should('include', '/schedules', { timeout: 10000 });
    cy.url().should('not.include', '/new');

    // ページが完全にロードされるまで待つ
    cy.contains('予定実績管理').should('be.visible');

    // フィルターをクリアして全スケジュールを表示
    cy.contains('button', 'フィルターをクリア').click();

    // フィルターで今日作成したスケジュールを表示
    cy.get('input[type="date"]').first().should('not.be.disabled').clear().type('2024-02-13');
    cy.get('input[type="date"]').eq(1).should('not.be.disabled').clear().type('2024-02-13');

    // 複製ボタンをクリック
    cy.get('button[title="複製"]').first().click();

    // 新規作成ページに遷移
    cy.url().should('include', '/schedules/new?duplicate=true');

    // 所感が空欄になっている
    cy.get('textarea[name="reflection"]').scrollIntoView().should('have.value', '');
  });

  it('should successfully register duplicated schedule', () => {
    // テスト用のスケジュールを作成
    cy.visit('/schedules/new');

    // 日付を入力
    cy.get('input[type="date"]').clear().type('2024-02-14');

    // 予定内容を入力
    cy.contains('予定').scrollIntoView();
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('登録テスト用予定');

    // 実績を入力
    cy.contains('実績').scrollIntoView();
    cy.get('textarea[name="actuals.0.content"]').should('be.visible').type('登録テスト用実績');
    cy.contains('label', '実績時間').first().parent().find('input[type="text"]').clear().type('5');

    // 登録
    cy.contains('button', '登録').scrollIntoView().click();
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページに戻る
    cy.url().should('include', '/schedules', { timeout: 10000 });
    cy.url().should('not.include', '/new');

    // ページが完全にロードされるまで待つ
    cy.contains('予定実績管理').should('be.visible');

    // フィルターをクリアして全スケジュールを表示
    cy.contains('button', 'フィルターをクリア').click();

    // フィルターで今日作成したスケジュールを表示
    cy.get('input[type="date"]').first().should('not.be.disabled').clear().type('2024-02-14');
    cy.get('input[type="date"]').eq(1).should('not.be.disabled').clear().type('2024-02-14');

    // 複製ボタンをクリック
    cy.get('button[title="複製"]').first().click();

    // 新規作成ページに遷移
    cy.url().should('include', '/schedules/new?duplicate=true');

    // 日付が今日になっていることを確認
    const today = new Date().toISOString().split('T')[0];
    cy.get('input[type="date"]').should('have.value', today);

    // そのまま登録
    cy.contains('button', '登録').scrollIntoView().click();

    // 成功メッセージが表示される
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページにリダイレクトされる
    cy.url().should('include', '/schedules', { timeout: 10000 });
    cy.url().should('not.include', '/new');
  });

  it('should duplicate schedule with project assigned', () => {
    // テスト用のスケジュールを作成（案件付き）
    cy.visit('/schedules/new');

    // 日付を入力
    cy.get('input[type="date"]').clear().type('2024-02-15');

    // 予定セクション
    cy.contains('予定').scrollIntoView();

    // 予定の案件を選択
    cy.contains('label', '案件').first().parent().find('button[role="combobox"]').scrollIntoView().click();
    cy.contains('[role="option"]', 'PRJ-2024-001').click();

    // 予定内容を入力
    cy.get('textarea[name="plans.0.content"]').should('be.visible').type('案件付き予定');

    // 登録
    cy.contains('button', '登録').scrollIntoView().click();
    cy.contains('予定実績を登録しました').should('be.visible');

    // 一覧ページに戻る
    cy.url().should('include', '/schedules', { timeout: 10000 });
    cy.url().should('not.include', '/new');

    // ページが完全にロードされるまで待つ
    cy.contains('予定実績管理').should('be.visible');

    // フィルターをクリアして全スケジュールを表示
    cy.contains('button', 'フィルターをクリア').click();

    // フィルターで今日作成したスケジュールを表示
    cy.get('input[type="date"]').first().should('not.be.disabled').clear().type('2024-02-15');
    cy.get('input[type="date"]').eq(1).should('not.be.disabled').clear().type('2024-02-15');

    // 複製ボタンをクリック
    cy.get('button[title="複製"]').first().click();

    // 新規作成ページに遷移
    cy.url().should('include', '/schedules/new?duplicate=true');

    // 予定セクションまでスクロール
    cy.contains('予定').scrollIntoView();

    // 案件が複製されている（PRJ-2024-001が表示されている）
    cy.contains('PRJ-2024-001').should('be.visible');

    // 予定内容が複製されている
    cy.get('textarea[name="plans.0.content"]').should('have.value', '案件付き予定');
  });
});
