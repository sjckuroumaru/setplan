import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer"

// 日本語フォントの登録
Font.register({
  family: "NotoSansJP",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY0rw-oME.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFJEk75vY0rw-oME.ttf",
      fontWeight: 700,
    },
  ],
})

// スタイル定義
const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    fontSize: 9,
    paddingTop: 25,
    paddingLeft: 35,
    paddingRight: 35,
    paddingBottom: 25,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 15,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  issueDate: {
    fontSize: 9,
    marginBottom: 3,
    color: "#495057",
  },
  estimateNumber: {
    fontSize: 9,
    backgroundColor: "#2c3e50",
    color: "#ffffff",
    padding: 6,
    marginTop: 3,
    alignItems: "center",
  },
  estimateNumberText: {
    fontSize: 8,
    color: "#ffffff",
    textAlign: "center",
  },
  estimateNumberValue: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: 700,
    textAlign: "center",
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 15,
    letterSpacing: 8,
    color: "#2c3e50",
  },
  customerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 40,
  },
  customerLeft: {
    flex: 1.2,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
    borderBottomWidth: 3,
    borderBottomColor: "#2c3e50",
    borderBottomStyle: "solid",
    paddingBottom: 7,
  },
  customerMessage: {
    fontSize: 9,
    lineHeight: 1.6,
    marginTop: 3,
    marginBottom: 5,
    color: "#495057",
  },
  companyInfo: {
    fontSize: 9,
    lineHeight: 1.5,
    flex: 0.8,
  },
  companyName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    color: "#2c3e50",
  },
  subjectSection: {
    marginBottom: 5,
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 5,
  },
  subjectRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  subjectLabel: {
    fontSize: 9,
    width: 90,
    color: "#495057",
  },
  subjectValue: {
    fontSize: 9,
    flex: 1,
    fontWeight: 500,
  },
  table: {
    marginTop: 0,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#34495e",
    padding: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
    padding: 6,
    minHeight: 28,
    backgroundColor: "#ffffff",
  },
  tableCol1: {
    flex: 2.5,
  },
  tableCol2: {
    flex: 0.8,
    textAlign: "center",
  },
  tableCol3: {
    flex: 0.5,
    textAlign: "center",
  },
  tableCol4: {
    flex: 1,
    textAlign: "right",
    paddingRight: 5,
  },
  tableCol5: {
    paddingLeft: 5,
    flex: 1.5,
  },
  tableCol6: {
    flex: 1,
    textAlign: "right",
    paddingRight: 5,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 700,
    color: "#ffffff",
    textAlign: "center",
  },
  tableText: {
    fontSize: 8,
  },
  tableTextRight: {
    fontSize: 8,
    textAlign: "right",
  },
  tableTextCenter: {
    fontSize: 8,
    textAlign: "center",
  },
  subtotalSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
  },
  subtotalBox: {
    width: 250,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 5,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    alignItems: "center",
  },
  subtotalLabel: {
    fontSize: 9,
    color: "#495057",
    flex: 1,
  },
  subtotalValue: {
    fontSize: 9,
    textAlign: "right",
    width: 100,
  },
  taxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    alignItems: "center",
  },
  finalTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: "#2c3e50",
    paddingTop: 8,
    marginTop: 8,
    alignItems: "center",
  },
  finalTotalLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: "#2c3e50",
    flex: 1,
  },
  finalTotalValue: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "right",
    width: 100,
    color: "#2c3e50",
  },
  remarksSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 5,
  },
  remarksTitle: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 5,
    color: "#2c3e50",
  },
  remarksText: {
    fontSize: 8,
    lineHeight: 1.5,
    color: "#495057",
  },
  companySealBox: {
    position: "absolute",
    right: 20,
    top: -10,
  },
  companySealImage: {
    width: 55,
    height: 55,
  },
  userSealBox: {
    position: "absolute",
    right: 15,
    bottom: -5,
  },
  userSealImage: {
    width: 35,
    height: 35,
  },
})

interface EstimatePDFProps {
  estimate: {
    estimateNumber: string
    issueDate: string
    validUntil: string
    customer: {
      name: string
      postalCode?: string | null
      address?: string | null
      building?: string | null
      representative?: string | null
    }
    honorific: string
    subject: string
    subtotal: string
    taxAmount: string
    totalAmount: string
    taxRate: number
    taxType: string
    remarks?: string | null
    items: {
      name: string
      quantity: string
      unit?: string | null
      unitPrice: string
      taxType: string
      amount: string
      remarks?: string | null
    }[]
  }
  company?: {
    name: string
    postalCode?: string | null
    address?: string | null
    building?: string | null
    representative?: string | null
    phone?: string | null
    fax?: string | null
    sealImagePath?: string | null
  } | null
  user: {
    lastName: string
    firstName: string
    sealImagePath?: string | null
  }
}

