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
  title: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 8,
    color: "#2c3e50",
  },
  issueDate: {
    fontSize: 9,
    marginBottom: 3,
    color: "#495057",
  },
  deliveryNoteNumber: {
    fontSize: 9,
    backgroundColor: "#2c3e50",
    color: "#ffffff",
    padding: 6,
    marginTop: 3,
    alignItems: "center",
  },
  deliveryNoteNumberText: {
    fontSize: 8,
    color: "#ffffff",
    textAlign: "center",
  },
  deliveryNoteNumberValue: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: 700,
    textAlign: "center",
    marginTop: 2,
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
  customerAddress: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 1,
  },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    gap: 40,
  },
  summarySection: {
    flex: 1.2,
  },
  summaryBox: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 9,
    width: 90,
    color: "#495057",
  },
  summaryValue: {
    fontSize: 9,
    flex: 1,
    fontWeight: 500,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 700,
    color: "#2c3e50",
  },
  taxDetailText: {
    fontSize: 8,
    color: "#666666",
    marginTop: 4,
    paddingLeft: 90,
  },
  companySection: {
    flex: 0.8,
    fontSize: 9,
    lineHeight: 1.5,
    position: "relative",
  },
  companyName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    color: "#2c3e50",
  },
  companyInfo: {
    fontSize: 9,
    marginBottom: 1,
  },
  qualifiedInvoiceNumber: {
    fontSize: 8,
    fontWeight: 700,
    marginTop: 5,
    color: "#2c3e50",
  },
  itemsSection: {
    marginBottom: 20,
  },
  itemsHeader: {
    flexDirection: "row",
    backgroundColor: "#34495e",
    padding: 8,
    marginBottom: 1,
  },
  itemRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    padding: 6,
    minHeight: 28,
    backgroundColor: "#ffffff",
  },
  tableCol1: {
    flex: 3,
  },
  tableCol2: {
    flex: 1,
    textAlign: "center",
  },
  tableCol3: {
    flex: 0.5,
    textAlign: "center",
  },
  tableCol4: {
    flex: 1.2,
    textAlign: "right",
    paddingRight: 5,
  },
  tableCol5: {
    flex: 1.2,
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
    marginBottom: 6,
  },
  subtotalLabel: {
    fontSize: 9,
    color: "#495057",
  },
  subtotalValue: {
    fontSize: 9,
    textAlign: "right",
  },
  taxDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    paddingLeft: 10,
  },
  taxDetailLabel: {
    fontSize: 8,
    color: "#666666",
  },
  taxDetailValue: {
    fontSize: 8,
    textAlign: "right",
    color: "#666666",
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
})

interface DeliveryNotePDFProps {
  deliveryNote: {
    deliveryNoteNumber: string
    deliveryDate: string
    honorific: string
    subject: string
    subtotal: string
    taxAmount: string
    taxAmount8: string
    taxAmount10: string
    totalAmount: string
    remarks?: string
    items: Array<{
      name: string
      quantity: string
      unit?: string
      unitPrice: string
      amount: string
    }>
  }
  customer: {
    name: string
    postalCode?: string
    address?: string
    building?: string
  }
  company: {
    name: string
    postalCode?: string
    address?: string
    building?: string
    representative?: string
    phone?: string
    fax?: string
    sealImagePath?: string
    qualifiedInvoiceNumber?: string
  } | null
}

