describe('見積番号生成テスト', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('見積番号の形式検証', () => {
    it('should generate estimate number in YYYY-MM-NNN format when creating new estimate', () => {
      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/estimates').as('createEstimate')

      // 新規見積作成ページに遷移
      cy.visit('/estimates/new')

      // 必須フィールドを入力
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'ABC株式会社').click()

      cy.get('input[name="subject"]').type('番号生成テスト用見積')

      // デフォルトの明細に入力
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')

      // 作成
      cy.contains('button', '作成').click()

      // APIレスポンスを待つ
      cy.wait('@createEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)

        const estimateNumber = interception.response?.body.estimate.estimateNumber

        // YYYY-MM-NNN形式であることを確認
        const regex = /^\d{4}-\d{2}-\d{3}$/
        expect(estimateNumber).to.match(regex)

        // 年月部分が現在の年月であることを確認
        const now = new Date()
        const expectedYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        expect(estimateNumber).to.contain(expectedYearMonth)

        cy.log(`Generated estimate number: ${estimateNumber}`)
      })
    })

    it('should increment sequence number when creating multiple estimates', () => {
      // 1件目の見積を作成
      cy.intercept('POST', '/api/estimates').as('createEstimate1')

      cy.visit('/estimates/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'ABC株式会社').click()
      cy.get('input[name="subject"]').type('連番テスト1')
      cy.get('input[name="items.0.name"]').type('テスト品目1')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '作成').click()

      cy.wait('@createEstimate1').then((interception1) => {
        const estimateNumber1 = interception1.response?.body.estimate.estimateNumber
        const sequenceNum1 = parseInt(estimateNumber1.split('-')[2])

        // 2件目の見積を作成
        cy.intercept('POST', '/api/estimates').as('createEstimate2')

        cy.visit('/estimates/new')
        cy.get('button[role="combobox"]').first().click()
        cy.contains('[role="option"]', 'ABC株式会社').click()
        cy.get('input[name="subject"]').type('連番テスト2')
        cy.get('input[name="items.0.name"]').type('テスト品目2')
        cy.get('input[name="items.0.quantity"]').clear().type('1')
        cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
        cy.contains('button', '作成').click()

        cy.wait('@createEstimate2').then((interception2) => {
          const estimateNumber2 = interception2.response?.body.estimate.estimateNumber
          const sequenceNum2 = parseInt(estimateNumber2.split('-')[2])

          // 連番が1増えていることを確認
          expect(sequenceNum2).to.equal(sequenceNum1 + 1)

          cy.log(`First estimate: ${estimateNumber1}`)
          cy.log(`Second estimate: ${estimateNumber2}`)
        })
      })
    })
  })

  describe('見積複製時の番号生成', () => {
    it('should generate new estimate number when duplicating', () => {
      cy.visit('/estimates')

      // APIリクエストをインターセプト
      cy.intercept('POST', '/api/estimates/*/duplicate').as('duplicateEstimate')

      // 最初の見積の番号を取得
      cy.get('table tbody tr').first().find('td').first().invoke('text').then((originalNumber) => {
        cy.get('table tbody tr').first().scrollIntoView()
        cy.get('table tbody tr').first().within(() => {
          cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
        })

        // 複製をクリック
        cy.contains('[role="menuitem"]', '複製').should('be.visible').click()

        // APIレスポンスを待つ
        cy.wait('@duplicateEstimate').then((interception) => {
          expect(interception.response?.statusCode).to.eq(200)

          const duplicatedNumber = interception.response?.body.estimate.estimateNumber

          // YYYY-MM-NNN形式であることを確認
          const regex = /^\d{4}-\d{2}-\d{3}$/
          expect(duplicatedNumber).to.match(regex)

          // 元の番号と異なることを確認
          expect(duplicatedNumber).to.not.equal(originalNumber.trim())

          cy.log(`Original estimate number: ${originalNumber.trim()}`)
          cy.log(`Duplicated estimate number: ${duplicatedNumber}`)
        })
      })
    })
  })

  describe('番号の桁数検証', () => {
    it('should pad sequence number with zeros to 3 digits', () => {
      cy.intercept('POST', '/api/estimates').as('createEstimate')

      cy.visit('/estimates/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'ABC株式会社').click()
      cy.get('input[name="subject"]').type('桁数テスト')
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '作成').click()

      cy.wait('@createEstimate').then((interception) => {
        const estimateNumber = interception.response?.body.estimate.estimateNumber
        const parts = estimateNumber.split('-')

        // 連番部分が3桁であることを確認
        expect(parts[2]).to.have.length(3)

        // 連番部分が数字のみであることを確認
        expect(parts[2]).to.match(/^\d{3}$/)

        cy.log(`Estimate number sequence part: ${parts[2]}`)
      })
    })
  })

  describe('年月の境界テスト', () => {
    it('should use current year and month in estimate number', () => {
      cy.intercept('POST', '/api/estimates').as('createEstimate')

      cy.visit('/estimates/new')
      cy.get('button[role="combobox"]').first().click()
      cy.contains('[role="option"]', 'ABC株式会社').click()
      cy.get('input[name="subject"]').type('年月テスト')
      cy.get('input[name="items.0.name"]').type('テスト品目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('10000')
      cy.contains('button', '作成').click()

      cy.wait('@createEstimate').then((interception) => {
        const estimateNumber = interception.response?.body.estimate.estimateNumber

        // 現在の年月を取得
        const now = new Date()
        const expectedYear = now.getFullYear().toString()
        const expectedMonth = String(now.getMonth() + 1).padStart(2, '0')

        // 見積番号に現在の年月が含まれることを確認
        expect(estimateNumber).to.contain(`${expectedYear}-${expectedMonth}`)

        cy.log(`Expected year-month: ${expectedYear}-${expectedMonth}`)
        cy.log(`Generated estimate number: ${estimateNumber}`)
      })
    })
  })
})
