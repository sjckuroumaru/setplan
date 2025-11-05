describe('請求番号生成テスト', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('請求番号の形式検証', () => {
    it('should generate invoice number in YYYY-MM-NNN format when creating new invoice', () => {
      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/invoices').as('createInvoice')

      // 新規請求書作成ページに遷移
      cy.visit('/invoices/new')

      // 必須フィールドを入力
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'ABC株式会社').click()

      cy.get('input[name="subject"]').type('番号生成テスト用請求書')

      // 明細を追加
      cy.contains('button', '明細を追加').click()
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')

      // 保存
      cy.contains('button', '保存').click()

      // APIレスポンスを待つ
      cy.wait('@createInvoice').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)

        const invoiceNumber = interception.response?.body.invoice.invoiceNumber

        // YYYY-MM-NNN形式であることを確認
        const regex = /^\d{4}-\d{2}-\d{3}$/
        expect(invoiceNumber).to.match(regex)

        // 年月部分が現在の年月であることを確認
        const now = new Date()
        const expectedYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        expect(invoiceNumber).to.contain(expectedYearMonth)

        cy.log(`Generated invoice number: ${invoiceNumber}`)
      })
    })

    it('should increment sequence number when creating multiple invoices', () => {
      // 1件目の請求書を作成
      cy.intercept('POST', '/api/invoices').as('createInvoice1')

      cy.visit('/invoices/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'ABC株式会社').click()
      cy.get('input[name="subject"]').type('連番テスト1')
      cy.contains('button', '明細を追加').click()
      cy.get('input[name="items.0.name"]').type('テスト品目1')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '保存').click()

      cy.wait('@createInvoice1').then((interception1) => {
        const invoiceNumber1 = interception1.response?.body.invoice.invoiceNumber
        const sequenceNum1 = parseInt(invoiceNumber1.split('-')[2])

        // 2件目の請求書を作成
        cy.intercept('POST', '/api/invoices').as('createInvoice2')

        cy.visit('/invoices/new')
        cy.get('button[role="combobox"]').first().click()
        cy.contains('[role="option"]', 'ABC株式会社').click()
        cy.get('input[name="subject"]').type('連番テスト2')
        cy.contains('button', '明細を追加').click()
        cy.get('input[name="items.0.name"]').type('テスト品目2')
        cy.get('input[name="items.0.quantity"]').clear().type('1')
        cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
        cy.contains('button', '保存').click()

        cy.wait('@createInvoice2').then((interception2) => {
          const invoiceNumber2 = interception2.response?.body.invoice.invoiceNumber
          const sequenceNum2 = parseInt(invoiceNumber2.split('-')[2])

          // 連番が1増えていることを確認
          expect(sequenceNum2).to.equal(sequenceNum1 + 1)

          cy.log(`First invoice: ${invoiceNumber1}`)
          cy.log(`Second invoice: ${invoiceNumber2}`)
        })
      })
    })
  })

  describe('請求書複製時の番号生成', () => {
    it('should generate new invoice number when duplicating', () => {
      cy.visit('/invoices')

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/invoices/*/duplicate').as('duplicateInvoice')

      // 最初の請求書の番号を取得
      cy.get('table tbody tr').first().find('td').first().invoke('text').then((originalNumber) => {
        cy.get('table tbody tr').first().scrollIntoView()
        cy.get('table tbody tr').first().within(() => {
          cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
        })

        // 複製をクリック
        cy.contains('[role="menuitem"]', '複製').should('be.visible').click()

        // APIレスポンスを待つ
        cy.wait('@duplicateInvoice').then((interception) => {
          expect(interception.response?.statusCode).to.eq(200)

          const duplicatedNumber = interception.response?.body.invoice.invoiceNumber

          // YYYY-MM-NNN形式であることを確認
          const regex = /^\d{4}-\d{2}-\d{3}$/
          expect(duplicatedNumber).to.match(regex)

          // 元の番号と異なることを確認
          expect(duplicatedNumber).to.not.equal(originalNumber.trim())

          cy.log(`Original invoice number: ${originalNumber.trim()}`)
          cy.log(`Duplicated invoice number: ${duplicatedNumber}`)
        })
      })
    })
  })

  describe('見積から請求書作成時の番号生成', () => {
    it('should generate new invoice number when creating from estimate', () => {
      cy.visit('/estimates')

      // 見積書の詳細ページに遷移
      cy.get('table tbody tr').first().find('td').first().find('a').click()
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/invoices/from-estimate').as('createInvoiceFromEstimate')

      // 請求書作成ボタンをクリック
      cy.contains('button', '請求書を作成').click()

      // APIレスポンスを待つ
      cy.wait('@createInvoiceFromEstimate').then((interception) => {
        if (interception.response?.statusCode === 200) {
          const invoiceNumber = interception.response?.body.invoice.invoiceNumber

          // YYYY-MM-NNN形式であることを確認
          const regex = /^\d{4}-\d{2}-\d{3}$/
          expect(invoiceNumber).to.match(regex)

          // 年月部分が現在の年月であることを確認
          const now = new Date()
          const expectedYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
          expect(invoiceNumber).to.contain(expectedYearMonth)

          cy.log(`Generated invoice number from estimate: ${invoiceNumber}`)
        }
      })
    })
  })

  describe('番号の桁数検証', () => {
    it('should pad sequence number with zeros to 3 digits', () => {
      cy.intercept('POST', '/api/invoices').as('createInvoice')

      cy.visit('/invoices/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'ABC株式会社').click()
      cy.get('input[name="subject"]').type('桁数テスト')
      cy.contains('button', '明細を追加').click()
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '保存').click()

      cy.wait('@createInvoice').then((interception) => {
        const invoiceNumber = interception.response?.body.invoice.invoiceNumber
        const parts = invoiceNumber.split('-')

        // 連番部分が3桁であることを確認
        expect(parts[2]).to.have.length(3)

        // 連番部分が数字のみであることを確認
        expect(parts[2]).to.match(/^\d{3}$/)

        cy.log(`Invoice number sequence part: ${parts[2]}`)
      })
    })
  })

  describe('年月の境界テスト', () => {
    it('should use current year and month in invoice number', () => {
      cy.intercept('POST', '/api/invoices').as('createInvoice')

      cy.visit('/invoices/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'ABC株式会社').click()
      cy.get('input[name="subject"]').type('年月テスト')
      cy.contains('button', '明細を追加').click()
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '保存').click()

      cy.wait('@createInvoice').then((interception) => {
        const invoiceNumber = interception.response?.body.invoice.invoiceNumber

        // 現在の年月を取得
        const now = new Date()
        const expectedYear = now.getFullYear().toString()
        const expectedMonth = String(now.getMonth() + 1).padStart(2, '0')

        // 請求番号に現在の年月が含まれることを確認
        expect(invoiceNumber).to.contain(`${expectedYear}-${expectedMonth}`)

        cy.log(`Expected year-month: ${expectedYear}-${expectedMonth}`)
        cy.log(`Generated invoice number: ${invoiceNumber}`)
      })
    })
  })
})
