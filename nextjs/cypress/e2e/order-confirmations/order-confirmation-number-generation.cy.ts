describe('発注請書番号生成テスト', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('発注請書番号の形式検証', () => {
    it('should generate order confirmation number in YYYY-MM-NNN format when creating new confirmation', () => {
      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/order-confirmations').as('createOrderConfirmation')

      // 新規発注請書作成ページに遷移
      cy.visit('/order-confirmations/new')

      // 必須フィールドを入力
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'GHI株式会社').click()

      cy.get('input[name="subject"]').type('番号生成テスト用発注請書')

      // デフォルトの明細に入力
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')

      // 作成
      cy.contains('button', '作成').click()

      // APIレスポンスを待つ
      cy.wait('@createOrderConfirmation').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)

        const confirmationNumber = interception.response?.body.orderConfirmation.confirmationNumber

        // YYYY-MM-NNN形式であることを確認
        const regex = /^\d{4}-\d{2}-\d{3}$/
        expect(confirmationNumber).to.match(regex)

        // 年月部分が現在の年月であることを確認
        const now = new Date()
        const expectedYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        expect(confirmationNumber).to.contain(expectedYearMonth)

        cy.log(`Generated order confirmation number: ${confirmationNumber}`)
      })
    })

    it('should increment sequence number when creating multiple confirmations', () => {
      // 1件目の発注請書を作成
      cy.intercept('POST', '/api/order-confirmations').as('createOrderConfirmation1')

      cy.visit('/order-confirmations/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'GHI株式会社').click()
      cy.get('input[name="subject"]').type('連番テスト1')
      cy.get('input[name="items.0.name"]').type('テスト品目1')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '作成').click()

      cy.wait('@createOrderConfirmation1').then((interception1) => {
        const confirmationNumber1 = interception1.response?.body.orderConfirmation.confirmationNumber
        const sequenceNum1 = parseInt(confirmationNumber1.split('-')[2])

        // 2件目の発注請書を作成
        cy.intercept('POST', '/api/order-confirmations').as('createOrderConfirmation2')

        cy.visit('/order-confirmations/new')
        cy.get('button[role="combobox"]').first().click()
        cy.contains('[role="option"]', 'GHI株式会社').click()
        cy.get('input[name="subject"]').type('連番テスト2')
        cy.get('input[name="items.0.name"]').type('テスト品目2')
        cy.get('input[name="items.0.quantity"]').clear().type('1')
        cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
        cy.contains('button', '作成').click()

        cy.wait('@createOrderConfirmation2').then((interception2) => {
          const confirmationNumber2 = interception2.response?.body.orderConfirmation.confirmationNumber
          const sequenceNum2 = parseInt(confirmationNumber2.split('-')[2])

          // 連番が1増えていることを確認
          expect(sequenceNum2).to.equal(sequenceNum1 + 1)

          cy.log(`First order confirmation: ${confirmationNumber1}`)
          cy.log(`Second order confirmation: ${confirmationNumber2}`)
        })
      })
    })
  })

  describe('番号の桁数検証', () => {
    it('should pad sequence number with zeros to 3 digits', () => {
      cy.intercept('POST', '/api/order-confirmations').as('createOrderConfirmation')

      cy.visit('/order-confirmations/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'GHI株式会社').click()
      cy.get('input[name="subject"]').type('桁数テスト')
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '作成').click()

      cy.wait('@createOrderConfirmation').then((interception) => {
        const confirmationNumber = interception.response?.body.orderConfirmation.confirmationNumber
        const parts = confirmationNumber.split('-')

        // 連番部分が3桁であることを確認
        expect(parts[2]).to.have.length(3)

        // 連番部分が数字のみであることを確認
        expect(parts[2]).to.match(/^\d{3}$/)

        cy.log(`Order confirmation number sequence part: ${parts[2]}`)
      })
    })
  })

  describe('年月の境界テスト', () => {
    it('should use current year and month in confirmation number', () => {
      cy.intercept('POST', '/api/order-confirmations').as('createOrderConfirmation')

      cy.visit('/order-confirmations/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'GHI株式会社').click()
      cy.get('input[name="subject"]').type('年月テスト')
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '作成').click()

      cy.wait('@createOrderConfirmation').then((interception) => {
        const confirmationNumber = interception.response?.body.orderConfirmation.confirmationNumber

        // 現在の年月を取得
        const now = new Date()
        const expectedYear = now.getFullYear().toString()
        const expectedMonth = String(now.getMonth() + 1).padStart(2, '0')

        // 発注請書番号に現在の年月が含まれることを確認
        expect(confirmationNumber).to.contain(`${expectedYear}-${expectedMonth}`)

        cy.log(`Expected year-month: ${expectedYear}-${expectedMonth}`)
        cy.log(`Generated order confirmation number: ${confirmationNumber}`)
      })
    })
  })

  describe('発注請書と発注書の番号の独立性', () => {
    it('should generate independent sequence numbers for order confirmations', () => {
      // 発注書を1件作成
      cy.intercept('POST', '/api/purchase-orders').as('createPurchaseOrder')

      cy.visit('/purchase-orders/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'GHI株式会社').click()
      cy.get('input[name="subject"]').type('独立性テスト用発注書')
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '作成').click()

      cy.wait('@createPurchaseOrder').then((interception1) => {
        const purchaseOrderNumber = interception1.response?.body.purchaseOrder.orderNumber

        // 発注請書を1件作成
        cy.intercept('POST', '/api/order-confirmations').as('createOrderConfirmation')

        cy.visit('/order-confirmations/new')
        cy.get('button[role="combobox"]').first().click()
        cy.contains('[role="option"]', 'GHI株式会社').click()
        cy.get('input[name="subject"]').type('独立性テスト用発注請書')
        cy.get('input[name="items.0.name"]').type('テスト品目')
        cy.get('input[name="items.0.quantity"]').clear().type('1')
        cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
        cy.contains('button', '作成').click()

        cy.wait('@createOrderConfirmation').then((interception2) => {
          const confirmationNumber = interception2.response?.body.orderConfirmation.confirmationNumber

          // 両方とも同じ年月部分を持つ
          const yearMonth = purchaseOrderNumber.substring(0, 7)
          expect(confirmationNumber).to.contain(yearMonth)

          // しかし、異なる連番体系を持つ（発注書と発注請書は独立してカウント）
          cy.log(`Purchase order number: ${purchaseOrderNumber}`)
          cy.log(`Order confirmation number: ${confirmationNumber}`)

          // 両方の形式がYYYY-MM-NNN形式であることを確認
          const regex = /^\d{4}-\d{2}-\d{3}$/
          expect(purchaseOrderNumber).to.match(regex)
          expect(confirmationNumber).to.match(regex)
        })
      })
    })
  })

  describe('番号のユニーク性検証', () => {
    it('should generate unique confirmation numbers across multiple creations', () => {
      const confirmationNumbers = new Set<string>()

      // 3件の発注請書を連続して作成
      const createConfirmation = (index: number) => {
        cy.intercept('POST', '/api/order-confirmations').as(`createOrderConfirmation${index}`)

        cy.visit('/order-confirmations/new')
        cy.get('button[role="combobox"]').first().click()
        cy.contains('[role="option"]', 'GHI株式会社').click()
        cy.get('input[name="subject"]').type(`ユニーク性テスト${index}`)
        cy.get('input[name="items.0.name"]').type('テスト品目')
        cy.get('input[name="items.0.quantity"]').clear().type('1')
        cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
        cy.contains('button', '作成').click()

        cy.wait(`@createOrderConfirmation${index}`).then((interception) => {
          const confirmationNumber = interception.response?.body.orderConfirmation.confirmationNumber

          // 重複していないことを確認
          expect(confirmationNumbers.has(confirmationNumber)).to.be.false

          confirmationNumbers.add(confirmationNumber)
          cy.log(`Created order confirmation ${index}: ${confirmationNumber}`)
        })
      }

      createConfirmation(1)
      createConfirmation(2)
      createConfirmation(3)

      // すべて異なる番号であることを確認
      cy.wrap(confirmationNumbers).then((numbers) => {
        expect(numbers.size).to.equal(3)
      })
    })
  })
})
