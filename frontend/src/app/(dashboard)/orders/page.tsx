"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, RefreshCw, Clock, Search } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  menuItem: { id: string; name: string };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  guestCount: number;
  createdAt: string;
  table?: { id: string; number: string; zone: string };
  user: { firstName: string; lastName: string };
  items: OrderItem[];
}

interface TableOption {
  id: string;
  number: string;
  zone: string;
  status: string;
}

interface MenuItemOption {
  id: string;
  name: string;
  price: number;
  category: { name: string };
}

interface ActiveTableOrder {
  orderId: string;
  orderNumber: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  PREPARING: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  READY: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  SERVED: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  PAID: "bg-green-500/10 text-green-600 border-green-500/20",
  CANCELLED: "bg-red-500/10 text-red-600 border-red-500/20",
};

const paymentColors: Record<string, string> = {
  PENDING: "bg-slate-500/10 text-slate-600",
  PARTIAL: "bg-amber-500/10 text-amber-600",
  PAID: "bg-emerald-500/10 text-emerald-600",
  REFUNDED: "bg-red-500/10 text-red-600",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [guestCount, setGuestCount] = useState("1");
  const [orderItems, setOrderItems] = useState<
    { menuItemId: string; quantity: number }[]
  >([]);
  const [creating, setCreating] = useState(false);
  const [activeTableOrder, setActiveTableOrder] =
    useState<ActiveTableOrder | null>(null);
  const { t } = useI18n();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get("/orders", { params });
      setOrders(res.data);
    } catch {
      toast.error(t("common.noResults"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (newOrderOpen) {
      api.get("/tables").then((r) => setTables(r.data));
      api.get("/menu/items").then((r) => setMenuItems(r.data));
    }
  }, [newOrderOpen]);

  const handleTableSelect = (tableId: string) => {
    setSelectedTable(tableId);
    const existing = orders.find(
      (o) =>
        o.table?.id === tableId && !["PAID", "CANCELLED"].includes(o.status),
    );
    if (existing) {
      setActiveTableOrder({
        orderId: existing.id,
        orderNumber: existing.orderNumber,
      });
    } else {
      setActiveTableOrder(null);
    }
  };

  const addItem = () => {
    setOrderItems([...orderItems, { menuItemId: "", quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: "menuItemId" | "quantity",
    value: string | number,
  ) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
  };

  const submitOrder = async () => {
    if (!selectedTable || orderItems.length === 0) {
      toast.error(t("orders.selectTable"));
      return;
    }
    const validItems = orderItems.filter((i) => i.menuItemId);
    if (validItems.length === 0) {
      toast.error(t("orders.addItem"));
      return;
    }
    setCreating(true);
    try {
      if (activeTableOrder) {
        await api.post(`/orders/${activeTableOrder.orderId}/items`, {
          items: validItems,
        });
        toast.success(
          `${t("orders.addItems")} ${activeTableOrder.orderNumber}`,
        );
      } else {
        await api.post("/orders", {
          tableId: selectedTable,
          guestCount: parseInt(guestCount),
          items: validItems,
        });
        toast.success(t("orders.createOrder") + " ✓");
      }
      setNewOrderOpen(false);
      setOrderItems([]);
      setSelectedTable("");
      setGuestCount("1");
      setActiveTableOrder(null);
      fetchOrders();
    } catch {
      toast.error(t("common.noResults"));
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`${t(("status." + status) as any)}`);
      fetchOrders();
    } catch {
      toast.error(t("common.noResults"));
    }
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.table?.number.includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("orders.title")}</h1>
          <p className="text-muted-foreground">
            {orders.length} {t("orders.totalOrders")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            <RefreshCw className="mr-1 h-4 w-4" /> {t("common.refresh")}
          </Button>
          <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> {t("orders.newOrder")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("orders.newOrder")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("orders.table")}</Label>
                    <Select
                      value={selectedTable}
                      onValueChange={handleTableSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("orders.selectTable")} />
                      </SelectTrigger>
                      <SelectContent>
                        {tables
                          .filter(
                            (tbl) =>
                              tbl.status === "AVAILABLE" ||
                              tbl.status === "OCCUPIED",
                          )
                          .map((tbl) => (
                            <SelectItem key={tbl.id} value={tbl.id}>
                              {t("orders.table")} {tbl.number} ({tbl.zone})
                              {tbl.status === "OCCUPIED"
                                ? " — " + t("orders.activeOrder")
                                : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("orders.guests")}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={guestCount}
                      onChange={(e) => setGuestCount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t("orders.items")}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
                    >
                      <Plus className="mr-1 h-3 w-3" /> {t("orders.addItem")}
                    </Button>
                  </div>
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Select
                        value={item.menuItemId}
                        onValueChange={(v) => updateItem(idx, "menuItemId", v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={t("orders.selectItem")} />
                        </SelectTrigger>
                        <SelectContent>
                          {menuItems.map((mi) => (
                            <SelectItem key={mi.id} value={mi.id}>
                              {mi.name} - {mi.price.toLocaleString()} FCFA
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="1"
                        className="w-20"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "quantity",
                            parseInt(e.target.value) || 1,
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(idx)}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
                {activeTableOrder && (
                  <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-600 dark:text-blue-400">
                    {t("orders.activeOrderBanner")}{" "}
                    <strong>{activeTableOrder.orderNumber}</strong>.{" "}
                    {t("orders.itemsWillBeAdded")}
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={submitOrder}
                  disabled={creating}
                >
                  {creating
                    ? activeTableOrder
                      ? t("orders.adding")
                      : t("orders.creating")
                    : activeTableOrder
                      ? `${t("orders.addItems")} ${activeTableOrder.orderNumber}`
                      : t("orders.createOrder")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("orders.searchOrder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("orders.filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("orders.allStatuses")}</SelectItem>
            <SelectItem value="PENDING">{t("status.PENDING")}</SelectItem>
            <SelectItem value="CONFIRMED">{t("status.CONFIRMED")}</SelectItem>
            <SelectItem value="PREPARING">{t("status.PREPARING")}</SelectItem>
            <SelectItem value="READY">{t("status.READY")}</SelectItem>
            <SelectItem value="SERVED">{t("status.SERVED")}</SelectItem>
            <SelectItem value="PAID">{t("status.PAID")}</SelectItem>
            <SelectItem value="CANCELLED">{t("status.CANCELLED")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            {t("orders.noOrders")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className={`overflow-hidden ${order.status === "PENDING" ? "ring-2 ring-yellow-500 animate-pulse" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {order.orderNumber}
                  </CardTitle>
                  <Badge
                    className={statusColors[order.status] || ""}
                    variant="outline"
                  >
                    {t(`status.${order.status}` as any)}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {order.table && (
                    <span>
                      {t("orders.table")} {order.table.number}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.menuItem.name}
                      </span>
                      <span className="text-muted-foreground">
                        {item.total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <div>
                    <span className="text-lg font-bold">
                      {order.total.toLocaleString()} FCFA
                    </span>
                    <Badge
                      className={`ml-2 text-xs ${paymentColors[order.paymentStatus]}`}
                      variant="outline"
                    >
                      {t(`payment.${order.paymentStatus}` as any)}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {order.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateStatus(order.id, "CONFIRMED")}
                    >
                      {t("action.confirm")}
                    </Button>
                  )}
                  {order.status === "CONFIRMED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateStatus(order.id, "PREPARING")}
                    >
                      {t("action.startPrep")}
                    </Button>
                  )}
                  {order.status === "PREPARING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateStatus(order.id, "READY")}
                    >
                      {t("action.markReady")}
                    </Button>
                  )}
                  {order.status === "READY" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => updateStatus(order.id, "SERVED")}
                    >
                      {t("action.served")}
                    </Button>
                  )}
                  {(order.status === "PENDING" ||
                    order.status === "CONFIRMED") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => updateStatus(order.id, "CANCELLED")}
                    >
                      {t("action.cancel")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
