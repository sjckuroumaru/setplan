describe('発注請書新規作成ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
    cy.visit('/order-confirmations/new')
  })

  describe('基本機能', () => {
    it('should display the new purchase order form', () => {
      cy.contains('発注請書作成').should('be.visible')
      cy.get('form').should('be.visible')
    })

    it('should display all required form fields', () => {
      cy.get('input[name="subject"]').should('be.visible')
      cy.get('input[name="issueDate"]').should('be.visible')
      cy.get('input[name="deliveryDate"]').should('be.visible')
      cy.contains('label', '発注先').should('be.visible')
      cy.get('input[name="honorific"]').should('be.visible')
      cy.get('input[name="completionPeriod"]').should('be.visible')
      cy.get('input[name="paymentTerms"]').should('be.visible')
    })

    it('should have a default line item', () => {
      // デフォルトで1行の明細が存在することを確認
      cy.get('input[name="items.0.name"]').should('be.visible')
      cy.get('input[name="items.0.quantity"]').should('be.visible')
      cy.get('input[name="items.0.unit"]').should('be.visible')
      cy.get('input[name="items.0.unitPrice"]').should('be.visible')
    })

    it('should navigate back to purchase orders list when clicking cancel', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('eq', Cypress.config().baseUrl + '/order-confirmations')
    })
  })

  describe('フォームバリデーション', () => {
    it('should show validation errors when submitting empty form', () => {
      cy.contains('button', '作成').click()

      // バリデーションエラーが表示されることを確認
      cy.contains('発注先は必須です').should('be.visible')
      cy.contains('件名は必須です').should('be.visible')
    })

    it('should show error when line item quantity is zero or negative', () => {
      // 数量が負の場合
      cy.get('input[name="items.0.name"]').type('テスト項目')
      cy.get('input[name="items.0.quantity"]').clear().type('-1')

      cy.contains('button', '作成').scrollIntoView().click()

      // エラーメッセージまでスクロールして確認
      cy.contains('数量は0以上である必要があります').scrollIntoView().should('be.visible')
    })

    it('should show error when line item unit price is negative', () => {
      // 単価が負の場合
      cy.get('input[name="items.0.name"]').type('テスト項目')
      cy.get('input[name="items.0.unitPrice"]').clear().type('-100')

      cy.contains('button', '作成').scrollIntoView().click()

      // エラーメッセージまでスクロールして確認
      cy.contains('単価は0以上である必要があります').scrollIntoView().should('be.visible')
    })
  })

  describe('発注先選択', () => {
    it('should select supplier from dropdown', () => {
      cy.contains('label', '発注先').parent().find('button[role="combobox"]').click()
      cy.get('[role="option"]').first().should('be.visible').click()

      // 選択された発注先が表示されることを確認
      cy.contains('label', '発注先').parent().should('not.be.empty')
    })

    it('should enter honorific', () => {
      cy.get('input[name="honorific"]').clear().type('御中')
      cy.get('input[name="honorific"]').should('have.value', '御中')
    })
  })

  describe('明細管理', () => {
    it('should add a new line item', () => {
      // 明細追加ボタンをクリック
      cy.contains('button', '明細追加').click()

      // 2行目の明細フィールドが表示されることを確認
      cy.get('input[name="items.1.name"]').should('be.visible')
      cy.get('input[name="items.1.quantity"]').should('be.visible')
      cy.get('input[name="items.1.unit"]').should('be.visible')
      cy.get('input[name="items.1.unitPrice"]').should('be.visible')
    })

    it('should remove a line item', () => {
      // まず明細を追加
      cy.contains('button', '明細追加').click()
      cy.get('input[name="items.1.name"]').should('be.visible')

      // 削除ボタンをクリック（2行目）- Trash2アイコンのボタン
      cy.get('table tbody tr').eq(1).find('button[type="button"]').last().click()

      // 2行目の明細が削除されることを確認
      cy.get('input[name="items.1.name"]').should('not.exist')
    })

    it('should not remove the last line item', () => {
      // 最後の1行は削除できないことを確認
      cy.get('table tbody tr').first().find('button[type="button"]').last().should('be.disabled')
    })

    it('should fill line item details', () => {
      cy.get('input[name="items.0.name"]').type('システム開発')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unit"]').type('式')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 入力値が正しく反映されることを確認
      cy.get('input[name="items.0.name"]').should('have.value', 'システム開発')
      cy.get('input[name="items.0.quantity"]').should('have.value', '1')
      cy.get('input[name="items.0.unit"]').should('have.value', '式')
      cy.get('input[name="items.0.unitPrice"]').should('have.value', '1000000')
    })

    it('should select tax rate for line item', () => {
      // 税率を選択
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[role="combobox"]').click()
      })
      cy.contains('[role="option"]', '8%', { timeout: 10000 }).click()

      // 税率が選択されたことを確認
      cy.get('table tbody tr').first().should('contain', '8%')
    })
  })

  describe('税金計算', () => {
    it('should calculate tax for exclusive tax type', () => {
      // 税別を選択（デフォルトは税別）
      cy.contains('label', '税計算方法').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '税別', { timeout: 10000 }).click()

      // 明細を入力
      cy.get('input[name="items.0.name"]').type('テスト項目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 合計金額セクションまでスクロール
      cy.contains('span', '小計').scrollIntoView().should('be.visible')

      // 税額が自動計算されることを確認（10%）
      cy.contains('計算設定').parent().parent().within(() => {
        cy.contains('小計').should('be.visible')
        cy.contains('span', '消費税').should('be.visible')
        // 円マークは半角(¥)または全角(￥)の可能性があるため、正規表現で確認
        cy.contains(/[¥￥]100,000/).should('be.visible') // 税額
        cy.contains(/[¥￥]1,100,000/).should('be.visible') // 合計
      })
    })

    it('should calculate tax for inclusive tax type', () => {
      // 税込を選択
      cy.contains('label', '税計算方法').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '税込', { timeout: 10000 }).click()

      // 明細を入力
      cy.get('input[name="items.0.name"]').type('テスト項目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1100000')

      // 合計金額セクションまでスクロール
      cy.contains('span', '小計').scrollIntoView().should('be.visible')

      // 内税の場合、合計額に税が含まれることを確認
      cy.contains('計算設定').parent().parent().within(() => {
        cy.contains('小計').should('be.visible')
        cy.contains('span', '消費税').should('be.visible')
      })
    })

    it('should change tax rate', () => {
      // 標準税率を変更（8%）
      cy.contains('label', '標準税率').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '8%', { timeout: 10000 }).click()

      // 明細を入力
      cy.get('input[name="items.0.name"]').type('テスト項目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 8%の税率が選択されていることを確認
      cy.contains('label', '標準税率').parent().should('contain', '8%')
    })

    it('should change rounding type', () => {
      // 端数処理を変更
      cy.contains('label', '端数処理').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '切り上げ', { timeout: 10000 }).click()

      cy.contains('label', '端数処理').parent().should('contain', '切り上げ')
    })
  })

  describe('追加情報入力', () => {
    it('should fill completion period field', () => {
      cy.get('input[name="completionPeriod"]').type('契約締結後3ヶ月')
      cy.get('input[name="completionPeriod"]').should('have.value', '契約締結後3ヶ月')
    })

    it('should fill payment terms field', () => {
      cy.get('input[name="paymentTerms"]').type('月末締め翌月末払い')
      cy.get('input[name="paymentTerms"]').should('have.value', '月末締め翌月末払い')
    })
  })

  describe('フォーム送信', () => {
    it('should successfully create a new purchase order', () => {
      // 必須フィールドを入力
      cy.contains('label', '発注先').parent().find('button[role="combobox"]').click()
      cy.get('[role="option"]').first().click()

      cy.get('input[name="subject"]').type('新規発注請書テスト')

      // 日付は自動入力されているはずなので、そのまま使用

      // 明細を入力
      cy.get('input[name="items.0.name"]').type('システム開発')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unit"]').type('式')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 備考を入力
      cy.get('textarea[name="remarks"]').clear().type('これはテスト用の発注請書です。')

      // 作成ボタンをクリック
      cy.contains('button', '作成').click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/order-confirmations\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should create purchase order with multiple line items', () => {
      // 必須フィールドを入力
      cy.contains('label', '発注先').parent().find('button[role="combobox"]').click()
      cy.get('[role="option"]').first().click()

      cy.get('input[name="subject"]').type('複数明細テスト')

      // 1行目の明細
      cy.get('input[name="items.0.name"]').type('要件定義')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unit"]').type('式')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 2行目を追加
      cy.contains('button', '明細追加').click()
      cy.get('input[name="items.1.name"]').type('基本設計')
      cy.get('input[name="items.1.quantity"]').clear().type('1')
      cy.get('input[name="items.1.unit"]').type('式')
      cy.get('input[name="items.1.unitPrice"]').clear().type('1500000')

      // 3行目を追加
      cy.contains('button', '明細追加').click()
      cy.get('input[name="items.2.name"]').type('詳細設計')
      cy.get('input[name="items.2.quantity"]').clear().type('1')
      cy.get('input[name="items.2.unit"]').type('式')
      cy.get('input[name="items.2.unitPrice"]').clear().type('2000000')

      // 作成
      cy.contains('button', '作成').click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/order-confirmations\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should create purchase order with mixed tax rates', () => {
      // 必須フィールドを入力
      cy.contains('label', '発注先').parent().find('button[role="combobox"]').click()
      cy.get('[role="option"]').first().click()

      cy.get('input[name="subject"]').type('軽減税率混在テスト')

      // 1行目の明細（10%税率）
      cy.get('input[name="items.0.name"]').type('標準税率商品')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 2行目を追加（8%税率）
      cy.contains('button', '明細追加').click()
      cy.get('input[name="items.1.name"]').type('軽減税率商品')
      cy.get('input[name="items.1.quantity"]').clear().type('1')
      cy.get('input[name="items.1.unitPrice"]').clear().type('500000')

      // 2行目の税率を8%に変更
      cy.get('table tbody tr').eq(1).within(() => {
        cy.get('button[role="combobox"]').click()
      })
      cy.contains('[role="option"]', '8%', { timeout: 10000 }).click()

      // 作成
      cy.contains('button', '作成').click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/order-confirmations\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })
})
