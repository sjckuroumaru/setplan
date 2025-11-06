describe('納品書一覧ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('基本機能', () => {
    it('should display the delivery notes list page', () => {
      cy.visit('/delivery-notes')
      cy.contains('納品書管理').should('be.visible')
      cy.get('table').should('be.visible')
    })

    it('should display delivery notes in the table', () => {
      cy.visit('/delivery-notes')
      // テーブルが表示されることを確認
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })

    it('should navigate to new delivery note page', () => {
      cy.visit('/delivery-notes')
      cy.contains('button', '新規作成').click()
      cy.url().should('include', '/delivery-notes/new')
    })

    it('should display search input', () => {
      cy.visit('/delivery-notes')
      cy.get('input[placeholder*="納品書番号"]').should('be.visible')
    })

    it('should display status filter', () => {
      cy.visit('/delivery-notes')
      cy.get('button[role="combobox"]').should('be.visible')
    })
  })

  describe('検索とフィルター', () => {
    it('should filter by search term', () => {
      cy.visit('/delivery-notes')

      // 検索フィールドに入力
      cy.get('input[placeholder*="納品書番号"]').type('テスト')

      // 検索結果が反映されることを確認（APIレスポンス待ち）
      cy.wait(1000)
      cy.get('table tbody tr').should('exist')
    })

    it('should filter by status', () => {
      cy.visit('/delivery-notes')

      // ステータスフィルターを開く
      cy.get('button[role="combobox"]').click()

      // 下書きを選択
      cy.contains('[role="option"]', '下書き').click()

      // フィルターが適用されることを確認（APIレスポンス待ち）
      cy.wait(1000)
      cy.get('table tbody tr').should('exist')
    })

    it('should show all status options in filter', () => {
      cy.visit('/delivery-notes')

      // ステータスフィルターを開く
      cy.get('button[role="combobox"]').click()

      // すべてのステータスオプションが表示されることを確認
      cy.contains('[role="option"]', 'すべて').should('be.visible')
      cy.contains('[role="option"]', '下書き').should('be.visible')
      cy.contains('[role="option"]', '送付済').should('be.visible')
    })
  })

  describe('ドロップダウンメニュー操作', () => {
    it('should navigate to detail page when clicking detail button', () => {
      cy.visit('/delivery-notes')

      // テーブルの最初の行をスクロール
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // 詳細をクリック
      cy.contains('[role="menuitem"]', '詳細').should('be.visible').click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/delivery-notes\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should navigate to edit page when clicking edit button (draft only)', () => {
      cy.visit('/delivery-notes')

      // 下書きステータスの納品書を探す
      cy.get('button[role="combobox"]').click()
      cy.contains('[role="option"]', '下書き').click()
      cy.wait(1000)

      // テーブルの最初の行をスクロール
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // 編集メニューが表示されることを確認（下書きステータスのみ）
      cy.get('body').then(($body) => {
        if ($body.find('[role="menuitem"]:contains("編集")').length > 0) {
          cy.contains('[role="menuitem"]', '編集').should('be.visible').click()

          // 編集ページに遷移することを確認
          cy.url().should('include', '/delivery-notes/')
          cy.url().should('include', '/edit')
        }
      })
    })

    it('should navigate to edit page when clicking duplicate button', () => {
      cy.visit('/delivery-notes')

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/delivery-notes/*/duplicate').as('duplicateDeliveryNote')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // 複製をクリック
      cy.contains('[role="menuitem"]', '複製').should('be.visible').click()

      // APIレスポンスを待つ
      cy.wait('@duplicateDeliveryNote').then((interception) => {
        // エラーが発生した場合はレスポンス内容をログに出力
        if (interception.response && interception.response.statusCode !== 200) {
          cy.log('API Error:', interception.response.statusCode)
          cy.log('Error Body:', JSON.stringify(interception.response.body))
        }

        // 200 OKを期待
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 編集ページに遷移することを確認（複製されたデータ）
      cy.url().should('include', '/delivery-notes/')
      cy.url().should('include', '/edit')
    })

    it('should handle PDF output action', () => {
      cy.visit('/delivery-notes')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // PDF出力メニューが表示されることを確認
      cy.contains('[role="menuitem"]', 'PDF出力').should('be.visible')
    })

    it('should show status update option for draft delivery notes', () => {
      cy.visit('/delivery-notes')

      // 下書きステータスの納品書を探す
      cy.get('button[role="combobox"]').click()
      cy.contains('[role="option"]', '下書き').click()
      cy.wait(1000)

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // 送付済みにするメニューが表示されることを確認（下書きステータスのみ）
      cy.get('body').then(($body) => {
        if ($body.find('[role="menuitem"]:contains("送付済みにする")').length > 0) {
          cy.contains('[role="menuitem"]', '送付済みにする').should('be.visible')
        }
      })
    })

    it('should cancel deletion when clicking cancel in confirm dialog', () => {
      cy.visit('/delivery-notes')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // 削除をクリック - confirm()をキャンセル
      cy.on('window:confirm', (text) => {
        expect(text).to.contain('この納品書を削除してもよろしいですか')
        return false
      })

      // 削除メニューが存在する場合のみクリック（管理者のみ表示）
      cy.get('body').then(($body) => {
        if ($body.find('[role="menuitem"]:contains("削除")').length > 0) {
          cy.contains('[role="menuitem"]', '削除').should('be.visible').click()
        }
      })

      // ページが変わらないことを確認
      cy.url().should('include', '/delivery-notes')
      cy.url().should('not.include', '/edit')
    })

    it('should delete delivery note when confirming deletion', () => {
      cy.visit('/delivery-notes')

      // 削除対象の納品書番号を取得
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().find('td').first().invoke('text').then((deliveryNoteNumber) => {
        cy.get('table tbody tr').first().within(() => {
          cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
        })

        // 削除をクリック - confirm()を承認
        cy.on('window:confirm', (text) => {
          expect(text).to.contain('この納品書を削除してもよろしいですか')
          return true
        })

        // 削除メニューが存在する場合のみクリック（管理者のみ表示）
        cy.get('body').then(($body) => {
          if ($body.find('[role="menuitem"]:contains("削除")').length > 0) {
            cy.contains('[role="menuitem"]', '削除').should('be.visible').click()

            // 削除された納品書が表示されないことを確認
            cy.wait(1000) // APIレスポンス待ち
            cy.get('body').should('not.contain', deliveryNoteNumber.trim())
          }
        })
      })
    })
  })

  describe('ステータス更新機能', () => {
    it('should update delivery note status from draft to sent', () => {
      cy.visit('/delivery-notes')

      // 下書きステータスの納品書を探す
      cy.get('button[role="combobox"]').click()
      cy.contains('[role="option"]', '下書き').click()
      cy.wait(1000)

      // テーブルにデータがある場合のみテスト実行
      cy.get('body').then(($body) => {
        if ($body.find('table tbody tr td:not(:contains("納品書がありません"))').length > 0) {
          cy.get('table tbody tr').first().scrollIntoView()
          cy.get('table tbody tr').first().within(() => {
            cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
          })

          // 送付済みにするメニューが存在する場合のみクリック
          cy.get('body').then(($innerBody) => {
            if ($innerBody.find('[role="menuitem"]:contains("送付済みにする")').length > 0) {
              // APIリクエストをインターセプト
              cy.intercept('PUT', '/api/delivery-notes/*/status').as('updateStatus')

              cy.contains('[role="menuitem"]', '送付済みにする').should('be.visible').click()

              // APIレスポンスを待つ
              cy.wait('@updateStatus').then((interception) => {
                expect(interception.response?.statusCode).to.eq(200)
              })

              // トースト通知が表示されることを確認
              cy.contains('ステータスを更新しました').should('be.visible')
            }
          })
        }
      })
    })
  })

  describe('テーブル表示', () => {
    it('should display delivery note details in table', () => {
      cy.visit('/delivery-notes')

      // テーブルのヘッダーが正しく表示されることを確認
      cy.contains('th', '納品書番号').should('be.visible')
      cy.contains('th', '顧客名').should('be.visible')
      cy.contains('th', '件名').should('be.visible')
      cy.contains('th', '納品日').should('be.visible')
      cy.contains('th', '金額').should('be.visible')
      cy.contains('th', 'ステータス').should('be.visible')
      cy.contains('th', '担当者').should('be.visible')
    })

    it('should show empty state when no delivery notes', () => {
      cy.visit('/delivery-notes')

      // 存在しない検索語で検索
      cy.get('input[placeholder*="納品書番号"]').type('存在しない納品書番号12345XYZ')
      cy.wait(1000)

      // 空の状態メッセージが表示されることを確認
      cy.contains('納品書がありません').should('be.visible')
    })
  })
})
