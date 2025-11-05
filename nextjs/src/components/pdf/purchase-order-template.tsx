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
    marginBottom: 10,
    letterSpacing: 8,
    color: "#2c3e50",
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
  orderNumber: {
    fontSize: 9,
    backgroundColor: "#2c3e50",
    color: "#ffffff",
    padding: 6,
    marginTop: 3,
    alignItems: "center",
  },
  orderNumberText: {
    fontSize: 8,
    color: "#ffffff",
    textAlign: "center",
  },
  orderNumberValue: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: 700,
    textAlign: "center",
    marginTop: 2,
  },
  company: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
    borderBottomWidth: 3,
    borderBottomColor: "#2c3e50",
    borderBottomStyle: "solid",
    paddingBottom: 7,
  },
  honorific: {
    fontSize: 11,
    marginLeft: 5,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  dateLabel: {
    width: 80,
    textAlign: "right",
    color: "#666",
  },
  dateValue: {
    width: 100,
    textAlign: "right",
    marginLeft: 10,
  },
  orderNumberRow: {
    marginTop: 5,
    paddingTop: 5,
    borderTop: 1,
    borderTopColor: "#e0e0e0",
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
  companySection: {
    flex: 0.8,
    fontSize: 9,
    lineHeight: 1.5,
    position: "relative",
  },
  customerMessage: {
    fontSize: 9,
    lineHeight: 1.6,
    marginTop: 3,
    marginBottom: 5,
    color: "#495057",
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
    marginBottom: 15,
  },
  totalAmountLabel: {
    fontSize: 10,
    color: "#495057",
    marginBottom: 3,
  },
  taxDetailText: {
    fontSize: 8,
    color: "#666666",
    marginTop: 4,
    paddingLeft: 90,
  },
  companyInfo: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  companyName: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    color: "#2c3e50",
  },
  additionalInfo: {
    marginTop: 15,
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 3,
  },
  additionalRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  additionalLabel: {
    width: 100,
    color: "#666",
    fontSize: 9,
  },
  additionalValue: {
    flex: 1,
    fontSize: 9,
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
    flex: 0.8,
    textAlign: "center",
  },
  tableCol6: {
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
  itemRemarks: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
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
})

interface PurchaseOrderTemplateProps {
  purchaseOrder: any
}

export function PurchaseOrderTemplate({
  purchaseOrder,
}: PurchaseOrderTemplateProps) {
  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString("ja-JP")}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}年${month}月${day}日`
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
              <Text style={styles.issueDate}>発行日: {formatDate(purchaseOrder.issueDate)}</Text>
              <View style={styles.orderNumber}>
                <Text style={styles.orderNumberText}>発注書番号</Text>
                <Text style={styles.orderNumberValue}>{purchaseOrder.orderNumber}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.title}>発 注 書</Text>
        </View>

        {/* 発注概要と発注先情報 */}
        <View style={styles.infoSection}>
          {/* 発注概要 - 左側 */}
          <View style={styles.summarySection}>
            <Text style={styles.company}>{purchaseOrder.supplier.name} {purchaseOrder.honorific}</Text>
            <Text style={styles.customerMessage}>
              下記の通り発注申し上げます。
            </Text>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>件名：</Text>
                <Text style={styles.summaryValue}>{purchaseOrder.subject}</Text>
              </View>
              {purchaseOrder.deliveryDate && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>納期：</Text>
                  <Text style={styles.summaryValue}>
                    {formatDate(purchaseOrder.deliveryDate)}
                  </Text>
                </View>
              )}
              {purchaseOrder.completionPeriod && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>検収完了期間：</Text>
                  <Text style={styles.summaryValue}>
                    {purchaseOrder.completionPeriod}
                  </Text>
                </View>
              )}
              {purchaseOrder.deliveryLocation && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>納入場所：</Text>
                  <Text style={styles.summaryValue}>
                    {purchaseOrder.deliveryLocation}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>ご発注金額：</Text>
                <Text style={styles.totalAmount}>{formatCurrency(purchaseOrder.totalAmount)}</Text>
              </View>
              {purchaseOrder.taxAmount8 > 0 && (
                <Text style={styles.taxDetailText}>
                  （8%対象: {formatCurrency(purchaseOrder.taxAmount8)}）
                </Text>
              )}
              {purchaseOrder.taxAmount10 > 0 && (
                <Text style={styles.taxDetailText}>
                  （10%対象: {formatCurrency(purchaseOrder.taxAmount10)}）
                </Text>
              )}
            </View>
          </View>

          {/* 発注先情報 - 右側 */}
          <View style={styles.companySection}>
            <Text style={styles.companyName}>{purchaseOrder.supplier.name}</Text>
            {purchaseOrder.supplier.postalCode && (
              <Text style={styles.companyInfo}>〒{purchaseOrder.supplier.postalCode}</Text>
            )}
            {purchaseOrder.supplier.address && (
              <Text style={styles.companyInfo}>{purchaseOrder.supplier.address}</Text>
            )}
            {purchaseOrder.supplier.building && (
              <Text style={styles.companyInfo}>{purchaseOrder.supplier.building}</Text>
            )}
            {purchaseOrder.supplier.phone && (
              <Text style={styles.companyInfo}>TEL: {purchaseOrder.supplier.phone}</Text>
            )}
            {purchaseOrder.supplier.fax && (
              <Text style={styles.companyInfo}>FAX: {purchaseOrder.supplier.fax}</Text>
            )}
          </View>
        </View>

        {/* お支払い条件を別途表示 */}
        {purchaseOrder.paymentTerms && (
          <View style={{ marginTop: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 9, color: "#495057" }}>お支払い条件：{purchaseOrder.paymentTerms}</Text>
          </View>
        )}

        {/* 明細 */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={[styles.tableHeaderText, styles.tableCol1]}>品名</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol2]}>数量</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol3]}>単位</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol4]}>単価</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol5]}>税率</Text>
            <Text style={[styles.tableHeaderText, styles.tableCol6]}>金額</Text>
          </View>

          {purchaseOrder.items.map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.tableCol1}>
                <Text style={styles.tableText}>{item.name}</Text>
                {item.remarks && (
                  <Text style={styles.itemRemarks}>{item.remarks}</Text>
                )}
              </View>
              <Text style={[styles.tableTextCenter, styles.tableCol2]}>{item.quantity}</Text>
              <Text style={[styles.tableTextCenter, styles.tableCol3]}>{item.unit || "-"}</Text>
              <Text style={[styles.tableTextRight, styles.tableCol4]}>
                {formatCurrency(item.unitPrice)}
              </Text>
              <Text style={[styles.tableTextCenter, styles.tableCol5]}>
                {item.taxRate}%
              </Text>
              <Text style={[styles.tableTextRight, styles.tableCol6]}>
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
              <Text style={styles.subtotalValue}>{formatCurrency(purchaseOrder.subtotal)}</Text>
            </View>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>消費税</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(purchaseOrder.taxAmount)}</Text>
            </View>
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>合計金額</Text>
              <Text style={styles.finalTotalValue}>{formatCurrency(purchaseOrder.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* 備考 */}
        {purchaseOrder.remarks && (
          <View style={styles.remarksSection}>
            <Text style={styles.remarksTitle}>備考</Text>
            <Text style={styles.remarksText}>{purchaseOrder.remarks}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}