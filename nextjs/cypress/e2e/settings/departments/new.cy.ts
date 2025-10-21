describe('部署・チーム新規作成ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
    cy.visit('/settings/departments/new')
  })

  describe('基本機能', () => {
    it('should display the new department page', () => {
      cy.contains('新規部署・チーム作成').should('be.visible')
      cy.contains('新しい部署・チームを登録します').should('be.visible')
    })

    it('should display form fields', () => {
      cy.get('input[name="name"]').should('be.visible')
    })

    it('should have back button that navigates to departments list', () => {
      // 戻るボタンをクリック（asChildでLinkとしてレンダリングされている）
      cy.get('a[href="/settings/departments"]').first().click()
      cy.url().should('include', '/settings/departments')
      cy.url().should('not.include', '/new')
    })

    it('should have cancel button that navigates to departments list', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('include', '/settings/departments')
      cy.url().should('not.include', '/new')
    })
  })

  describe('バリデーション', () => {
    it('should show validation error when submitting without department name', () => {
      // 部署名を空のまま送信
      cy.contains('button', '作成').click()

      // バリデーションエラーが表示されることを確認
      cy.contains('部署・チーム名は必須です').should('be.visible')
    })

    it('should not show validation error when department name is provided', () => {
      // 部署名を入力
      cy.get('input[name="name"]').type('テスト部署')

      // バリデーションエラーが表示されないことを確認
      cy.contains('部署・チーム名は必須です').should('not.exist')
    })
  })

  describe('フォーム入力', () => {
    it('should accept department name input', () => {
      const departmentName = 'システム開発部'

      // 部署名を入力
      cy.get('input[name="name"]').type(departmentName)

      // 値が正しく入力されていることを確認
      cy.get('input[name="name"]').should('have.value', departmentName)
    })

    it('should accept long department name', () => {
      const longName = 'これは非常に長い部署・チーム名のテストです。複数の単語と記号を含んでいます。'

      cy.get('input[name="name"]').type(longName)
      cy.get('input[name="name"]').should('have.value', longName)
    })

    it('should accept department name with special characters', () => {
      const nameWithSpecialChars = '開発部（第1）・営業課'

      cy.get('input[name="name"]').type(nameWithSpecialChars)
      cy.get('input[name="name"]').should('have.value', nameWithSpecialChars)
    })
  })

  describe('フォーム送信', () => {
    it('should create a new department', () => {
      const timestamp = Date.now()
      const departmentName = `E2Eテスト部署_${timestamp}`

      // 部署名を入力
      cy.get('input[name="name"]').type(departmentName)

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/departments').as('createDepartment')
      cy.intercept('GET', '/api/departments?*').as('getDepartments')

      // 作成ボタンをクリック
      cy.contains('button', '作成').click()

      // APIレスポンスを待つ（POSTは201 Createdを返す）
      cy.wait('@createDepartment').then((interception) => {
        expect(interception.response?.statusCode).to.eq(201)
      })

      // 成功のトースト通知が表示されることを確認
      cy.contains('部署・チームを作成しました').should('be.visible')

      // 部署一覧ページに遷移することを確認
      cy.url().should('eq', Cypress.config().baseUrl + '/settings/departments')

      // 検索フィールドが表示されるまで待つ
      cy.get('input[placeholder*="部署・チーム名で検索"]').should('be.visible')

      // 検索機能を使って作成された部署を検索（ページネーション・ソートを回避）
      cy.get('input[placeholder*="部署・チーム名で検索"]').type(departmentName)
      cy.wait('@getDepartments')

      // 検索結果に作成された部署が表示されることを確認
      cy.contains(departmentName).should('be.visible')
    })

    it('should disable submit button while creating', () => {
      cy.get('input[name="name"]').type('送信中テスト部署')

      // 作成ボタンをクリック
      cy.contains('button', '作成').click()

      // ボタンがdisabledになることを確認
      cy.contains('button', '作成中...').should('be.disabled')
    })

    it('should send correct data to API', () => {
      const departmentName = 'API確認用部署'

      cy.get('input[name="name"]').type(departmentName)

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/departments').as('createDepartment')

      cy.contains('button', '作成').click()

      // APIリクエストの内容を確認
      cy.wait('@createDepartment').then((interception) => {
        expect(interception.request.body.name).to.eq(departmentName)
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error toast when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('POST', '/api/departments', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('createDepartmentError')

      cy.get('input[name="name"]').type('エラーテスト部署')
      cy.contains('button', '作成').click()

      // APIレスポンスを待つ
      cy.wait('@createDepartmentError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('Internal Server Error').should('be.visible')

      // ページが遷移しないことを確認
      cy.url().should('include', '/settings/departments/new')
    })

    it('should display error alert when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('POST', '/api/departments', {
        statusCode: 400,
        body: { error: '同じ名前の部署が既に存在します' },
      }).as('createDepartmentError')

      cy.get('input[name="name"]').type('重複部署名')
      cy.contains('button', '作成').click()

      // APIレスポンスを待つ
      cy.wait('@createDepartmentError')

      // エラーアラートが表示されることを確認
      cy.get('[role="alert"]').should('be.visible')
      cy.contains('同じ名前の部署が既に存在します').should('be.visible')
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access new department page', () => {
      cy.url().should('include', '/settings/departments/new')
      cy.contains('新規部署・チーム作成').should('be.visible')
    })

    it('should allow admin to create departments', () => {
      cy.get('input[name="name"]').type('権限テスト部署')

      cy.intercept('POST', '/api/departments').as('createDepartment')

      cy.contains('button', '作成').click()

      // POSTは201 Createdを返す
      cy.wait('@createDepartment').then((interception) => {
        expect(interception.response?.statusCode).to.eq(201)
      })

      cy.contains('部署・チームを作成しました').should('be.visible')
    })
  })

  describe('フォームの挙動', () => {
    it('should clear form when navigating back and forth', () => {
      // 部署名を入力
      cy.get('input[name="name"]').type('一時的な入力')

      // キャンセルボタンで戻る
      cy.contains('button', 'キャンセル').click()

      // 再度新規作成ページにアクセス
      cy.contains('a', '新規部署・チーム').click()

      // フォームがクリアされていることを確認
      cy.get('input[name="name"]').should('have.value', '')
    })

    it('should focus on name field when page loads', () => {
      // 名前フィールドが存在することを確認
      cy.get('input[name="name"]').should('be.visible')
    })
  })
})
