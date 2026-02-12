"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, RefreshCw, Users, UserPlus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useRouter } from "next/navigation";

interface TableOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  guestCount: number;
}

interface TableReservation {
  id: string;
  customerName: string;
  guestCount: number;
  startTime: string;
  status: string;
}

interface Table {
  id: string;
  number: string;
  capacity: number;
  zone: string;
  status: string;
  isActive: boolean;
  orders?: TableOrder[];
  reservations?: TableReservation[];
}

const statusConfig: Record<string, { color: string; bg: string }> = {
  AVAILABLE: {
    color: "text-emerald-600",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  OCCUPIED: { color: "text-red-600", bg: "bg-red-500/10 border-red-500/30" },
  RESERVED: { color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30" },
  CLEANING: {
    color: "text-amber-600",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
};

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    number: "",
    capacity: "4",
    zone: "Main Hall",
  });
  const [creating, setCreating] = useState(false);
  const { t } = useI18n();
  const router = useRouter();

  // Seat client dialog
  const [seatOpen, setSeatOpen] = useState(false);
  const [seatTableId, setSeatTableId] = useState("");
  const [seatTableNumber, setSeatTableNumber] = useState("");
  const [seatForm, setSeatForm] = useState({
    customerName: "",
    guestCount: "2",
  });
  const [seating, setSeating] = useState(false);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tables");
      setTables(res.data);
    } catch {
      toast.error(t("common.noResults"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const createTable = async () => {
    setCreating(true);
    try {
      await api.post("/tables", {
        number: form.number,
        capacity: parseInt(form.capacity),
        zone: form.zone,
      });
      toast.success(t("tables.addTable") + " ✓");
      setCreateOpen(false);
      setForm({ number: "", capacity: "4", zone: "Main Hall" });
      fetchTables();
    } catch {
      toast.error(t("common.noResults"));
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/tables/${id}/status`, { status });
      toast.success(t(`tables.${status}` as any));
      fetchTables();
    } catch {
      toast.error(t("common.noResults"));
    }
  };

  const openSeatDialog = (table: Table) => {
    setSeatTableId(table.id);
    setSeatTableNumber(table.number);
    setSeatForm({ customerName: "", guestCount: "2" });
    setSeatOpen(true);
  };

  const seatClient = async () => {
    if (!seatForm.customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    setSeating(true);
    try {
      await api.patch(`/tables/${seatTableId}/status`, { status: "OCCUPIED" });
      toast.success(
        `Table ${seatTableNumber} — ${seatForm.customerName} seated`,
      );
      setSeatOpen(false);
      fetchTables();
    } catch {
      toast.error("Failed to seat client");
    } finally {
      setSeating(false);
    }
  };

  const zones = [...new Set(tables.map((t) => t.zone).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("tables.title")}</h1>
          <p className="text-muted-foreground">
            {tables.length} {t("tables.totalTables")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchTables}>
            <RefreshCw className="mr-1 h-4 w-4" /> {t("common.refresh")}
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> {t("tables.addTable")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("tables.addTable")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("tables.tableNumber")}</Label>
                  <Input
                    value={form.number}
                    onChange={(e) =>
                      setForm({ ...form, number: e.target.value })
                    }
                    placeholder="e.g. 8"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("tables.capacity")}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({ ...form, capacity: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("tables.zone")}</Label>
                  <Input
                    value={form.zone}
                    onChange={(e) => setForm({ ...form, zone: e.target.value })}
                    placeholder="Main Hall, Terrace, VIP..."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={createTable}
                  disabled={creating}
                >
                  {creating ? t("common.loading") : t("tables.addTable")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seat Client Dialog */}
      <Dialog open={seatOpen} onOpenChange={setSeatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <UserPlus className="mr-2 inline h-5 w-5" />
              Seat Client — Table {seatTableNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={seatForm.customerName}
                onChange={(e) =>
                  setSeatForm({ ...seatForm, customerName: e.target.value })
                }
                placeholder="Walk-in client name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Guests</Label>
              <Input
                type="number"
                min="1"
                value={seatForm.guestCount}
                onChange={(e) =>
                  setSeatForm({ ...seatForm, guestCount: e.target.value })
                }
              />
            </div>
            <Button className="w-full" onClick={seatClient} disabled={seating}>
              <UserPlus className="mr-1 h-4 w-4" />
              {seating ? "Seating..." : "Seat Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-3">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = tables.filter((t) => t.status === status).length;
          return (
            <Badge
              key={status}
              variant="outline"
              className={`${config.bg} px-3 py-1`}
            >
              <span className={config.color}>
                {t(`tables.${status}` as any)}: {count}
              </span>
            </Badge>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        zones.map((zone) => (
          <div key={zone} className="space-y-3">
            <h2 className="text-lg font-semibold text-muted-foreground">
              {zone}
            </h2>
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {tables
                .filter((t) => t.zone === zone)
                .map((table) => {
                  const sc =
                    statusConfig[table.status] || statusConfig.AVAILABLE;
                  const activeOrder = table.orders?.[0];
                  const nextReservation = table.reservations?.[0];
                  return (
                    <Card
                      key={table.id}
                      className={cn(
                        "border-2 transition-all hover:shadow-md",
                        sc.bg,
                      )}
                    >
                      <CardContent className="p-4 text-center">
                        <p className={cn("text-2xl font-bold", sc.color)}>
                          {table.number}
                        </p>
                        <div className="mt-1 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" /> {table.capacity}
                        </div>
                        <Badge
                          variant="outline"
                          className={`mt-2 text-xs ${sc.bg}`}
                        >
                          {t(`tables.${table.status}` as any)}
                        </Badge>

                        {/* Active order info */}
                        {activeOrder && table.status === "OCCUPIED" && (
                          <div className="mt-2 rounded border bg-background/50 px-2 py-1 text-xs text-muted-foreground">
                            <ShoppingCart className="mr-1 inline h-3 w-3" />
                            {activeOrder.orderNumber} —{" "}
                            {activeOrder.total.toLocaleString()} FCFA
                          </div>
                        )}

                        {/* Next reservation info */}
                        {nextReservation && table.status === "RESERVED" && (
                          <div className="mt-2 rounded border bg-background/50 px-2 py-1 text-xs text-muted-foreground">
                            {nextReservation.customerName} (
                            {nextReservation.guestCount}p)
                            <br />
                            {new Date(
                              nextReservation.startTime,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}

                        <div className="mt-3 flex flex-col gap-1">
                          {table.status === "AVAILABLE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => openSeatDialog(table)}
                            >
                              <UserPlus className="mr-1 h-3 w-3" /> Seat Client
                            </Button>
                          )}
                          {table.status === "OCCUPIED" && (
                            <>
                              {!activeOrder && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => router.push("/orders")}
                                >
                                  <ShoppingCart className="mr-1 h-3 w-3" /> New
                                  Order
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() =>
                                  updateStatus(table.id, "CLEANING")
                                }
                              >
                                {t("tables.CLEANING")}
                              </Button>
                            </>
                          )}
                          {table.status === "CLEANING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() =>
                                updateStatus(table.id, "AVAILABLE")
                              }
                            >
                              {t("tables.AVAILABLE")}
                            </Button>
                          )}
                          {table.status === "RESERVED" && (
                            <Select
                              onValueChange={(v) => updateStatus(table.id, v)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue
                                  placeholder={t("common.actions")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OCCUPIED">
                                  {t("tables.OCCUPIED")}
                                </SelectItem>
                                <SelectItem value="AVAILABLE">
                                  {t("tables.AVAILABLE")}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
