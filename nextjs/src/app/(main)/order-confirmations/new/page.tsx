import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderConfirmationForm } from "@/components/documents/order-confirmation-form"

export default function NewOrderConfirmationPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>発注請書作成</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderConfirmationForm />
        </CardContent>
      </Card>
    </div>
  )
}