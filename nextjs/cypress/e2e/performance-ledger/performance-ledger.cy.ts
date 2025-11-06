describe('実績台帳ページ', () => {
  // テストファイル全体で1回だけDBをリセット＆シード
  before(() => {
    cy.resetAndSeedDb()
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
    cy.visit('/performance-ledger')
  })

  describe('基本機能', () => {
    it('should display the performance ledger page', () => {
      cy.contains('実績台帳').should('be.visible')
      cy.contains('案件の収益性を分析・管理').should('be.visible')
    })

    it('should display filter card', () => {
      cy.contains('フィルター').should('be.visible')
      cy.get('[role="combobox"]').should('have.length.at.least', 2)
    })

    it('should display performance ledger table', () => {
      cy.get('table').should('be.visible')

      // テーブルヘッダーの確認（左側の列）
      cy.contains('th', '案件番号').should('be.visible')
      cy.contains('th', '案件名').should('be.visible')
      cy.contains('th', '発行日').should('be.visible')
      cy.contains('th', '発注先').should('be.visible')
      cy.contains('th', '種別').should('be.visible')
      cy.contains('th', '記入者').should('be.visible')
      cy.contains('th', 'チーム').should('be.visible')
      cy.contains('th', 'ステータス').should('be.visible')
      cy.contains('th', 'メモ').should('be.visible')
      cy.contains('th', '発注金額').should('be.visible')

      // 横スクロールが必要な列（右側の列）
      cy.contains('th', '納期').scrollIntoView()
      cy.contains('th', '納期').should('be.visible')
      cy.contains('th', '納品日').scrollIntoView()
      cy.contains('th', '納品日').should('be.visible')
      cy.contains('th', '請求可能日').scrollIntoView()
      cy.contains('th', '請求可能日').should('be.visible')
      cy.contains('th', '外注費').scrollIntoView()
      cy.contains('th', '外注費').should('be.visible')
      cy.contains('th', 'サーバー費').scrollIntoView()
      cy.contains('th', 'サーバー費').should('be.visible')
      cy.contains('th', '投下工数').scrollIntoView()
      cy.contains('th', '投下工数').should('be.visible')
      cy.contains('th', '粗利').scrollIntoView()
      cy.contains('th', '粗利').should('be.visible')
      cy.contains('th', '粗利率').scrollIntoView()
      cy.contains('th', '粗利率').should('be.visible')
    })

    it('should display data in table rows', () => {
      // ローディングが完了するまで待つ
      cy.get('table tbody tr').should('have.length.at.least', 1)

      // データが表示されることを確認（スケルトンではない）
      cy.contains('th', '案件番号').parents('table').find('tbody tr').first().within(() => {
        cy.get('td').first().should('not.be.empty')
      })
    })
  })

  describe('フィルター機能', () => {
    it('should filter by project type', () => {
      // 案件種別フィルターを開く
      cy.get('[role="combobox"]').first().click()
      cy.contains('[role="option"]', '開発').click()

      // テーブルにデータが表示される（フィルターが適用される）
      cy.wait(1000)
      cy.get('table tbody tr').should('exist')
    })

    it('should show completed projects when status filter is all', () => {
      // ステータスフィルターを開く（2番目のcombobox）
      cy.get('[role="combobox"]').eq(1).click()
      cy.contains('[role="option"]', 'すべて').click()

      // フィルターが適用される
      cy.wait(1000)
      cy.get('table').should('be.visible')
    })

    it('should hide completed projects by default', () => {
      // デフォルトでステータスフィルターが「完了以外」であることを確認
      cy.get('[role="combobox"]').eq(1).should('contain', '完了以外')
    })

    it('should filter by status', () => {
      // ステータスフィルターを開く
      cy.get('[role="combobox"]').eq(1).click()
      cy.contains('[role="option"]', '計画中').click()

      // フィルターが適用される
      cy.wait(1000)
      cy.get('table').should('be.visible')
    })

    it('should filter by date range', () => {
      // 開始日と終了日を入力
      cy.get('input[type="date"]').first().type('2024-01-01')
      cy.get('input[type="date"]').last().type('2024-12-31')

      // フィルターが適用される
      cy.wait(1000)
      cy.get('table').should('be.visible')
    })

    it('should reset to first page when filter changes', () => {
      // ページネーション情報が表示されていることを確認
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("次へ")').length > 0) {
          // 次のページに移動
          cy.contains('button', '次へ').then(($btn) => {
            if (!$btn.is(':disabled')) {
              cy.wrap($btn).click()
              cy.wait(1000)

              // フィルターを変更
              cy.get('[role="combobox"]').first().click()
              cy.contains('[role="option"]', 'SES').click()

              // 1ページ目に戻ることを確認
              cy.wait(1000)
              cy.get('body').should('contain', '1 /')
            }
          })
        }
      })
    })
  })

  describe('ソート機能', () => {
    it('should sort by project number', () => {
      // 案件番号でソート
      cy.contains('th', '案件番号').click()
      cy.wait(1000)

      // ソートアイコンが表示されることを確認
      cy.contains('th', '案件番号').find('svg').should('exist')
    })

    it('should sort by project name', () => {
      // 案件名でソート
      cy.contains('th', '案件名').click()
      cy.wait(1000)

      // ソートアイコンが表示されることを確認
      cy.contains('th', '案件名').find('svg').should('exist')
    })

    it('should sort by issue date', () => {
      // 発行日でソート（デフォルト降順）
      cy.contains('th', '発行日').click()
      cy.wait(1000)

      // ソートアイコンが表示されることを確認
      cy.contains('th', '発行日').find('svg').should('exist')

      // 再度クリックで昇順に切り替わる
      cy.contains('th', '発行日').click()
      cy.wait(1000)
      cy.contains('th', '発行日').find('svg').should('exist')
    })

    it('should sort by order amount', () => {
      // 発注金額でソート
      cy.contains('th', '発注金額').click()
      cy.wait(1000)

      // ソートアイコンが表示されることを確認
      cy.contains('th', '発注金額').find('svg').should('exist')
    })

    it('should sort by labor cost', () => {
      // 投下工数でソート
      cy.contains('th', '投下工数').click()
      cy.wait(1000)

      // ソートアイコンが表示されることを確認
      cy.contains('th', '投下工数').find('svg').should('exist')
    })

    it('should sort by gross profit', () => {
      // 粗利でソート
      cy.contains('th', '粗利').click()
      cy.wait(1000)

      // ソートアイコンが表示されることを確認
      cy.contains('th', '粗利').find('svg').should('exist')
    })

    it('should sort by gross profit rate', () => {
      // 粗利率でソート
      cy.contains('th', '粗利率').click()
      cy.wait(1000)

      // ソートアイコンが表示されることを確認
      cy.contains('th', '粗利率').find('svg').should('exist')
    })

    it('should toggle sort order when clicking same column twice', () => {
      // 発行日でソート
      cy.contains('th', '発行日').click()
      cy.wait(1000)

      // 再度クリック
      cy.contains('th', '発行日').click()
      cy.wait(1000)

      // ソートが切り替わる（アイコンが変わる）
      cy.contains('th', '発行日').find('svg').should('exist')
    })
  })

  describe('データ表示', () => {
    it('should display formatted currency', () => {
      // 金額が「¥」付きで表示されることを確認（発注金額の列）
      // 実績台帳のメインテーブルを探す（案件番号ヘッダーがあるテーブル）
      cy.contains('th', '案件番号').parents('table').find('tbody tr').first().within(() => {
        // 発注金額の列を探す（列番号9）
        cy.get('td').eq(9).should('contain', '¥')
      })
    })

    it('should display formatted date', () => {
      // 日付がフォーマットされて表示されることを確認
      // 「-」または日付形式（数字とスラッシュ）が表示される
      cy.contains('th', '案件番号').parents('table').find('tbody tr').first().within(() => {
        cy.get('td').eq(2).invoke('text').should('match', /\d|^-$/)
      })
    })

    it('should display project type labels in Japanese', () => {
      // 種別が日本語で表示されることを確認
      cy.contains('th', '案件番号').parents('table').find('tbody tr').first().within(() => {
        cy.get('td').eq(4).invoke('text').should('match', /開発|SES|保守|その他/)
      })
    })

    it('should display status labels in Japanese', () => {
      // ステータスが日本語で表示されることを確認
      cy.contains('th', '案件番号').parents('table').find('tbody tr').first().within(() => {
        cy.get('td').eq(7).invoke('text').should('match', /計画中|開発中|稼働中|停止中|完了/)
      })
    })

    it('should display dash for null values', () => {
      // null値が「-」で表示されることを確認
      // 右側の列をスクロールして確認
      cy.contains('th', '案件番号').parents('table').find('tbody tr').first().scrollIntoView()
      cy.contains('th', '案件番号').parents('table').find('tbody').within(() => {
        // テーブル内に「-」が少なくとも1つ存在することを確認
        cy.contains('-').should('exist')
      })
    })

    it('should display gross profit rate with percentage', () => {
      // 粗利率が「%」付きで表示されることを確認
      cy.contains('th', '案件番号').parents('table').find('tbody tr').first().within(() => {
        cy.get('td').last().scrollIntoView()
        cy.get('td').last().should('contain', '%')
      })
    })

    it('should display all cost fields with currency format', () => {
      // 外注費、サーバー費、投下工数が金額フォーマットで表示されることを確認
      cy.contains('th', '案件番号').parents('table').find('tbody tr').first().within(() => {
        // 外注費（列番号13）
        cy.get('td').eq(13).scrollIntoView()
        cy.get('td').eq(13).should('contain', '¥')
        // サーバー費（列番号14）
        cy.get('td').eq(14).scrollIntoView()
        cy.get('td').eq(14).should('contain', '¥')
        // 投下工数（列番号15）
        cy.get('td').eq(15).scrollIntoView()
        cy.get('td').eq(15).should('contain', '¥')
        // 粗利（列番号16）
        cy.get('td').eq(16).scrollIntoView()
        cy.get('td').eq(16).should('contain', '¥')
      })
    })
  })

  describe('粗利率の色分け', () => {
    it('should apply correct color classes to profit rate', () => {
      // 粗利率の色分けが適用されることを確認
      cy.contains('th', '案件番号').parents('table').find('tbody tr').first().within(() => {
        // 粗利率の列（最後の列）を横スクロールして表示
        cy.get('td').last().as('profitRateCell')
        cy.get('@profitRateCell').scrollIntoView()
        // 色分けクラスが適用されていることを確認（text-から始まるクラス）
        cy.get('@profitRateCell').invoke('attr', 'class').should('match', /text-(red|yellow|green)/)
      })
    })

    it('should display negative profit rate in red', () => {
      // マイナスの粗利率が赤色で表示されることを確認
      // （テストデータにマイナスがある場合）
      cy.get('table tbody').then(($tbody) => {
        const hasNegative = $tbody.text().includes('-')
        if (hasNegative) {
          cy.get('table tbody tr').each(($row) => {
            cy.wrap($row).find('td').last().scrollIntoView().invoke('text').then((text) => {
              if (text.includes('-')) {
                cy.wrap($row).find('td').last().should('have.class', 'text-red-700')
              }
            })
          })
        }
      })
    })
  })

  describe('ページネーション', () => {
    it('should display pagination controls', () => {
      // ページネーション情報が表示される（データがある場合）
      cy.get('body').then(($body) => {
        if ($body.find('table tbody tr td').length > 0) {
          // データがある場合、ページネーションが表示される
          cy.contains('件中').should('be.visible')
          cy.contains('件を表示').should('be.visible')
        }
      })
    })

    it('should navigate to next page', () => {
      // 次のページに移動できるか確認（次ページがある場合）
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("次へ")').length > 0) {
          cy.contains('button', '次へ').then(($btn) => {
            if (!$btn.is(':disabled')) {
              cy.wrap($btn).click()
              cy.wait(1000)

              // ページ番号が更新されることを確認
              cy.get('body').should('contain', '/')
            }
          })
        }
      })
    })

    it('should navigate to previous page', () => {
      // 次のページに移動してから前のページに戻る（複数ページがある場合）
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("次へ")').length > 0) {
          cy.contains('button', '次へ').then(($nextBtn) => {
            if (!$nextBtn.is(':disabled')) {
              cy.wrap($nextBtn).click()
              cy.wait(1000)

              // 前のページに戻る
              cy.contains('button', '前へ').should('not.be.disabled').click()
              cy.wait(1000)

              // 1ページ目に戻ることを確認
              cy.get('body').should('contain', '1 /')
            }
          })
        }
      })
    })

    it('should disable previous button on first page', () => {
      // 1ページ目では「前へ」ボタンが無効
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("前へ")').length > 0) {
          cy.contains('button', '前へ').should('be.disabled')
        }
      })
    })

    it('should display current page and total pages', () => {
      // 現在のページと総ページ数が表示される（データがある場合）
      cy.get('body').then(($body) => {
        if ($body.find('table tbody tr td').length > 0) {
          cy.get('body').should('match', /\d+ \/ \d+/)
        }
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('should display error alert when API fails', () => {
      // APIエラーをシミュレート
      cy.intercept('GET', '/api/performance-ledger*', {
        statusCode: 500,
        body: { error: 'サーバーエラーが発生しました' },
      }).as('performanceLedgerError')

      // ページをリロード
      cy.visit('/performance-ledger')

      // APIレスポンスを待つ
      cy.wait('@performanceLedgerError')

      // エラーアラートが表示されることを確認
      cy.get('[role="alert"]', { timeout: 10000 }).should('be.visible')
    })

    it('should display empty state when no data', () => {
      // 空のデータをシミュレート
      cy.intercept('GET', '/api/performance-ledger*', {
        statusCode: 200,
        body: {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: 50,
          },
        },
      }).as('emptyData')

      // ページをリロード
      cy.visit('/performance-ledger')

      // APIレスポンスを待つ
      cy.wait('@emptyData')

      // 空の状態メッセージが表示される
      cy.contains('データが見つかりません').should('be.visible')
    })
  })

  describe('ローディング状態', () => {
    it('should display skeleton while loading', () => {
      // ローディング中のスケルトンを確認するため、APIレスポンスを遅延させる
      cy.intercept('GET', '/api/performance-ledger*', (req) => {
        req.reply((res) => {
          res.delay = 1000
        })
      }).as('delayedResponse')

      // ページをリロード
      cy.visit('/performance-ledger')

      // スケルトンが表示される
      cy.get('table tbody tr').should('have.length.at.least', 1)

      // APIレスポンスを待つ
      cy.wait('@delayedResponse')
    })
  })

  describe('レスポンシブ対応', () => {
    it('should display table with horizontal scroll on small screens', () => {
      // テーブルが横スクロール可能であることを確認
      cy.get('table').parent().should('have.css', 'overflow-x')
    })
  })

  describe('統合テスト', () => {
    it('should filter, sort, and paginate together', () => {
      // フィルターを適用
      cy.get('[role="combobox"]').first().click()
      cy.contains('[role="option"]', '開発').click()
      cy.wait(1000)

      // ソートを適用
      cy.contains('th', '発注金額').click()
      cy.wait(1000)

      // データが表示されることを確認
      cy.get('table tbody tr').should('exist')

      // ページネーションが機能することを確認（複数ページがある場合）
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("次へ")').length > 0) {
          cy.contains('button', '次へ').then(($btn) => {
            if (!$btn.is(':disabled')) {
              cy.wrap($btn).click()
              cy.wait(1000)
              cy.get('table tbody tr').should('exist')
            }
          })
        }
      })
    })

    it('should maintain state when navigating back from projects', () => {
      // サイドバーから設定メニューを展開
      cy.contains('設定').click()
      // 案件管理に移動
      cy.contains('案件管理').click()
      cy.url().should('include', '/projects')

      // 実績台帳に戻る
      cy.contains('実績台帳').click()
      cy.url().should('include', '/performance-ledger')

      // ページが正しく表示される
      cy.contains('実績台帳').should('be.visible')
      cy.get('table').should('be.visible')
    })
  })

  describe('アクセス権限', () => {
    it('should allow admin to access performance ledger', () => {
      cy.url().should('include', '/performance-ledger')
      cy.contains('実績台帳').should('be.visible')
    })

    it('should allow regular user to access performance ledger', () => {
      // 設計書では全ユーザーが閲覧可能
      cy.login('yamada@example.com', 'password123')
      cy.visit('/performance-ledger')

      // ページが表示されることを確認
      cy.contains('実績台帳').should('be.visible')
    })
  })
})
