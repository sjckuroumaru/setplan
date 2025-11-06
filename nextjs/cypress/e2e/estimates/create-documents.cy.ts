describe('見積書から書類作成', () => {
  let estimateId: string

  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')

    // 見積書詳細ページに遷移
    cy.visit('/estimates')

    // 最初の見積書を開く
    cy.get('table tbody tr').first().scrollIntoView()
    cy.get('table tbody tr').first().find('td').first().find('a').click()

    // URLから見積IDを取得
    cy.url().then((url) => {
      const matches = url.match(/\/estimates\/([a-zA-Z0-9-]+)$/)
      if (matches) {
        estimateId = matches[1]
      }
    })

    // 見積詳細ページが表示されることを確認
    cy.contains('見積詳細', { timeout: 10000 }).should('be.visible')
  })

  describe('発注請書作成', () => {
    it('should create order confirmation from estimate', () => {
      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/order-confirmations/from-estimate').as('createOrderConfirmation')

      // 発注請書作成ボタンをクリック
      cy.contains('button', '発注請書作成').scrollIntoView().should('be.visible').click()

      // APIレスポンスを待つ
      cy.wait('@createOrderConfirmation').then((interception) => {
        // エラーが発生した場合はレスポンス内容をログに出力
        if (interception.response && interception.response.statusCode !== 200) {
          cy.log('API Error:', interception.response.statusCode)
          cy.log('Error Body:', JSON.stringify(interception.response.body))
        }

        // 200 OKを期待
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 発注請書詳細ページに遷移することを確認
      cy.url().should('match', /\/order-confirmations\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')

      // 発注請書詳細ページが表示されることを確認
      cy.contains('発注請書詳細', { timeout: 10000 }).should('be.visible')

      // 発注請書番号が表示されることを確認
      cy.contains(/発注請書番号:\s*\d{4}-\d{2}-\d{3}/).should('be.visible')
    })

    it('should display success message when order confirmation is created', () => {
      // 発注請書作成ボタンをクリック
      cy.contains('button', '発注請書作成').scrollIntoView().should('be.visible').click()

      // 成功メッセージが表示されることを確認
      cy.contains('発注請書を作成しました', { timeout: 10000 }).should('be.visible')
    })

    it('should copy estimate data to order confirmation', () => {
      // 見積の件名を取得
      let estimateSubject: string
      cy.contains('件名').parent().find('.text-lg').invoke('text').then((text) => {
        estimateSubject = text
      })

      // 発注請書作成ボタンをクリック
      cy.contains('button', '発注請書作成').scrollIntoView().should('be.visible').click()

      // 発注請書詳細ページに遷移
      cy.url().should('match', /\/order-confirmations\/[a-zA-Z0-9-]+$/)

      // 件名が見積書と同じことを確認
      cy.contains('件名').parent().should(($el) => {
        expect($el.text()).to.include(estimateSubject)
      })
    })
  })

  describe('納品書作成', () => {
    it('should create delivery note from estimate', () => {
      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/delivery-notes/from-estimate').as('createDeliveryNote')

      // 納品書作成ボタンをクリック
      cy.contains('button', '納品書作成').scrollIntoView().should('be.visible').click()

      // APIレスポンスを待つ
      cy.wait('@createDeliveryNote').then((interception) => {
        // エラーが発生した場合はレスポンス内容をログに出力
        if (interception.response && interception.response.statusCode !== 200) {
          cy.log('API Error:', interception.response.statusCode)
          cy.log('Error Body:', JSON.stringify(interception.response.body))
        }

        // 200 OKを期待
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 納品書詳細ページに遷移することを確認
      cy.url().should('match', /\/delivery-notes\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')

      // 納品書詳細ページが表示されることを確認
      cy.contains('納品書詳細', { timeout: 10000 }).should('be.visible')

      // 納品書番号が表示されることを確認
      cy.contains(/納品書番号:\s*\d{4}-\d{2}-\d{3}/).should('be.visible')
    })

    it('should display success message when delivery note is created', () => {
      // 納品書作成ボタンをクリック
      cy.contains('button', '納品書作成').scrollIntoView().should('be.visible').click()

      // 成功メッセージが表示されることを確認
      cy.contains('納品書を作成しました', { timeout: 10000 }).should('be.visible')
    })

    it('should copy estimate data to delivery note', () => {
      // 見積の件名を取得
      let estimateSubject: string
      cy.contains('件名').parent().find('.text-lg').invoke('text').then((text) => {
        estimateSubject = text
      })

      // 納品書作成ボタンをクリック
      cy.contains('button', '納品書作成').scrollIntoView().should('be.visible').click()

      // 納品書詳細ページに遷移
      cy.url().should('match', /\/delivery-notes\/[a-zA-Z0-9-]+$/)

      // 件名が見積書と同じことを確認
      cy.contains('件名').parent().should(($el) => {
        expect($el.text()).to.include(estimateSubject)
      })
    })
  })

  describe('ボタン配置', () => {
    it('should display buttons in two rows', () => {
      // 編集・複製・PDF出力ボタンが表示されることを確認
      cy.contains('button', '編集').should('be.visible')
      cy.contains('button', '複製').should('be.visible')
      cy.contains('button', 'PDF出力').should('be.visible')

      // 請求書作成・発注書作成・発注請書作成・納品書作成ボタンが表示されることを確認
      cy.contains('button', '請求書作成').should('be.visible')
      cy.contains('button', '発注書作成').should('be.visible')
      cy.contains('button', '発注請書作成').should('be.visible')
      cy.contains('button', '納品書作成').should('be.visible')
    })
  })
})
