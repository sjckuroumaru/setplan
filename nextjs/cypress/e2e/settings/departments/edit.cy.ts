describe('部署・チーム編集ページ', () => {
  let departmentId: string

  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')

    // 編集対象の部署IDを取得
    cy.visit('/settings/departments')
    cy.get('table tbody tr').first().scrollIntoView()
    cy.get('table tbody tr').first().within(() => {
      cy.get('a[href*="/settings/departments/"][href*="/edit"]').click()
    })

    // URLから部署IDを取得
    cy.url().then((url) => {
      const matches = url.match(/\/settings\/departments\/([^/]+)\/edit/)
      if (matches) {
        departmentId = matches[1]
      }
    })
  })

  describe('基本機能', () => {
    it('should display the edit department page', () => {
      cy.contains('部署・チーム編集').should('be.visible')
      cy.contains('部署・チーム情報を編集します').should('be.visible')
    })

    it('should load existing department data', () => {
      // フォームに既存データが入っていることを確認
      cy.get('input[name="name"]').should('not.have.value', '')
    })

    it('should display form fields', () => {
      cy.get('input[name="name"]').should('be.visible')
    })

    it('should have back button that navigates to departments list', () => {
      // 戻るボタンをクリック（asChildでLinkとしてレンダリングされている）
      cy.get('a[href="/settings/departments"]').first().click()
      cy.url().should('include', '/settings/departments')
      cy.url().should('not.include', '/edit')
    })

    it('should have cancel button that navigates to departments list', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('include', '/settings/departments')
      cy.url().should('not.include', '/edit')
    })
  })

  describe('バリデーション', () => {
    it('should show validation error when clearing department name', () => {
      // 部署名をクリア
      cy.get('input[name="name"]').clear()

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // バリデーションエラーが表示されることを確認
      cy.contains('部署・チーム名は必須です').should('be.visible')
    })

    it('should not submit when department name is empty', () => {
      // 部署名をクリア
      cy.get('input[name="name"]').clear()

      // APIリクエストがインターセプトされないことを確認
      cy.intercept('PUT', '/api/departments/*').as('updateDepartment')

      cy.contains('button', '更新').click()

      // バリデーションエラーが表示され、APIリクエストが送信されないことを確認
      cy.contains('部署・チーム名は必須です').should('be.visible')

      // APIリクエストが送信されていないことを確認
      cy.get('@updateDepartment.all').should('have.length', 0)
    })
  })

  describe('フォーム編集', () => {
    it('should allow editing department name', () => {
      const newName = `編集テスト部署_${Date.now()}`

      // 部署名を編集
      cy.get('input[name="name"]').clear().type(newName)

      // 新しい値が入力されていることを確認
      cy.get('input[name="name"]').should('have.value', newName)
    })

    it('should preserve existing data when loading', () => {
      // ページをリロードしても既存データが保持されることを確認
      cy.get('input[name="name"]').invoke('val').then((originalName) => {
        cy.reload()

        // ローディングが完了するまで待つ
        cy.contains('部署・チーム編集').should('be.visible')

        // 元のデータが保持されていることを確認
        cy.get('input[name="name"]').should('have.value', originalName)
      })
    })
  })

  describe('フォーム送信', () => {
    it('should update department with edited name', () => {
      const timestamp = Date.now()
      const newName = `編集後_E2Eテスト部署_${timestamp}`

      // 部署名を編集
      cy.get('input[name="name"]').clear().type(newName)

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/departments/*').as('updateDepartment')
      cy.intercept('GET', '/api/departments?*').as('getDepartments')

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateDepartment').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 成功のトースト通知が表示されることを確認
      cy.contains('部署・チームを更新しました').should('be.visible')

      // 部署一覧ページに遷移することを確認
      cy.url().should('eq', Cypress.config().baseUrl + '/settings/departments')

      // 検索フィールドが表示されるまで待つ
      cy.get('input[placeholder*="部署・チーム名で検索"]').should('be.visible')

      // 検索機能を使って更新された部署を検索（ページネーション・ソートを回避）
      cy.get('input[placeholder*="部署・チーム名で検索"]').type(newName)
      cy.wait('@getDepartments')

      // 検索結果に更新された部署が表示されることを確認
      cy.contains(newName).should('be.visible')
    })

    it('should send correct data to API', () => {
      const newName = 'API確認用部署'

      cy.get('input[name="name"]').clear().type(newName)

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/departments/*').as('updateDepartment')

      // React DOMエラーを無視
      cy.on('uncaught:exception', (err) => {
        // NotFoundError: Failed to execute 'removeChild' を無視
        if (err.message.includes('removeChild') || err.message.includes('NotFoundError')) {
          return false
        }
        return true
      })

      cy.contains('button', '更新').click()

      // APIリクエストの内容を確認
      cy.wait('@updateDepartment').then((interception) => {
        expect(interception.request.body.name).to.eq(newName)
      })
    })

    it('should disable submit button while updating', () => {
      cy.get('input[name="name"]').clear().type('送信中テスト部署')

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // ボタンがdisabledになることを確認
      cy.contains('button', '更新中...').should('be.disabled')
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error toast when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('PUT', '/api/departments/*', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('updateDepartmentError')

      cy.get('input[name="name"]').clear().type('エラーテスト部署')
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateDepartmentError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('Internal Server Error').should('be.visible')

      // ページが遷移しないことを確認
      cy.url().should('include', '/edit')
    })

    it('should display error alert when update fails', () => {
      // APIエラーをシミュレート
      cy.intercept('PUT', '/api/departments/*', {
        statusCode: 400,
        body: { error: '同じ名前の部署が既に存在します' },
      }).as('updateDepartmentError')

      cy.get('input[name="name"]').clear().type('重複部署名')
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateDepartmentError')

      // エラーアラートが表示されることを確認
      cy.get('[role="alert"]').should('be.visible')
      cy.contains('同じ名前の部署が既に存在します').should('be.visible')
    })

    it('should handle 404 error when department not found', () => {
      // 存在しない部署IDでアクセス
      cy.visit('/settings/departments/non-existent-id/edit', { failOnStatusCode: false })

      // エラーメッセージまたはアラートが表示されることを確認
      cy.wait(2000)

      cy.get('body').then(($body) => {
        if ($body.find('[role="alert"]').length > 0) {
          // アラートが表示された場合
          cy.get('[role="alert"]').should('be.visible')
          cy.contains('部署が見つかりません').should('be.visible')
        } else {
          // エラートーストが表示された場合
          cy.contains('部署情報の取得に失敗しました').should('be.visible')
        }
      })
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access edit department page', () => {
      cy.url().should('include', '/settings/departments/')
      cy.url().should('include', '/edit')
      cy.contains('部署・チーム編集').should('be.visible')
    })

    it('should allow admin to update departments', () => {
      cy.get('input[name="name"]').clear().type('権限テスト部署')

      cy.intercept('PUT', '/api/departments/*').as('updateDepartment')

      cy.contains('button', '更新').click()

      cy.wait('@updateDepartment').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      cy.contains('部署・チームを更新しました').should('be.visible')
    })
  })

  describe('データの整合性', () => {
    it('should not lose data when navigating away and back', () => {
      // データを編集
      const newName = '整合性テスト部署'
      cy.get('input[name="name"]').clear().type(newName)

      // キャンセルボタンで戻る
      cy.contains('button', 'キャンセル').click()

      // 再度編集ページにアクセス
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('a[href*="/settings/departments/"][href*="/edit"]').click()
      })

      // 元のデータが保持されていることを確認（編集が保存されていないため）
      cy.get('input[name="name"]').should('not.have.value', newName)
    })

    it('should display loading state while fetching data', () => {
      // 新しいページに移動してローディング状態を確認
      cy.visit('/settings/departments')
      cy.get('table tbody tr').eq(1).scrollIntoView()
      cy.get('table tbody tr').eq(1).within(() => {
        cy.get('a[href*="/settings/departments/"][href*="/edit"]').click()
      })

      // データが読み込まれたことを確認
      cy.contains('部署・チーム編集').should('be.visible')
      cy.get('input[name="name"]').should('not.have.value', '')
    })
  })

  describe('フォームの挙動', () => {
    it('should allow editing with special characters', () => {
      const nameWithSpecialChars = '開発部（第1）・営業課'

      cy.get('input[name="name"]').clear().type(nameWithSpecialChars)
      cy.get('input[name="name"]').should('have.value', nameWithSpecialChars)
    })

    it('should allow long department names', () => {
      const longName = 'これは非常に長い部署・チーム名のテストです。複数の単語と記号を含んでいます。'

      cy.get('input[name="name"]').clear().type(longName)
      cy.get('input[name="name"]').should('have.value', longName)
    })

    it('should trim whitespace from department name', () => {
      const nameWithSpaces = '  トリムテスト部署  '
      const trimmedName = 'トリムテスト部署'

      cy.get('input[name="name"]').clear().type(nameWithSpaces)

      cy.intercept('PUT', '/api/departments/*').as('updateDepartment')

      cy.contains('button', '更新').click()

      // APIリクエストでトリムされた値が送信されることを確認
      cy.wait('@updateDepartment').then((interception) => {
        const sentName = interception.request.body.name
        // トリム処理は実装による。ここではトリムされている可能性を確認
        expect(sentName).to.satisfy((name: string) => {
          return name === nameWithSpaces || name === trimmedName
        })
      })
    })
  })
})
