describe('見積新規作成ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
    cy.visit('/estimates/new')
  })

  describe('基本機能', () => {
    it('should display the new estimate form', () => {
      cy.contains('新規見積作成').should('be.visible')
      cy.get('form').should('be.visible')
    })

    it('should display all required form fields', () => {
      cy.get('input[name="subject"]').should('be.visible')
      cy.get('input[name="issueDate"]').should('be.visible')
      cy.get('input[name="validUntil"]').should('be.visible')
      cy.contains('label', '顧客').should('be.visible')
      cy.get('input[name="honorific"]').should('be.visible')
    })

    it('should have a default line item', () => {
      // デフォルトで1行の明細が存在することを確認
      cy.get('input[name="items.0.name"]').should('be.visible')
      cy.get('input[name="items.0.quantity"]').should('be.visible')
      cy.get('input[name="items.0.unit"]').should('be.visible')
      cy.get('input[name="items.0.unitPrice"]').should('be.visible')
    })

    it('should navigate back to estimates list when clicking cancel', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('eq', Cypress.config().baseUrl + '/estimates')
    })
  })

  describe('フォームバリデーション', () => {
    it('should show validation errors when submitting empty form', () => {
      cy.contains('button', '作成').click()

      // バリデーションエラーが表示されることを確認（エラーメッセージまでスクロール）
      cy.contains('顧客を選択してください').scrollIntoView().should('be.visible')
      cy.contains('件名は必須です').scrollIntoView().should('be.visible')
    })

    it('should show error when line item name is empty', () => {
      // 顧客を選択
      cy.contains('label', '顧客').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', 'ABC株式会社', { timeout: 10000 }).click()

      cy.get('input[name="subject"]').type('テスト見積書')

      // 明細の単価だけ入力（名前は空）
      cy.get('input[name="items.0.unitPrice"]').clear().type('100000')

      cy.contains('button', '作成').scrollIntoView().click()

      // 明細名のバリデーションエラーが表示されることを確認（スクロールして確認）
      cy.contains('項目名は必須です').scrollIntoView().should('be.visible')
    })

    it('should show error when line item quantity is zero or negative', () => {
      // 数量が0の場合
      cy.get('input[name="items.0.name"]').type('テスト項目')
      cy.get('input[name="items.0.quantity"]').clear().type('0')

      cy.contains('button', '作成').scrollIntoView().click()

      // エラーメッセージまでスクロールして確認
      cy.contains('数量は正の数である必要があります').scrollIntoView().should('be.visible')
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

  describe('顧客選択', () => {
    it('should select customer from dropdown', () => {
      cy.contains('label', '顧客').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', 'ABC株式会社', { timeout: 10000 }).should('be.visible').click()

      // 選択された顧客が表示されることを確認
      cy.contains('label', '顧客').parent().should('contain', 'ABC株式会社')
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
      cy.get('input[name="items.0.name"]').type('要件定義')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unit"]').type('式')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 入力値が正しく反映されることを確認
      cy.get('input[name="items.0.name"]').should('have.value', '要件定義')
      cy.get('input[name="items.0.quantity"]').should('have.value', '1')
      cy.get('input[name="items.0.unit"]').should('have.value', '式')
      cy.get('input[name="items.0.unitPrice"]').should('have.value', '1000000')
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
      // 合計金額セクションを「計算設定」のCard内で確認
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
      // 税率を変更（8%）
      cy.contains('label', '消費税率').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '8%', { timeout: 10000 }).click()

      // 明細を入力
      cy.get('input[name="items.0.name"]').type('テスト項目')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 合計金額セクションまでスクロール
      cy.contains('span', '小計').scrollIntoView().should('be.visible')

      // 8%の税額が計算されることを確認
      cy.contains('計算設定').parent().parent().within(() => {
        // 円マークは半角(¥)または全角(￥)の可能性があるため、正規表現で確認
        cy.contains(/[¥￥]80,000/).should('be.visible')
      })
    })

    it('should change rounding type', () => {
      // 端数処理を変更
      cy.contains('label', '端数処理').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', '切り上げ', { timeout: 10000 }).click()

      cy.contains('label', '端数処理').parent().should('contain', '切り上げ')
    })
  })

  describe('フォーム送信', () => {
    it('should successfully create a new estimate', () => {
      // 必須フィールドを入力
      cy.contains('label', '顧客').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', 'ABC株式会社', { timeout: 10000 }).click()

      cy.get('input[name="subject"]').type('新規見積書テスト')

      // 日付は自動入力されているはずなので、そのまま使用

      // 明細を入力
      cy.get('input[name="items.0.name"]').type('要件定義')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unit"]').type('式')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 備考を入力
      cy.get('textarea[name="remarks"]').clear().type('これはテスト用の見積書です。')

      // 作成ボタンをクリック
      cy.contains('button', '作成').click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should create estimate with multiple line items', () => {
      // 必須フィールドを入力
      cy.contains('label', '顧客').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', 'XYZ株式会社', { timeout: 10000 }).click()

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
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })

  describe('明細の備考機能', () => {
    it('should create estimate with item remarks and display them', () => {
      // 基本情報を入力
      cy.contains('label', '顧客').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', 'ABC株式会社', { timeout: 10000 }).click()

      cy.get('input[name="subject"]').type('備考テスト見積')

      // 明細の入力（1行目）
      cy.get('input[name="items.0.name"]').type('Webシステム開発')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unit"]').type('式')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 備考を入力
      cy.get('input[name="items.0.remarks"]').type('初期開発費用（3ヶ月）')

      // 明細を追加
      cy.contains('button', '明細追加').click()

      // 2行目の明細を入力
      cy.get('input[name="items.1.name"]').type('保守運用費')
      cy.get('input[name="items.1.quantity"]').clear().type('12')
      cy.get('input[name="items.1.unit"]').type('ヶ月')
      cy.get('input[name="items.1.unitPrice"]').clear().type('50000')

      // 2行目の備考を入力
      cy.get('input[name="items.1.remarks"]').type('月額保守費用')

      // 作成ボタンをクリック
      cy.intercept('POST', '/api/estimates').as('createEstimate')
      cy.contains('button', '作成').click()

      // APIレスポンスを待つ
      cy.wait('@createEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
      cy.url().should('not.include', '/new')

      // 詳細画面で備考が表示されることを確認
      cy.contains('Webシステム開発').should('be.visible')
      cy.contains('初期開発費用（3ヶ月）').should('be.visible')
      cy.contains('保守運用費').should('be.visible')
      cy.contains('月額保守費用').should('be.visible')
    })

    it('should allow empty remarks for items', () => {
      // 基本情報を入力
      cy.contains('label', '顧客').parent().find('button[role="combobox"]').click()
      cy.contains('[role="option"]', 'ABC株式会社', { timeout: 10000 }).click()

      cy.get('input[name="subject"]').type('備考なし見積')

      // 明細の入力（備考なし）
      cy.get('input[name="items.0.name"]').type('Webシステム開発')
      cy.get('input[name="items.0.quantity"]').clear().type('1')
      cy.get('input[name="items.0.unit"]').type('式')
      cy.get('input[name="items.0.unitPrice"]').clear().type('1000000')

      // 備考は入力しない

      // 作成ボタンをクリック
      cy.intercept('POST', '/api/estimates').as('createEstimate')
      cy.contains('button', '作成').click()

      // APIレスポンスを待つ
      cy.wait('@createEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')

      // 備考列に「-」が表示されることを確認
      cy.contains('Webシステム開発').should('be.visible')
      cy.contains('Webシステム開発').parents('tr').within(() => {
        cy.contains('td', '-').should('be.visible')
      })
    })

    it('should display remarks field in the item table', () => {
      // 明細テーブルに備考列が存在することを確認
      cy.get('table thead').contains('備考').should('be.visible')

      // 備考入力フィールドが存在することを確認
      cy.get('input[name="items.0.remarks"]').should('be.visible')
    })
  })
})
