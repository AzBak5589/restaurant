"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertTriangle,
  Package,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { toast } from "sonner";

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

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inventory/items");
      setItems(res.data);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // ─── CREATE ─────────────────────────────────────────────────
  const createItem = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
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
      toast.success("Inventory item created");
      setCreateOpen(false);
      setForm({ ...emptyForm });
      fetchItems();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create item");
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
      toast.error("Name is required");
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

      toast.success("Item updated");
      setEditOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  // ─── DELETE ─────────────────────────────────────────────────
  const deleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will deactivate the item.`)) return;
    try {
      await api.delete(`/inventory/items/${id}`);
      toast.success(`"${name}" deleted`);
      fetchItems();
    } catch {
      toast.error("Failed to delete item");
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
      toast.error("Enter a valid quantity");
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
          ? "added"
          : stockForm.type === "OUT"
            ? "removed"
            : stockForm.type === "LOSS"
              ? "lost"
              : "returned";
      toast.success(`${qty} ${stockItem.unit} ${label} — ${stockItem.name}`);
      setStockOpen(false);
      fetchItems();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to adjust stock");
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
          <Label>Name *</Label>
          <Input
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>SKU</Label>
          <Input
            value={f.sku}
            onChange={(e) => setF({ ...f, sku: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Unit</Label>
          <Input
            value={f.unit}
            onChange={(e) => setF({ ...f, unit: e.target.value })}
            placeholder="kg, L, pcs..."
          />
        </div>
        <div className="space-y-2">
          <Label>Min Stock</Label>
          <Input
            type="number"
            value={f.minStock}
            onChange={(e) => setF({ ...f, minStock: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Max Stock</Label>
          <Input
            type="number"
            value={f.maxStock}
            onChange={(e) => setF({ ...f, maxStock: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Unit Cost (FCFA)</Label>
          <Input
            type="number"
            value={f.unitCost}
            onChange={(e) => setF({ ...f, unitCost: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Supplier</Label>
          <Input
            value={f.supplier}
            onChange={(e) => setF({ ...f, supplier: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Input
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
          placeholder="Produce, Meat, Beverages..."
        />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">{items.length} items tracked</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {renderFormFields(form, setForm)}
                <Button
                  className="w-full"
                  onClick={createItem}
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Add Item"}
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
              Edit Inventory Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={editForm.sku}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sku: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  value={editForm.unit}
                  onChange={(e) =>
                    setEditForm({ ...editForm, unit: e.target.value })
                  }
                  placeholder="kg, L, pcs..."
                />
              </div>
              <div className="space-y-2">
                <Label>Min Stock</Label>
                <Input
                  type="number"
                  value={editForm.minStock}
                  onChange={(e) =>
                    setEditForm({ ...editForm, minStock: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Stock</Label>
                <Input
                  type="number"
                  value={editForm.maxStock}
                  onChange={(e) =>
                    setEditForm({ ...editForm, maxStock: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Current Stock</Label>
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
                    was {editOriginalStock}
                  </Badge>
                )}
              </div>
              {parseFloat(editForm.currentStock) !== editOriginalStock && (
                <p className="text-xs text-muted-foreground">
                  A stock movement will be recorded automatically.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unit Cost (FCFA)</Label>
                <Input
                  type="number"
                  value={editForm.unitCost}
                  onChange={(e) =>
                    setEditForm({ ...editForm, unitCost: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  value={editForm.supplier}
                  onChange={(e) =>
                    setEditForm({ ...editForm, supplier: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
                placeholder="Produce, Meat, Beverages..."
              />
            </div>
            <Button className="w-full" onClick={saveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
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
              Adjust Stock — {stockItem?.name}
            </DialogTitle>
          </DialogHeader>
          {stockItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                <span className="text-sm text-muted-foreground">
                  Current stock:
                </span>
                <span className="text-lg font-bold">
                  {stockItem.currentStock} {stockItem.unit}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Movement Type *</Label>
                  <Select
                    value={stockForm.type}
                    onValueChange={(v) =>
                      setStockForm({ ...stockForm, type: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">Stock In (purchase)</SelectItem>
                      <SelectItem value="OUT">Stock Out (usage)</SelectItem>
                      <SelectItem value="LOSS">
                        Loss (spoilage/damage)
                      </SelectItem>
                      <SelectItem value="RETURN">Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity ({stockItem.unit}) *</Label>
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
                <Label>Notes</Label>
                <Input
                  value={stockForm.notes}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, notes: e.target.value })
                  }
                  placeholder="Optional reason..."
                />
              </div>
              <Button
                className="w-full"
                onClick={submitStockAdjust}
                disabled={adjusting}
              >
                {adjusting
                  ? "Adjusting..."
                  : `${["IN", "RETURN"].includes(stockForm.type) ? "Add" : "Remove"} Stock`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {lowStockCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="font-medium text-amber-600">
              {lowStockCount} item{lowStockCount > 1 ? "s" : ""} below minimum
              stock level
            </span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Package className="h-8 w-8" />
            No inventory items yet
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
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
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          OK
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
                            <ArrowUpCircle className="mr-2 h-4 w-4" /> Adjust
                            Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteItem(item.id, item.name)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
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
