describe('顧客新規作成ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
    cy.visit('/customers/new')
  })

  describe('基本機能', () => {
    it('should display the new customer page', () => {
      cy.contains('新規顧客登録').should('be.visible')
      cy.contains('基本情報').should('be.visible')
    })

    it('should display all form fields', () => {
      cy.get('input[name="name"]').should('be.visible')
      cy.get('input[name="postalCode"]').should('be.visible')
      cy.get('input[name="address"]').should('be.visible')
      cy.get('input[name="building"]').should('be.visible')
      cy.get('input[name="representative"]').should('be.visible')
      cy.get('input[name="phone"]').should('be.visible')
      cy.get('input[name="fax"]').should('be.visible')
      cy.get('textarea[name="remarks"]').should('be.visible')
      cy.get('button[role="combobox"]').should('be.visible')
    })

    it('should have back button that navigates to customers list', () => {
      // ページタイトルから戻るボタンを相対的に取得してクリック
      cy.contains('h2', '新規顧客登録').parent().parent().find('button').first().click()
      cy.url().should('include', '/customers')
      cy.url().should('not.include', '/new')
    })

    it('should have cancel button that navigates to customers list', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('include', '/customers')
      cy.url().should('not.include', '/new')
    })
  })

  describe('バリデーション', () => {
    it('should show validation error when submitting without company name', () => {
      // 会社名を空のまま送信
      cy.contains('button', '登録').click()

      // バリデーションエラーが表示されることを確認
      cy.contains('会社名は必須です').should('be.visible')
    })

    it('should not show validation error when company name is provided', () => {
      // 会社名を入力
      cy.get('input[name="name"]').type('テスト株式会社')

      // バリデーションエラーが表示されないことを確認
      cy.contains('会社名は必須です').should('not.exist')
    })

    it('should accept form with only required fields', () => {
      // 必須フィールドのみ入力
      cy.get('input[name="name"]').type('最小限テスト株式会社')

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/customers').as('createCustomer')

      cy.contains('button', '登録').click()

      // APIレスポンスを待つ
      cy.wait('@createCustomer').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 成功のトースト通知が表示されることを確認
      cy.contains('顧客を登録しました').should('be.visible')

      // 顧客一覧ページに遷移することを確認
      cy.url().should('include', '/customers')
      cy.url().should('not.include', '/new')
    })
  })

  describe('フォーム入力', () => {
    it('should accept all form fields input', () => {
      // すべてのフィールドに入力
      cy.get('input[name="name"]').type('完全テスト株式会社')
      cy.get('input[name="postalCode"]').type('100-0001')
      cy.get('input[name="address"]').type('東京都千代田区千代田1-1')
      cy.get('input[name="building"]').type('テストビル 10F')
      cy.get('input[name="representative"]').type('田中 太郎')
      cy.get('input[name="phone"]').type('03-1234-5678')
      cy.get('input[name="fax"]').type('03-1234-5679')
      cy.get('textarea[name="remarks"]').type('これはテスト用の備考です。')

      // ステータスを選択
      cy.get('button[role="combobox"]').click()
      cy.contains('[role="option"]', '有効').click()

      // すべての値が正しく入力されていることを確認
      cy.get('input[name="name"]').should('have.value', '完全テスト株式会社')
      cy.get('input[name="postalCode"]').should('have.value', '100-0001')
      cy.get('input[name="address"]').should('have.value', '東京都千代田区千代田1-1')
      cy.get('input[name="building"]').should('have.value', 'テストビル 10F')
      cy.get('input[name="representative"]').should('have.value', '田中 太郎')
      cy.get('input[name="phone"]').should('have.value', '03-1234-5678')
      cy.get('input[name="fax"]').should('have.value', '03-1234-5679')
      cy.get('textarea[name="remarks"]').should('have.value', 'これはテスト用の備考です。')
    })

    it('should allow selecting status', () => {
      cy.get('input[name="name"]').type('ステータステスト株式会社')

      // 有効を選択
      cy.get('button[role="combobox"]').click()
      cy.contains('[role="option"]', '有効').should('be.visible')
      cy.contains('[role="option"]', '無効').should('be.visible')
      cy.contains('[role="option"]', '有効').click()

      // ステータスが選択されていることを確認
      cy.get('button[role="combobox"]').should('contain', '有効')
    })

    it('should allow selecting inactive status', () => {
      cy.get('input[name="name"]').type('無効ステータステスト株式会社')

      // 無効を選択
      cy.get('button[role="combobox"]').click()
      cy.contains('[role="option"]', '無効').click()

      // ステータスが選択されていることを確認
      cy.get('button[role="combobox"]').should('contain', '無効')
    })
  })

  describe('フォーム送信', () => {
    it('should create a new customer with all fields', () => {
      const timestamp = Date.now()
      const customerName = `E2Eテスト株式会社_${timestamp}`

      // すべてのフィールドに入力
      cy.get('input[name="name"]').type(customerName)
      cy.get('input[name="postalCode"]').type('100-0001')
      cy.get('input[name="address"]').type('東京都千代田区千代田1-1')
      cy.get('input[name="building"]').type('テストビル 10F')
      cy.get('input[name="representative"]').type('山田 太郎')
      cy.get('input[name="phone"]').type('03-1234-5678')
      cy.get('input[name="fax"]').type('03-1234-5679')
      cy.get('textarea[name="remarks"]').type('E2Eテスト用の顧客データです。')

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/customers').as('createCustomer')

      // 登録ボタンをクリック
      cy.contains('button', '登録').click()

      // APIレスポンスを待つ
      cy.wait('@createCustomer').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 成功のトースト通知が表示されることを確認
      cy.contains('顧客を登録しました').should('be.visible')

      // 顧客一覧ページに遷移することを確認
      cy.url().should('include', '/customers')
      cy.url().should('not.include', '/new')

      // 作成された顧客が一覧に表示されることを確認
      cy.contains(customerName).should('be.visible')
    })

    it('should create a new customer with minimal fields', () => {
      const timestamp = Date.now()
      const customerName = `最小限テスト株式会社_${timestamp}`

      // 必須フィールドのみ入力
      cy.get('input[name="name"]').type(customerName)

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/customers').as('createCustomer')

      // 登録ボタンをクリック
      cy.contains('button', '登録').click()

      // APIレスポンスを待つ
      cy.wait('@createCustomer').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 成功のトースト通知が表示されることを確認
      cy.contains('顧客を登録しました').should('be.visible')

      // 顧客一覧ページに遷移することを確認
      cy.url().should('include', '/customers')
      cy.url().should('not.include', '/new')

      // 作成された顧客が一覧に表示されることを確認
      cy.contains(customerName).should('be.visible')
    })

    it('should disable submit button while creating', () => {
      cy.get('input[name="name"]').type('送信中テスト株式会社')

      // 登録ボタンをクリック
      cy.contains('button', '登録').click()

      // ボタンがdisabledになることを確認
      cy.contains('button', '登録中...').should('be.disabled')
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error toast when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('POST', '/api/customers', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('createCustomerError')

      cy.get('input[name="name"]').type('エラーテスト株式会社')
      cy.contains('button', '登録').click()

      // APIレスポンスを待つ
      cy.wait('@createCustomerError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('登録に失敗しました').should('be.visible')

      // ページが遷移しないことを確認
      cy.url().should('include', '/customers/new')
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access new customer page', () => {
      cy.url().should('include', '/customers/new')
      cy.contains('新規顧客登録').should('be.visible')
    })

    it('should allow admin to create customers', () => {
      cy.get('input[name="name"]').type('権限テスト株式会社')

      cy.intercept('POST', '/api/customers').as('createCustomer')

      cy.contains('button', '登録').click()

      cy.wait('@createCustomer').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      cy.contains('顧客を登録しました').should('be.visible')
    })
  })
})
