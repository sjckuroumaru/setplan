import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PurchaseOrderForm } from "@/components/documents/purchase-order-form"

export default function NewPurchaseOrderPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>発注書作成</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseOrderForm />
        </CardContent>
      </Card>
    </div>
  )
}