export const DeliveryNotePDF: React.FC<DeliveryNotePDFProps> = ({ deliveryNote, customer, company }) => {
  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount)
    return `¥${num.toLocaleString("ja-JP")}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.issueDate}>納品日: {formatDate(deliveryNote.deliveryDate)}</Text>
              <View style={styles.deliveryNoteNumber}>
                <Text style={styles.deliveryNoteNumberText}>納品書番号</Text>
                <Text style={styles.deliveryNoteNumberValue}>{deliveryNote.deliveryNoteNumber}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.title}>納 品 書</Text>
        </View>

        {/* 納品概要と納品元情報 */}
        <View style={styles.infoSection}>
          {/* 納品概要 - 左側 */}
          <View style={styles.summarySection}>
            <Text style={styles.customerName}>{customer.name} {deliveryNote.honorific}</Text>
            <Text style={styles.customerMessage}>
              下記の通り納品いたしました。
            </Text>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>件名：</Text>
                <Text style={styles.summaryValue}>{deliveryNote.subject}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>ご納品金額：</Text>
                <Text style={styles.totalAmount}>{formatCurrency(deliveryNote.totalAmount)}</Text>
              </View>
              {parseFloat(deliveryNote.taxAmount8) > 0 && (
                <Text style={styles.taxDetailText}>
                  （8%対象: {formatCurrency(deliveryNote.taxAmount8)}）
                </Text>
              )}
              {parseFloat(deliveryNote.taxAmount10) > 0 && (
                <Text style={styles.taxDetailText}>
                  （10%対象: {formatCurrency(deliveryNote.taxAmount10)}）
                </Text>
              )}
            </View>
          </View>

          {/* 納品元情報 - 右側 */}
          {company && (
            <View style={styles.companySection}>
              <Text style={styles.companyName}>{company.name}</Text>
              {company.postalCode && (
                <Text style={styles.companyInfo}>〒{company.postalCode}</Text>
              )}
              {company.address && (
                <Text style={styles.companyInfo}>{company.address}</Text>
              )}
              {company.building && (
                <Text style={styles.companyInfo}>{company.building}</Text>
              )}
              {company.phone && (
                <Text style={styles.companyInfo}>TEL: {company.phone}</Text>
              )}
              {company.fax && (
                <Text style={styles.companyInfo}>FAX: {company.fax}</Text>
              )}
              {company.qualifiedInvoiceNumber && (
                <Text style={styles.qualifiedInvoiceNumber}>
                  登録番号: {company.qualifiedInvoiceNumber}
                </Text>
              )}
              {company.sealImagePath && (
                <View style={styles.companySealBox}>
                  <Image style={styles.companySealImage} src={company.sealImagePath} />
                </View>
              )}
            </View>
          )}
        </View>

        {/* 明細 */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={[styles.tableHeaderText, styles.tableCol1]}>項目</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol2]}>数量</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol3]}>単位</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol4]}>単価</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol5]}>金額</Text>
          </View>
          {deliveryNote.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={[styles.tableText, styles.tableCol1]}>
                {item.name}
              </Text>
              <Text style={[styles.tableTextCenter, styles.tableCol2]}>
                {parseFloat(item.quantity).toLocaleString("ja-JP")}
              </Text>
              <Text style={[styles.tableTextCenter, styles.tableCol3]}>{item.unit || ""}</Text>
              <Text style={[styles.tableTextRight, styles.tableCol4]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.tableTextRight, styles.tableCol5]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* 小計・税額・合計 */}
        <View style={styles.subtotalSection}>
          <View style={styles.subtotalBox}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>小計</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(deliveryNote.subtotal)}</Text>
            </View>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>消費税</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(deliveryNote.taxAmount)}</Text>
            </View>
            {parseFloat(deliveryNote.taxAmount8) > 0 && (
              <View style={styles.taxDetailRow}>
                <Text style={styles.taxDetailLabel}>（8%対象）</Text>
                <Text style={styles.taxDetailValue}>{formatCurrency(deliveryNote.taxAmount8)}</Text>
              </View>
            )}
            {parseFloat(deliveryNote.taxAmount10) > 0 && (
              <View style={styles.taxDetailRow}>
                <Text style={styles.taxDetailLabel}>（10%対象）</Text>
                <Text style={styles.taxDetailValue}>{formatCurrency(deliveryNote.taxAmount10)}</Text>
              </View>
            )}
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>合計金額</Text>
              <Text style={styles.finalTotalValue}>{formatCurrency(deliveryNote.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* 備考 */}
        {deliveryNote.remarks && (
          <View style={styles.remarksSection}>
            <Text style={styles.remarksTitle}>備考</Text>
            <Text style={styles.remarksText}>{deliveryNote.remarks}</Text>
          </View>
        )}

      </Page>
    </Document>
  )
}
