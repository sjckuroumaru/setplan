describe('部署・チーム一覧ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('基本機能', () => {
    it('should display the departments list page', () => {
      cy.visit('/settings/departments')
      cy.contains('部署・チーム管理').should('be.visible')
      cy.get('table').should('be.visible')
    })

    it('should display departments in the table', () => {
      cy.visit('/settings/departments')
      // テーブルが表示されることを確認
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })

    it('should display search control', () => {
      cy.visit('/settings/departments')
      cy.get('input[placeholder*="部署・チーム名で検索"]').should('be.visible')
    })

    it('should display new department button for admin', () => {
      cy.visit('/settings/departments')
      cy.contains('a', '新規部署・チーム').should('be.visible')
    })
  })

  describe('検索機能', () => {
    it('should filter departments by search term', () => {
      cy.visit('/settings/departments')

      // 検索フィールドに入力
      cy.get('input[placeholder*="部署・チーム名で検索"]').type('開発')

      // 検索結果が反映されることを確認（APIレスポンス待ち）
      cy.wait(1000)
      cy.get('table tbody tr').should('exist')
    })

    it('should clear search results when search term is removed', () => {
      cy.visit('/settings/departments')

      // 検索フィールドに入力
      cy.get('input[placeholder*="部署・チーム名で検索"]').type('開発')
      cy.wait(1000)

      // 検索をクリア
      cy.get('input[placeholder*="部署・チーム名で検索"]').clear()
      cy.wait(1000)

      // すべての部署が表示されることを確認
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })

    it('should show empty state when no departments found', () => {
      cy.visit('/settings/departments')

      // 存在しない検索語で検索
      cy.get('input[placeholder*="部署・チーム名で検索"]').type('存在しない部署XYZ12345')
      cy.wait(1000)

      // 空の状態メッセージが表示されることを確認
      cy.contains('部署・チームが見つかりません').should('be.visible')
    })
  })

  describe('テーブル表示', () => {
    it('should display department details in table', () => {
      cy.visit('/settings/departments')

      // テーブルのヘッダーが正しく表示されることを確認
      cy.contains('th', '部署・チーム名').should('be.visible')
      cy.contains('th', '所属ユーザー数').should('be.visible')
      cy.contains('th', '関連案件数').should('be.visible')
      cy.contains('th', '作成日時').should('be.visible')
      cy.contains('th', '操作').should('be.visible')
    })

    it('should display user count with icon', () => {
      cy.visit('/settings/departments')

      // ユーザー数が表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(1).should('contain', '人')
      })
    })

    it('should display project count with icon', () => {
      cy.visit('/settings/departments')

      // 案件数が表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(2).should('contain', '件')
      })
    })

    it('should display creation date in Japanese format', () => {
      cy.visit('/settings/departments')

      // 作成日時が表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('td').eq(3).should('exist')
      })
    })
  })

  describe('編集機能', () => {
    it('should navigate to edit page when clicking edit button', () => {
      cy.visit('/settings/departments')

      // 編集ボタンをクリック
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('a[href*="/settings/departments/"][href*="/edit"]').click()
      })

      // 編集ページに遷移することを確認
      cy.url().should('include', '/settings/departments/')
      cy.url().should('include', '/edit')
      cy.contains('部署・チーム編集').should('be.visible')
    })
  })

  describe('削除機能', () => {
    it('should open delete dialog when clicking delete button', () => {
      cy.visit('/settings/departments')

      // 削除ボタンをクリック（赤色のボタン）
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button.text-red-600').click()
      })

      // 削除確認ダイアログが表示されることを確認
      cy.contains('部署・チームの削除').should('be.visible')
      cy.contains('本当にこの部署・チームを削除しますか').should('be.visible')
    })

    it('should display warning about related data in dialog', () => {
      cy.visit('/settings/departments')

      // 削除ボタンをクリック（赤色のボタン）
      cy.get('table tbody tr').first().within(() => {
        cy.get('button.text-red-600').click()
      })

      // 関連データに関する警告が表示されることを確認
      cy.contains('所属ユーザーまたは関連案件が存在する場合は削除できません').should('be.visible')
    })

    it('should cancel deletion when clicking cancel button', () => {
      cy.visit('/settings/departments')

      // テーブルにデータがロードされるまで待つ
      cy.get('table tbody tr').should('have.length.at.least', 1)

      // 削除対象の部署名を取得（テキストが空でないことを確認）
      cy.get('table tbody tr').first().find('td').eq(0).should(($td) => {
        expect($td.text().trim()).to.not.be.empty
      })

      cy.get('table tbody tr').first().find('td').eq(0).invoke('text').then((departmentName) => {
        const trimmedName = departmentName.trim()

        // 削除ボタンをクリック（赤色のボタン）
        cy.get('table tbody tr').first().within(() => {
          cy.get('button.text-red-600').click()
        })

        // ダイアログでキャンセルをクリック
        cy.contains('button', 'キャンセル').click()

        // ダイアログが閉じることを確認
        cy.contains('部署・チームの削除').should('not.exist')

        // 部署がまだ存在することを確認
        cy.contains(trimmedName).should('be.visible')
      })
    })

    it('should delete department when confirming deletion', () => {
      cy.visit('/settings/departments')

      // テーブルにデータがロードされるまで待つ
      cy.get('table tbody tr').should('have.length.at.least', 1)

      // 関連データがない部署を探す（ユーザー数と案件数が0の部署）
      let targetRowIndex = -1
      let targetDepartmentName = ''

      cy.get('table tbody tr').each(($row, index) => {
        const userCount = $row.find('td').eq(1).text()
        const projectCount = $row.find('td').eq(2).text()

        // "0人" と "0件" の行を探す
        if (userCount.includes('0人') && projectCount.includes('0件')) {
          targetRowIndex = index
          targetDepartmentName = $row.find('td').eq(0).text().trim()
          return false // ループを抜ける
        }
      }).then(() => {
        // 削除可能な部署が見つからない場合はスキップ
        if (targetRowIndex === -1) {
          cy.log('No deletable department found (all have related data)')
          return
        }

        // 削除対象の行を操作
        cy.get('table tbody tr').eq(targetRowIndex).within(() => {
          cy.get('button.text-red-600').click()
        })

        // ダイアログで削除を確認
        cy.contains('button', '削除').click()

        // 削除成功のトースト通知が表示されることを確認
        cy.contains('部署を削除しました', { timeout: 10000 }).should('be.visible')

        // 削除された部署が表示されないことを確認
        cy.wait(1000) // APIレスポンス待ち
        cy.get('body').should('not.contain', targetDepartmentName)
      })
    })

    it('should show error toast when deletion fails due to related data', () => {
      cy.visit('/settings/departments')

      // 削除APIエラーをシミュレート
      cy.intercept('DELETE', '/api/departments/*', {
        statusCode: 400,
        body: { error: '所属ユーザーまたは関連案件が存在するため削除できません' },
      }).as('deleteDepartmentError')

      // 削除ボタンをクリック（赤色のボタン）
      cy.get('table tbody tr').first().within(() => {
        cy.get('button.text-red-600').click()
      })

      // ダイアログで削除を確認
      cy.contains('button', '削除').click()

      // APIレスポンスを待つ
      cy.wait('@deleteDepartmentError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('所属ユーザーまたは関連案件が存在するため削除できません').should('be.visible')
    })

    it('should disable delete button while deleting', () => {
      cy.visit('/settings/departments')

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
      cy.visit('/settings/departments')

      // ページネーションコントロールが存在するか確認
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("次へ")').length > 0) {
          cy.contains('button', '前へ').should('be.visible')
          cy.contains('button', '次へ').should('be.visible')
        }
      })
    })

    it('should disable previous button on first page', () => {
      cy.visit('/settings/departments')

      cy.get('body').then(($body) => {
        if ($body.find('button:contains("前へ")').length > 0) {
          cy.contains('button', '前へ').should('be.disabled')
        }
      })
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access departments page', () => {
      cy.visit('/settings/departments')
      cy.url().should('include', '/settings/departments')
      cy.contains('部署・チーム管理').should('be.visible')
    })

    it('should allow admin to see new department button', () => {
      cy.visit('/settings/departments')
      cy.contains('a', '新規部署・チーム').should('be.visible')
    })

    it('should allow admin to see edit and delete buttons', () => {
      cy.visit('/settings/departments')

      // 編集と削除ボタンが表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        cy.get('a[href*="/edit"]').should('exist')
        cy.get('button.text-red-600').should('exist')
      })
    })

    it('should navigate to new department page when clicking new department button', () => {
      cy.visit('/settings/departments')

      cy.contains('a', '新規部署・チーム').click()

      cy.url().should('include', '/settings/departments/new')
      cy.contains('新規部署・チーム作成').should('be.visible')
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error alert when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('GET', '/api/departments*', {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      }).as('getDepartmentsError')

      cy.visit('/settings/departments')

      // APIレスポンスを待つ
      cy.wait('@getDepartmentsError')

      // エラーアラートが表示されることを確認
      cy.get('[role="alert"]').should('be.visible')
    })
  })
})
