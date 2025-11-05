describe('発注書番号生成テスト', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('発注書番号の形式検証', () => {
    it('should generate purchase order number in YYYY-MM-NNN format when creating new order', () => {
      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/purchase-orders').as('createPurchaseOrder')

      // 新規発注書作成ページに遷移
      cy.visit('/purchase-orders/new')

      // 必須フィールドを入力
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'GHI株式会社').click()

      cy.get('input[name="subject"]').type('番号生成テスト用発注書')

      // デフォルトの明細に入力
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')

      // 保存
      cy.contains('button', '保存').click()

      // APIレスポンスを待つ
      cy.wait('@createPurchaseOrder').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)

        const orderNumber = interception.response?.body.purchaseOrder.orderNumber

        // YYYY-MM-NNN形式であることを確認
        const regex = /^\d{4}-\d{2}-\d{3}$/
        expect(orderNumber).to.match(regex)

        // 年月部分が現在の年月であることを確認
        const now = new Date()
        const expectedYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        expect(orderNumber).to.contain(expectedYearMonth)

        cy.log(`Generated purchase order number: ${orderNumber}`)
      })
    })

    it('should increment sequence number when creating multiple orders', () => {
      // 1件目の発注書を作成
      cy.intercept('POST', '/api/purchase-orders').as('createPurchaseOrder1')

      cy.visit('/purchase-orders/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'GHI株式会社').click()
      cy.get('input[name="subject"]').type('連番テスト1')
      cy.get('input[name="items.0.name"]').type('テスト品目1')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '保存').click()

      cy.wait('@createPurchaseOrder1').then((interception1) => {
        const orderNumber1 = interception1.response?.body.purchaseOrder.orderNumber
        const sequenceNum1 = parseInt(orderNumber1.split('-')[2])

        // 2件目の発注書を作成
        cy.intercept('POST', '/api/purchase-orders').as('createPurchaseOrder2')

        cy.visit('/purchase-orders/new')
        cy.get('button[role="combobox"]').first().click()
        cy.contains('[role="option"]', 'GHI株式会社').click()
        cy.get('input[name="subject"]').type('連番テスト2')
        cy.get('input[name="items.0.name"]').type('テスト品目2')
        cy.get('input[name="items.0.quantity"]').clear().type('1')
        cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
        cy.contains('button', '保存').click()

        cy.wait('@createPurchaseOrder2').then((interception2) => {
          const orderNumber2 = interception2.response?.body.purchaseOrder.orderNumber
          const sequenceNum2 = parseInt(orderNumber2.split('-')[2])

          // 連番が1増えていることを確認
          expect(sequenceNum2).to.equal(sequenceNum1 + 1)

          cy.log(`First purchase order: ${orderNumber1}`)
          cy.log(`Second purchase order: ${orderNumber2}`)
        })
      })
    })
  })

  describe('発注書複製時の番号生成', () => {
    it('should generate new order number when duplicating', () => {
      cy.visit('/purchase-orders')

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/purchase-orders/*/duplicate').as('duplicatePurchaseOrder')

      // 最初の発注書の番号を取得
      cy.get('table tbody tr').first().find('td').first().invoke('text').then((originalNumber) => {
        cy.get('table tbody tr').first().scrollIntoView()
        cy.get('table tbody tr').first().within(() => {
          cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
        })

        // 複製をクリック
        cy.contains('[role="menuitem"]', '複製').should('be.visible').click()

        // APIレスポンスを待つ
        cy.wait('@duplicatePurchaseOrder').then((interception) => {
          expect(interception.response?.statusCode).to.eq(200)

          const duplicatedNumber = interception.response?.body.orderNumber

          // YYYY-MM-NNN形式であることを確認
          const regex = /^\d{4}-\d{2}-\d{3}$/
          expect(duplicatedNumber).to.match(regex)

          // 元の番号と異なることを確認
          expect(duplicatedNumber).to.not.equal(originalNumber.trim())

          cy.log(`Original purchase order number: ${originalNumber.trim()}`)
          cy.log(`Duplicated purchase order number: ${duplicatedNumber}`)
        })
      })
    })
  })

  describe('見積から発注書作成時の番号生成', () => {
    it('should generate new order number when creating from estimate', () => {
      cy.visit('/estimates')

      // 見積書の詳細ページに遷移
      cy.get('table tbody tr').first().find('td').first().find('a').click()
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/purchase-orders/from-estimate').as('createOrderFromEstimate')

      // 発注書作成ボタンをクリック
      cy.contains('button', '発注書を作成').click()

      // APIレスポンスを待つ
      cy.wait('@createOrderFromEstimate').then((interception) => {
        if (interception.response?.statusCode === 200) {
          const orderNumber = interception.response?.body.purchaseOrder.orderNumber

          // YYYY-MM-NNN形式であることを確認
          const regex = /^\d{4}-\d{2}-\d{3}$/
          expect(orderNumber).to.match(regex)

          // 年月部分が現在の年月であることを確認
          const now = new Date()
          const expectedYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
          expect(orderNumber).to.contain(expectedYearMonth)

          cy.log(`Generated purchase order number from estimate: ${orderNumber}`)
        }
      })
    })
  })

  describe('番号の桁数検証', () => {
    it('should pad sequence number with zeros to 3 digits', () => {
      cy.intercept('POST', '/api/purchase-orders').as('createPurchaseOrder')

      cy.visit('/purchase-orders/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'GHI株式会社').click()
      cy.get('input[name="subject"]').type('桁数テスト')
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '保存').click()

      cy.wait('@createPurchaseOrder').then((interception) => {
        const orderNumber = interception.response?.body.purchaseOrder.orderNumber
        const parts = orderNumber.split('-')

        // 連番部分が3桁であることを確認
        expect(parts[2]).to.have.length(3)

        // 連番部分が数字のみであることを確認
        expect(parts[2]).to.match(/^\d{3}$/)

        cy.log(`Purchase order number sequence part: ${parts[2]}`)
      })
    })
  })

  describe('年月の境界テスト', () => {
    it('should use current year and month in order number', () => {
      cy.intercept('POST', '/api/purchase-orders').as('createPurchaseOrder')

      cy.visit('/purchase-orders/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'GHI株式会社').click()
      cy.get('input[name="subject"]').type('年月テスト')
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '保存').click()

      cy.wait('@createPurchaseOrder').then((interception) => {
        const orderNumber = interception.response?.body.purchaseOrder.orderNumber

        // 現在の年月を取得
        const now = new Date()
        const expectedYear = now.getFullYear().toString()
        const expectedMonth = String(now.getMonth() + 1).padStart(2, '0')

        // 発注書番号に現在の年月が含まれることを確認
        expect(orderNumber).to.contain(`${expectedYear}-${expectedMonth}`)

        cy.log(`Expected year-month: ${expectedYear}-${expectedMonth}`)
        cy.log(`Generated purchase order number: ${orderNumber}`)
      })
    })
  })
})
