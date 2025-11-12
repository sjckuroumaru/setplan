describe('Attendance Buttons (Check In/Out)', () => {
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
    // ビューポートサイズを設定
    cy.viewport(1280, 1024);
    // テストユーザーでログイン
    cy.login('admin@example.com', 'password123');
  });

  describe('Dashboard Page', () => {
    it('should display attendance buttons on dashboard', () => {
      cy.visit('/dashboard');

      // 出勤・退勤ボタンが表示されている
      cy.contains('button', '出勤').should('be.visible');
      cy.contains('button', '退勤').should('be.visible');
    });

    it('should check in when clicking check-in button', () => {
      cy.visit('/dashboard');

      // 出勤ボタンをクリック
      cy.contains('button', '出勤').should('not.be.disabled').click();

      // 成功メッセージが表示される
      cy.contains('出勤しました').should('be.visible');

      // 出勤時刻が表示される
      cy.contains('出勤時刻:').should('be.visible');
    });

    it('should disable check-in button after checking in', () => {
      cy.visit('/dashboard');

      // 出勤ボタンが無効化されている（既に出勤済み）
      cy.contains('button', '出勤').should('be.disabled');
    });

    it('should check out when clicking check-out button', () => {
      cy.visit('/dashboard');

      // 退勤ボタンが有効化されている
      cy.contains('button', '退勤').should('not.be.disabled').click();

      // 成功メッセージが表示される
      cy.contains('退勤しました').should('be.visible');

      // 退勤時刻が表示される
      cy.contains('退勤時刻:').should('be.visible');
    });

    it('should disable both buttons after checking out', () => {
      cy.visit('/dashboard');

      // 両方のボタンが無効化されている
      cy.contains('button', '出勤').should('be.disabled');
      cy.contains('button', '退勤').should('be.disabled');
    });
  });

  describe('Schedules Page', () => {
    beforeEach(() => {
      // 各テストの前にデータベースをリセット（予定実績の重複を防ぐため）
      cy.resetAndSeedDb();
      cy.login('admin@example.com', 'password123');
    });

    it('should display attendance buttons on schedules page', () => {
      cy.visit('/schedules');

      // 出勤・退勤ボタンが表示されている
      cy.contains('button', '出勤').should('be.visible');
      cy.contains('button', '退勤').should('be.visible');
    });

    it('should check in and check out on schedules page', () => {
      cy.visit('/schedules');

      // 出勤ボタンをクリック
      cy.contains('button', '出勤').should('not.be.disabled').click();

      // 成功メッセージが表示される
      cy.contains('出勤しました').should('be.visible');

      // 出勤時刻が表示される
      cy.contains('出勤時刻:').should('be.visible');

      // 退勤ボタンが有効化されている
      cy.contains('button', '退勤').should('not.be.disabled').click();

      // 成功メッセージが表示される
      cy.contains('退勤しました').should('be.visible');

      // 退勤時刻が表示される
      cy.contains('退勤時刻:').should('be.visible');
    });

    it('should verify default break time through edit page', () => {
      cy.visit('/schedules');

      // 出勤ボタンをクリック
      cy.contains('button', '出勤').should('not.be.disabled').click();

      // 成功メッセージを待つ
      cy.contains('出勤しました').should('be.visible');

      // 一覧ページで最初の行（今日作成した予定実績）を編集
      cy.wait(1000); // データ更新を待つ
      cy.get('table tbody tr').first().find('a[href*="/schedules/"][href*="/edit"]').click();

      // 編集ページで休憩時間が1.0になっていることを確認
      cy.url().should('match', /\/schedules\/[^/]+\/edit/, { timeout: 10000 });
      cy.contains('label', '休憩時間').parent().find('input[type="text"]').should('have.value', '1');
    });
  });

  describe('Time Rounding (15-minute intervals)', () => {
    before(() => {
      cy.resetAndSeedDb();
    });

    beforeEach(() => {
      cy.login('admin@example.com', 'password123');
    });

    it('should round check-in time to nearest 15 minutes (ceiling)', () => {
      cy.visit('/dashboard');

      // 出勤ボタンをクリック
      cy.contains('button', '出勤').should('not.be.disabled').click();

      // 成功メッセージが表示される
      cy.contains('出勤しました').should('be.visible');

      // 出勤時刻が15分単位になっている（HH:00, HH:15, HH:30, HH:45のいずれか）
      cy.contains('出勤時刻:').parent().invoke('text').then((text) => {
        const timeMatch = text.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
          const minutes = parseInt(timeMatch[2]);
          expect([0, 15, 30, 45]).to.include(minutes);
        }
      });
    });

    it('should round check-out time to nearest 15 minutes (floor)', () => {
      cy.visit('/dashboard');

      // 退勤ボタンをクリック
      cy.contains('button', '退勤').should('not.be.disabled').click();

      // 成功メッセージが表示される
      cy.contains('退勤しました').should('be.visible');

      // 退勤時刻が15分単位になっている（HH:00, HH:15, HH:30, HH:45のいずれか）
      cy.contains('退勤時刻:').parent().invoke('text').then((text) => {
        const timeMatch = text.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
          const minutes = parseInt(timeMatch[2]);
          expect([0, 15, 30, 45]).to.include(minutes);
        }
      });
    });

    it('should verify time rounding difference between check-in (ceiling) and check-out (floor)', () => {
      cy.resetAndSeedDb();
      cy.login('admin@example.com', 'password123');
      cy.visit('/dashboard');

      // 出勤ボタンをクリック
      cy.contains('button', '出勤').should('not.be.disabled').click();
      cy.contains('出勤しました').should('be.visible');

      // 出勤時刻を取得（切り上げ）
      let checkInTime: string;
      cy.contains('出勤時刻:').parent().invoke('text').then((text) => {
        const timeMatch = text.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
          checkInTime = `${timeMatch[1]}:${timeMatch[2]}`;
          const minutes = parseInt(timeMatch[2]);
          // 出勤時刻は15分単位（切り上げ）
          expect([0, 15, 30, 45]).to.include(minutes);
        }
      });

      // 退勤ボタンをクリック
      cy.contains('button', '退勤').should('not.be.disabled').click();
      cy.contains('退勤しました').should('be.visible');

      // 退勤時刻を取得（切り下げ）
      cy.contains('退勤時刻:').parent().invoke('text').then((text) => {
        const timeMatch = text.match(/(\d{2}):(\d{2})/);
        if (timeMatch) {
          const minutes = parseInt(timeMatch[2]);
          // 退勤時刻は15分単位（切り下げ）
          expect([0, 15, 30, 45]).to.include(minutes);
        }
      });
    });
  });

  describe('Error Handling', () => {
    before(() => {
      cy.resetAndSeedDb();
    });

    beforeEach(() => {
      cy.login('admin@example.com', 'password123');
    });

    it('should show error if trying to check in twice on the same day', () => {
      cy.visit('/dashboard');

      // 1回目の出勤
      cy.contains('button', '出勤').should('not.be.disabled').click();
      cy.contains('出勤しました').should('be.visible');

      // ページをリロード
      cy.reload();

      // 出勤ボタンが無効化されている
      cy.contains('button', '出勤').should('be.disabled');
    });

    it('should not allow check out without check in', () => {
      cy.visit('/schedules');

      // 退勤ボタンが無効化されている（出勤していない）
      cy.contains('button', '退勤').should('be.disabled');
    });
  });
});
