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

export default function PaymentsPage() {
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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/orders");
      setOrders(res.data.filter((o: Order) => o.paymentStatus !== "PAID"));
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const openPayment = (order: Order) => {
    setSelectedOrder(order);
    setAmount(order.total.toString());
    setPayOpen(true);
  };

  const processPayment = async () => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      await api.post("/payments", {
        orderId: selectedOrder.id,
        amount: parseFloat(amount),
        method,
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
      toast.success("Payment processed!");
      setPayOpen(false);
      setReceiptOpen(true);
      fetchOrders();
    } catch {
      toast.error("Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open("", "_blank", "width=350,height=600");
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups to print.");
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
          <h1 className="text-2xl font-bold">POS / Payments</h1>
          <p className="text-muted-foreground">{orders.length} unpaid orders</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
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
            All orders are paid!
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
                    Table {order.table.number}
                  </p>
                )}
                <p className="text-2xl font-bold">
                  {order.total.toLocaleString()} FCFA
                </p>
                <Button className="w-full" onClick={() => openPayment(order)}>
                  <DollarSign className="mr-1 h-4 w-4" /> Process Payment
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
              Process Payment - {selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-bold">
                {selectedOrder?.total.toLocaleString()} FCFA
              </p>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount Received</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {method === "CASH" &&
                selectedOrder &&
                parseFloat(amount) > selectedOrder.total && (
                  <p className="text-sm font-medium text-emerald-600">
                    Change:{" "}
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
              {processing ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center rounded-lg border bg-white p-2">
            {receiptData && <Receipt ref={receiptRef} data={receiptData} />}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={printReceipt}>
              <Printer className="mr-1 h-4 w-4" /> Print Receipt
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setReceiptOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