export const EstimatePDF: React.FC<EstimatePDFProps> = ({ estimate, company, user }) => {
  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount)
    return `¥${num.toLocaleString("ja-JP")}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `令和${year - 2018}年${month}月${day}日`
  }

  const formatQuantity = (quantity: string) => {
    const num = parseFloat(quantity)
    return num.toLocaleString("ja-JP")
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}></View>
            <View style={styles.headerRight}>
              <Text style={styles.issueDate}>発行日： {formatDate(estimate.issueDate)}</Text>
              <View style={styles.estimateNumber}>
                <Text style={styles.estimateNumberText}>見積書番号</Text>
                <Text style={styles.estimateNumberValue}>{estimate.estimateNumber}</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.title}>お 見 積 書</Text>
        </View>

        {/* 顧客情報と自社情報 */}
        <View style={styles.customerSection}>
          <View style={styles.customerLeft}>
            <Text style={styles.customerName}>
              {estimate.customer.name} {estimate.honorific}
            </Text>
            
            <Text style={styles.customerMessage}>
              下記の通り、お見積もりさせていただきます。{"\n"}
              ご検討のほど、よろしくお願いいたします。
            </Text>

            <View style={styles.subjectSection}>
              <View style={styles.subjectRow}>
                <Text style={styles.subjectLabel}>件名：</Text>
                <Text style={styles.subjectValue}>{estimate.subject}</Text>
              </View>
              <View style={styles.subjectRow}>
                <Text style={styles.subjectLabel}>本見積書有効期限：</Text>
                <Text style={styles.subjectValue}>{formatDate(estimate.validUntil)}</Text>
              </View>
            </View>
          </View>

          {/* 自社情報 */}
          {company && (
            <View style={[styles.companyInfo, { position: "relative" }]}>
              <Text style={styles.companyName}>{company.name}</Text>
              {company.postalCode && (
                <Text>〒{company.postalCode}</Text>
              )}
              {company.address && (
                <Text>{company.address}</Text>
              )}
              {company.building && (
                <Text>{company.building}</Text>
              )}
              {company.phone && (
                <Text>TEL ：{company.phone}</Text>
              )}
              {company.fax && (
                <Text>FAX ：{company.fax}</Text>
              )}
              
              {/* 会社印 - 自社情報の右上に配置 */}
              {company.sealImagePath && (
                <View style={styles.companySealBox}>
                  <Image style={styles.companySealImage} src={company.sealImagePath} />
                </View>
              )}

              {/* 担当者印 - 自社情報の右下に配置 */}
              {user.sealImagePath && (
                <View style={styles.userSealBox}>
                  <Image style={styles.userSealImage} src={user.sealImagePath} />
                </View>
              )}
            </View>
          )}
        </View>


        {/* 明細テーブル */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableCol1]}>商品番号・商品名</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol2]}>数量</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol3]}>単位</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol4]}>単価</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol5]}>備考</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol6]}>金額</Text>
          </View>
          {estimate.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableText, styles.tableCol1]}>{item.name}</Text>
              <Text style={[styles.tableTextRight, styles.tableCol2]}>
                {formatQuantity(item.quantity)}
              </Text>
              <Text style={[styles.tableTextCenter, styles.tableCol3]}>{item.unit || ""}</Text>
              <Text style={[styles.tableTextRight, styles.tableCol4]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.tableText, styles.tableCol5]}>{item.remarks || ""}</Text>
              <Text style={[styles.tableTextRight, styles.tableCol6]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
          
          {/* 空行を追加（必要に応じて） */}
          {estimate.items.length < 10 && (
            <>
              {[...Array(10 - estimate.items.length)].map((_, index) => (
                <View key={`empty-${index}`} style={styles.tableRow}>
                  <Text style={[styles.tableText, styles.tableCol1]}> </Text>
                  <Text style={[styles.tableText, styles.tableCol2]}> </Text>
                  <Text style={[styles.tableText, styles.tableCol3]}> </Text>
                  <Text style={[styles.tableText, styles.tableCol4]}> </Text>
                  <Text style={[styles.tableText, styles.tableCol5]}> </Text>
                  <Text style={[styles.tableText, styles.tableCol6]}> </Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* 小計・税額・合計 */}
        <View style={styles.subtotalSection}>
          <View style={styles.subtotalBox}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>小計</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(estimate.subtotal)}</Text>
            </View>
            <View style={styles.taxRow}>
              <Text style={styles.subtotalLabel}>消費税（{estimate.taxRate}%）</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(estimate.taxAmount)}</Text>
            </View>
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>合計金額</Text>
              <Text style={styles.finalTotalValue}>{formatCurrency(estimate.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* 備考 */}
        {estimate.remarks && (
          <View style={styles.remarksSection}>
            <Text style={styles.remarksTitle}>見積り条件</Text>
            <Text style={styles.remarksText}>{estimate.remarks}</Text>
          </View>
        )}
        
        {!estimate.remarks && (
          <View style={styles.remarksSection}>
            <Text style={styles.remarksTitle}>見積り条件</Text>
            <Text style={styles.remarksText}>
              仕様変更及び大幅な内容変更が生じた際には、再度お見積りさせて頂きます。
            </Text>
          </View>
        )}

      </Page>
    </Document>
  )
}