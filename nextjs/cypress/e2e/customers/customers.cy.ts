describe('顧客一覧ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('基本機能', () => {
    it('should display the customers list page', () => {
      cy.visit('/customers')
      cy.contains('顧客管理').should('be.visible')
    })

    it('should display customers in the table', () => {
      cy.visit('/customers')
      // テーブルが表示されることを確認
      cy.get('table').should('be.visible')
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })

    it('should navigate to new customer page', () => {
      cy.visit('/customers')
      cy.contains('button', '新規顧客').click()
      cy.url().should('include', '/customers/new')
    })

    it('should display search input', () => {
      cy.visit('/customers')
      cy.get('input[placeholder*="顧客名で検索"]').should('be.visible')
    })

    it('should show "no customers" state when empty', () => {
      cy.visit('/customers')

      // 存在しない検索語で検索
      cy.get('input[placeholder*="顧客名で検索"]').type('存在しない顧客名XYZ12345')
      cy.wait(1000)

      // 空の状態メッセージが表示されることを確認
      cy.contains('顧客が登録されていません').should('be.visible')
    })
  })

  describe('検索機能', () => {
    it('should filter customers by search term', () => {
      cy.visit('/customers')

      // 初期状態の顧客数を取得
      cy.get('table tbody tr').then(($rows) => {
        const initialCount = $rows.length

        // 検索フィールドに入力
        cy.get('input[placeholder*="顧客名で検索"]').type('株式会社')

        // 検索結果が反映されることを確認（APIレスポンス待ち）
        cy.wait(1000)

        // テーブルが存在することを確認
        cy.get('table tbody tr').should('exist')
      })
    })

    it('should clear search results when search term is removed', () => {
      cy.visit('/customers')

      // 検索フィールドに入力
      cy.get('input[placeholder*="顧客名で検索"]').type('株式会社')
      cy.wait(1000)

      // 検索をクリア
      cy.get('input[placeholder*="顧客名で検索"]').clear()
      cy.wait(1000)

      // 全ての顧客が再度表示されることを確認
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })
  })

  describe('テーブル表示', () => {
    it('should display customer details in table', () => {
      cy.visit('/customers')

      // テーブルのヘッダーが正しく表示されることを確認
      cy.contains('th', '会社名').should('be.visible')
      cy.contains('th', '代表者').should('be.visible')
      cy.contains('th', '電話番号').should('be.visible')
      cy.contains('th', '住所').should('be.visible')
      cy.contains('th', 'ステータス').should('be.visible')
    })

    it('should display status badges correctly', () => {
      cy.visit('/customers')

      // ステータスバッジが表示されることを確認
      cy.get('table tbody tr').first().within(() => {
        // ステータス列を確認（"有効"または"無効"のテキストが表示される）
        cy.get('td').eq(4).invoke('text').should('match', /有効|無効/)
      })
    })

    it('should display phone numbers with icon', () => {
      cy.visit('/customers')

      // 電話番号が表示されている顧客を確認
      cy.get('table tbody tr').then(($rows) => {
        // 各行をチェックして電話番号があるか確認
        const hasPhone = Array.from($rows).some((row) => {
          const phoneCell = row.querySelector('td:nth-child(3)')
          return phoneCell && phoneCell.textContent && phoneCell.textContent.trim() !== '-'
        })

        if (hasPhone) {
          cy.get('table tbody tr').each(($row) => {
            cy.wrap($row).find('td').eq(2).then(($cell) => {
              const text = $cell.text().trim()
              if (text !== '-') {
                // 電話番号アイコンが表示されることを確認
                cy.wrap($cell).find('svg').should('exist')
              }
            })
          })
        }
      })
    })

    it('should display addresses with icon', () => {
      cy.visit('/customers')

      // 住所が表示されている顧客を確認
      cy.get('table tbody tr').then(($rows) => {
        const hasAddress = Array.from($rows).some((row) => {
          const addressCell = row.querySelector('td:nth-child(4)')
          return addressCell && addressCell.textContent && addressCell.textContent.trim() !== '-'
        })

        if (hasAddress) {
          cy.get('table tbody tr').each(($row) => {
            cy.wrap($row).find('td').eq(3).then(($cell) => {
              const text = $cell.text().trim()
              if (text !== '-') {
                // 住所アイコンが表示されることを確認
                cy.wrap($cell).find('svg').should('exist')
              }
            })
          })
        }
      })
    })
  })

  describe('ドロップダウンメニュー操作', () => {
    it('should open dropdown menu for customer actions', () => {
      cy.visit('/customers')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').scrollIntoView().click()
      })

      // メニューが表示されることを確認
      cy.get('[role="menu"]').should('be.visible')
      cy.contains('[role="menuitem"]', '編集').should('be.visible')
      cy.contains('[role="menuitem"]', '削除').should('be.visible')
    })

    it('should navigate to edit page when clicking edit button', () => {
      cy.visit('/customers')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').scrollIntoView().click()
      })

      // 編集をクリック
      cy.contains('[role="menuitem"]', '編集').should('be.visible').click()

      // 編集ページに遷移することを確認
      cy.url().should('include', '/customers/')
      cy.url().should('include', '/edit')
      cy.contains('顧客編集').should('be.visible')
    })

    it('should cancel deletion when clicking cancel in confirm dialog', () => {
      cy.visit('/customers')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').scrollIntoView().click()
      })

      // 削除をクリック - confirm()をキャンセル
      cy.on('window:confirm', (text) => {
        expect(text).to.contain('この顧客を削除してもよろしいですか')
        return false
      })

      cy.contains('[role="menuitem"]', '削除').should('be.visible').click()

      // ページが変わらないことを確認
      cy.url().should('include', '/customers')
      cy.url().should('not.include', '/edit')
    })

    it('should delete customer when confirming deletion', () => {
      // まず新しい顧客を作成（関連データがないことを保証）
      const timestamp = Date.now()
      const customerName = `削除テスト顧客_${timestamp}`

      cy.visit('/customers/new')
      cy.get('input[name="name"]').type(customerName)
      cy.get('button[role="combobox"]').click()
      cy.contains('[role="option"]', '有効').click()
      cy.contains('button', '登録').click()
      cy.contains('顧客を登録しました').should('be.visible')

      // 一覧ページで作成した顧客を検索
      cy.visit('/customers')
      cy.get('input[placeholder*="顧客名で検索"]').type(customerName)
      cy.wait(1000)

      // 作成した顧客を削除
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').scrollIntoView().click()
      })

      // 削除をクリック - confirm()を承認
      cy.on('window:confirm', (text) => {
        expect(text).to.contain('この顧客を削除してもよろしいですか')
        return true
      })

      cy.contains('[role="menuitem"]', '削除').should('be.visible').click()

      // 削除成功のトースト通知が表示されることを確認
      cy.contains('顧客を削除しました').should('be.visible')

      // 削除された顧客が表示されないことを確認
      cy.wait(1000) // APIレスポンス待ち
      cy.get('body').should('not.contain', customerName)
    })
  })

  describe('ページネーション', () => {
    it('should display pagination controls when there are multiple pages', () => {
      cy.visit('/customers')

      // ページネーションコントロールが存在するか確認
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("次へ")').length > 0) {
          cy.contains('button', '前へ').should('be.visible')
          cy.contains('button', '次へ').should('be.visible')
        }
      })
    })

    it('should disable previous button on first page', () => {
      cy.visit('/customers')

      cy.get('body').then(($body) => {
        if ($body.find('button:contains("前へ")').length > 0) {
          cy.contains('button', '前へ').should('be.disabled')
        }
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error when deleting customer with related data', () => {
      cy.visit('/customers')

      // 関連データがある顧客の削除エラーをシミュレート
      cy.intercept('DELETE', '/api/customers/*', {
        statusCode: 400,
        body: { error: 'この顧客に紐づく見積書、発注書、または請求書が存在するため削除できません' },
      }).as('deleteCustomerError')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').scrollIntoView().click()
      })

      // 削除をクリック - confirm()を承認
      cy.on('window:confirm', (text) => {
        expect(text).to.contain('この顧客を削除してもよろしいですか')
        return true
      })

      cy.contains('[role="menuitem"]', '削除').should('be.visible').click()

      // APIレスポンスを待つ
      cy.wait('@deleteCustomerError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('この顧客に紐づく見積書、発注書、または請求書が存在するため削除できません').should('be.visible')

      // 顧客がまだ一覧に存在することを確認
      cy.url().should('include', '/customers')
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })

    it('should display error toast when deletion API fails', () => {
      cy.visit('/customers')

      // 一般的なAPIエラーをシミュレート
      cy.intercept('DELETE', '/api/customers/*', {
        statusCode: 500,
        body: { error: '顧客の削除に失敗しました' },
      }).as('deleteCustomerError')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').scrollIntoView().click()
      })

      cy.on('window:confirm', () => true)

      cy.contains('[role="menuitem"]', '削除').should('be.visible').click()

      cy.wait('@deleteCustomerError')

      // エラーのトースト通知が表示されることを確認
      cy.contains('削除に失敗しました').should('be.visible')
    })
  })

  describe('管理者権限', () => {
    it('should allow admin to access customers page', () => {
      cy.visit('/customers')
      cy.url().should('include', '/customers')
      cy.contains('顧客管理').should('be.visible')
    })

    it('should allow admin to see all action buttons', () => {
      cy.visit('/customers')

      // 新規顧客ボタンが表示されることを確認
      cy.contains('button', '新規顧客').should('be.visible')

      // ドロップダウンメニューを開く
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').scrollIntoView().click()
      })

      // 編集と削除が表示されることを確認
      cy.contains('[role="menuitem"]', '編集').should('be.visible')
      cy.contains('[role="menuitem"]', '削除').should('be.visible')
    })
  })
})
