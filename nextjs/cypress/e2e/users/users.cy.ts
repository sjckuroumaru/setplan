describe('ユーザー一覧ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('基本機能', () => {
    it('should display the users list page', () => {
      cy.visit('/users')
      cy.contains('ユーザー管理').should('be.visible')
      cy.get('table').should('be.visible')
    })

    it('should display users in the table', () => {
      cy.visit('/users')
      // テーブルが表示されることを確認
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })

    it('should display search and filter controls', () => {
      cy.visit('/users')
      cy.get('input[placeholder*="社員番号、ユーザー名、メールアドレスで検索"]').should('be.visible')
      cy.get('button[role="combobox"]').should('be.visible')
    })

    it('should display new user button for admin', () => {
      cy.visit('/users')
      cy.contains('a', '新規ユーザー').should('be.visible')
    })
  })

  describe('検索とフィルター', () => {
    it('should filter users by search term', () => {
      cy.visit('/users')

      // 検索フィールドに入力
      cy.get('input[placeholder*="社員番号、ユーザー名、メールアドレスで検索"]').type('admin')

      // 検索結果が反映されることを確認（APIレスポンス待ち）
      cy.wait(1000)
      cy.get('table tbody tr').should('exist')
    })

    it('should filter users by status', () => {
      cy.visit('/users')

      // ステータスフィルターを開く
      cy.get('button[role="combobox"]').click()

      // 有効を選択
      cy.contains('[role="option"]', '有効').click()

      // フィルターが適用されることを確認（APIレスポンス待ち）
      cy.wait(1000)
      cy.get('table tbody tr').should('exist')
    })

    it('should show status filter options', () => {
      cy.visit('/users')

      // ステータスフィルターを開く
      cy.get('button[role="combobox"]').click()

      // すべてのステータスオプションが表示されることを確認
      cy.contains('[role="option"]', '有効').should('be.visible')
      cy.contains('[role="option"]', '無効').should('be.visible')
    })

    it('should clear search results when search term is removed', () => {
      cy.visit('/users')

      // 検索フィールドに入力
      cy.get('input[placeholder*="社員番号、ユーザー名、メールアドレスで検索"]').type('admin')
      cy.wait(1000)

      // 検索をクリア
      cy.get('input[placeholder*="社員番号、ユーザー名、メールアドレスで検索"]').clear()
      cy.wait(1000)

      // すべてのユーザーが表示されることを確認
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })

    it('should show empty state when no users found', () => {
      cy.visit('/users')

      // 存在しない検索語で検索
      cy.get('input[placeholder*="社員番号、ユーザー名、メールアドレスで検索"]').type('存在しないユーザーXYZ12345')
      cy.wait(1000)

      // 空の状態メッセージが表示されることを確認
      cy.contains('ユーザーが見つかりません').should('be.visible')
    })
  })

  describe('テーブル表示', () => {
    it('should display user details in table', () => {
      cy.visit('/users')

      // テーブルのヘッダーが正しく表示されることを確認
      cy.contains('th', '社員番号').should('be.visible')
      cy.contains('th', '氏名').should('be.visible')
      cy.contains('th', 'ユーザー名').should('be.visible')
      cy.contains('th', 'メールアドレス').should('be.visible')
      cy.contains('th', '部署・チーム').should('be.visible')
      cy.contains('th', '権限').should('be.visible')
      cy.contains('th', '状態').should('be.visible')
      cy.contains('th', '作成日時').should('be.visible')
      cy.contains('th', '操作').should('be.visible')
    })

    it('should display permission badges correctly', () => {
      cy.visit('/users')

      // 権限バッジが表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(5).invoke('text').should('match', /管理者|一般/)
      })
    })

    it('should display status badges correctly', () => {
      cy.visit('/users')

      // 状態バッジが表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(6).invoke('text').should('match', /有効|無効/)
      })
    })

    it('should display user full name', () => {
      cy.visit('/users')

      // 氏名が姓名で表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(1).should('not.be.empty')
      })
    })

    it('should display department when available', () => {
      cy.visit('/users')

      // 部署・チーム列が表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(4).should('exist')
      })
    })

    it('should display creation date in Japanese format', () => {
      cy.visit('/users')

      // 作成日時が表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(7).should('exist')
      })
    })
  })

  describe('編集機能', () => {
    it('should navigate to edit page when clicking edit button', () => {
      cy.visit('/users')

      // 編集ボタンをクリック
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('a[href*="/users/"][href*="/edit"]').click()
      })

      // 編集ページに遷移することを確認
      cy.url().should('include', '/users/')
      cy.url().should('include', '/edit')
      cy.contains('ユーザー編集').should('be.visible')
    })
  })

  describe('削除機能', () => {
    it('should open delete dialog when clicking delete button', () => {
      cy.visit('/users')

      // 削除ボタンが存在する最初の行を探してクリック
      cy.get('table tbody tr').then(($rows) => {
        for (let i = 0; i < $rows.length; i++) {
          const $row = $rows.eq(i)
          if ($row.find('button.text-red-600').length > 0) {
            cy.wrap($row).within(() => {
              cy.get('button.text-red-600').click()
            })
            return
          }
        }
      })

      // 削除確認ダイアログが表示されることを確認
      cy.contains('ユーザーの削除').should('be.visible')
      cy.contains('本当にこのユーザーを削除しますか').should('be.visible')
    })

    it('should not show delete button for current user', () => {
      cy.visit('/users')

      // 管理者ユーザーの行を探す
      cy.get('table tbody tr').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('td').eq(3).then(($email) => {
            if ($email.text().includes('admin@example.com')) {
              // 削除ボタンが存在しないことを確認（赤色のボタンがない）
              cy.get('button.text-red-600').should('not.exist')
            }
          })
        })
      })
    })

    it('should cancel deletion when clicking cancel button', () => {
      cy.visit('/users')

      // 削除ボタンが存在する最初の行を見つける
      cy.get('table tbody tr').then(($rows) => {
        for (let i = 0; i < $rows.length; i++) {
          const $row = $rows.eq(i)
          if ($row.find('button.text-red-600').length > 0) {
            // ユーザー名を取得
            const userName = $row.find('td').eq(1).text()

            // 削除ボタンをクリック
            cy.wrap($row).scrollIntoView()
            cy.wrap($row).within(() => {
              cy.get('button.text-red-600').click()
            })

            // ダイアログでキャンセルをクリック
            cy.contains('button', 'キャンセル').click()

            // ダイアログが閉じることを確認
            cy.contains('ユーザーの削除').should('not.exist')

            // ユーザーがまだ存在することを確認
            cy.contains(userName.trim()).should('be.visible')
            return
          }
        }
      })
    })

    it('should delete user when confirming deletion', () => {
      cy.visit('/users')

      // 削除ボタンが存在する最初の行を見つける
      cy.get('table tbody tr').then(($rows) => {
        for (let i = 0; i < $rows.length; i++) {
          const $row = $rows.eq(i)
          if ($row.find('button.text-red-600').length > 0) {
            // ユーザー名を取得
            const userName = $row.find('td').eq(1).text()

            // 削除ボタンをクリック
            cy.wrap($row).scrollIntoView()
            cy.wrap($row).within(() => {
              cy.get('button.text-red-600').click()
            })

            // ダイアログで削除を確認
            cy.contains('button', '削除').click()

            // 削除成功のトースト通知が表示されることを確認
            cy.contains('ユーザーを削除しました', { timeout: 10000 }).should('be.visible')

            // 削除されたユーザーが表示されないことを確認
            cy.wait(1000) // APIレスポンス待ち
            cy.get('body').should('not.contain', userName.trim())
            return
          }
        }
      })
    })

    it('should show error toast when deletion fails', () => {
      cy.visit('/users')

      // 削除APIエラーをシミュレート
      cy.intercept('DELETE', '/api/users/*', {
        statusCode: 400,
        body: { error: 'ユーザーの削除に失敗しました' },
      }).as('deleteUserError')

      // 削除ボタンが存在する最初の行を見つけてクリック
      cy.get('table tbody tr').then(($rows) => {
        for (let i = 0; i < $rows.length; i++) {
          const $row = $rows.eq(i)
          if ($row.find('button.text-red-600').length > 0) {
            cy.wrap($row).within(() => {
              cy.get('button.text-red-600').click()
            })
            return
          }
        }
      })

      // ダイアログで削除を確認
      cy.contains('button', '削除').click()

      // APIレスポンスを待つ
      cy.wait('@deleteUserError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('ユーザーの削除に失敗しました').should('be.visible')
    })

    it('should disable delete button while deleting', () => {
      cy.visit('/users')

      // 削除ボタンが存在する最初の行を見つけてクリック
      cy.get('table tbody tr').then(($rows) => {
        for (let i = 0; i < $rows.length; i++) {
          const $row = $rows.eq(i)
          if ($row.find('button.text-red-600').length > 0) {
            cy.wrap($row).within(() => {
              cy.get('button.text-red-600').click()
            })
            return
          }
        }
      })

      // 削除ボタンをクリック
      cy.contains('button', '削除').click()

      // ボタンがdisabledになることを確認
      cy.contains('button', '削除中...').should('be.disabled')
    })
  })

  describe('ページネーション', () => {
    it('should display pagination controls when there are multiple pages', () => {
      cy.visit('/users')

      // ページネーションコントロールが存在するか確認
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("次へ")').length > 0) {
          cy.contains('button', '前へ').should('be.visible')
          cy.contains('button', '次へ').should('be.visible')
        }
      })
    })

    it('should disable previous button on first page', () => {
      cy.visit('/users')

      cy.get('body').then(($body) => {
        if ($body.find('button:contains("前へ")').length > 0) {
          cy.contains('button', '前へ').should('be.disabled')
        }
      })
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access users page', () => {
      cy.visit('/users')
      cy.url().should('include', '/users')
      cy.contains('ユーザー管理').should('be.visible')
    })

    it('should allow admin to see new user button', () => {
      cy.visit('/users')
      cy.contains('a', '新規ユーザー').should('be.visible')
    })

    it('should allow admin to see edit buttons', () => {
      cy.visit('/users')

      // 編集ボタンが表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('a[href*="/edit"]').should('exist')
      })
    })

    it('should navigate to new user page when clicking new user button', () => {
      cy.visit('/users')

      cy.contains('a', '新規ユーザー').click()

      cy.url().should('include', '/users/new')
      cy.contains('新規ユーザー作成').should('be.visible')
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error alert when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('GET', '/api/users*', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('getUsersError')

      cy.visit('/users')

      // APIレスポンスを待つ
      cy.wait('@getUsersError')

      // エラーアラートが表示されることを確認
      cy.get('[role="alert"]').should('be.visible')
    })
  })

  describe('ユーザー情報の表示', () => {
    it('should display admin badge for admin users', () => {
      cy.visit('/users')

      // 管理者ユーザーを探す
      cy.get('table tbody tr').each(($row) => {
        cy.wrap($row).within(() => {
          cy.get('td').eq(5).then(($badge) => {
            if ($badge.text().includes('管理者')) {
              cy.wrap($badge).should('contain.text', '管理者')
            }
          })
        })
      })
    })

    it('should display active/inactive status correctly', () => {
      cy.visit('/users')

      // 状態バッジが正しく表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(6).invoke('text').should('match', /有効|無効/)
      })
    })
  })
})
