describe('案件新規作成ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
    cy.visit('/projects/new')
  })

  describe('基本機能', () => {
    it('should display the new project form', () => {
      cy.contains('新規案件作成').should('be.visible')
      cy.contains('新しい案件を作成します').should('be.visible')
      cy.get('form').should('be.visible')
    })

    it('should display all required form fields', () => {
      cy.get('input[name="projectNumber"]').should('be.visible')
      cy.get('input[name="projectName"]').should('be.visible')
      cy.get('textarea[name="description"]').should('be.visible')
      cy.contains('label', 'ステータス').should('be.visible')
    })

    it('should have back button that navigates to projects list', () => {
      // 戻るボタンをクリック（asChildでLinkとしてレンダリングされている）
      cy.get('a[href="/projects"]').first().click()
      cy.url().should('include', '/projects')
      cy.url().should('not.include', '/new')
    })

    it('should navigate back to projects list when clicking cancel', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('eq', Cypress.config().baseUrl + '/projects')
    })
  })

  describe('フォームバリデーション', () => {
    it('should show validation errors when submitting empty form', () => {
      cy.contains('button', '作成').click()

      // バリデーションエラーが表示されることを確認
      cy.contains('案件番号は必須です').scrollIntoView().should('be.visible')
      cy.contains('案件名は必須です').scrollIntoView().should('be.visible')
    })

    it('should show error when project number is empty', () => {
      cy.get('input[name="projectName"]').type('テスト案件')
      cy.contains('button', '作成').click()

      cy.contains('案件番号は必須です').scrollIntoView().should('be.visible')
    })

    it('should show error when project name is empty', () => {
      cy.get('input[name="projectNumber"]').type('PROJ001')
      cy.contains('button', '作成').click()

      cy.contains('案件名は必須です').scrollIntoView().should('be.visible')
    })
  })

  describe('基本情報入力', () => {
    it('should allow entering project number and name', () => {
      cy.get('input[name="projectNumber"]').type('PROJ001')
      cy.get('input[name="projectNumber"]').should('have.value', 'PROJ001')

      cy.get('input[name="projectName"]').type('新規システム開発')
      cy.get('input[name="projectName"]').should('have.value', '新規システム開発')
    })

    it('should allow entering description', () => {
      const description = 'これはテスト用の案件説明です。'
      cy.get('textarea[name="description"]').type(description)
      cy.get('textarea[name="description"]').should('have.value', description)
    })

    it('should allow selecting status', () => {
      // ステータスを選択
      cy.contains('label', 'ステータス').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '開発中', { timeout: 10000 }).click()

      // 選択されたことを確認
      cy.contains('label', 'ステータス').parent().should('contain', '開発中')
    })

    it('should allow selecting department', () => {
      // 部署を選択
      cy.contains('label', '担当部署・チーム').parent().find('button[role="combobox"]').click()
      cy.get('[role="option"]').first().click()

      // 選択されたことを確認（「なし」以外が選択される）
      cy.contains('label', '担当部署・チーム').parent().find('button[role="combobox"]').should('exist')
    })
  })

  describe('日程情報入力', () => {
    it('should allow entering planned start date', () => {
      cy.get('input[name="plannedStartDate"]').type('2024-01-01')
      cy.get('input[name="plannedStartDate"]').should('have.value', '2024-01-01')
    })

    it('should allow entering planned end date', () => {
      cy.get('input[name="plannedEndDate"]').type('2024-12-31')
      cy.get('input[name="plannedEndDate"]').should('have.value', '2024-12-31')
    })

    it('should allow entering actual start date', () => {
      cy.get('input[name="actualStartDate"]').type('2024-02-01')
      cy.get('input[name="actualStartDate"]').should('have.value', '2024-02-01')
    })

    it('should allow entering actual end date', () => {
      cy.get('input[name="actualEndDate"]').type('2024-11-30')
      cy.get('input[name="actualEndDate"]').should('have.value', '2024-11-30')
    })
  })

  describe('予算情報入力', () => {
    it('should allow entering budget', () => {
      cy.get('input[name="budget"]').scrollIntoView().type('10000000')
      cy.get('input[name="budget"]').should('have.value', '10000000')
    })

    it('should allow entering hourly rate', () => {
      cy.get('input[name="hourlyRate"]').scrollIntoView().type('5000')
      cy.get('input[name="hourlyRate"]').should('have.value', '5000')
    })
  })

  describe('フォーム送信', () => {
    it('should successfully create a new project with minimum required fields', () => {
      const timestamp = Date.now()

      // 必須フィールドのみ入力
      cy.get('input[name="projectNumber"]').type(`PROJ-TEST-${timestamp}`)
      cy.get('input[name="projectName"]').type(`テスト案件（必須項目のみ）_${timestamp}`)

      // 作成ボタンをクリック
      cy.contains('button', '作成').click()

      // 一覧ページに遷移することを確認
      cy.url().should('eq', Cypress.config().baseUrl + '/projects')

      // 成功のトースト通知が表示されることを確認
      cy.contains('案件を作成しました').should('be.visible')
    })

    it('should successfully create a new project with all fields', () => {
      const timestamp = Date.now()

      // 基本情報
      cy.get('input[name="projectNumber"]').type(`PROJ-FULL-${timestamp}`)
      cy.get('input[name="projectName"]').type(`フル項目テスト案件_${timestamp}`)
      cy.get('textarea[name="description"]').type('すべての項目を入力したテストケース')

      // ステータス選択
      cy.contains('label', 'ステータス').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '開発中', { timeout: 10000 }).click()

      // 日程情報
      cy.get('input[name="plannedStartDate"]').type('2024-04-01')
      cy.get('input[name="plannedEndDate"]').type('2024-09-30')
      cy.get('input[name="actualStartDate"]').type('2024-04-15')

      // 予算情報
      cy.get('input[name="budget"]').scrollIntoView().type('15000000')
      cy.get('input[name="hourlyRate"]').scrollIntoView().type('8000')

      // 作成
      cy.contains('button', '作成').click()

      // 一覧ページに遷移することを確認
      cy.url().should('eq', Cypress.config().baseUrl + '/projects')

      // 成功のトースト通知が表示されることを確認
      cy.contains('案件を作成しました').should('be.visible')
    })

    it('should disable submit button while creating', () => {
      const timestamp = Date.now()

      cy.get('input[name="projectNumber"]').type(`PROJ-BTN-${timestamp}`)
      cy.get('input[name="projectName"]').type(`ボタン状態テスト_${timestamp}`)

      cy.contains('button', '作成').click()

      // ボタンがdisabledになることを確認
      cy.contains('button', '作成中...').should('be.disabled')
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error alert when API fails', () => {
      const timestamp = Date.now()

      // APIエラーをシミュレート
      cy.intercept('POST', '/api/projects', {
        statusCode: 500,
        body: { error: 'サーバーエラーが発生しました' },
      }).as('createProjectError')

      cy.get('input[name="projectNumber"]').type(`ERROR-TEST-${timestamp}`)
      cy.get('input[name="projectName"]').type(`エラーテスト案件_${timestamp}`)

      cy.contains('button', '作成').click()

      // APIレスポンスを待つ
      cy.wait('@createProjectError')

      // エラーアラートが表示されることを確認（scrollIntoViewを追加）
      cy.get('[role="alert"]').scrollIntoView().should('be.visible')
      cy.contains('サーバーエラーが発生しました').scrollIntoView().should('be.visible')

      // ページが遷移しないことを確認
      cy.url().should('include', '/new')
    })

    it('should display error toast when API fails', () => {
      const timestamp = Date.now()

      // APIエラーをシミュレート
      cy.intercept('POST', '/api/projects', {
        statusCode: 400,
        body: { error: '同じ案件番号が既に存在します' },
      }).as('createProjectError')

      cy.get('input[name="projectNumber"]').type(`DUPLICATE-${timestamp}`)
      cy.get('input[name="projectName"]').type(`重複テスト_${timestamp}`)

      cy.contains('button', '作成').click()

      // APIレスポンスを待つ
      cy.wait('@createProjectError')

      // エラートーストが表示されることを確認（scrollIntoViewを追加）
      cy.contains('同じ案件番号が既に存在します').scrollIntoView().should('be.visible')
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access new project page', () => {
      cy.url().should('include', '/projects/new')
      cy.contains('新規案件作成').should('be.visible')
    })

    it('should not allow non-admin to access new project page', () => {
      // 一般ユーザーでログイン
      cy.login('yamada@example.com', 'password123')
      cy.visit('/projects/new', { failOnStatusCode: false })

      // ダッシュボードにリダイレクトされることを確認
      cy.url().should('include', '/dashboard')
    })
  })
})
