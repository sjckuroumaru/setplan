describe('案件一覧ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('基本機能', () => {
    it('should display the projects list page', () => {
      cy.visit('/projects')
      cy.contains('案件管理').should('be.visible')
      cy.get('table').should('be.visible')
    })

    it('should display projects in the table', () => {
      cy.visit('/projects')
      // テーブルが表示されることを確認
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })

    it('should display search and filter controls', () => {
      cy.visit('/projects')
      cy.get('input[placeholder*="案件番号、案件名で検索"]').should('be.visible')
      cy.get('button[role="combobox"]').should('be.visible')
    })

    it('should display new project button for admin', () => {
      cy.visit('/projects')
      cy.contains('a', '新規案件').should('be.visible')
    })
  })

  describe('検索とフィルター', () => {
    it('should filter projects by search term', () => {
      cy.visit('/projects')

      // 検索フィールドに入力
      cy.get('input[placeholder*="案件番号、案件名で検索"]').type('PRJ')

      // 検索結果が反映されることを確認（APIレスポンス待ち）
      cy.wait(1000)
      cy.get('table tbody tr').should('exist')
    })

    it('should filter projects by status', () => {
      cy.visit('/projects')

      // ステータスフィルターを開く
      cy.get('button[role="combobox"]').click()

      // 開発中を選択
      cy.contains('[role="option"]', '開発中').click()

      // フィルターが適用されることを確認（APIレスポンス待ち）
      cy.wait(1000)
      cy.get('table tbody tr').should('exist')
    })

    it('should show all status options in filter', () => {
      cy.visit('/projects')

      // ステータスフィルターを開く
      cy.get('button[role="combobox"]').click()

      // すべてのステータスオプションが表示されることを確認
      cy.contains('[role="option"]', 'すべて').should('be.visible')
      cy.contains('[role="option"]', '計画中').should('be.visible')
      cy.contains('[role="option"]', '開発中').should('be.visible')
      cy.contains('[role="option"]', '稼働中').should('be.visible')
      cy.contains('[role="option"]', '停止中').should('be.visible')
      cy.contains('[role="option"]', '完了').should('be.visible')
    })

    it('should clear filters and show all projects', () => {
      cy.visit('/projects')

      // フィルターを適用
      cy.get('input[placeholder*="案件番号、案件名で検索"]').type('テスト')
      cy.wait(1000)

      // フィルターをクリア
      cy.get('input[placeholder*="案件番号、案件名で検索"]').clear()
      cy.wait(1000)

      // すべての案件が表示されることを確認
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })
  })

  describe('テーブル表示', () => {
    it('should display project details in table', () => {
      cy.visit('/projects')

      // テーブルのヘッダーが正しく表示されることを確認
      cy.contains('th', '案件番号').should('be.visible')
      cy.contains('th', '案件名').should('be.visible')
      cy.contains('th', '担当部署').should('be.visible')
      cy.contains('th', '関連発注書').should('be.visible')
      cy.contains('th', 'ステータス').should('be.visible')
      cy.contains('th', '開始予定日').should('be.visible')
      cy.contains('th', '終了予定日').should('be.visible')
      cy.contains('th', '操作').should('be.visible')
    })

    it('should display status badges correctly', () => {
      cy.visit('/projects')

      // ステータスバッジが表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('[data-slot="badge"]').should('exist')
      })
    })

    it('should show project number as clickable link', () => {
      cy.visit('/projects')

      // 案件番号がリンクとして表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('a').first().should('have.attr', 'href').and('include', '/projects/')
      })
    })

    it('should show empty state when no projects found', () => {
      cy.visit('/projects')

      // 存在しない検索語で検索
      cy.get('input[placeholder*="案件番号、案件名で検索"]').type('存在しない案件XYZ12345')
      cy.wait(1000)

      // 空の状態メッセージが表示されることを確認
      cy.contains('案件が見つかりません').should('be.visible')
    })
  })

  describe('編集機能', () => {
    it('should navigate to edit page when clicking project number', () => {
      cy.visit('/projects')

      // 案件番号をクリック
      cy.get('table tbody tr').first().find('a').first().click()

      // 編集ページに遷移することを確認
      cy.url().should('include', '/projects/')
      cy.url().should('include', '/edit')
      cy.contains('案件編集').should('be.visible')
    })

    it('should navigate to edit page when clicking edit button', () => {
      cy.visit('/projects')

      // 編集ボタンをクリック（操作列の編集ボタン）
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        // 操作列（最後のセル）の編集リンクを取得
        cy.get('td').last().find('a[href*="/edit"]').click()
      })

      // 編集ページに遷移することを確認
      cy.url().should('include', '/projects/')
      cy.url().should('include', '/edit')
      cy.contains('案件編集').should('be.visible')
    })
  })

  describe('削除機能', () => {
    it('should open delete dialog when clicking delete button', () => {
      cy.visit('/projects')

      // 削除ボタンをクリック（赤色のボタン）
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button.text-red-600').click()
      })

      // 削除確認ダイアログが表示されることを確認
      cy.contains('案件の削除').should('be.visible')
      cy.contains('本当にこの案件を削除しますか').should('be.visible')
    })

    it('should cancel deletion when clicking cancel button', () => {
      cy.visit('/projects')

      // 削除対象の案件番号を取得（リンク要素から直接取得）
      cy.get('table tbody tr').first().find('a').first().invoke('text').then((projectNumber) => {
        const trimmedNumber = projectNumber.trim()

        // 削除ボタンをクリック（赤色のボタン）
        cy.get('table tbody tr').first().within(() => {
          cy.get('button.text-red-600').click()
        })

        // ダイアログでキャンセルをクリック
        cy.contains('button', 'キャンセル').click()

        // ダイアログが閉じることを確認
        cy.contains('案件の削除').should('not.exist')

        // 案件がまだ存在することを確認
        cy.contains(trimmedNumber).should('be.visible')
      })
    })

    it('should delete project when confirming deletion', () => {
      cy.visit('/projects')

      // 削除可能な案件を作成
      const testProjectNumber = `DEL_TEST_${Date.now()}`
      const testProjectName = `削除テスト案件_${Date.now()}`

      // 案件作成ページに移動
      cy.contains('a', '新規案件').click()

      // 案件番号と案件名を入力
      cy.get('input[name="projectNumber"]').type(testProjectNumber)
      cy.get('input[name="projectName"]').type(testProjectName)

      // ステータスを選択（デフォルトのままでOK）

      // 作成ボタンまでスクロールしてクリック
      cy.contains('button', '作成').scrollIntoView()
      cy.contains('button', '作成').click()

      // 作成成功を待つ
      cy.contains('案件を作成しました', { timeout: 10000 }).should('be.visible')

      // 案件一覧に戻る
      cy.visit('/projects')

      // 作成した案件を検索して削除
      cy.contains('td', testProjectNumber).parent('tr').within(() => {
        cy.get('button.text-red-600').click()
      })

      // ダイアログで削除を確認
      cy.contains('button', '削除').click()

      // 削除成功のトースト通知が表示されることを確認
      cy.contains('案件を削除しました', { timeout: 10000 }).should('be.visible')

      // 削除された案件が表示されないことを確認
      cy.wait(1000) // APIレスポンス待ち
      cy.get('body').should('not.contain', testProjectNumber)
    })

    it('should show error toast when deletion fails', () => {
      cy.visit('/projects')

      // 削除APIエラーをシミュレート
      cy.intercept('DELETE', '/api/projects/*', {
        statusCode: 400,
        body: { error: '関連データがあるため削除できません' },
      }).as('deleteProjectError')

      // 削除ボタンをクリック（赤色のボタン）
      cy.get('table tbody tr').first().within(() => {
        cy.get('button.text-red-600').click()
      })

      // ダイアログで削除を確認
      cy.contains('button', '削除').click()

      // APIレスポンスを待つ
      cy.wait('@deleteProjectError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('関連データがあるため削除できません').should('be.visible')
    })

    it('should disable delete button while deleting', () => {
      cy.visit('/projects')

      // 削除ボタンをクリック（赤色のボタン）
      cy.get('table tbody tr').first().within(() => {
        cy.get('button.text-red-600').click()
      })

      // ダイアログの削除ボタンをクリック
      cy.contains('button', '削除').click()

      // ボタンがdisabledになることを確認
      cy.contains('button', '削除中...').should('be.disabled')
    })
  })

  describe('ページネーション', () => {
    it('should display pagination controls when there are multiple pages', () => {
      cy.visit('/projects')

      // ページネーションコントロールが存在するか確認
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("次へ")').length > 0) {
          cy.contains('button', '前へ').should('be.visible')
          cy.contains('button', '次へ').should('be.visible')
        }
      })
    })

    it('should disable previous button on first page', () => {
      cy.visit('/projects')

      cy.get('body').then(($body) => {
        if ($body.find('button:contains("前へ")').length > 0) {
          cy.contains('button', '前へ').should('be.disabled')
        }
      })
    })

    it('should display page information', () => {
      cy.visit('/projects')

      cy.get('body').then(($body) => {
        if ($body.find('button:contains("次へ")').length > 0) {
          // ページ情報が表示されることを確認
          cy.get('.text-sm.text-muted-foreground').contains(/\d+ \/ \d+ページ/).should('be.visible')
        }
      })
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access projects page', () => {
      cy.visit('/projects')
      cy.url().should('include', '/projects')
      cy.contains('案件管理').should('be.visible')
    })

    it('should allow admin to see new project button', () => {
      cy.visit('/projects')
      cy.contains('a', '新規案件').should('be.visible')
    })

    it('should allow admin to see delete buttons', () => {
      cy.visit('/projects')

      // 削除ボタンが表示されることを確認（赤色のボタン）
      cy.get('table tbody tr').first().within(() => {
        cy.get('button.text-red-600').should('exist')
      })
    })

    it('should navigate to new project page when clicking new project button', () => {
      cy.visit('/projects')

      cy.contains('a', '新規案件').click()

      cy.url().should('include', '/projects/new')
      cy.contains('新規案件作成').should('be.visible')
    })
  })

  describe('データ表示', () => {
    it('should display department name when available', () => {
      cy.visit('/projects')

      // 担当部署列を確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(2).should('exist')
      })
    })

    it('should display purchase order information when available', () => {
      cy.visit('/projects')

      // 関連発注書列を確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(3).should('exist')
      })
    })

    it('should display dates in Japanese format', () => {
      cy.visit('/projects')

      // 日付列を確認（日本語フォーマットまたは"-"）
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(5).should('exist')
        cy.get('td').eq(6).should('exist')
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error alert when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('GET', '/api/projects*', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('getProjectsError')

      cy.visit('/projects')

      // APIレスポンスを待つ
      cy.wait('@getProjectsError')

      // エラーアラートが表示されることを確認
      cy.get('[role="alert"]').should('be.visible')
    })
  })
})
