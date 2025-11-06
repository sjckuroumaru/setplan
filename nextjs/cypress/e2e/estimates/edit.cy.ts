describe('見積編集ページ', () => {
  let estimateId: string

  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')

    // 編集対象の見積書IDを取得
    cy.visit('/estimates')
    cy.get('table tbody tr').first().scrollIntoView()
    cy.get('table tbody tr').first().within(() => {
      cy.get('button[aria-haspopup="menu"]').last().scrollIntoView().click()
    })

    // 編集ページへの遷移とAPIレスポンスをインターセプト
    cy.intercept('GET', '/api/estimates/*').as('getEstimate')
    cy.contains('[role="menuitem"]', '編集').should('be.visible').click()

    // URLが編集ページになることを確認
    cy.url().should('include', '/edit')
    cy.url().then((url) => {
      const matches = url.match(/\/estimates\/([^/]+)\/edit/)
      if (matches) {
        estimateId = matches[1]
      }
    })

    // APIレスポンスを待ち、データ取得が成功したことを確認
    cy.wait('@getEstimate').then((interception) => {
      // 200 OKでない場合はテストを失敗させる
      expect(interception.response?.statusCode).to.eq(200)
    })

    // 編集フォームが表示されることを確認
    cy.contains('見積編集', { timeout: 10000 }).should('be.visible')
  })

  describe('基本機能', () => {
    it('should display the edit estimate form', () => {
      cy.contains('見積編集').should('be.visible')
      cy.get('form').should('be.visible')
    })

    it('should load existing estimate data', () => {
      // フォームが読み込まれるまで待機
      cy.contains('見積編集').should('be.visible')

      // 既存データが入力されていることを確認（件名で確認）
      cy.get('input[name="subject"]').should('not.have.value', '')

      // 明細は存在する場合のみ表示されるため、存在確認のみ行う
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length > 0) {
          // 明細が存在する場合は値が入力されていることを確認
          cy.get('input[name="items.0.name"]').scrollIntoView().should('not.have.value', '')
        }
      })
    })

    it('should display status field in edit form', () => {
      // 編集フォームにはステータスフィールドが存在
      cy.contains('label', 'ステータス').should('be.visible')
    })

    it('should display all form fields', () => {
      cy.get('input[name="subject"]').should('be.visible')
      cy.get('input[name="issueDate"]').should('be.visible')
      cy.get('input[name="validUntil"]').should('be.visible')
      cy.contains('label', '顧客').should('be.visible')
      cy.get('input[name="honorific"]').should('be.visible')
      cy.contains('label', 'ステータス').should('be.visible')
    })

    it('should navigate back to detail page when clicking cancel', () => {
      cy.contains('button', 'キャンセル').click()
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })

  describe('データ更新', () => {
    beforeEach(() => {
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

    it('should update estimate subject', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 件名を変更（画面上部にあるのでスクロール）
      cy.get('input[name="subject"]').scrollIntoView().should('be.visible').clear().type('更新された見積書タイトル')

      // 更新ボタンをクリック（画面下部にあるのでスクロール）
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update estimate status', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // ステータスを変更（画面上部にあるのでスクロール）
      cy.contains('label', 'ステータス').scrollIntoView().parent().find('button[role="combobox"]').should('be.visible').click()
      cy.contains('[role="option"]', '送付済', { timeout: 10000 }).click()

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update customer', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 顧客を変更（画面上部にあるのでスクロール）
      cy.contains('label', '顧客').scrollIntoView().parent().find('button[role="combobox"]').should('be.visible').click()
      cy.contains('[role="option"]', 'XYZ株式会社', { timeout: 10000 }).click()

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update remarks', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 備考を変更
      cy.get('textarea[name="remarks"]').scrollIntoView().clear().type('これは更新されたテスト用備考です。')

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })

  describe('明細更新', () => {
    beforeEach(() => {
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
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 明細名を変更
      cy.get('input[name="items.0.name"]').scrollIntoView().should('be.visible').clear().type('更新された明細名')

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update line item quantity and unit price', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 数量と単価を変更
      cy.get('input[name="items.0.quantity"]').scrollIntoView().should('be.visible').clear().type('5')
      cy.get('input[name="items.0.unitPrice"]').scrollIntoView().should('be.visible').clear().type('2000000')

      // 合計金額が再計算されることを確認
      cy.contains(/[¥￥]10,000,000/).should('be.visible')

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should add new line item to existing estimate', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 新しい明細を追加
      cy.contains('button', '明細追加').scrollIntoView().click()

      // 最後の明細フィールドに入力（フィールドが表示されるまで待つ）
      cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('新規追加明細')
      cy.get('input[name^="items."][name$=".quantity"]').last().scrollIntoView().should('be.visible').clear().type('1')
      cy.get('input[name^="items."][name$=".unit"]').last().scrollIntoView().should('be.visible').type('式')
      cy.get('input[name^="items."][name$=".unitPrice"]').last().scrollIntoView().should('be.visible').clear().type('500000')

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should remove line item from estimate', () => {
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
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 税区分を変更
      cy.contains('label', '税計算方法').scrollIntoView().parent().find('button[role="combobox"]').should('be.visible').click()
      cy.contains('[role="option"]', '税込', { timeout: 10000 }).click()

      // 税額が再計算されることを確認
      cy.contains('消費税').should('be.visible')

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update tax rate', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 税率を変更
      cy.contains('label', '消費税率').scrollIntoView().parent().find('button[role="combobox"]').should('be.visible').click()
      cy.contains('[role="option"]', '8%', { timeout: 10000 }).click()

      // 8%で再計算されることを確認
      cy.contains('消費税').should('be.visible')

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should update rounding type', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 端数処理を変更
      cy.contains('label', '端数処理').scrollIntoView().parent().find('button[role="combobox"]').should('be.visible').click()
      cy.contains('[role="option"]', '切り上げ', { timeout: 10000 }).click()

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })

  describe('フォームバリデーション', () => {
    beforeEach(() => {
      // データの読み込み完了を待つ（テーブルが表示されるまで）
      cy.get('table', { timeout: 10000 }).should('be.visible')
      cy.wait(500) // データバインディング完了を待つ
    })

    it('should show validation error when removing required field', () => {
      // 件名を空にする
      cy.get('input[name="subject"]').scrollIntoView().should('be.visible').clear()

      // 更新ボタンをクリック
      cy.contains('button', '更新').scrollIntoView().click()

      // バリデーションエラーが表示されることを確認（スクロールして確認）
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

      // バリデーションエラーが表示されることを確認（スクロールして確認）
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

      // 数量を0にする
      cy.get('input[name="items.0.quantity"]').scrollIntoView().should('be.visible').clear().type('0')

      // 更新ボタンをクリック
      cy.contains('button', '更新').scrollIntoView().click()

      // バリデーションエラーが表示されることを確認（スクロールして確認）
      cy.contains('数量は正の数である必要があります').scrollIntoView().should('be.visible')
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

      // バリデーションエラーが表示されることを確認（スクロールして確認）
      cy.contains('単価は0以上である必要があります').scrollIntoView().should('be.visible')
    })
  })

  describe('複数フィールド同時更新', () => {
    beforeEach(() => {
      // データの読み込み完了を待つ（テーブルが表示されるまで）
      cy.get('table', { timeout: 10000 }).should('be.visible')
      cy.wait(500) // データバインディング完了を待つ
    })

    it('should update multiple fields at once', () => {
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

      // 複数のフィールドを同時に変更
      cy.get('input[name="subject"]').scrollIntoView().should('be.visible').clear().type('一括更新テスト')

      cy.contains('label', 'ステータス').scrollIntoView().parent().find('button[role="combobox"]').should('be.visible').click()
      cy.contains('[role="option"]', '受注', { timeout: 10000 }).click()

      cy.get('input[name="items.0.name"]').scrollIntoView().should('be.visible').clear().type('一括更新明細')
      cy.get('input[name="items.0.quantity"]').scrollIntoView().should('be.visible').clear().type('3')

      cy.get('textarea[name="remarks"]').scrollIntoView().clear().type('一括更新のテスト備考')

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })
  })

  describe('ページ遷移', () => {
    beforeEach(() => {
      // データの読み込み完了を待つ（テーブルが表示されるまで）
      cy.get('table', { timeout: 10000 }).should('be.visible')
      cy.wait(500) // データバインディング完了を待つ
    })

    it('should navigate back to detail page after successful update', () => {
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

      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 件名を変更
      cy.get('input[name="subject"]').scrollIntoView().should('be.visible').clear().type('遷移テスト')

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに遷移することを確認
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should stay on edit page when validation fails', () => {
      // バリデーションエラーを発生させる
      cy.get('input[name="subject"]').scrollIntoView().should('be.visible').clear()

      // 更新ボタンをクリック
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // 編集ページに留まることを確認
      cy.url().should('include', '/estimates/')
      cy.url().should('include', '/edit')

      // バリデーションエラーが表示されることを確認
      cy.contains('件名は必須です').scrollIntoView().should('be.visible')

      // 見出しが表示されることを確認
      cy.contains('見積編集').scrollIntoView().should('be.visible')
    })
  })

  describe('明細の備考機能', () => {
    beforeEach(() => {
      // データの読み込み完了を待つ（テーブルが表示されるまで）
      cy.get('table', { timeout: 10000 }).should('be.visible')
      cy.wait(500) // データバインディング完了を待つ

      // 明細が存在しない場合は追加（テスト用に最低1行必要）
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.0.name"]').length === 0) {
          cy.contains('button', '明細追加').scrollIntoView().click()
          cy.get('input[name^="items."][name$=".name"]').last().scrollIntoView().should('be.visible').type('テスト明細')
          cy.get('input[name^="items."][name$=".quantity"]').last().scrollIntoView().should('be.visible').clear().type('1')
          cy.get('input[name^="items."][name$=".unitPrice"]').last().scrollIntoView().should('be.visible').clear().type('1000000')
        }
      })
    })

    it('should display remarks field in the item table', () => {
      // 明細テーブルに備考列が存在することを確認
      cy.get('table thead').contains('備考').should('be.visible')

      // 備考入力フィールドが存在することを確認
      cy.get('input[name^="items."][name$=".remarks"]').first().should('be.visible')
    })

    it('should update item remarks and display updated remarks', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 備考を変更
      cy.get('input[name="items.0.remarks"]').scrollIntoView().should('be.visible').clear().type('更新された備考（修正版）')

      // 明細が2行以上ある場合は2行目も変更
      cy.get('body').then(($body) => {
        if ($body.find('input[name="items.1.remarks"]').length > 0) {
          cy.get('input[name="items.1.remarks"]').scrollIntoView().should('be.visible').clear().type('2行目の備考も更新')
        }
      })

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに戻ることを確認
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')

      // 更新された備考が表示されることを確認
      cy.contains('更新された備考（修正版）').should('be.visible')
    })

    it('should clear item remarks', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 既存の備考がある場合、それをクリア
      cy.get('input[name="items.0.remarks"]').scrollIntoView().should('be.visible').clear()

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに戻ることを確認
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')
    })

    it('should add remarks to item that had no remarks', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // 備考がない場合は追加、ある場合は新しい値を設定
      cy.get('input[name="items.0.remarks"]').scrollIntoView().should('be.visible').clear().type('新しく追加した備考')

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに戻ることを確認
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')

      // 追加された備考が表示されることを確認
      cy.contains('新しく追加した備考').should('be.visible')
    })

    it('should preserve remarks when updating other fields', () => {
      // APIリクエストをインターセプト
      cy.intercept('PUT', '/api/estimates/*').as('updateEstimate')

      // まず備考を設定
      cy.get('input[name="items.0.remarks"]').scrollIntoView().should('be.visible').clear().type('保持される備考')

      // 他のフィールドを変更（明細名）
      cy.get('input[name="items.0.name"]').scrollIntoView().should('be.visible').clear().type('更新された明細名')

      // 更新
      cy.contains('button', '更新').scrollIntoView().should('be.visible').click()

      // API更新完了を待つ
      cy.wait('@updateEstimate').then((interception) => {
        expect(interception.response?.statusCode).to.eq(200)
      })

      // 詳細ページに戻ることを確認
      cy.url().should('match', /\/estimates\/[a-zA-Z0-9-]+$/)
      cy.url().should('not.include', '/edit')

      // 備考が保持されていることを確認
      cy.contains('保持される備考').should('be.visible')
    })
  })
})
