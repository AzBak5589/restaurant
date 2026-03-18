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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  RefreshCw,
  Package,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowUpCircle,
  History,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/lib/i18n";

interface Movement {
  id: string;
  type: string;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  item: { name: string; unit: string };
}

interface Valuation {
  totalValue: number;
  totalItems: number;
  itemCount: number;
}

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number | null;
  unitCost: number | null;
  supplier: string | null;
  category: string | null;
  isActive: boolean;
}

const emptyForm = {
  name: "",
  sku: "",
  unit: "kg",
  minStock: "5",
  maxStock: "",
  unitCost: "",
  supplier: "",
  category: "",
};

export default function InventoryPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({ ...emptyForm, currentStock: "0" });
  const [editOriginalStock, setEditOriginalStock] = useState(0);
  const [saving, setSaving] = useState(false);

  // Stock adjustment dialog
  const [stockOpen, setStockOpen] = useState(false);
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [stockForm, setStockForm] = useState({
    type: "IN" as "IN" | "OUT" | "LOSS" | "RETURN",
    quantity: "",
    notes: "",
  });
  const [adjusting, setAdjusting] = useState(false);

  // Movement history dialog
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Stock valuation
  const [valuation, setValuation] = useState<Valuation | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inventory/items");
      setItems(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("inventory.error.load")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchValuation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchValuation = async () => {
    try {
      const res = await api.get("/inventory/valuation");
      setValuation(res.data);
    } catch {
      /* ignore */
    }
  };

  const openHistory = async (item: InventoryItem) => {
    setHistoryItem(item);
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get("/inventory/movements", {
        params: { itemId: item.id },
      });
      setMovements(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("inventory.error.loadHistory")));
    } finally {
      setLoadingHistory(false);
    }
  };

  // ─── CREATE ─────────────────────────────────────────────────
  const createItem = async () => {
    if (!form.name.trim()) {
      toast.error(t("inventory.error.requiredName"));
      return;
    }
    setCreating(true);
    try {
      await api.post("/inventory/items", {
        name: form.name,
        sku: form.sku || undefined,
        unit: form.unit,
        minStock: parseFloat(form.minStock) || 0,
        maxStock: form.maxStock ? parseFloat(form.maxStock) : undefined,
        unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
        supplier: form.supplier || undefined,
        category: form.category || undefined,
      });
      toast.success(t("inventory.toast.created"));
      setCreateOpen(false);
      setForm({ ...emptyForm });
      fetchItems();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("inventory.error.create")));
    } finally {
      setCreating(false);
    }
  };

  // ─── EDIT ───────────────────────────────────────────────────
  const openEdit = (item: InventoryItem) => {
    setEditId(item.id);
    setEditOriginalStock(item.currentStock);
    setEditForm({
      name: item.name,
      sku: item.sku || "",
      unit: item.unit,
      minStock: String(item.minStock),
      maxStock: item.maxStock != null ? String(item.maxStock) : "",
      unitCost: item.unitCost != null ? String(item.unitCost) : "",
      supplier: item.supplier || "",
      category: item.category || "",
      currentStock: String(item.currentStock),
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error(t("inventory.error.requiredName"));
      return;
    }
    setSaving(true);
    try {
      // Update item metadata
      await api.patch(`/inventory/items/${editId}`, {
        name: editForm.name,
        sku: editForm.sku || null,
        unit: editForm.unit,
        minStock: parseFloat(editForm.minStock) || 0,
        maxStock: editForm.maxStock ? parseFloat(editForm.maxStock) : null,
        unitCost: editForm.unitCost ? parseFloat(editForm.unitCost) : null,
        supplier: editForm.supplier || null,
        category: editForm.category || null,
      });

      // If stock changed, create an adjustment movement
      const newStock = parseFloat(editForm.currentStock) || 0;
      const diff = newStock - editOriginalStock;
      if (diff !== 0) {
        await api.post("/inventory/movements", {
          itemId: editId,
          type: diff > 0 ? "IN" : "OUT",
          quantity: Math.abs(diff),
          notes: `Stock adjusted from ${editOriginalStock} to ${newStock}`,
        });
      }

      toast.success(t("inventory.toast.updated"));
      setEditOpen(false);
      fetchItems();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("inventory.error.update")));
    } finally {
      setSaving(false);
    }
  };

  // ─── DELETE ─────────────────────────────────────────────────
  const deleteItem = async (id: string, name: string) => {
    if (!confirm(`${t("inventory.confirm.delete")} "${name}"?`)) return;
    try {
      await api.delete(`/inventory/items/${id}`);
      toast.success(`${t("inventory.toast.deleted")} "${name}"`);
      fetchItems();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("inventory.error.delete")));
    }
  };

  // ─── STOCK ADJUSTMENT ──────────────────────────────────────
  const openStockAdjust = (item: InventoryItem) => {
    setStockItem(item);
    setStockForm({ type: "IN", quantity: "", notes: "" });
    setStockOpen(true);
  };

  const submitStockAdjust = async () => {
    if (!stockItem) return;
    const qty = parseFloat(stockForm.quantity);
    if (!qty || qty <= 0) {
      toast.error(t("inventory.error.invalidQuantity"));
      return;
    }
    setAdjusting(true);
    try {
      await api.post("/inventory/movements", {
        itemId: stockItem.id,
        type: stockForm.type,
        quantity: qty,
        notes: stockForm.notes || undefined,
      });
      const label =
        stockForm.type === "IN"
          ? t("inventory.adjust.added")
          : stockForm.type === "OUT"
            ? t("inventory.adjust.removed")
            : stockForm.type === "LOSS"
              ? t("inventory.adjust.lost")
              : t("inventory.adjust.returned");
      toast.success(`${qty} ${stockItem.unit} ${label} — ${stockItem.name}`);
      setStockOpen(false);
      fetchItems();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("inventory.error.adjust")));
    } finally {
      setAdjusting(false);
    }
  };

  const lowStockCount = items.filter(
    (i) => i.currentStock <= i.minStock,
  ).length;

  // Shared form fields renderer
  const renderFormFields = (
    f: typeof emptyForm,
    setF: (v: typeof emptyForm) => void,
  ) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("common.name")} *</Label>
          <Input
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("inventory.sku")}</Label>
          <Input
            value={f.sku}
            onChange={(e) => setF({ ...f, sku: e.target.value })}
            placeholder={t("inventory.optional")}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>{t("inventory.unit")}</Label>
          <Input
            value={f.unit}
            onChange={(e) => setF({ ...f, unit: e.target.value })}
            placeholder={t("inventory.unitPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("inventory.minStock")}</Label>
          <Input
            type="number"
            value={f.minStock}
            onChange={(e) => setF({ ...f, minStock: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("inventory.maxStock")}</Label>
          <Input
            type="number"
            value={f.maxStock}
            onChange={(e) => setF({ ...f, maxStock: e.target.value })}
            placeholder={t("inventory.optional")}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("inventory.unitCost")} (FCFA)</Label>
          <Input
            type="number"
            value={f.unitCost}
            onChange={(e) => setF({ ...f, unitCost: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("inventory.supplier")}</Label>
          <Input
            value={f.supplier}
            onChange={(e) => setF({ ...f, supplier: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("inventory.category")}</Label>
        <Input
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
          placeholder={t("inventory.categoryPlaceholder")}
        />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("inventory.title")}</h1>
          <p className="text-muted-foreground">
            {items.length} {t("inventory.itemsTracked")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}>
            <RefreshCw className="mr-1 h-4 w-4" /> {t("common.refresh")}
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> {t("inventory.addItem")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("inventory.addInventoryItem")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {renderFormFields(form, setForm)}
                <Button
                  className="w-full"
                  onClick={createItem}
                  disabled={creating}
                >
                  {creating ? t("common.creating") : t("inventory.addItem")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Pencil className="mr-2 inline h-4 w-4" />
              {t("inventory.editInventoryItem")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("common.name")} *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("inventory.sku")}</Label>
                <Input
                  value={editForm.sku}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sku: e.target.value })
                  }
                  placeholder={t("inventory.optional")}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>{t("inventory.unit")}</Label>
                <Input
                  value={editForm.unit}
                  onChange={(e) =>
                    setEditForm({ ...editForm, unit: e.target.value })
                  }
                  placeholder={t("inventory.unitPlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("inventory.minStock")}</Label>
                <Input
                  type="number"
                  value={editForm.minStock}
                  onChange={(e) =>
                    setEditForm({ ...editForm, minStock: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("inventory.maxStock")}</Label>
                <Input
                  type="number"
                  value={editForm.maxStock}
                  onChange={(e) =>
                    setEditForm({ ...editForm, maxStock: e.target.value })
                  }
                  placeholder={t("inventory.optional")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("inventory.currentStock")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.currentStock}
                  onChange={(e) =>
                    setEditForm({ ...editForm, currentStock: e.target.value })
                  }
                  className="flex-1"
                />
                {parseFloat(editForm.currentStock) !== editOriginalStock && (
                  <Badge
                    variant="outline"
                    className="whitespace-nowrap text-xs"
                  >
                    {t("inventory.was")} {editOriginalStock}
                  </Badge>
                )}
              </div>
              {parseFloat(editForm.currentStock) !== editOriginalStock && (
                <p className="text-xs text-muted-foreground">
                  {t("inventory.stockMovementAuto")}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("inventory.unitCost")} (FCFA)</Label>
                <Input
                  type="number"
                  value={editForm.unitCost}
                  onChange={(e) =>
                    setEditForm({ ...editForm, unitCost: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("inventory.supplier")}</Label>
                <Input
                  value={editForm.supplier}
                  onChange={(e) =>
                    setEditForm({ ...editForm, supplier: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("inventory.category")}</Label>
              <Input
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
                placeholder={t("inventory.categoryPlaceholder")}
              />
            </div>
            <Button className="w-full" onClick={saveEdit} disabled={saving}>
              {saving ? t("common.saving") : t("customers.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <ArrowUpCircle className="mr-2 inline h-4 w-4" />
              {t("inventory.adjustStock")} — {stockItem?.name}
            </DialogTitle>
          </DialogHeader>
          {stockItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                <span className="text-sm text-muted-foreground">
                  {t("inventory.currentStock")}:
                </span>
                <span className="text-lg font-bold">
                  {stockItem.currentStock} {stockItem.unit}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("inventory.movementType")} *</Label>
                  <Select
                    value={stockForm.type}
                    onValueChange={(v) =>
                      setStockForm({
                        ...stockForm,
                        type: v as "IN" | "OUT" | "LOSS" | "RETURN",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">{t("inventory.movement.in")}</SelectItem>
                      <SelectItem value="OUT">{t("inventory.movement.out")}</SelectItem>
                      <SelectItem value="LOSS">
                        {t("inventory.movement.loss")}
                      </SelectItem>
                      <SelectItem value="RETURN">{t("inventory.movement.return")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("inventory.quantity")} ({stockItem.unit}) *</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={stockForm.quantity}
                    onChange={(e) =>
                      setStockForm({ ...stockForm, quantity: e.target.value })
                    }
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("common.notes")}</Label>
                <Input
                  value={stockForm.notes}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, notes: e.target.value })
                  }
                  placeholder={t("inventory.optionalReason")}
                />
              </div>
              <Button
                className="w-full"
                onClick={submitStockAdjust}
                disabled={adjusting}
              >
                {adjusting
                  ? t("inventory.adjusting")
                  : `${["IN", "RETURN"].includes(stockForm.type) ? t("inventory.addStock") : t("inventory.removeStock")}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Movement History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <History className="mr-2 inline h-4 w-4" />
              {t("inventory.movementHistory")} — {historyItem?.name}
            </DialogTitle>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t("inventory.noMovements")}
            </p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("common.type")}</TableHead>
                    <TableHead className="text-right">{t("inventory.qty")}</TableHead>
                    <TableHead>{t("common.notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString()}{" "}
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            ["IN", "RETURN"].includes(m.type)
                              ? "bg-emerald-500/10 text-emerald-600"
                              : m.type === "TRANSFER"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {m.type}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          ["IN", "RETURN"].includes(m.type)
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {["IN", "RETURN"].includes(m.type) ? "+" : "-"}
                        {m.quantity}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                        {m.notes || m.reference || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Valuation & Alert Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {valuation && (
          <>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("inventory.stockValue")}</p>
                  <p className="text-lg font-bold">
                    {valuation.totalValue.toLocaleString()} FCFA
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("inventory.itemsTracked")}</p>
                  <p className="text-lg font-bold">{valuation.itemCount}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
        {lowStockCount > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <TrendingDown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("inventory.lowStock")}</p>
                <p className="text-lg font-bold text-amber-600">
                  {lowStockCount} {t("inventory.itemWord")}
                  {lowStockCount > 1 ? t("inventory.itemPluralSuffix") : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Package className="h-8 w-8" />
            {t("inventory.noInventoryItems")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("inventory.category")}</TableHead>
                <TableHead className="text-right">{t("inventory.stock")}</TableHead>
                <TableHead className="text-right">{t("inventory.minShort")}</TableHead>
                <TableHead>{t("inventory.unit")}</TableHead>
                <TableHead className="text-right">{t("inventory.cost")}</TableHead>
                <TableHead>{t("inventory.supplier")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isLow = item.currentStock <= item.minStock;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.name}
                      {item.sku && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({item.sku})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.category || "-"}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${isLow ? "text-red-500" : ""}`}
                    >
                      {item.currentStock}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.minStock}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">
                      {item.unitCost
                        ? `${item.unitCost.toLocaleString()} FCFA`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.supplier || "-"}
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="destructive" className="text-xs">
                          {t("inventory.lowStock")}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          {t("common.ok")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openStockAdjust(item)}
                          >
                            <ArrowUpCircle className="mr-2 h-4 w-4" /> {t("inventory.adjustStock")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openHistory(item)}>
                            <History className="mr-2 h-4 w-4" /> {t("inventory.history")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" /> {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteItem(item.id, item.name)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
