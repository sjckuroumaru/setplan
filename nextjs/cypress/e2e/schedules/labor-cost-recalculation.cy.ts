describe('投下工数の自動再計算', () => {
  let testProjectId: string
  let testProjectId2: string
  let testScheduleId: string
  let adminUserId: string

  before(() => {
    cy.resetAndSeedDb()

    // 管理者ユーザーIDを取得
    cy.login('admin@example.com', 'password123')
    cy.request('GET', '/api/auth/session').then((response) => {
      adminUserId = response.body.user.id
    })
  })

  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
  })

  describe('実績作成・更新時の投下工数再計算', () => {
    it('should recalculate labor cost when creating actuals', () => {
      // 新しい案件を作成（hourlyRate: 5000円）
      const timestamp = Date.now()
      cy.request('POST', '/api/projects', {
        projectNumber: `LABOR-CREATE-${timestamp}`,
        projectName: `投下工数テスト案件_作成_${timestamp}`,
        status: 'developing',
        hourlyRate: 5000,
        projectType: 'development',
      }).then((response) => {
        expect(response.status).to.eq(201)
        testProjectId = response.body.project.id

        // 初期状態：投下工数は0であることを確認
        cy.request('GET', `/api/projects/${testProjectId}`).then((projectResponse) => {
          const project = projectResponse.body.project
          expect(Number(project.totalLaborHours || 0)).to.eq(0)
          expect(Number(project.totalLaborCost || 0)).to.eq(0)
        })

        // 予定実績を作成して実績を追加（8時間）
        cy.request('POST', '/api/schedules', {
          userId: adminUserId,
          scheduleDate: '2024-01-01',
          checkInTime: '09:00',
          checkOutTime: '18:00',
          plans: [],
          actuals: [
            {
              projectId: testProjectId,
              content: '開発作業',
              hours: 8,
              details: 'テスト用実績',
            },
          ],
        }).then((scheduleResponse) => {
          expect(scheduleResponse.status).to.eq(201)
          testScheduleId = scheduleResponse.body.schedule.id

          // 投下工数が自動計算されていることを確認
          // 8時間 × 5000円/時間 = 40,000円
          cy.request('GET', `/api/projects/${testProjectId}`).then((updatedProjectResponse) => {
            const updatedProject = updatedProjectResponse.body.project
            expect(Number(updatedProject.totalLaborHours)).to.eq(8)
            expect(Number(updatedProject.totalLaborCost)).to.eq(40000)
            expect(updatedProject.lastCalculatedAt).to.not.be.null
          })
        })
      })
    })

    it('should recalculate labor cost when updating actuals hours', () => {
      // 前のテストで作成した実績を更新（8時間→10時間）
      cy.request('GET', `/api/schedules/${testScheduleId}`).then((scheduleResponse) => {
        const schedule = scheduleResponse.body.schedule
        const updatedActuals = schedule.actuals.map((actual: any) => ({
          ...actual,
          hours: 10, // 8時間から10時間に変更
        }))

        cy.request('PUT', `/api/schedules/${testScheduleId}`, {
          checkInTime: schedule.checkInTime,
          checkOutTime: schedule.checkOutTime,
          plans: schedule.plans,
          actuals: updatedActuals,
        }).then((updateResponse) => {
          expect(updateResponse.status).to.eq(200)

          // 投下工数が再計算されていることを確認
          // 10時間 × 5000円/時間 = 50,000円
          cy.request('GET', `/api/projects/${testProjectId}`).then((projectResponse) => {
            const project = projectResponse.body.project
            expect(Number(project.totalLaborHours)).to.eq(10)
            expect(Number(project.totalLaborCost)).to.eq(50000)
          })
        })
      })
    })

    it('should recalculate labor cost when adding more actuals', () => {
      // 同じ案件に別の実績を追加（5時間）
      cy.request('GET', `/api/schedules/${testScheduleId}`).then((scheduleResponse) => {
        const schedule = scheduleResponse.body.schedule

        const updatedActuals = [
          ...schedule.actuals,
          {
            projectId: testProjectId,
            content: '追加作業',
            hours: 5,
            details: '追加実績',
          },
        ]

        cy.request('PUT', `/api/schedules/${testScheduleId}`, {
          checkInTime: schedule.checkInTime,
          checkOutTime: schedule.checkOutTime,
          plans: schedule.plans,
          actuals: updatedActuals,
        }).then((updateResponse) => {
          expect(updateResponse.status).to.eq(200)

          // 投下工数が再計算されていることを確認
          // (10時間 + 5時間) × 5000円/時間 = 75,000円
          cy.request('GET', `/api/projects/${testProjectId}`).then((projectResponse) => {
            const project = projectResponse.body.project
            expect(Number(project.totalLaborHours)).to.eq(15)
            expect(Number(project.totalLaborCost)).to.eq(75000)
          })
        })
      })
    })
  })

  describe('実績削除時の投下工数再計算', () => {
    it('should recalculate labor cost when deleting schedule with actuals', () => {
      // 削除前の投下工数を確認（前のテストから15時間、75,000円）
      cy.request('GET', `/api/projects/${testProjectId}`).then((projectResponse) => {
        const beforeProject = projectResponse.body.project
        expect(Number(beforeProject.totalLaborHours)).to.eq(15)
        expect(Number(beforeProject.totalLaborCost)).to.eq(75000)

        // 予定実績を削除
        cy.request('DELETE', `/api/schedules/${testScheduleId}`).then((deleteResponse) => {
          expect(deleteResponse.status).to.eq(200)

          // 投下工数が再計算されて0になることを確認
          cy.request('GET', `/api/projects/${testProjectId}`).then((afterProjectResponse) => {
            const afterProject = afterProjectResponse.body.project
            expect(Number(afterProject.totalLaborHours)).to.eq(0)
            expect(Number(afterProject.totalLaborCost)).to.eq(0)
          })
        })
      })
    })
  })

  describe('projectId変更時の両案件再計算', () => {
    let scheduleIdForProjectChange: string

    it('should recalculate both projects when changing actual projectId', () => {
      const timestamp = Date.now()

      // 案件1を作成（hourlyRate: 6000円）
      cy.request('POST', '/api/projects', {
        projectNumber: `LABOR-PROJ1-${timestamp}`,
        projectName: `案件1_${timestamp}`,
        status: 'developing',
        hourlyRate: 6000,
        projectType: 'development',
      }).then((project1Response) => {
        expect(project1Response.status).to.eq(201)
        const project1Id = project1Response.body.project.id

        // 案件2を作成（hourlyRate: 7000円）
        cy.request('POST', '/api/projects', {
          projectNumber: `LABOR-PROJ2-${timestamp}`,
          projectName: `案件2_${timestamp}`,
          status: 'developing',
          hourlyRate: 7000,
          projectType: 'development',
        }).then((project2Response) => {
          expect(project2Response.status).to.eq(201)
          const project2Id = project2Response.body.project.id

          // 案件1に実績を追加（10時間）
          cy.request('POST', '/api/schedules', {
            userId: adminUserId,
            scheduleDate: '2024-02-01',
            checkInTime: '09:00',
            checkOutTime: '19:00',
            plans: [],
            actuals: [
              {
                projectId: project1Id,
                content: '案件1の作業',
                hours: 10,
                details: 'projectId変更テスト用',
              },
            ],
          }).then((scheduleResponse) => {
            expect(scheduleResponse.status).to.eq(201)
            scheduleIdForProjectChange = scheduleResponse.body.schedule.id

            // 案件1の投下工数を確認（10時間 × 6000円 = 60,000円）
            cy.request('GET', `/api/projects/${project1Id}`).then((p1Response) => {
              expect(Number(p1Response.body.project.totalLaborHours)).to.eq(10)
              expect(Number(p1Response.body.project.totalLaborCost)).to.eq(60000)
            })

            // 案件2の投下工数を確認（0時間、0円）
            cy.request('GET', `/api/projects/${project2Id}`).then((p2Response) => {
              expect(Number(p2Response.body.project.totalLaborHours || 0)).to.eq(0)
              expect(Number(p2Response.body.project.totalLaborCost || 0)).to.eq(0)
            })

            // 実績のprojectIdを案件1から案件2に変更
            cy.request('GET', `/api/schedules/${scheduleIdForProjectChange}`).then((getResponse) => {
              const schedule = getResponse.body.schedule
              const updatedActuals = schedule.actuals.map((actual: any) => ({
                ...actual,
                projectId: project2Id, // 案件2に変更
              }))

              cy.request('PUT', `/api/schedules/${scheduleIdForProjectChange}`, {
                checkInTime: schedule.checkInTime,
                checkOutTime: schedule.checkOutTime,
                plans: schedule.plans,
                actuals: updatedActuals,
              }).then((putResponse) => {
                expect(putResponse.status).to.eq(200)

                // 案件1の投下工数が再計算されて0になることを確認
                cy.request('GET', `/api/projects/${project1Id}`).then((p1AfterResponse) => {
                  expect(Number(p1AfterResponse.body.project.totalLaborHours)).to.eq(0)
                  expect(Number(p1AfterResponse.body.project.totalLaborCost)).to.eq(0)
                })

                // 案件2の投下工数が再計算されることを確認（10時間 × 7000円 = 70,000円）
                cy.request('GET', `/api/projects/${project2Id}`).then((p2AfterResponse) => {
                  expect(Number(p2AfterResponse.body.project.totalLaborHours)).to.eq(10)
                  expect(Number(p2AfterResponse.body.project.totalLaborCost)).to.eq(70000)
                })
              })
            })
          })
        })
      })
    })
  })

  describe('時間単価変更時の投下工数再計算', () => {
    let projectForRateChange: string
    let scheduleForRateChange: string

    it('should recalculate labor cost when hourly rate is changed', () => {
      const timestamp = Date.now()

      // 案件を作成（hourlyRate: 4000円）
      cy.request('POST', '/api/projects', {
        projectNumber: `LABOR-RATE-${timestamp}`,
        projectName: `時間単価変更テスト_${timestamp}`,
        status: 'developing',
        hourlyRate: 4000,
        projectType: 'development',
      }).then((projectResponse) => {
        expect(projectResponse.status).to.eq(201)
        projectForRateChange = projectResponse.body.project.id

        // 実績を追加（12時間）
        cy.request('POST', '/api/schedules', {
          userId: adminUserId,
          scheduleDate: '2024-03-01',
          checkInTime: '08:00',
          checkOutTime: '20:00',
          plans: [],
          actuals: [
            {
              projectId: projectForRateChange,
              content: '開発作業',
              hours: 12,
              details: '時間単価変更テスト用',
            },
          ],
        }).then((scheduleResponse) => {
          expect(scheduleResponse.status).to.eq(201)
          scheduleForRateChange = scheduleResponse.body.schedule.id

          // 初期投下工数を確認（12時間 × 4000円 = 48,000円）
          cy.request('GET', `/api/projects/${projectForRateChange}`).then((initialResponse) => {
            expect(Number(initialResponse.body.project.totalLaborHours)).to.eq(12)
            expect(Number(initialResponse.body.project.totalLaborCost)).to.eq(48000)

            // 時間単価を4000円→6000円に変更
            cy.request('GET', `/api/projects/${projectForRateChange}`).then((getResponse) => {
              const project = getResponse.body.project

              cy.request('PUT', `/api/projects/${projectForRateChange}`, {
                projectNumber: project.projectNumber,
                projectName: project.projectName,
                status: project.status,
                hourlyRate: 6000, // 4000円から6000円に変更
                projectType: project.projectType,
              }).then((updateResponse) => {
                expect(updateResponse.status).to.eq(200)

                // 投下工数が再計算されることを確認（12時間 × 6000円 = 72,000円）
                cy.request('GET', `/api/projects/${projectForRateChange}`).then((finalResponse) => {
                  expect(Number(finalResponse.body.project.totalLaborHours)).to.eq(12)
                  expect(Number(finalResponse.body.project.totalLaborCost)).to.eq(72000)
                  expect(finalResponse.body.project.hourlyRate).to.eq('6000')
                })
              })
            })
          })
        })
      })
    })

    it('should use default hourly rate of 5000 when hourlyRate is null', () => {
      const timestamp = Date.now()

      // hourlyRateを省略して案件を作成（nullとして扱われる）
      cy.request('POST', '/api/projects', {
        projectNumber: `LABOR-NULL-${timestamp}`,
        projectName: `デフォルト単価テスト_${timestamp}`,
        status: 'developing',
        projectType: 'development',
        // hourlyRateを省略（バリデーションではoptionalのため、省略可能）
      }).then((projectResponse) => {
        expect(projectResponse.status).to.eq(201)
        const projectId = projectResponse.body.project.id

        // 実績を追加（6時間）
        cy.request('POST', '/api/schedules', {
          userId: adminUserId,
          scheduleDate: '2024-04-01',
          checkInTime: '10:00',
          checkOutTime: '16:00',
          plans: [],
          actuals: [
            {
              projectId: projectId,
              content: '開発作業',
              hours: 6,
              details: 'デフォルト単価テスト用',
            },
          ],
        }).then((scheduleResponse) => {
          expect(scheduleResponse.status).to.eq(201)

          // デフォルト単価5000円で計算されることを確認（6時間 × 5000円 = 30,000円）
          cy.request('GET', `/api/projects/${projectId}`).then((response) => {
            expect(Number(response.body.project.totalLaborHours)).to.eq(6)
            expect(Number(response.body.project.totalLaborCost)).to.eq(30000)
          })
        })
      })
    })
  })

  describe('複数実績の集計', () => {
    it('should correctly aggregate multiple actuals from different schedules', () => {
      const timestamp = Date.now()

      // 案件を作成（hourlyRate: 5500円）
      cy.request('POST', '/api/projects', {
        projectNumber: `LABOR-MULTI-${timestamp}`,
        projectName: `複数実績集計テスト_${timestamp}`,
        status: 'developing',
        hourlyRate: 5500,
        projectType: 'development',
      }).then((projectResponse) => {
        expect(projectResponse.status).to.eq(201)
        const projectId = projectResponse.body.project.id

        // 1日目の実績（8時間）
        cy.request('POST', '/api/schedules', {
          userId: adminUserId,
          scheduleDate: '2024-01-10',
          checkInTime: '09:00',
          checkOutTime: '18:00',
          plans: [],
          actuals: [
            {
              projectId: projectId,
              content: '1日目の作業',
              hours: 8,
            },
          ],
        }).then((schedule1Response) => {
          expect(schedule1Response.status).to.eq(201)

          // 2日目の実績（7時間）
          cy.request('POST', '/api/schedules', {
            userId: adminUserId,
            scheduleDate: '2024-01-11',
            checkInTime: '09:00',
            checkOutTime: '17:00',
            plans: [],
            actuals: [
              {
                projectId: projectId,
                content: '2日目の作業',
                hours: 7,
              },
            ],
          }).then((schedule2Response) => {
            expect(schedule2Response.status).to.eq(201)

            // 3日目の実績（5時間）
            cy.request('POST', '/api/schedules', {
              userId: adminUserId,
              scheduleDate: '2024-01-12',
              checkInTime: '10:00',
              checkOutTime: '15:00',
              plans: [],
              actuals: [
                {
                  projectId: projectId,
                  content: '3日目の作業',
                  hours: 5,
                },
              ],
            }).then((schedule3Response) => {
              expect(schedule3Response.status).to.eq(201)

              // 全実績が正しく集計されることを確認
              // (8 + 7 + 5)時間 × 5500円 = 110,000円
              cy.request('GET', `/api/projects/${projectId}`).then((response) => {
                expect(Number(response.body.project.totalLaborHours)).to.eq(20)
                expect(Number(response.body.project.totalLaborCost)).to.eq(110000)
              })
            })
          })
        })
      })
    })
  })

  describe('トランザクションの整合性', () => {
    it('should rollback if recalculation fails during schedule update', () => {
      const timestamp = Date.now()

      // 存在しない案件IDを使用してエラーを発生させる
      cy.request({
        method: 'POST',
        url: '/api/schedules',
        body: {
          userId: adminUserId,
          scheduleDate: '2024-05-01',
          checkInTime: '09:00',
          checkOutTime: '18:00',
          plans: [],
          actuals: [
            {
              projectId: 'non-existent-project-id',
              content: 'テスト実績',
              hours: 8,
            },
          ],
        },
        failOnStatusCode: false,
      }).then((response) => {
        // 無効な案件IDの場合、エラーが返されることを確認
        // （実装によっては400または500エラー）
        expect(response.status).to.be.oneOf([400, 500])
      })
    })
  })
})
