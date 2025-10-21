describe('ユーザー新規作成ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
    cy.visit('/users/new')
  })

  describe('基本機能', () => {
    it('should display the new user page', () => {
      cy.contains('新規ユーザー作成').should('be.visible')
      cy.contains('新しいユーザーアカウントを作成します').should('be.visible')
    })

    it('should display all form fields', () => {
      cy.get('input[name="employeeNumber"]').should('be.visible')
      cy.get('input[name="lastName"]').should('be.visible')
      cy.get('input[name="firstName"]').should('be.visible')
      cy.get('input[name="username"]').should('be.visible')
      cy.get('input[name="email"]').should('be.visible')
      cy.get('input[name="password"]').should('be.visible')
    })

    it('should have back button that navigates to users list', () => {
      // 戻るボタンをクリック（asChildでLinkとしてレンダリングされている）
      cy.get('a[href="/users"]').first().click()
      cy.url().should('include', '/users')
      cy.url().should('not.include', '/new')
    })

    it('should have cancel button that navigates to users list', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('include', '/users')
      cy.url().should('not.include', '/new')
    })
  })

  describe('バリデーション', () => {
    it('should show validation errors when submitting empty form', () => {
      // 空のまま送信
      cy.contains('button', '作成').click()

      // バリデーションエラーが表示されることを確認
      cy.contains('社員番号は必須です').should('be.visible')
      cy.contains('ユーザー名は必須です').should('be.visible')
      cy.contains('姓は必須です').should('be.visible')
      cy.contains('名は必須です').should('be.visible')
    })

    it('should prevent submission with invalid email (browser validation)', () => {
      cy.get('input[name="email"]').type('invalid-email')

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/users').as('createUser')

      cy.contains('button', '作成').click()

      // ブラウザのネイティブ検証によりフォーム送信がブロックされる
      // APIリクエストが送信されないことを確認
      cy.wait(1000)
      cy.get('@createUser.all').should('have.length', 0)

      // ページが遷移しないことを確認
      cy.url().should('include', '/users/new')
    })

    it('should show password validation error for short password', () => {
      cy.get('input[name="password"]').type('12345')
      cy.contains('button', '作成').click()

      cy.contains('パスワードは6文字以上で入力してください').should('be.visible')
    })

    it('should not show validation errors when all required fields are filled', () => {
      // すべての必須フィールドを入力
      cy.get('input[name="employeeNumber"]').type('EMP999')
      cy.get('input[name="lastName"]').type('テスト')
      cy.get('input[name="firstName"]').type('太郎')
      cy.get('input[name="username"]').type('test.user')
      cy.get('input[name="email"]').type('test@example.com')
      cy.get('input[name="password"]').type('password123')

      // バリデーションエラーが表示されないことを確認
      cy.contains('は必須です').should('not.exist')
    })
  })

  describe('フォーム入力', () => {
    it('should accept all form fields input', () => {
      // すべてのフィールドに入力
      cy.get('input[name="employeeNumber"]').type('EMP001')
      cy.get('input[name="lastName"]').type('山田')
      cy.get('input[name="firstName"]').type('太郎')
      cy.get('input[name="username"]').type('yamada.taro')
      cy.get('input[name="email"]').type('yamada@example.com')
      cy.get('input[name="password"]').type('password123')

      // 値が正しく入力されていることを確認
      cy.get('input[name="employeeNumber"]').should('have.value', 'EMP001')
      cy.get('input[name="lastName"]').should('have.value', '山田')
      cy.get('input[name="firstName"]').should('have.value', '太郎')
      cy.get('input[name="username"]').should('have.value', 'yamada.taro')
      cy.get('input[name="email"]').should('have.value', 'yamada@example.com')
    })

    it('should allow selecting department', () => {
      // 部署データのフェッチを待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible')

      // 部署を選択
      cy.get('button[role="combobox"]').first().click()

      // 部署リストが表示されることを確認
      cy.get('[role="option"]', { timeout: 10000 }).should('have.length.at.least', 1)
      cy.contains('[role="option"]', 'なし').should('be.visible')

      // 部署を選択（存在する場合）
      cy.get('[role="option"]').then(($options) => {
        if ($options.length > 1) {
          cy.get('[role="option"]').eq(1).click()
        } else {
          cy.contains('[role="option"]', 'なし').click()
        }
      })
    })

    it('should allow selecting status', () => {
      // フォームがレンダリングされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible')

      // ステータスを選択
      cy.get('button[role="combobox"]').eq(1).click()
      cy.get('[role="option"]', { timeout: 10000 }).should('have.length.at.least', 1)
      cy.contains('[role="option"]', '有効').should('be.visible')
      cy.contains('[role="option"]', '無効').should('be.visible')
      cy.contains('[role="option"]', '有効').click()
    })

    it('should allow toggling admin permission', () => {
      // 管理者権限スイッチを確認
      cy.contains('管理者権限').should('be.visible')

      // スイッチをクリック
      cy.get('button[role="switch"]').click()

      // スイッチがonになることを確認
      cy.get('button[role="switch"]').should('have.attr', 'data-state', 'checked')

      // 再度クリックしてoffにする
      cy.get('button[role="switch"]').click()
      cy.get('button[role="switch"]').should('have.attr', 'data-state', 'unchecked')
    })
  })

  describe('フォーム送信', () => {
    it('should create a new user with all required fields', () => {
      const timestamp = Date.now()
      const employeeNumber = `EMP${timestamp}`
      const email = `e2e.test${timestamp}@example.com`

      // 必須フィールドを入力
      cy.get('input[name="employeeNumber"]').type(employeeNumber)
      cy.get('input[name="lastName"]').type('E2E')
      cy.get('input[name="firstName"]').type('テスト')
      cy.get('input[name="username"]').type(`e2e.test${timestamp}`)
      cy.get('input[name="email"]').type(email)
      cy.get('input[name="password"]').type('password123')

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/users').as('createUser')

      // 作成ボタンをクリック
      cy.contains('button', '作成').click()

      // APIレスポンスを待つ（POSTは201 Createdを返す）
      cy.wait('@createUser').then((interception) => {
        expect(interception.response?.statusCode).to.eq(201)
      })

      // 成功のトースト通知が表示されることを確認
      cy.contains('ユーザーを作成しました').should('be.visible')

      // ユーザー一覧ページに遷移することを確認
      cy.url().should('include', '/users')
      cy.url().should('not.include', '/new')

      // 作成されたユーザーが一覧に表示されることを確認
      cy.contains(email).should('be.visible')
    })

    it('should create a new user with admin permission', () => {
      const timestamp = Date.now()

      cy.get('input[name="employeeNumber"]').type(`ADM${timestamp}`)
      cy.get('input[name="lastName"]').type('管理者')
      cy.get('input[name="firstName"]').type('テスト')
      cy.get('input[name="username"]').type(`admin.test${timestamp}`)
      cy.get('input[name="email"]').type(`admin${timestamp}@example.com`)
      cy.get('input[name="password"]').type('password123')

      // 管理者権限をオン
      cy.get('button[role="switch"]').click()

      cy.intercept('POST', '/api/users').as('createUser')

      cy.contains('button', '作成').click()

      cy.wait('@createUser').then((interception) => {
        expect(interception.response?.statusCode).to.eq(201)
        expect(interception.request.body.isAdmin).to.be.true
      })

      cy.contains('ユーザーを作成しました').should('be.visible')
    })

    it('should create an inactive user', () => {
      const timestamp = Date.now()

      cy.get('input[name="employeeNumber"]').type(`INA${timestamp}`)
      cy.get('input[name="lastName"]').type('無効')
      cy.get('input[name="firstName"]').type('ユーザー')
      cy.get('input[name="username"]').type(`inactive${timestamp}`)
      cy.get('input[name="email"]').type(`inactive${timestamp}@example.com`)
      cy.get('input[name="password"]').type('password123')

      // ステータスを無効にする
      cy.get('button[role="combobox"]').eq(1).click()
      cy.contains('[role="option"]', '無効').click()

      cy.intercept('POST', '/api/users').as('createUser')

      cy.contains('button', '作成').click()

      cy.wait('@createUser').then((interception) => {
        expect(interception.response?.statusCode).to.eq(201)
        expect(interception.request.body.status).to.eq('inactive')
      })

      cy.contains('ユーザーを作成しました').should('be.visible')
    })

    it('should disable submit button while creating', () => {
      cy.get('input[name="employeeNumber"]').type('EMP999')
      cy.get('input[name="lastName"]').type('送信中')
      cy.get('input[name="firstName"]').type('テスト')
      cy.get('input[name="username"]').type('submitting')
      cy.get('input[name="email"]').type('submitting@example.com')
      cy.get('input[name="password"]').type('password123')

      // 作成ボタンをクリック
      cy.contains('button', '作成').click()

      // ボタンがdisabledになることを確認
      cy.contains('button', '作成中...').should('be.disabled')
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error toast when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('POST', '/api/users', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('createUserError')

      cy.get('input[name="employeeNumber"]').type('ERR001')
      cy.get('input[name="lastName"]').type('エラー')
      cy.get('input[name="firstName"]').type('テスト')
      cy.get('input[name="username"]').type('error.test')
      cy.get('input[name="email"]').type('error@example.com')
      cy.get('input[name="password"]').type('password123')

      cy.contains('button', '作成').click()

      // APIレスポンスを待つ
      cy.wait('@createUserError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('Internal Server Error').should('be.visible')

      // ページが遷移しないことを確認
      cy.url().should('include', '/users/new')
    })

    it('should display error for duplicate employee number', () => {
      // 重複エラーをシミュレート
      cy.intercept('POST', '/api/users', {
        statusCode: 400,
        body: { error: '同じ社員番号が既に存在します' },
      }).as('createUserError')

      cy.get('input[name="employeeNumber"]').type('EMP001')
      cy.get('input[name="lastName"]').type('重複')
      cy.get('input[name="firstName"]').type('テスト')
      cy.get('input[name="username"]').type('duplicate.test')
      cy.get('input[name="email"]').type('duplicate@example.com')
      cy.get('input[name="password"]').type('password123')

      cy.contains('button', '作成').click()

      cy.wait('@createUserError')

      // エラーアラートが表示されることを確認
      cy.get('[role="alert"]').should('be.visible')
      cy.contains('同じ社員番号が既に存在します').should('be.visible')
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access new user page', () => {
      cy.url().should('include', '/users/new')
      cy.contains('新規ユーザー作成').should('be.visible')
    })

    it('should allow admin to create users', () => {
      const timestamp = Date.now()

      cy.get('input[name="employeeNumber"]').type(`PRM${timestamp}`)
      cy.get('input[name="lastName"]').type('権限')
      cy.get('input[name="firstName"]').type('テスト')
      cy.get('input[name="username"]').type(`permission${timestamp}`)
      cy.get('input[name="email"]').type(`permission${timestamp}@example.com`)
      cy.get('input[name="password"]').type('password123')

      cy.intercept('POST', '/api/users').as('createUser')

      cy.contains('button', '作成').click()

      cy.wait('@createUser').then((interception) => {
        expect(interception.response?.statusCode).to.eq(201)
      })

      cy.contains('ユーザーを作成しました').should('be.visible')
    })
  })
})
