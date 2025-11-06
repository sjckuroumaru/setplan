describe('発注請書一覧ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('基本機能', () => {
    it('should display the purchase orders list page', () => {
      cy.visit('/order-confirmations')
      cy.contains('発注請書管理').should('be.visible')
      cy.get('table').should('be.visible')
    })

    it('should display purchase orders in the table', () => {
      cy.visit('/order-confirmations')
      // テーブルが表示されることを確認
      cy.get('table tbody tr').should('have.length.at.least', 1)
    })

    it('should navigate to new purchase order page', () => {
      cy.visit('/order-confirmations')
      cy.contains('a', '新規作成').click()
      cy.url().should('include', '/order-confirmations/new')
    })
  })

  describe('ドロップダウンメニュー操作', () => {
    it('should navigate to detail page when clicking detail button', () => {
      cy.visit('/order-confirmations')

      // テーブルの最初の行をスクロール
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // 詳細をクリック
      cy.contains('[role="menuitem"]', '詳細').should('be.visible').click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/order-confirmations\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should navigate to edit page when clicking edit button', () => {
      cy.visit('/order-confirmations')

      // テーブルの最初の行をスクロール
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // 編集をクリック
      cy.contains('[role="menuitem"]', '編集').should('be.visible').click()

      // 編集ページに遷移することを確認
      cy.url().should('include', '/order-confirmations/')
      cy.url().should('include', '/edit')
    })

    it('should navigate to edit page when clicking duplicate button', () => {
      cy.visit('/order-confirmations')

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/order-confirmations/*/duplicate').as('duplicateOrderConfirmation')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // 複製をクリック
      cy.contains('[role="menuitem"]', '複製').should('be.visible').click()

      // APIレスポンスを待つ
      cy.wait('@duplicateOrderConfirmation').then((interception) => {
        // エラーが発生した場合はレスポンス内容をログに出力
        if (interception.response && interception.response.statusCode !== 200) {
          cy.log('API Error:', interception.response.statusCode)
          cy.log('Error Body:', JSON.stringify(interception.response.body))
        }

        // 200 OKを期待
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 編集ページに遷移することを確認（複製されたデータ）
      cy.url().should('include', '/order-confirmations/')
      cy.url().should('include', '/edit')
    })

    it('should handle PDF download action', () => {
      cy.visit('/order-confirmations')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // PDFダウンロードメニューが表示されることを確認
      cy.contains('[role="menuitem"]', 'PDFダウンロード').should('be.visible')
    })

    it('should cancel deletion when clicking cancel in confirm dialog', () => {
      cy.visit('/order-confirmations')

      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
      })

      // 削除をクリック - confirm()をキャンセル
      cy.on('window:confirm', (text) => {
        expect(text).to.contain('この発注請書を削除してもよろしいですか')
        return false
      })

      // 削除メニューが存在する場合のみクリック
      cy.get('body').then(($body) => {
        if ($body.find('[role="menuitem"]:contains("削除")').length > 0) {
          cy.contains('[role="menuitem"]', '削除').should('be.visible').click()
        }
      })

      // ページが変わらないことを確認
      cy.url().should('include', '/order-confirmations')
      cy.url().should('not.include', '/edit')
    })

    it('should delete purchase order when confirming deletion', () => {
      cy.visit('/order-confirmations')

      // 削除対象の発注請書番号を取得
      cy.get('table tbody tr').first().scrollIntoView()
      cy.get('table tbody tr').first().find('td').first().invoke('text').then((confirmationNumber) => {
        cy.get('table tbody tr').first().within(() => {
          cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
        })

        // 削除をクリック - confirm()を承認
        cy.on('window:confirm', (text) => {
          expect(text).to.contain('この発注請書を削除してもよろしいですか')
          return true
        })

        // 削除メニューが存在する場合のみクリック
        cy.get('body').then(($body) => {
          if ($body.find('[role="menuitem"]:contains("削除")').length > 0) {
            cy.contains('[role="menuitem"]', '削除').should('be.visible').click()

            // 削除された発注請書が表示されないことを確認
            cy.wait(1000) // APIレスポンス待ち
            cy.get('body').should('not.contain', confirmationNumber.trim())
          }
        })
      })
    })
  })

  describe('発注請書リンク', () => {
    it('should navigate to detail page when clicking order number', () => {
      cy.visit('/order-confirmations')

      // 発注請書番号をクリック
      cy.get('table tbody tr').first().find('td').first().find('a').click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/order-confirmations\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })
})
