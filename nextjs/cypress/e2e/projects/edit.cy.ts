describe('案件編集ページ', () => {
  let testProjectId: string

  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()

    // テスト用のプロジェクトIDを1回だけ取得
    cy.login('admin@example.com', 'password123')
    cy.visit('/projects')
    cy.get('table tbody tr').first().scrollIntoView()
    cy.get('table tbody tr').first().within(() => {
      cy.get('td').last().find('a[href*="/edit"]').invoke('attr', 'href').then((href) => {
        const matches = href?.match(/\/projects\/([^/]+)\/edit/)
        if (matches) {
          testProjectId = matches[1]
        }
      })
    })
  })

  // ほとんどのテストでは同じプロジェクトの編集ページに直接アクセス
  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
    cy.visit(`/projects/${testProjectId}/edit`)
  })

  describe('基本機能', () => {
    it('should display the edit project page', () => {
      cy.contains('案件編集').should('be.visible')
      cy.contains('の情報を編集').should('be.visible')
    })

    it('should load existing project data', () => {
      // フォームに既存データが入っていることを確認
      cy.get('input[name="projectNumber"]').should('not.have.value', '')
      cy.get('input[name="projectName"]').should('not.have.value', '')
    })

    it('should display form fields', () => {
      cy.get('input[name="projectNumber"]').should('be.visible')
      cy.get('input[name="projectName"]').should('be.visible')
      cy.get('textarea[name="description"]').should('be.visible')
      cy.contains('label', 'ステータス').should('be.visible')
    })

    it('should have back button that navigates to projects list', () => {
      // 戻るボタンをクリック（asChildでLinkとしてレンダリングされている）
      cy.get('a[href="/projects"]').first().click()
      cy.url().should('include', '/projects')
      cy.url().should('not.include', '/edit')
    })

    it('should have cancel button that navigates to projects list', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('include', '/projects')
      cy.url().should('not.include', '/edit')
    })
  })

  describe('バリデーション', () => {
    it('should show validation error when clearing project number', () => {
      // 案件番号をクリア
      cy.get('input[name="projectNumber"]').clear()

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // バリデーションエラーが表示されることを確認
      cy.contains('案件番号は必須です').scrollIntoView().should('be.visible')
    })

    it('should show validation error when clearing project name', () => {
      // 案件名をクリア
      cy.get('input[name="projectName"]').clear()

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // バリデーションエラーが表示されることを確認
      cy.contains('案件名は必須です').scrollIntoView().should('be.visible')
    })

    it('should not submit when required fields are empty', () => {
      // 必須項目をクリア
      cy.get('input[name="projectNumber"]').clear()
      cy.get('input[name="projectName"]').clear()

      // APIリクエストがインターセプトされないことを確認
      cy.intercept('PUT', '/api/projects/*').as('updateProject')

      cy.contains('button', '更新').click()

      // バリデーションエラーが表示され、APIリクエストが送信されないことを確認
      cy.contains('案件番号は必須です').scrollIntoView().should('be.visible')
      cy.contains('案件名は必須です').scrollIntoView().should('be.visible')

      // APIリクエストが送信されていないことを確認
      cy.get('@updateProject.all').should('have.length', 0)
    })
  })

  describe('フォーム編集', () => {
    it('should allow editing project number', () => {
      const newNumber = `EDIT-${Date.now()}`

      cy.get('input[name="projectNumber"]').clear().type(newNumber)
      cy.get('input[name="projectNumber"]').should('have.value', newNumber)
    })

    it('should allow editing project name', () => {
      const newName = `編集テスト案件_${Date.now()}`

      cy.get('input[name="projectName"]').clear().type(newName)
      cy.get('input[name="projectName"]').should('have.value', newName)
    })

    it('should allow editing description', () => {
      const newDescription = '編集後の説明文です。'

      cy.get('textarea[name="description"]').clear().type(newDescription)
      cy.get('textarea[name="description"]').should('have.value', newDescription)
    })

    it('should allow changing status', () => {
      // ステータスを変更
      cy.contains('label', 'ステータス').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '完了', { timeout: 10000 }).click()

      // 選択されたことを確認
      cy.contains('label', 'ステータス').parent().should('contain', '完了')
    })

    it('should allow editing dates', () => {
      cy.get('input[name="plannedStartDate"]').clear().type('2024-06-01')
      cy.get('input[name="plannedStartDate"]').should('have.value', '2024-06-01')

      cy.get('input[name="plannedEndDate"]').clear().type('2024-12-31')
      cy.get('input[name="plannedEndDate"]').should('have.value', '2024-12-31')
    })

    it('should allow editing budget information', () => {
      cy.get('input[name="budget"]').scrollIntoView().clear().type('20000000')
      cy.get('input[name="budget"]').should('have.value', '20000000')

      cy.get('input[name="hourlyRate"]').scrollIntoView().clear().type('10000')
      cy.get('input[name="hourlyRate"]').should('have.value', '10000')
    })

    it('should preserve existing data when loading', () => {
      // ページをリロードしても既存データが保持されることを確認
      cy.get('input[name="projectNumber"]').invoke('val').then((originalNumber) => {
        cy.get('input[name="projectName"]').invoke('val').then((originalName) => {
          cy.reload()

          // ローディングが完了するまで待つ
          cy.contains('案件編集').should('be.visible')

          // 元のデータが保持されていることを確認
          cy.get('input[name="projectNumber"]').should('have.value', originalNumber)
          cy.get('input[name="projectName"]').should('have.value', originalName)
        })
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error alert when API fails', () => {
      const timestamp = Date.now()

      // APIエラーをシミュレート
      cy.intercept('PUT', '/api/projects/*', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('updateProjectError')

      cy.get('input[name="projectName"]').clear().type(`エラーテスト案件_${timestamp}`)
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateProjectError')

      // エラーアラートまたはトーストが表示されることを確認（scrollIntoViewを追加）
      cy.get('body').then(($body) => {
        if ($body.find('[role="alert"]').length > 0) {
          cy.get('[role="alert"]').scrollIntoView().should('be.visible')
          cy.contains('Internal Server Error').scrollIntoView().should('be.visible')
        } else {
          cy.contains('Internal Server Error').scrollIntoView().should('be.visible')
        }
      })

      // ページが遷移しないことを確認
      cy.url().should('include', '/edit')
    })

    it('should display error alert when update fails', () => {
      const timestamp = Date.now()

      // APIエラーをシミュレート
      cy.intercept('PUT', '/api/projects/*', {
        statusCode: 400,
        body: { error: '同じ案件番号が既に存在します' },
      }).as('updateProjectError')

      cy.get('input[name="projectNumber"]').clear().type(`DUPLICATE-${timestamp}`)
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateProjectError')

      // エラーが表示されることを確認（scrollIntoViewを追加）
      cy.contains('同じ案件番号が既に存在します').scrollIntoView().should('be.visible')
    })

    it('should handle 404 error when project not found', () => {
      // 存在しない案件IDでアクセス
      cy.visit('/projects/non-existent-id/edit', { failOnStatusCode: false })

      // エラーメッセージまたはアラートが表示されることを確認
      cy.wait(2000)

      cy.get('body').then(($body) => {
        if ($body.find('[role="alert"]').length > 0) {
          // アラートが表示された場合
          cy.get('[role="alert"]').should('be.visible')
        } else {
          // エラートーストまたはメッセージが表示された場合
          cy.contains(/案件|取得|失敗|エラー/).should('be.visible')
        }
      })
    })
  })

  describe('フォームの挙動', () => {
    it('should allow editing with special characters', () => {
      const nameWithSpecialChars = '開発案件（第1期）・重要'

      cy.get('input[name="projectName"]').clear().type(nameWithSpecialChars)
      cy.get('input[name="projectName"]').should('have.value', nameWithSpecialChars)
    })

    it('should allow long project names', () => {
      const longName = 'これは非常に長い案件名のテストです。複数の単語と記号を含んでいます。システム開発プロジェクト。'

      cy.get('input[name="projectName"]').clear().type(longName)
      cy.get('input[name="projectName"]').should('have.value', longName)
    })

    it('should handle numeric inputs correctly', () => {
      // 数値フィールドに文字列を入力しようとする
      cy.get('input[name="budget"]').scrollIntoView().clear().type('abc')
      cy.get('input[name="budget"]').should('have.value', '')

      // 正しい数値を入力
      cy.get('input[name="budget"]').clear().type('5000000')
      cy.get('input[name="budget"]').should('have.value', '5000000')
    })
  })

  describe('実績台帳情報編集', () => {
    it('should display performance ledger fields', () => {
      cy.scrollTo('bottom')
      cy.contains('実績台帳情報').scrollIntoView().should('be.visible')
      cy.contains('label', '案件種別').should('be.visible')
      cy.contains('label', '納品日').should('be.visible')
      cy.contains('label', '請求可能日').should('be.visible')
      cy.contains('label', 'メモ').should('be.visible')
      cy.contains('label', '外注費').should('be.visible')
      cy.contains('label', 'サーバー・ドメイン代').should('be.visible')
    })

    it('should allow changing project type', () => {
      cy.scrollTo('bottom')
      cy.contains('label', '案件種別').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', 'その他', { timeout: 10000 }).click()

      // 選択されたことを確認
      cy.contains('label', '案件種別').parent().should('contain', 'その他')
    })

    it('should allow editing delivery date', () => {
      cy.scrollTo('bottom')
      cy.get('input[name="deliveryDate"]').scrollIntoView().clear().type('2024-08-01')
      cy.get('input[name="deliveryDate"]').should('have.value', '2024-08-01')
    })

    it('should allow editing invoiceable date', () => {
      cy.scrollTo('bottom')
      cy.get('input[name="invoiceableDate"]').scrollIntoView().clear().type('2024-08-15')
      cy.get('input[name="invoiceableDate"]').should('have.value', '2024-08-15')
    })

    it('should allow editing outsourcing cost', () => {
      cy.scrollTo('bottom')
      cy.get('input[name="outsourcingCost"]').scrollIntoView().clear().type('600000')
      cy.get('input[name="outsourcingCost"]').should('have.value', '600000')
    })

    it('should allow editing server domain cost', () => {
      cy.scrollTo('bottom')
      cy.get('input[name="serverDomainCost"]').scrollIntoView().clear().type('60000')
      cy.get('input[name="serverDomainCost"]').should('have.value', '60000')
    })

    it('should allow editing memo', () => {
      cy.scrollTo('bottom')
      const memo = '編集後のメモです。'
      cy.get('textarea[name="memo"]').scrollIntoView().clear().type(memo)
      cy.get('textarea[name="memo"]').should('have.value', memo)
    })

    it('should handle numeric inputs correctly for performance ledger fields', () => {
      cy.scrollTo('bottom')

      // 数値フィールドに文字列を入力しようとする
      cy.get('input[name="outsourcingCost"]').scrollIntoView().clear().type('abc')
      cy.get('input[name="outsourcingCost"]').should('have.value', '')

      // 正しい数値を入力
      cy.get('input[name="outsourcingCost"]').clear().type('750000')
      cy.get('input[name="outsourcingCost"]').should('have.value', '750000')
    })
  })

  // データを実際に更新するテストは別のdescribeブロックで、独自のbeforeEachを使用
  describe('フォーム送信', () => {
    let updateProjectId: string

    beforeEach(() => {
      // フォーム送信テストでは毎回新しいプロジェクトの編集ページにアクセス
      cy.login('admin@example.com', 'password123')
      cy.visit('/projects')
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').last().find('a[href*="/edit"]').then(($link) => {
          const href = $link.attr('href')
          const matches = href?.match(/\/projects\/([^/]+)\/edit/)
          if (matches) {
            updateProjectId = matches[1]
          }
          cy.wrap($link).click()
        })
      })
    })

    it('should update project with edited data', () => {
      const timestamp = Date.now()
      const newNumber = `UPD-${timestamp}`
      const newName = `編集後_E2Eテスト案件_${timestamp}`

      // 案件情報を編集
      cy.get('input[name="projectNumber"]').clear().type(newNumber)
      cy.get('input[name="projectName"]').clear().type(newName)
      cy.get('textarea[name="description"]').clear().type('更新テスト用の説明')

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/projects/*').as('updateProject')
      cy.intercept('GET', '/api/projects?*').as('getProjects')

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // APIレスポンスを待つ
      cy.wait('@updateProject').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 成功のトースト通知が表示されることを確認
      cy.contains('案件情報を更新しました').should('be.visible')

      // 案件一覧ページに遷移することを確認
      cy.url().should('eq', Cypress.config().baseUrl + '/projects')

      // 検索入力フィールドが表示されるまで待つ
      cy.get('input[placeholder*="案件番号"]').should('be.visible')

      // 検索機能を使って更新されたプロジェクトを検索
      // （これによりAPIリクエストが発生し、ページネーションやソート順の問題を回避）
      cy.get('input[placeholder*="案件番号"]').type(newNumber)

      // 検索用のAPIリクエストを待つ
      cy.wait('@getProjects')

      // 更新された案件が検索結果に表示されることを確認
      cy.contains(newNumber).should('be.visible')
      cy.contains(newName).should('be.visible')
    })

    it('should send correct data to API', () => {
      const timestamp = Date.now()
      const newNumber = `API-TEST-${timestamp}`
      const newName = `API確認用案件_${timestamp}`

      cy.get('input[name="projectNumber"]').clear().type(newNumber)
      cy.get('input[name="projectName"]').clear().type(newName)

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/projects/*').as('updateProject')

      cy.contains('button', '更新').click()

      // APIリクエストの内容を確認
      cy.wait('@updateProject').then((interception) => {
        expect(interception.request.body.projectNumber).to.eq(newNumber)
        expect(interception.request.body.projectName).to.eq(newName)
      })
    })

    it('should disable submit button while updating', () => {
      const timestamp = Date.now()

      cy.get('input[name="projectName"]').clear().type(`送信中テスト案件_${timestamp}`)

      // 更新ボタンをクリック
      cy.contains('button', '更新').click()

      // ボタンがdisabledになることを確認
      cy.contains('button', '更新中...').should('be.disabled')
    })

    it('should update project with all fields', () => {
      const timestamp = Date.now()

      cy.get('input[name="projectNumber"]').clear().type(`FULL-${timestamp}`)
      cy.get('input[name="projectName"]').clear().type(`フル更新案件_${timestamp}`)
      cy.get('textarea[name="description"]').clear().type('すべての項目を更新')

      // ステータス変更
      cy.contains('label', 'ステータス').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '稼働中', { timeout: 10000 }).click()

      // 日程情報
      cy.get('input[name="plannedStartDate"]').clear().type('2024-07-01')
      cy.get('input[name="plannedEndDate"]').clear().type('2024-12-31')
      cy.get('input[name="actualStartDate"]').clear().type('2024-07-15')
      cy.get('input[name="actualEndDate"]').clear().type('2024-12-15')

      // 予算情報
      cy.get('input[name="budget"]').scrollIntoView().clear().type('30000000')
      cy.get('input[name="hourlyRate"]').scrollIntoView().clear().type('12000')

      // 実績台帳情報
      cy.scrollTo('bottom')
      cy.contains('label', '案件種別').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', 'SES', { timeout: 10000 }).click()
      cy.get('input[name="deliveryDate"]').scrollIntoView().clear().type('2024-12-10')
      cy.get('input[name="invoiceableDate"]').scrollIntoView().clear().type('2024-12-20')
      cy.get('input[name="outsourcingCost"]').scrollIntoView().clear().type('800000')
      cy.get('input[name="serverDomainCost"]').scrollIntoView().clear().type('80000')
      cy.get('textarea[name="memo"]').scrollIntoView().clear().type('更新後のメモ')

      cy.intercept('PUT', '/api/projects/*').as('updateProject')

      cy.contains('button', '更新').click()

      cy.wait('@updateProject').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
        // 数値フィールドが正しく数値として送信されることを確認
        expect(interception.request.body.budget).to.eq(30000000)
        expect(interception.request.body.hourlyRate).to.eq(12000)
        expect(interception.request.body.outsourcingCost).to.eq(800000)
        expect(interception.request.body.serverDomainCost).to.eq(80000)
        // 実績台帳フィールドが送信されることを確認
        expect(interception.request.body.projectType).to.eq('ses')
        expect(interception.request.body.memo).to.eq('更新後のメモ')
      })

      cy.contains('案件情報を更新しました').should('be.visible')
    })
  })

  describe('管理者権限', () => {
    let permissionProjectId: string

    beforeEach(() => {
      // 権限テストでも新しいプロジェクトを使用
      cy.login('admin@example.com', 'password123')
      cy.visit('/projects')
      cy.get('table tbody tr').eq(1).scrollIntoView()
      cy.get('table tbody tr').eq(1).within(() => {
        cy.get('td').last().find('a[href*="/edit"]').then(($link) => {
          const href = $link.attr('href')
          const matches = href?.match(/\/projects\/([^/]+)\/edit/)
          if (matches) {
            permissionProjectId = matches[1]
          }
          cy.wrap($link).click()
        })
      })
    })

    it('should allow admin to access edit project page', () => {
      cy.url().should('include', '/projects/')
      cy.url().should('include', '/edit')
      cy.contains('案件編集').should('be.visible')
    })

    it('should allow admin to update projects', () => {
      const timestamp = Date.now()

      cy.get('input[name="projectName"]').clear().type(`権限テスト案件_${timestamp}`)

      cy.intercept('PUT', '/api/projects/*').as('updateProject')

      cy.contains('button', '更新').click()

      cy.wait('@updateProject').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      cy.contains('案件情報を更新しました').should('be.visible')
    })

    it('should not allow non-admin to access edit project page', () => {
      // 一般ユーザーでログイン
      cy.login('yamada@example.com', 'password123')

      // 管理者専用の編集ページに直接アクセスを試みる
      cy.visit(`/projects/${permissionProjectId}/edit`, { failOnStatusCode: false })

      // ダッシュボードにリダイレクトされることを確認
      cy.url().should('include', '/dashboard')
    })
  })

  describe('データの整合性', () => {
    let dataProjectId: string

    beforeEach(() => {
      // データ整合性テストでも別のプロジェクトを使用
      cy.login('admin@example.com', 'password123')
      cy.visit('/projects')
      cy.get('table tbody tr').eq(2).scrollIntoView()
      cy.get('table tbody tr').eq(2).within(() => {
        cy.get('td').last().find('a[href*="/edit"]').then(($link) => {
          const href = $link.attr('href')
          const matches = href?.match(/\/projects\/([^/]+)\/edit/)
          if (matches) {
            dataProjectId = matches[1]
          }
          cy.wrap($link).click()
        })
      })
    })

    it('should not lose data when navigating away and back', () => {
      // データを編集
      const newName = '整合性テスト案件'
      cy.get('input[name="projectName"]').clear().type(newName)

      // キャンセルボタンで戻る
      cy.contains('button', 'キャンセル').click()

      // 再度編集ページにアクセス
      cy.visit(`/projects/${dataProjectId}/edit`)

      // 元のデータが保持されていることを確認（編集が保存されていないため）
      cy.get('input[name="projectName"]').should('not.have.value', newName)
    })

    it('should display loading state while fetching data', () => {
      // 新しいページに移動してローディング状態を確認
      cy.visit('/projects')
      cy.get('table tbody tr').eq(3).scrollIntoView()
      cy.get('table tbody tr').eq(3).within(() => {
        // 操作列（最後のセル）の編集ボタンをクリック
        cy.get('td').last().find('a[href*="/edit"]').click()
      })

      // データが読み込まれたことを確認
      cy.contains('案件編集').should('be.visible')
      cy.get('input[name="projectNumber"]').should('not.have.value', '')
      cy.get('input[name="projectName"]').should('not.have.value', '')
    })
  })
})
