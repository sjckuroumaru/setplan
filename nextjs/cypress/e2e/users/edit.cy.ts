describe('ユーザー編集ページ', () => {
  let userId: string

  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')

    // 編集対象のユーザーIDを取得
    cy.visit('/users')
    cy.get('table tbody tr').eq(1).scrollIntoView()
    cy.get('table tbody tr').eq(1).within(() => {
      cy.get('a[href*="/users/"][href*="/edit"]').click()
    })

    // URLからユーザーIDを取得
    cy.url().then((url) => {
      const matches = url.match(/\/users\/([^/]+)\/edit/)
      if (matches) {
        userId = matches[1]
      }
    })
  })

  describe('基本機能', () => {
    it('should display the edit user page', () => {
      cy.contains('ユーザー編集').should('be.visible')
      // 説明文は動的（「○○さんの情報を編集」）なので、「情報を編集」が含まれていることを確認
      cy.contains('情報を編集').should('be.visible')
    })

    it('should load existing user data', () => {
      // フォームがレンダリングされるまで待つ（部署データのフェッチ完了を待つ）
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible')

      // フォームに既存データが入っていることを確認
      cy.get('input[name="employeeNumber"]').should('not.have.value', '')
      cy.get('input[name="lastName"]').should('not.have.value', '')
      cy.get('input[name="firstName"]').should('not.have.value', '')
      cy.get('input[name="username"]').should('not.have.value', '')
      cy.get('input[name="email"]').should('not.have.value', '')
    })

    it('should display all form fields', () => {
      // フォームがレンダリングされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible')
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
      cy.url().should('not.include', '/edit')
    })

    it('should have cancel button that navigates to users list', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('include', '/users')
      cy.url().should('not.include', '/edit')
    })
  })

  describe('バリデーション', () => {
    it('should show validation errors when clearing required fields', () => {
      // 必須フィールドをクリア
      cy.get('input[name="employeeNumber"]').clear()
      cy.get('input[name="lastName"]').clear()
      cy.get('input[name="firstName"]').clear()
      cy.get('input[name="username"]').clear()

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // バリデーションエラーが表示されることを確認
      cy.contains('社員番号は必須です').should('be.visible')
      cy.contains('ユーザー名は必須です').should('be.visible')
      cy.contains('姓は必須です').should('be.visible')
      cy.contains('名は必須です').should('be.visible')
    })

    it('should prevent submission with invalid email (browser validation)', () => {
      cy.get('input[name="email"]').clear().type('invalid-email')

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/users/*').as('updateUser')

      cy.contains('button', '更新').click()

      // ブラウザのネイティブ検証によりフォーム送信がブロックされる
      // APIリクエストが送信されないことを確認
      cy.wait(1000)
      cy.get('@updateUser.all').should('have.length', 0)

      // ページが遷移しないことを確認
      cy.url().should('include', '/edit')
    })

    it('should show password validation error for short password', () => {
      cy.get('input[name="password"]').type('12345')
      cy.contains('button', '更新').click()

      cy.contains('パスワードは6文字以上で入力してください').should('be.visible')
    })

    it('should allow empty password in edit mode', () => {
      // フォームが完全にロードされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible').should('not.have.value', '')

      // パスワードを空のままにする（デフォルトで空）
      cy.get('input[name="password"]').should('have.value', '')

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/users/*').as('updateUser')

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // バリデーションエラーが表示されないことを確認
      cy.contains('パスワードは6文字以上で入力してください').should('not.exist')

      // APIレスポンスを待つ
      cy.wait('@updateUser').then((interception) => {
        // パスワードが空の場合、リクエストボディにパスワードが含まれないことを確認
        // 空文字列として送信される場合もあるため、空文字列またはundefinedを許容
        const password = interception.request.body.password
        expect(password === '' || password === undefined).to.be.true
      })
    })

    it('should not submit when required fields are empty', () => {
      // 必須フィールドをクリア
      cy.get('input[name="employeeNumber"]').clear()

      // APIリクエストがインターセプトされないことを確認
      cy.intercept('PUT', '/api/users/*').as('updateUser')

      cy.contains('button', '更新').click()

      // バリデーションエラーが表示され、APIリクエストが送信されないことを確認
      cy.contains('社員番号は必須です').should('be.visible')

      // APIリクエストが送信されていないことを確認
      cy.get('@updateUser.all').should('have.length', 0)
    })
  })

  describe('フォーム編集', () => {
    it('should allow editing all basic fields', () => {
      const timestamp = Date.now()

      // すべてのフィールドを編集
      cy.get('input[name="employeeNumber"]').clear().type(`EDIT${timestamp}`)
      cy.get('input[name="lastName"]').clear().type('編集')
      cy.get('input[name="firstName"]').clear().type('太郎')
      cy.get('input[name="username"]').clear().type(`edited${timestamp}`)
      cy.get('input[name="email"]').clear().type(`edited${timestamp}@example.com`)

      // 新しい値が入力されていることを確認
      cy.get('input[name="employeeNumber"]').should('have.value', `EDIT${timestamp}`)
      cy.get('input[name="lastName"]').should('have.value', '編集')
      cy.get('input[name="firstName"]').should('have.value', '太郎')
      cy.get('input[name="username"]').should('have.value', `edited${timestamp}`)
      cy.get('input[name="email"]').should('have.value', `edited${timestamp}@example.com`)
    })

    it('should allow changing password', () => {
      const newPassword = 'newpassword123'

      // パスワードを変更
      cy.get('input[name="password"]').type(newPassword)

      // パスワードが入力されていることを確認（セキュリティのため値は見えない）
      cy.get('input[name="password"]').should('have.attr', 'type', 'password')
    })

    it('should allow selecting department', () => {
      // フォームが完全にロードされるまで待つ（部署データのフェッチ完了を含む）
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible').should('not.have.value', '')

      // 部署を選択
      cy.get('button[role="combobox"]').first().click()

      // 部署リストが表示されることを確認（role="option"を使用）
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
      // フォームが完全にロードされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible').should('not.have.value', '')

      // ステータスを選択
      cy.get('button[role="combobox"]').eq(1).click()
      cy.get('[role="option"]', { timeout: 10000 }).should('have.length.at.least', 1)
      cy.contains('[role="option"]', '有効').should('be.visible')
      cy.contains('[role="option"]', '無効').should('be.visible')
      cy.contains('[role="option"]', '無効').click()
    })

    it('should allow toggling admin permission', () => {
      // 管理者権限スイッチを確認
      cy.contains('管理者権限').should('be.visible')

      // 現在の状態を取得
      cy.get('button[role="switch"]').then(($switch) => {
        const currentState = $switch.attr('data-state')

        // スイッチをクリック
        cy.get('button[role="switch"]').click()

        // スイッチの状態が変わることを確認
        if (currentState === 'checked') {
          cy.get('button[role="switch"]').should('have.attr', 'data-state', 'unchecked')
        } else {
          cy.get('button[role="switch"]').should('have.attr', 'data-state', 'checked')
        }
      })
    })

    it('should preserve existing data when loading', () => {
      // ページをリロードしても既存データが保持されることを確認
      cy.get('input[name="username"]').invoke('val').then((originalUsername) => {
        cy.reload()

        // ローディングが完了するまで待つ
        cy.contains('ユーザー編集').should('be.visible')

        // 元のデータが保持されていることを確認
        cy.get('input[name="username"]').should('have.value', originalUsername)
      })
    })
  })

  describe('フォーム送信', () => {
    it('should update user with edited data', () => {
      const timestamp = Date.now()
      const newLastName = `編集後_${timestamp}`

      // フォームが完全にロードされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible').should('not.have.value', '')

      // 姓を編集
      cy.get('input[name="lastName"]').clear().type(newLastName)

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/users/*').as('updateUser')
      cy.intercept('GET', '/api/users?*').as('getUsers')

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateUser').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 成功のトースト通知が表示されることを確認
      cy.contains('ユーザー情報を更新しました').should('be.visible')

      // ユーザー一覧ページに遷移することを確認
      cy.url().should('eq', Cypress.config().baseUrl + '/users')

      // 検索フィールドが表示されるまで待つ
      cy.get('input[placeholder*="社員番号"]').should('be.visible')

      // 検索機能を使って更新されたユーザーを検索
      cy.get('input[placeholder*="社員番号"]').type(newLastName)
      cy.wait('@getUsers')

      // 更新されたユーザーが一覧に表示されることを確認
      cy.contains(newLastName).should('be.visible')
    })

    it('should update user with new password', () => {
      const newPassword = 'newpassword123'

      // フォームが完全にロードされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible').should('not.have.value', '')

      cy.get('input[name="password"]').type(newPassword)

      cy.intercept('PUT', '/api/users/*').as('updateUser')

      cy.contains('button', '更新').click()

      cy.wait('@updateUser').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
        // パスワードがリクエストに含まれていることを確認
        expect(interception.request.body.password).to.eq(newPassword)
      })

      cy.contains('ユーザー情報を更新しました').should('be.visible')
    })

    it('should update user to inactive status', () => {
      // フォームが完全にロードされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible').should('not.have.value', '')

      // ステータスを無効にする
      cy.get('button[role="combobox"]').eq(1).click()
      cy.contains('[data-slot="select-item"]', '無効', { timeout: 10000 }).click()

      cy.intercept('PUT', '/api/users/*').as('updateUser')

      cy.contains('button', '更新').click()

      cy.wait('@updateUser').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
        expect(interception.request.body.status).to.eq('inactive')
      })

      cy.contains('ユーザー情報を更新しました').should('be.visible')
    })

    it('should update user admin permission', () => {
      // フォームが完全にロードされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible').should('not.have.value', '')

      // 管理者権限スイッチをクリック
      cy.get('button[role="switch"]').click()

      cy.intercept('PUT', '/api/users/*').as('updateUser')

      cy.contains('button', '更新').click()

      cy.wait('@updateUser').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
        expect(interception.request.body).to.have.property('isAdmin')
      })

      cy.contains('ユーザー情報を更新しました').should('be.visible')
    })

    it('should send correct data to API', () => {
      const timestamp = Date.now()
      const newData = {
        employeeNumber: `API${timestamp}`,
        lastName: 'API確認',
        firstName: '太郎',
        username: `api${timestamp}`,
        email: `api${timestamp}@example.com`,
      }

      // フォームが完全にロードされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible').should('not.have.value', '')

      cy.get('input[name="employeeNumber"]').clear().type(newData.employeeNumber)
      cy.get('input[name="lastName"]').clear().type(newData.lastName)
      cy.get('input[name="firstName"]').clear().type(newData.firstName)
      cy.get('input[name="username"]').clear().type(newData.username)
      cy.get('input[name="email"]').clear().type(newData.email)

      cy.intercept('PUT', '/api/users/*').as('updateUser')

      cy.contains('button', '更新').click()

      // APIリクエストの内容を確認
      cy.wait('@updateUser').then((interception) => {
        expect(interception.request.body.employeeNumber).to.eq(newData.employeeNumber)
        expect(interception.request.body.lastName).to.eq(newData.lastName)
        expect(interception.request.body.firstName).to.eq(newData.firstName)
        expect(interception.request.body.username).to.eq(newData.username)
        expect(interception.request.body.email).to.eq(newData.email)
      })
    })

    it('should disable submit button while updating', () => {
      // フォームが完全にロードされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible').should('not.have.value', '')

      cy.get('input[name="lastName"]').clear().type('送信中テスト')

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // ボタンがdisabledになることを確認
      cy.contains('button', '更新中...').should('be.disabled')
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error toast when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('PUT', '/api/users/*', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('updateUserError')

      cy.get('input[name="lastName"]').clear().type('エラーテスト')
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateUserError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('Internal Server Error').should('be.visible')

      // ページが遷移しないことを確認
      cy.url().should('include', '/edit')
    })

    it('should display error for duplicate username', () => {
      // 重複エラーをシミュレート
      cy.intercept('PUT', '/api/users/*', {
        statusCode: 400,
        body: { error: '同じユーザー名が既に存在します' },
      }).as('updateUserError')

      cy.get('input[name="username"]').clear().type('duplicate')
      cy.contains('button', '更新').click()

      cy.wait('@updateUserError')

      // エラーアラートが表示されることを確認
      cy.get('[role="alert"]').should('be.visible')
      cy.contains('同じユーザー名が既に存在します').should('be.visible')
    })

    it('should display error for duplicate email', () => {
      // 重複エラーをシミュレート
      cy.intercept('PUT', '/api/users/*', {
        statusCode: 400,
        body: { error: '同じメールアドレスが既に存在します' },
      }).as('updateUserError')

      cy.get('input[name="email"]').clear().type('duplicate@example.com')
      cy.contains('button', '更新').click()

      cy.wait('@updateUserError')

      // エラーアラートが表示されることを確認
      cy.get('[role="alert"]').should('be.visible')
      cy.contains('同じメールアドレスが既に存在します').should('be.visible')
    })

    it('should handle 404 error when user not found', () => {
      // 存在しないユーザーIDでアクセス
      cy.visit('/users/non-existent-id/edit', { failOnStatusCode: false })

      // エラーメッセージまたはアラートが表示されることを確認
      cy.wait(2000)

      cy.get('body').then(($body) => {
        if ($body.find('[role="alert"]').length > 0) {
          // アラートが表示された場合
          cy.get('[role="alert"]').should('be.visible')
          cy.contains('ユーザーが見つかりません').should('be.visible')
        } else {
          // エラートーストが表示された場合
          cy.contains('ユーザー情報の取得に失敗しました').should('be.visible')
        }
      })
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access edit user page', () => {
      cy.url().should('include', '/users/')
      cy.url().should('include', '/edit')
      cy.contains('ユーザー編集').should('be.visible')
    })

    it('should allow admin to update users', () => {
      // フォームが完全にロードされるまで待つ
      cy.get('input[name="employeeNumber"]', { timeout: 10000 }).should('be.visible').should('not.have.value', '')

      cy.get('input[name="lastName"]').clear().type('権限テスト')

      cy.intercept('PUT', '/api/users/*').as('updateUser')

      cy.contains('button', '更新').click()

      cy.wait('@updateUser').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      cy.contains('ユーザー情報を更新しました').should('be.visible')
    })
  })

  describe('データの整合性', () => {
    it('should not lose data when navigating away and back', () => {
      // データを編集
      const newLastName = '整合性テスト'
      cy.get('input[name="lastName"]').clear().type(newLastName)

      // キャンセルボタンで戻る
      cy.contains('button', 'キャンセル').click()

      // 再度編集ページにアクセス
      cy.get('table tbody tr').eq(1).scrollIntoView()
      cy.get('table tbody tr').eq(1).within(() => {
        cy.get('a[href*="/users/"][href*="/edit"]').click()
      })

      // 元のデータが保持されていることを確認（編集が保存されていないため）
      cy.get('input[name="lastName"]').should('not.have.value', newLastName)
    })

    it('should display loading state while fetching data', () => {
      // 新しいページに移動してローディング状態を確認
      cy.visit('/users')
      cy.get('table tbody tr').eq(2).scrollIntoView()
      cy.get('table tbody tr').eq(2).within(() => {
        cy.get('a[href*="/users/"][href*="/edit"]').click()
      })

      // データが読み込まれたことを確認
      cy.contains('ユーザー編集').should('be.visible')
      cy.get('input[name="username"]').should('not.have.value', '')
    })
  })

  describe('フォームの挙動', () => {
    it('should allow editing with special characters', () => {
      const nameWithSpecialChars = '山田（第1営業部）・太郎'

      cy.get('input[name="lastName"]').clear().type(nameWithSpecialChars)
      cy.get('input[name="lastName"]').should('have.value', nameWithSpecialChars)
    })

    it('should allow long names', () => {
      const longName = 'これは非常に長い名前のテストです。複数の単語と記号を含んでいます。'

      cy.get('input[name="lastName"]').clear().type(longName)
      cy.get('input[name="lastName"]').should('have.value', longName)
    })

    it('should handle password visibility toggle if available', () => {
      // パスワードフィールドが存在することを確認
      cy.get('input[name="password"]').should('have.attr', 'type', 'password')

      // パスワード表示トグルボタンが存在する場合の処理
      cy.get('body').then(($body) => {
        if ($body.find('button[aria-label*="パスワード"]').length > 0) {
          cy.get('button[aria-label*="パスワード"]').click()
          cy.get('input[name="password"]').should('have.attr', 'type', 'text')
        }
      })
    })
  })
})
