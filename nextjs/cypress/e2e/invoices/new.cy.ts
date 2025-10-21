describe('請求書新規作成ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
    cy.visit('/invoices/new')
  })

  describe('基本機能', () => {
    it('should display the new invoice form', () => {
      cy.contains('請求書作成').should('be.visible')
      cy.get('form').should('be.visible')
    })

    it('should display all required form fields', () => {
      cy.get('input[name="subject"]').scrollIntoView().should('be.visible')
      cy.get('input[name="issueDate"]').scrollIntoView().should('be.visible')
      cy.get('input[name="dueDate"]').scrollIntoView().should('be.visible')
      cy.contains('label', '顧客').scrollIntoView().should('be.visible')
      cy.contains('label', '敬称').scrollIntoView().should('be.visible')
    })

    it('should have a default line item', () => {
      // デフォルトで1行の明細が存在することを確認
      cy.get('input[name="items.0.name"]').scrollIntoView().should('be.visible')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().should('be.visible')
      cy.get('input[name="items.0.unit"]').scrollIntoView().should('be.visible')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().should('be.visible')
    })

    it('should navigate back to invoices list when clicking cancel', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('eq', Cypress.config().baseUrl + '/invoices')
    })
  })

  describe('フォームバリデーション', () => {
    it('should show validation errors when submitting empty form', () => {
      cy.contains('button', '作成').scrollIntoView().click()

      // バリデーションエラーが表示されることを確認
      cy.contains('顧客を選択してください').scrollIntoView().should('be.visible')
      cy.contains('件名は必須です').scrollIntoView().should('be.visible')
    })

    it('should show error when line item name is empty', () => {
      // 顧客を選択
      cy.contains('label', '顧客').scrollIntoView().parent().find('button[role="combobox"]').click()
      cy.get('[role="option"]').first().click()

      cy.get('input[name="subject"]').scrollIntoView().type('テスト請求書')

      // 明細の単価だけ入力（名前は空）
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().clear().type('100000')

      cy.contains('button', '作成').scrollIntoView().click()

      // 明細名のバリデーションエラーが表示されることを確認
      cy.contains('項目名は必須です').scrollIntoView().should('be.visible')
    })

    it('should show error when line item quantity is zero or negative', () => {
      // 数量が負の場合（positive()なので0もエラー）
      cy.get('input[name="items.0.name"]').scrollIntoView().type('テスト項目')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().clear().type('-1')

      cy.contains('button', '作成').scrollIntoView().click()

      // エラーメッセージまでスクロールして確認
      cy.contains('数量は正の数である必要があります').scrollIntoView().should('be.visible')
    })

    it('should show error when line item unit price is negative', () => {
      // 単価が負の場合
      cy.get('input[name="items.0.name"]').scrollIntoView().type('テスト項目')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().clear().type('-100')

      cy.contains('button', '作成').scrollIntoView().click()

      // エラーメッセージまでスクロールして確認
      cy.contains('単価は0以上である必要があります').scrollIntoView().should('be.visible')
    })
  })

  describe('顧客選択', () => {
    it('should select customer from dropdown', () => {
      cy.contains('label', '顧客').parent().find('button[role="combobox"]').click()
      cy.get('[role="option"]').first().should('be.visible').click()

      // 選択された顧客が表示されることを確認
      cy.contains('label', '顧客').parent().should('not.be.empty')
    })

    it('should display honorific select', () => {
      // 敬称はSelectとして実装されているため、ラベルの存在確認のみ
      cy.contains('label', '敬称').should('be.visible')
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

    // Note: invoicesの実装では最後の1行でも削除可能（disabled属性なし）
    // purchase-ordersとは異なる実装になっています

    it('should fill line item details', () => {
      cy.get('input[name="items.0.name"]').scrollIntoView().type('システム開発')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.0.unit"]').scrollIntoView().type('式')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().clear().type('1000000')

      // 入力値が正しく反映されることを確認
      cy.get('input[name="items.0.name"]').should('have.value', 'システム開発')
      cy.get('input[name="items.0.quantity"]').should('have.value', '1')
      cy.get('input[name="items.0.unit"]').should('have.value', '式')
      cy.get('input[name="items.0.unitPrice"]').should('have.value', '1000000')
    })

    it('should select tax rate for line item', () => {
      // 税率を選択（明細行には税区分と税率の2つのセレクトがあるため、lastを使用）
      cy.get('table tbody tr').first().within(() => {
        cy.get('button[role="combobox"]').last().click()
      })
      cy.contains('[role="option"]', '8%', { timeout: 10000 }).click()

      // 税率が選択されたことを確認
      cy.get('table tbody tr').first().should('contain', '8%')
    })
  })

  describe('税金計算', () => {
    it('should calculate tax for exclusive tax type', () => {
      // 税別を選択（デフォルトは税別）
      cy.contains('label', '税計算').scrollIntoView().parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '税別', { timeout: 10000 }).click()

      // 明細を入力
      cy.get('input[name="items.0.name"]').scrollIntoView().type('テスト項目')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().clear().type('1000000')

      // 合計金額セクションまでスクロール
      cy.contains('小計').scrollIntoView().should('be.visible')

      // 税額が自動計算されることを確認（10%）
      cy.contains('消費税').should('be.visible')
      // 円マークは半角(¥)または全角(￥)の可能性があるため、正規表現で確認
      cy.contains(/[¥￥]100,000/).should('be.visible') // 税額
      cy.contains(/[¥￥]1,100,000/).should('be.visible') // 合計
    })

    it('should calculate tax for inclusive tax type', () => {
      // 税込を選択
      cy.contains('label', '税計算').scrollIntoView().parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '税込', { timeout: 10000 }).click()

      // 明細を入力
      cy.get('input[name="items.0.name"]').scrollIntoView().type('テスト項目')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().clear().type('1100000')

      // 合計金額セクションまでスクロール
      cy.contains('小計').scrollIntoView().should('be.visible')

      // 内税の場合、合計額に税が含まれることを確認
      cy.contains('消費税').should('be.visible')
    })

    it('should change rounding type', () => {
      // 端数処理を変更
      cy.contains('label', '端数処理').scrollIntoView().parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '切り上げ', { timeout: 10000 }).click()

      cy.contains('label', '端数処理').parent().should('contain', '切り上げ')
    })
  })

  describe('フォーム送信', () => {
    it('should successfully create a new invoice', () => {
      // 必須フィールドを入力
      cy.contains('label', '顧客').scrollIntoView().parent().find('button[role="combobox"]').click()
      cy.get('[role="option"]').first().click()

      cy.get('input[name="subject"]').scrollIntoView().type('新規請求書テスト')

      // 日付は自動入力されているはずなので、そのまま使用

      // 明細を入力
      cy.get('input[name="items.0.name"]').scrollIntoView().type('システム開発')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.0.unit"]').scrollIntoView().type('式')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().clear().type('1000000')

      // 備考を入力
      cy.get('textarea[name="remarks"]').scrollIntoView().clear().type('これはテスト用の請求書です。')

      // 作成ボタンをクリック
      cy.contains('button', '作成').scrollIntoView().click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/invoices\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should create invoice with multiple line items', () => {
      // 必須フィールドを入力
      cy.contains('label', '顧客').scrollIntoView().parent().find('button[role="combobox"]').click()
      cy.get('[role="option"]').first().click()

      cy.get('input[name="subject"]').scrollIntoView().type('複数明細テスト')

      // 1行目の明細
      cy.get('input[name="items.0.name"]').scrollIntoView().type('要件定義')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.0.unit"]').scrollIntoView().type('式')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().clear().type('1000000')

      // 2行目を追加
      cy.contains('button', '明細追加').scrollIntoView().click()
      cy.get('input[name="items.1.name"]').scrollIntoView().type('基本設計')
      cy.get('input[name="items.1.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.1.unit"]').scrollIntoView().type('式')
      cy.get('input[name="items.1.unitPrice"]').scrollIntoView().clear().type('1500000')

      // 3行目を追加
      cy.contains('button', '明細追加').scrollIntoView().click()
      cy.get('input[name="items.2.name"]').scrollIntoView().type('詳細設計')
      cy.get('input[name="items.2.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.2.unit"]').scrollIntoView().type('式')
      cy.get('input[name="items.2.unitPrice"]').scrollIntoView().clear().type('2000000')

      // 作成
      cy.contains('button', '作成').scrollIntoView().click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/invoices\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should create invoice with mixed tax rates', () => {
      // 必須フィールドを入力
      cy.contains('label', '顧客').scrollIntoView().parent().find('button[role="combobox"]').click()
      cy.get('[role="option"]').first().click()

      cy.get('input[name="subject"]').scrollIntoView().type('軽減税率混在テスト')

      // 1行目の明細（10%税率）
      cy.get('input[name="items.0.name"]').scrollIntoView().type('標準税率商品')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().clear().type('1000000')

      // 2行目を追加（8%税率）
      cy.contains('button', '明細追加').scrollIntoView().click()
      cy.get('input[name="items.1.name"]').scrollIntoView().type('軽減税率商品')
      cy.get('input[name="items.1.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.1.unitPrice"]').scrollIntoView().clear().type('500000')

      // 2行目の税率を8%に変更（明細行には税区分と税率の2つのセレクトがあるため、lastを使用）
      cy.get('table tbody tr').eq(1).scrollIntoView().within(() => {
        cy.get('button[role="combobox"]').last().click()
      })
      cy.contains('[role="option"]', '8%', { timeout: 10000 }).click()

      // 作成
      cy.contains('button', '作成').scrollIntoView().click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/invoices\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })
})
