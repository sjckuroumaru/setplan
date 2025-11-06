import React from "react"
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"

// フォントの登録
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
  title: {
    fontSize: 20,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 15,
    letterSpacing: 8,
    color: "#2c3e50",
  },
  dateSection: {
    fontSize: 9,
    marginBottom: 15,
    textAlign: "right",
    color: "#495057",
  },
  tableSection: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#34495e",
    padding: 8,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    padding: 6,
    minHeight: 28,
    backgroundColor: "#ffffff",
  },
  tableCol1: {
    flex: 2,
  },
  tableCol2: {
    flex: 3,
  },
  tableCol3: {
    flex: 1.3,
    textAlign: "center",
  },
  tableCol4: {
    flex: 1.3,
    textAlign: "center",
  },
  tableCol5: {
    flex: 1.5,
    textAlign: "right",
    paddingRight: 10,
  },
  tableCol6: {
    flex: 1,
    textAlign: "center",
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
  summarySection: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBox: {
    width: 250,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 5,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#495057",
    fontWeight: 700,
  },
  summaryValue: {
    fontSize: 10,
    textAlign: "right",
    fontWeight: 700,
    color: "#2c3e50",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 2,
    borderTopColor: "#2c3e50",
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#2c3e50",
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "right",
    color: "#2c3e50",
  },
  statusBadge: {
    fontSize: 8,
    padding: 3,
    borderRadius: 3,
    textAlign: "center",
  },
  statusDraft: {
    backgroundColor: "#e0e0e0",
    color: "#424242",
  },
  statusSent: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  statusPaid: {
    backgroundColor: "#d4edda",
    color: "#155724",
  },
})

interface Invoice {
  id: string
  invoiceNumber: string
  customer: {
    name: string
  }
  subject: string
  issueDate: string
  dueDate: string
  totalAmount: string
  subtotal: string
  taxAmount: string
  status: string
}

interface InvoiceListPDFProps {
  invoices: Invoice[]
  generatedDate: string
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "draft":
      return "下書き"
    case "sent":
      return "入金待ち"
    case "paid":
      return "入金済"
    default:
      return status
  }
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case "draft":
      return styles.statusDraft
    case "sent":
      return styles.statusSent
    case "paid":
      return styles.statusPaid
    default:
      return styles.statusDraft
  }
}

export function InvoiceListPDF({ invoices, generatedDate }: InvoiceListPDFProps) {
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount
    const formatted = Math.floor(numAmount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return `¥${formatted}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}年${month}月${day}日`
  }

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}/${month}/${day}`
  }

  // 合計金額の計算（税抜）
  const totalSubtotal = invoices.reduce((sum, invoice) => {
    return sum + parseFloat(invoice.subtotal)
  }, 0)

  // 合計金額の計算（税込）
  const totalAmount = invoices.reduce((sum, invoice) => {
    return sum + parseFloat(invoice.totalAmount)
  }, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* タイトル */}
        <Text style={styles.title}>請求書一覧</Text>

        {/* 発行日 */}
        <Text style={styles.dateSection}>発行日: {formatDate(generatedDate)}</Text>

        {/* テーブル */}
        <View style={styles.tableSection}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableCol1]}>顧客名</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol2]}>件名</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol3]}>請求日</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol4]}>支払期日</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol5]}>金額</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol6]}>ステータス</Text>
          </View>

          {invoices.map((invoice) => (
            <View key={invoice.id} style={styles.tableRow}>
              <Text style={[styles.tableText, styles.tableCol1]}>
                {invoice.customer.name}
              </Text>
              <Text style={[styles.tableText, styles.tableCol2]}>
                {invoice.subject}
              </Text>
              <Text style={[styles.tableTextCenter, styles.tableCol3]}>
                {formatDateShort(invoice.issueDate)}
              </Text>
              <Text style={[styles.tableTextCenter, styles.tableCol4]}>
                {formatDateShort(invoice.dueDate)}
              </Text>
              <Text style={[styles.tableTextRight, styles.tableCol5]}>
                {formatCurrency(invoice.totalAmount)}
              </Text>
              <View style={styles.tableCol6}>
                <Text style={[styles.statusBadge, getStatusStyle(invoice.status)]}>
                  {getStatusLabel(invoice.status)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* 合計セクション */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>金額合計（税抜）</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalSubtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>金額合計（税込）</Text>
              <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
