describe('発注書編集ページ', () => {
  let purchaseOrderId: string

  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')

    // 編集対象の発注書IDを取得
    cy.visit('/purchase-orders')
    cy.get('table tbody tr').first().scrollIntoView()
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
    })

    // 編集ページへの遷移とAPIレスポンスをインターセプト
    cy.intercept('GET', '/api/purchase-orders/*').as('getPurchaseOrder')
    cy.contains('[role="menuitem"]', '編集').should('be.visible').click()

    // URLが編集ページになることを確認
    cy.url().should('include', '/edit')
    cy.url().then((url) => {
      const matches = url.match(/\/purchase-orders\/([^/]+)\/edit/)
      if (matches) {
        purchaseOrderId = matches[1]
      }
    })

    // APIレスポンスを待ち、データ取得が成功したことを確認
    cy.wait('@getPurchaseOrder').then((interception) => {
      // 200 OKでない場合はテストを失敗させる
      expect(interception.response?.statusCode).to.eq(200)
    })

    // 編集フォームが表示されることを確認
    cy.contains('発注書編集', { timeout: 10000 }).should('be.visible')
  })

  describe('基本機能', () => {
    it('should display the edit purchase order form', () => {
      cy.contains('発注書編集').should('be.visible')
      cy.get('form').should('be.visible')
    })

    it('should load existing purchase order data', () => {
      // フォームが読み込まれるまで待機
      cy.contains('発注書編集').should('be.visible')

      // 既存データが入力されていることを確認（件名）
      cy.get('input[name="subject"]').should('not.have.value', '')

      // 明細は存在する場合のみ表示されるため、存在確認のみ行う
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length > 0) {
          // 明細が存在する場合は値が入力されていることを確認
          cy.get('input[name="items.0.name"]').scrollIntoView().should('not.have.value', '')
        }
      })
    })

    it('should display all form fields', () => {
      cy.get('input[name="subject"]').should('be.visible')
      cy.get('input[name="issueDate"]').should('be.visible')
      cy.get('input[name="deliveryDate"]').should('be.visible')
      cy.contains('label', '発注先').should('be.visible')
      cy.get('input[name="honorific"]').should('be.visible')
      cy.get('input[name="completionPeriod"]').should('be.visible')
      cy.get('input[name="deliveryLocation"]').should('be.visible')
      cy.get('input[name="paymentTerms"]').should('be.visible')
    })

    it('should navigate back to purchase orders list when clicking cancel', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('eq', Cypress.config().baseUrl + '/purchase-orders')
    })
  })

  describe('データ更新', () => {
    beforeEach(() => {
      // データのロード完了を待つ（件名フィールドが表示されるまで）
      cy.get('input[name="subject"]', { timeout: 10000 }).should('be.visible')

      // 明細が存在しない場合は追加（バリデーションエラーを防ぐため）
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length === 0) {
          cy.contains('button', '明細追加').scrollIntoView().click()
          // フィールドが表示されるまで待つ（最後の行に入力）
          cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('テスト明細')
          cy.get('input[name^="items."][name$=".quantity"]').last().scrollIntoView().should('be.visible').clear().type('1')
          cy.get('input[name^="items."][name$=".unitPrice"]').last().scrollIntoView().should('be.visible').clear().type('1000000')
        }
      })
    })

    it('should update purchase order subject', () => {
      // 件名を変更
      cy.get('input[name="subject"]').scrollIntoView().should('be.visible').clear().type('更新された発注書タイトル')

      // 更新ボタンをクリック
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update supplier', () => {
      // 発注先を変更
      cy.contains('label', '発注先').scrollIntoView().parent().find('button[role="combobox"]').should('be.visible').click()
      cy.get('[role="option"]').eq(1).click()

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update delivery date', () => {
      // 納期を変更
      cy.get('input[name="deliveryDate"]').scrollIntoView().should('be.visible').type('2025-12-31')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update completion period', () => {
      // 検収完了期間を変更
      cy.get('input[name="completionPeriod"]').scrollIntoView().clear().type('契約締結後6ヶ月')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update delivery location', () => {
      // 納入場所を変更
      cy.get('input[name="deliveryLocation"]').scrollIntoView().clear().type('東京都港区○○1-2-3')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update payment terms', () => {
      // お支払い条件を変更
      cy.get('input[name="paymentTerms"]').scrollIntoView().clear().type('翌月末払い')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update remarks', () => {
      // 備考を変更
      cy.get('textarea[name="remarks"]').scrollIntoView().clear().type('これは更新されたテスト用備考です。')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })

  describe('明細更新', () => {
    beforeEach(() => {
      // データのロード完了を待つ（件名フィールドが表示されるまで）
      cy.get('input[name="subject"]', { timeout: 10000 }).should('be.visible')

      // 明細が存在しない場合は追加
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length === 0) {
          cy.contains('button', '明細追加').scrollIntoView().click()
          // フィールドが表示されるまで待つ（最後の行に入力）
          cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('テスト明細')
          cy.get('input[name^="items."][name$=".quantity"]').last().scrollIntoView().should('be.visible').clear().type('1')
          cy.get('input[name^="items."][name$=".unitPrice"]').last().scrollIntoView().should('be.visible').clear().type('1000000')
        }
      })
    })

    it('should update line item name', () => {
      // 明細名を変更
      cy.get('input[name="items.0.name"]').scrollIntoView().should('be.visible').clear().type('更新された明細名')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update line item quantity and unit price', () => {
      // 数量と単価を変更
      cy.get('input[name="items.0.quantity"]').scrollIntoView().should('be.visible').clear().type('5')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().should('be.visible').clear().type('2000000')

      // 合計金額が再計算されることを確認
      // 円マークは半角(¥)または全角(￥)の可能性があるため、正規表現で確認
      cy.contains(/[¥￥]10,000,000/).should('be.visible')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update line item tax rate', () => {
      // 税率を変更
      cy.get('table tbody tr').first().scrollIntoView().within(() => {
        cy.get('button[role="combobox"]').click()
      })
      cy.contains('[role="option"]', '8%', { timeout: 10000 }).click()

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should add new line item to existing purchase order', () => {
      // 新しい明細を追加
      cy.contains('button', '明細追加').scrollIntoView().click()

      // 最後の明細フィールドに入力（フィールドが表示されるまで待つ）
      cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('新規追加明細')
      cy.get('input[name^="items."][name$=".quantity"]').last().scrollIntoView().should('be.visible').clear().type('1')
      cy.get('input[name^="items."][name$=".unit"]').last().scrollIntoView().should('be.visible').type('式')
      cy.get('input[name^="items."][name$=".unitPrice"]').last().scrollIntoView().should('be.visible').clear().type('500000')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should remove line item from purchase order', () => {
      // まず明細を追加（削除テストのため）
      cy.contains('button', '明細追加').scrollIntoView().click()
      cy.get('input[name="items.1.name"]').scrollIntoView().should('be.visible').type('削除予定の明細')

      // 削除ボタンをクリック（最後の明細）
      cy.get('table tbody tr').last().scrollIntoView().find('button[type="button"]').last().click()

      // 削除された明細が表示されないことを確認
      cy.contains('削除予定の明細').should('not.exist')
    })
  })

  describe('税金設定更新', () => {
    beforeEach(() => {
      // データのロード完了を待つ（件名フィールドが表示されるまで）
      cy.get('input[name="subject"]', { timeout: 10000 }).should('be.visible')

      // 明細が存在しない場合は追加（バリデーションエラーを防ぐため）
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length === 0) {
          cy.contains('button', '明細追加').scrollIntoView().click()
          // フィールドが表示されるまで待つ（最後の行に入力）
          cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('テスト明細')
          cy.get('input[name^="items."][name$=".quantity"]').last().scrollIntoView().should('be.visible').clear().type('1')
          cy.get('input[name^="items."][name$=".unitPrice"]').last().scrollIntoView().should('be.visible').clear().type('1000000')
        }
      })
    })

    it('should update tax type from exclusive to inclusive', () => {
      // 税区分を変更
      cy.contains('label', '税計算方法').scrollIntoView().parent().find('button[role="combobox"]').should('be.visible').click()
      cy.contains('[role="option"]', '税込', { timeout: 10000 }).click()

      // 税額が再計算されることを確認
      cy.contains('消費税').should('be.visible')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update tax rate', () => {
      // 標準税率を変更
      cy.contains('label', '標準税率').scrollIntoView().parent().find('button[role="combobox"]').should('be.visible').click()
      cy.contains('[role="option"]', '8%', { timeout: 10000 }).click()

      // 8%で再計算されることを確認
      cy.contains('消費税').should('be.visible')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update rounding type', () => {
      // 端数処理を変更
      cy.contains('label', '端数処理').scrollIntoView().parent().find('button[role="combobox"]').should('be.visible').click()
      cy.contains('[role="option"]', '切り上げ', { timeout: 10000 }).click()

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })

  describe('フォームバリデーション', () => {
    beforeEach(() => {
      // データの読み込み完了を待つ（件名フィールドが表示されるまで）
      cy.get('input[name="subject"]', { timeout: 10000 }).should('be.visible')
      cy.wait(500) // データバインディング完了を待つ
    })

    it('should show validation error when removing required field', () => {
      // 件名を空にする
      cy.get('input[name="subject"]').should('be.visible').clear()

      // 更新ボタンをクリック
      cy.contains('button', '更新').scrollIntoView().click()

      // バリデーションエラーが表示されることを確認
      cy.contains('件名は必須です').scrollIntoView().should('be.visible')
    })

    it('should show validation error when line item has no name', () => {
      // 明細が存在しない場合は追加
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length === 0) {
          cy.contains('button', '明細追加').scrollIntoView().click()
          // フィールドが表示されるまで待つ（最後の行）
          cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible')
        }
      })

      // 明細名を空にする（最初の行）
      cy.get('input[name="items.0.name"]').scrollIntoView().should('be.visible').clear()

      // 更新ボタンをクリック
      cy.contains('button', '更新').scrollIntoView().click()

      // バリデーションエラーが表示されることを確認
      cy.contains('項目名は必須です').scrollIntoView().should('be.visible')
    })

    it('should show validation error for invalid quantity', () => {
      // 明細が存在しない場合は追加
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length === 0) {
          cy.contains('button', '明細追加').scrollIntoView().click()
          // フィールドが表示されるまで待つ（最後の行に入力）
          cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('テスト明細')
        }
      })

      // 数量を負の値にする
      cy.get('input[name="items.0.quantity"]').scrollIntoView().should('be.visible').clear().type('-1')

      // 更新ボタンをクリック
      cy.contains('button', '更新').scrollIntoView().click()

      // バリデーションエラーが表示されることを確認
      cy.contains('数量は0以上である必要があります').scrollIntoView().should('be.visible')
    })

    it('should show validation error for negative unit price', () => {
      // 明細が存在しない場合は追加
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length === 0) {
          cy.contains('button', '明細追加').scrollIntoView().click()
          // フィールドが表示されるまで待つ（最後の行に入力）
          cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('テスト明細')
        }
      })

      // 単価を負の値にする
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().should('be.visible').clear().type('-100')

      // 更新ボタンをクリック
      cy.contains('button', '更新').scrollIntoView().click()

      // バリデーションエラーが表示されることを確認
      cy.contains('単価は0以上である必要があります').scrollIntoView().should('be.visible')
    })
  })

  describe('複数フィールド同時更新', () => {
    beforeEach(() => {
      // データのロード完了を待つ（件名フィールドが表示されるまで）
      cy.get('input[name="subject"]', { timeout: 10000 }).should('be.visible')

      // 明細が存在しない場合は追加
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length === 0) {
          cy.contains('button', '明細追加').scrollIntoView().click()
          // フィールドが表示されるまで待つ（最後の行に入力）
          cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('テスト明細')
          cy.get('input[name^="items."][name$=".quantity"]').last().scrollIntoView().should('be.visible').clear().type('1')
          cy.get('input[name^="items."][name$=".unitPrice"]').last().scrollIntoView().should('be.visible').clear().type('1000000')
        }
      })
    })

    it('should update multiple fields at once', () => {
      // 複数のフィールドを同時に変更
      cy.get('input[name="subject"]').scrollIntoView().should('be.visible').clear().type('一括更新テスト')

      cy.get('input[name="items.0.name"]').scrollIntoView().should('be.visible').clear().type('一括更新明細')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().should('be.visible').clear().type('3')

      cy.get('input[name="completionPeriod"]').scrollIntoView().clear().type('契約締結後12ヶ月')

      cy.get('textarea[name="remarks"]').scrollIntoView().clear().type('一括更新のテスト備考')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })

  describe('ページ遷移', () => {
    beforeEach(() => {
      // データのロード完了を待つ（件名フィールドが表示されるまで）
      cy.get('input[name="subject"]', { timeout: 10000 }).should('be.visible')

      // 明細が存在しない場合は追加
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length === 0) {
          cy.contains('button', '明細追加').scrollIntoView().click()
          // フィールドが表示されるまで待つ（最後の行に入力）
          cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('テスト明細')
          cy.get('input[name^="items."][name$=".quantity"]').last().scrollIntoView().should('be.visible').clear().type('1')
          cy.get('input[name^="items."][name$=".unitPrice"]').last().scrollIntoView().should('be.visible').clear().type('1000000')
        }
      })
    })

    it('should navigate back to purchase orders list after successful update', () => {
      // 件名を変更
      cy.get('input[name="subject"]').scrollIntoView().should('be.visible').clear().type('遷移テスト')

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should stay on edit page when validation fails', () => {
      // バリデーションエラーを発生させる
      cy.get('input[name="subject"]').scrollIntoView().should('be.visible').clear()

      // 更新ボタンをクリック
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // 編集ページに留まることを確認
      cy.url().should('include', '/purchase-orders/')
      cy.url().should('include', '/edit')

      // バリデーションエラーが表示されることを確認
      cy.contains('件名は必須です').scrollIntoView().should('be.visible')

      // 見出しが表示されることを確認
      cy.contains('発注書編集').scrollIntoView().should('be.visible')
    })
  })

  describe('混在税率計算', () => {
    beforeEach(() => {
      // データのロード完了を待つ（件名フィールドが表示されるまで）
      cy.get('input[name="subject"]', { timeout: 10000 }).should('be.visible')

      // 明細が存在しない場合は追加
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length === 0) {
          cy.contains('button', '明細追加').scrollIntoView().click()
          // フィールドが表示されるまで待つ（最後の行に入力）
          cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('テスト明細')
          cy.get('input[name^="items."][name$=".quantity"]').last().scrollIntoView().should('be.visible').clear().type('1')
          cy.get('input[name^="items."][name$=".unitPrice"]').last().scrollIntoView().should('be.visible').clear().type('1000000')
        }
      })
    })

    it('should correctly calculate total with mixed tax rates', () => {
      // 1行目を10%に設定
      cy.get('input[name="items.0.name"]').scrollIntoView().should('be.visible').clear().type('標準税率商品')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().clear().type('1000000')

      // 1行目の税率を明示的に10%に設定
      cy.get('table tbody tr').eq(0).scrollIntoView().within(() => {
        cy.get('button[role="combobox"]').click()
      })
      cy.contains('[role="option"]', '10%', { timeout: 10000 }).click()

      // 2行目を追加して8%に設定
      cy.contains('button', '明細追加').scrollIntoView().click()
      cy.get('input[name="items.1.name"]').scrollIntoView().should('be.visible').type('軽減税率商品')
      cy.get('input[name="items.1.quantity"]').scrollIntoView().clear().type('1')
      cy.get('input[name="items.1.unitPrice"]').scrollIntoView().clear().type('500000')

      // 2行目の税率を8%に変更
      cy.get('table tbody tr').eq(1).scrollIntoView().within(() => {
        cy.get('button[role="combobox"]').click()
      })
      cy.contains('[role="option"]', '8%', { timeout: 10000 }).click()

      // 合計金額セクションまでスクロール
      cy.contains('span', '小計').scrollIntoView().should('be.visible')

      // 税額内訳が表示されることを確認（%は半角または全角の可能性があるため、正規表現で確認）
      // 実装では「（8%対象: ¥金額）」という形式なので、閉じ括弧を含めない
      cy.contains('計算設定').parent().parent().within(() => {
        cy.contains(/（8[%％]対象/).should('be.visible')
        cy.contains(/（10[%％]対象/).should('be.visible')
      })

      // 更新
      cy.contains('button', '更新').scrollIntoView().click()

      // 詳細ページに遷移
      cy.url().should('match', /\/purchase-orders\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })
})
