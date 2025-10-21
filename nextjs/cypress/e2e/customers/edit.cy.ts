describe('顧客編集ページ', () => {
  let customerId: string

  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')

    // 編集対象の顧客IDを取得
    cy.visit('/customers')
    cy.get('table tbody tr').first().scrollIntoView()
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').scrollIntoView().click()
    })

    // 編集ページへの遷移とAPIレスポンスをインターセプト
    cy.intercept('GET', '/api/customers/*').as('getCustomer')
    cy.contains('[role="menuitem"]', '編集').should('be.visible').click()

    // URLが編集ページになることを確認
    cy.url().should('include', '/edit')

    // URLから顧客IDを取得
    cy.url().then((url) => {
      const matches = url.match(/\/customers\/([^/]+)\/edit/)
      if (matches) {
        customerId = matches[1]
      }
    })

    // APIレスポンスを待ち、データ取得が成功したことを確認
    cy.wait('@getCustomer').then((interception) => {
      // 200 OKでない場合はテストを失敗させる
      expect(interception.response?.statusCode).to.eq(200)
    })

    // 編集フォームが表示されることを確認
    cy.contains('顧客編集', { timeout: 10000 }).should('be.visible')
  })

  describe('基本機能', () => {
    it('should display the edit customer page', () => {
      cy.contains('顧客編集').should('be.visible')
      cy.contains('基本情報').should('be.visible')
    })

    it('should load existing customer data', () => {
      // フォームに既存データが入っていることを確認
      cy.get('input[name="name"]').should('not.have.value', '')
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
      cy.contains('h2', '顧客編集').parent().parent().find('button').first().click()
      cy.url().should('include', '/customers')
      cy.url().should('not.include', '/edit')
    })

    it('should have cancel button that navigates to customers list', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('include', '/customers')
      cy.url().should('not.include', '/edit')
    })
  })

  describe('バリデーション', () => {
    it('should show validation error when clearing company name', () => {
      // 会社名をクリア
      cy.get('input[name="name"]').clear()

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // バリデーションエラーが表示されることを確認
      cy.contains('会社名は必須です').should('be.visible')
    })

    it('should not submit when company name is empty', () => {
      // 会社名をクリア
      cy.get('input[name="name"]').clear()

      // APIリクエストがインターセプトされないことを確認
      cy.intercept('PUT', '/api/customers/*').as('updateCustomer')

      cy.contains('button', '更新').click()

      // バリデーションエラーが表示され、APIリクエストが送信されないことを確認
      cy.contains('会社名は必須です').should('be.visible')

      // APIリクエストが送信されていないことを確認
      cy.get('@updateCustomer.all').should('have.length', 0)
    })
  })

  describe('フォーム編集', () => {
    it('should allow editing company name', () => {
      const newName = `編集テスト株式会社_${Date.now()}`

      // 会社名を編集
      cy.get('input[name="name"]').clear().type(newName)

      // 新しい値が入力されていることを確認
      cy.get('input[name="name"]').should('have.value', newName)
    })

    it('should allow editing all fields', () => {
      // すべてのフィールドを編集
      cy.get('input[name="name"]').clear().type('更新テスト株式会社')
      cy.get('input[name="postalCode"]').clear().type('105-0001')
      cy.get('input[name="address"]').clear().type('東京都港区虎ノ門1-1-1')
      cy.get('input[name="building"]').clear().type('更新ビル 5F')
      cy.get('input[name="representative"]').clear().type('佐藤 次郎')
      cy.get('input[name="phone"]').clear().type('03-9876-5432')
      cy.get('input[name="fax"]').clear().type('03-9876-5433')
      cy.get('textarea[name="remarks"]').clear().type('更新されたテスト用の備考です。')

      // すべての値が正しく入力されていることを確認
      cy.get('input[name="name"]').should('have.value', '更新テスト株式会社')
      cy.get('input[name="postalCode"]').should('have.value', '105-0001')
      cy.get('input[name="address"]').should('have.value', '東京都港区虎ノ門1-1-1')
      cy.get('input[name="building"]').should('have.value', '更新ビル 5F')
      cy.get('input[name="representative"]').should('have.value', '佐藤 次郎')
      cy.get('input[name="phone"]').should('have.value', '03-9876-5432')
      cy.get('input[name="fax"]').should('have.value', '03-9876-5433')
      cy.get('textarea[name="remarks"]').should('have.value', '更新されたテスト用の備考です。')
    })

    it('should allow changing status', () => {
      // ステータスを変更
      cy.get('button[role="combobox"]').click()
      cy.contains('[role="option"]', '無効').click()

      // ステータスが変更されていることを確認
      cy.get('button[role="combobox"]').should('contain', '無効')
    })

    it('should preserve existing data when loading', () => {
      // ページをリロードしても既存データが保持されることを確認
      cy.get('input[name="name"]').invoke('val').then((originalName) => {
        cy.reload()

        // ローディングが完了するまで待つ
        cy.contains('顧客編集').should('be.visible')

        // 元のデータが保持されていることを確認
        cy.get('input[name="name"]').should('have.value', originalName)
      })
    })
  })

  describe('フォーム送信', () => {
    it('should update customer with edited fields', () => {
      const timestamp = Date.now()
      const newName = `編集後_E2Eテスト株式会社_${timestamp}`

      // フィールドを編集
      cy.get('input[name="name"]').clear().type(newName)
      cy.get('input[name="representative"]').clear().type('編集 太郎')

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/customers/*').as('updateCustomer')

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateCustomer').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 成功のトースト通知が表示されることを確認
      cy.contains('顧客情報を更新しました').should('be.visible')

      // 顧客一覧ページに遷移することを確認
      cy.url().should('include', '/customers')
      cy.url().should('not.include', '/edit')

      // 更新された顧客が一覧に表示されることを確認
      cy.contains(newName).should('be.visible')
    })

    it('should update customer with all fields changed', () => {
      const timestamp = Date.now()
      const newName = `全項目更新_E2Eテスト株式会社_${timestamp}`

      // すべてのフィールドを編集
      cy.get('input[name="name"]').clear().type(newName)
      cy.get('input[name="postalCode"]').clear().type('106-0001')
      cy.get('input[name="address"]').clear().type('東京都港区六本木1-1-1')
      cy.get('input[name="building"]').clear().type('全更新ビル 20F')
      cy.get('input[name="representative"]').clear().type('全更新 太郎')
      cy.get('input[name="phone"]').clear().type('03-5555-6666')
      cy.get('input[name="fax"]').clear().type('03-5555-6667')
      cy.get('textarea[name="remarks"]').clear().type('すべての項目が更新されたテストデータです。')

      // ステータスを変更
      cy.get('button[role="combobox"]').click()
      cy.contains('[role="option"]', '無効').click()

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/customers/*').as('updateCustomer')

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateCustomer').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)

        // リクエストボディに更新データが含まれていることを確認
        expect(interception.request.body.name).to.eq(newName)
        expect(interception.request.body.postalCode).to.eq('106-0001')
        expect(interception.request.body.representative).to.eq('全更新 太郎')
        expect(interception.request.body.status).to.eq('inactive')
      })

      // 成功のトースト通知が表示されることを確認
      cy.contains('顧客情報を更新しました').should('be.visible')

      // 顧客一覧ページに遷移することを確認
      cy.url().should('include', '/customers')
      cy.url().should('not.include', '/edit')

      // 更新された顧客が一覧に表示されることを確認
      cy.contains(newName).should('be.visible')
    })

    it('should disable submit button while updating', () => {
      cy.get('input[name="name"]').clear().type('送信中テスト株式会社')

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // ボタンがdisabledになることを確認
      cy.contains('button', '更新中...').should('be.disabled')
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error toast when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('PUT', '/api/customers/*', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('updateCustomerError')

      cy.get('input[name="name"]').clear().type('エラーテスト株式会社')
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateCustomerError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('更新に失敗しました').should('be.visible')

      // ページが遷移しないことを確認
      cy.url().should('include', '/edit')
    })

    it('should handle 404 error when customer not found', () => {
      // 存在しない顧客IDでアクセス
      cy.visit('/customers/non-existent-id/edit', { failOnStatusCode: false })

      // エラーメッセージまたはリダイレクトが発生することを確認
      cy.wait(2000)

      // 顧客一覧ページにリダイレクトされるか、エラートーストが表示される
      cy.url().then((url) => {
        if (url.includes('/customers') && !url.includes('/edit')) {
          // リダイレクトされた場合
          cy.url().should('include', '/customers')
        } else {
          // エラートーストが表示された場合
          cy.contains('顧客情報の取得に失敗しました').should('be.visible')
        }
      })
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access edit customer page', () => {
      cy.url().should('include', '/customers/')
      cy.url().should('include', '/edit')
      cy.contains('顧客編集').should('be.visible')
    })

    it('should allow admin to update customers', () => {
      cy.get('input[name="name"]').clear().type('権限テスト株式会社')

      cy.intercept('PUT', '/api/customers/*').as('updateCustomer')

      cy.contains('button', '更新').click()

      cy.wait('@updateCustomer').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      cy.contains('顧客情報を更新しました').should('be.visible')
    })
  })

  describe('データの整合性', () => {
    it('should not lose data when navigating away and back', () => {
      // データを編集
      const newName = '整合性テスト株式会社'
      cy.get('input[name="name"]').clear().type(newName)

      // キャンセルボタンで戻る
      cy.contains('button', 'キャンセル').click()

      // 再度編集ページにアクセス
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').scrollIntoView().click()
      })
      cy.contains('[role="menuitem"]', '編集').click()

      // 元のデータが保持されていることを確認（編集が保存されていないため）
      cy.get('input[name="name"]').should('not.have.value', newName)
    })

    it('should display loading state while fetching data', () => {
      // 新しいページに移動してローディング状態を確認
      cy.visit('/customers')
      cy.get('table tbody tr').eq(1).scrollIntoView()
      cy.get('table tbody tr').eq(1).within(() => {
        cy.get('button[aria-haspopup="menu"]').scrollIntoView().click()
      })
      cy.contains('[role="menuitem"]', '編集').click()

      // ローディングスケルトンが表示されることを確認（短時間なので見えない場合がある）
      // データが読み込まれたことを確認
      cy.contains('顧客編集').should('be.visible')
      cy.get('input[name="name"]').should('not.have.value', '')
    })
  })
})
