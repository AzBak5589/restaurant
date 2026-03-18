"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, DollarSign, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Receipt, ReceiptData } from "@/components/receipt";
import { getApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/lib/i18n";

interface OrderItem {
  quantity: number;
  unitPrice: number;
  total: number;
  menuItem: { name: string };
}

interface Order {
  id: string;
  orderNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentStatus: string;
  table?: { number: string };
  items?: OrderItem[];
  createdBy?: { firstName: string; lastName: string };
}

interface Promotion {
  id: string;
  code: string | null;
  name: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
}

export default function PaymentsPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [method, setMethod] = useState("CASH");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromotionId, setSelectedPromotionId] = useState("none");
  const [promotionCode, setPromotionCode] = useState("");
  const [applyingPromotion, setApplyingPromotion] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/orders");
      setOrders(res.data.filter((o: Order) => o.paymentStatus !== "PAID"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("payments.error.loadOrders")));
    } finally {
      setLoading(false);
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await api.get("/promotions", {
        params: {
          isActive: "true",
          activeOn: new Date().toISOString(),
          limit: 100,
        },
      });
      setPromotions(res.data);
    } catch {
      setPromotions([]);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPromotions();
  }, []);

  const openPayment = (order: Order) => {
    setSelectedOrder(order);
    setAmount(order.total.toString());
    setSelectedPromotionId("none");
    setPromotionCode("");
    setPayOpen(true);
  };

  const applyPromotion = async () => {
    if (!selectedOrder) return;
    setApplyingPromotion(true);
    try {
      const payload =
        selectedPromotionId !== "none"
          ? { promotionId: selectedPromotionId, promotionCode: null }
          : promotionCode.trim()
            ? { promotionId: null, promotionCode: promotionCode.trim().toUpperCase() }
            : { promotionId: null, promotionCode: null };
      const res = await api.patch(`/orders/${selectedOrder.id}/promotion`, payload);
      const updated = res.data as Order;
      setSelectedOrder(updated);
      setAmount(updated.total.toString());
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      toast.success(
        selectedPromotionId === "none"
          ? promotionCode.trim()
            ? t("payments.toast.promotionApplied")
            : t("payments.toast.promotionRemoved")
          : t("payments.toast.promotionApplied"),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("payments.error.applyPromotion")));
    } finally {
      setApplyingPromotion(false);
    }
  };

  const processPayment = async () => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `pay-${selectedOrder.id}-${Date.now()}`;
      await api.post("/payments", {
        orderId: selectedOrder.id,
        amount: parseFloat(amount),
        method,
        idempotencyKey,
      });

      const paid = parseFloat(amount);
      const change = paid - selectedOrder.total;

      const receipt: ReceiptData = {
        restaurantName: "RestoPOS Restaurant",
        orderNumber: selectedOrder.orderNumber,
        tableNumber: selectedOrder.table?.number,
        serverName: selectedOrder.createdBy
          ? `${selectedOrder.createdBy.firstName} ${selectedOrder.createdBy.lastName}`
          : undefined,
        date: new Date().toLocaleString(),
        items: (selectedOrder.items || []).map((item) => ({
          name: item.menuItem?.name || "Item",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        subtotal: selectedOrder.subtotal || selectedOrder.total,
        tax: selectedOrder.tax || 0,
        discount: selectedOrder.discount || 0,
        total: selectedOrder.total,
        paymentMethod: method,
        amountPaid: paid,
        change: change > 0 ? change : 0,
      };

      setReceiptData(receipt);
      toast.success(t("payments.toast.processed"));
      setPayOpen(false);
      setReceiptOpen(true);
      fetchOrders();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("payments.error.failed")));
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) {
      toast.error(t("payments.error.popupBlocked"));
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { margin: 0; padding: 0; font-family: monospace; font-size: 12px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>${receiptRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("payments.title")}</h1>
          <p className="text-muted-foreground">
            {orders.length} {t("payments.unpaidOrders")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="mr-1 h-4 w-4" /> {t("common.refresh")}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <CreditCard className="h-8 w-8" />
            {t("payments.allPaid")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {order.orderNumber}
                  </CardTitle>
                  <Badge variant="outline">{order.paymentStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.table && (
                  <p className="text-sm text-muted-foreground">
                    {t("orders.table")} {order.table.number}
                  </p>
                )}
                <p className="text-2xl font-bold">
                  {order.total.toLocaleString()} FCFA
                </p>
                <Button className="w-full" onClick={() => openPayment(order)}>
                  <DollarSign className="mr-1 h-4 w-4" /> {t("payments.process")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("payments.process")} - {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">{t("payments.amountDue")}</p>
              <p className="text-3xl font-bold">
                {selectedOrder?.total.toLocaleString()} FCFA
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("payments.method")}</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t("payments.CASH")}</SelectItem>
                  <SelectItem value="CARD">{t("payments.CARD")}</SelectItem>
                  <SelectItem value="MOBILE_MONEY">
                    {t("payments.MOBILE_MONEY")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("promotions.title")}</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedPromotionId}
                  onValueChange={(value) => {
                    setSelectedPromotionId(value);
                    if (value !== "none") {
                      setPromotionCode("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("payments.selectPromotion")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("payments.noPromotion")}</SelectItem>
                    {promotions.map((promotion) => (
                      <SelectItem key={promotion.id} value={promotion.id}>
                        {promotion.name} (
                        {promotion.discountType === "PERCENTAGE"
                          ? `${promotion.discountValue}%`
                          : `${promotion.discountValue.toLocaleString()} FCFA`}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={applyPromotion}
                  disabled={applyingPromotion}
                >
                  {applyingPromotion ? t("payments.applying") : t("payments.apply")}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={promotionCode}
                  onChange={(e) => {
                    setPromotionCode(e.target.value.toUpperCase());
                    if (selectedPromotionId !== "none") {
                      setSelectedPromotionId("none");
                    }
                  }}
                  placeholder={t("payments.promoCodePlaceholder")}
                />
                <Button
                  variant="outline"
                  onClick={applyPromotion}
                  disabled={applyingPromotion}
                >
                  {applyingPromotion ? t("payments.checking") : t("payments.applyCode")}
                </Button>
              </div>
            </div>
            {selectedOrder && selectedOrder.discount > 0 && (
              <p className="text-sm font-medium text-emerald-600">
                {t("payments.discountApplied")}:{" "}
                {selectedOrder.discount.toLocaleString()} FCFA
              </p>
            )}
            <div className="space-y-2">
              <Label>{t("payments.amountReceived")}</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {method === "CASH" &&
                selectedOrder &&
                parseFloat(amount) > selectedOrder.total && (
                  <p className="text-sm font-medium text-emerald-600">
                    {t("payments.change")}:{" "}
                    {(
                      parseFloat(amount) - selectedOrder.total
                    ).toLocaleString()}{" "}
                    FCFA
                  </p>
                )}
            </div>
            <Button
              className="w-full"
              onClick={processPayment}
              disabled={processing}
            >
              {processing ? t("payments.processing") : t("payments.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("payments.receipt")}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center rounded-lg border bg-white p-2">
            {receiptData && <Receipt ref={receiptRef} data={receiptData} />}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={printReceipt}>
              <Printer className="mr-1 h-4 w-4" /> {t("payments.printReceipt")}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setReceiptOpen(false)}
            >
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
