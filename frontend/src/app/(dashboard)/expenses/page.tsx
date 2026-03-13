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
  Plus,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  supplier: string | null;
  reference: string | null;
  paymentMethod: string | null;
  notes: string | null;
  isRecurring: boolean;
  createdAt: string;
  createdBy: { id: string; firstName: string; lastName: string } | null;
}

interface Summary {
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  expenseCount: number;
  orderCount: number;
  byCategory: Record<string, number>;
}

const CATEGORIES = [
  "Food & Beverages",
  "Salaries",
  "Rent",
  "Utilities",
  "Equipment",
  "Maintenance",
  "Marketing",
  "Insurance",
  "Supplies",
  "Transport",
  "Taxes & Fees",
  "Other",
];

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Mobile Money", "Cheque", "Card"];

const categoryColors: Record<string, string> = {
  "Food & Beverages": "bg-orange-500/10 text-orange-600",
  Salaries: "bg-blue-500/10 text-blue-600",
  Rent: "bg-purple-500/10 text-purple-600",
  Utilities: "bg-yellow-500/10 text-yellow-600",
  Equipment: "bg-slate-500/10 text-slate-600",
  Maintenance: "bg-teal-500/10 text-teal-600",
  Marketing: "bg-pink-500/10 text-pink-600",
  Insurance: "bg-indigo-500/10 text-indigo-600",
  Supplies: "bg-emerald-500/10 text-emerald-600",
  Transport: "bg-cyan-500/10 text-cyan-600",
  "Taxes & Fees": "bg-red-500/10 text-red-600",
  Other: "bg-gray-500/10 text-gray-600",
};

const emptyForm = {
  category: "Food & Beverages",
  description: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  supplier: "",
  reference: "",
  paymentMethod: "",
  notes: "",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [summary, setSummary] = useState<Summary | null>(null);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (categoryFilter !== "all") params.category = categoryFilter;
      const res = await api.get("/expenses", { params });
      setExpenses(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load expenses"));
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const res = await api.get("/expenses/summary", {
        params: { startDate, endDate },
      });
      setSummary(res.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const createExpense = async () => {
    if (!form.description.trim() || !form.amount) {
      toast.error("Description and amount are required");
      return;
    }
    setCreating(true);
    try {
      await api.post("/expenses", {
        ...form,
        amount: parseFloat(form.amount),
      });
      toast.success("Expense added");
      setCreateOpen(false);
      setForm({ ...emptyForm });
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create expense"));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (e: Expense) => {
    setEditId(e.id);
    setEditForm({
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      date: new Date(e.date).toISOString().split("T")[0],
      supplier: e.supplier || "",
      reference: e.reference || "",
      paymentMethod: e.paymentMethod || "",
      notes: e.notes || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.description.trim() || !editForm.amount) {
      toast.error("Description and amount are required");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/expenses/${editId}`, {
        ...editForm,
        amount: parseFloat(editForm.amount),
        supplier: editForm.supplier || null,
        reference: editForm.reference || null,
        paymentMethod: editForm.paymentMethod || null,
        notes: editForm.notes || null,
      });
      toast.success("Expense updated");
      setEditOpen(false);
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update expense"));
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (e: Expense) => {
    if (!confirm(`Delete expense "${e.description}"?`)) return;
    try {
      await api.delete(`/expenses/${e.id}`);
      toast.success("Expense deleted");
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete expense"));
    }
  };

  const renderFormFields = (
    f: typeof emptyForm,
    setF: (v: typeof emptyForm) => void
  ) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={f.category}
            onValueChange={(v) => setF({ ...f, category: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description *</Label>
        <Input
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
          placeholder="What was this expense for?"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Amount (FCFA) *</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={f.paymentMethod || "none"}
            onValueChange={(v) =>
              setF({ ...f, paymentMethod: v === "none" ? "" : v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Supplier</Label>
          <Input
            value={f.supplier}
            onChange={(e) => setF({ ...f, supplier: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Reference / Invoice #</Label>
          <Input
            value={f.reference}
            onChange={(e) => setF({ ...f, reference: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
          placeholder="Optional notes..."
        />
      </div>
    </>
  );

  const monthName = new Date().toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">
            {expenses.length} expenses recorded
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchExpenses();
              fetchSummary();
            }}
          >
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {renderFormFields(form, setForm)}
                <Button
                  className="w-full"
                  onClick={createExpense}
                  disabled={creating}
                >
                  {creating ? "Adding..." : "Add Expense"}
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
              Edit Expense
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {renderFormFields(editForm, setEditForm)}
            <Button className="w-full" onClick={saveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* P&L Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Revenue ({monthName})
                </p>
                <p className="text-lg font-bold">
                  {summary.totalRevenue.toLocaleString()} FCFA
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-red-500/10 p-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Expenses ({monthName})
                </p>
                <p className="text-lg font-bold">
                  {summary.totalExpenses.toLocaleString()} FCFA
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className={`rounded-lg p-2 ${summary.netProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}
              >
                <DollarSign
                  className={`h-5 w-5 ${summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Net Profit ({monthName})
                </p>
                <p
                  className={`text-lg font-bold ${summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {summary.netProfit.toLocaleString()} FCFA
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-lg font-bold">
                  {summary.orderCount} orders / {summary.expenseCount} expenses
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category breakdown */}
      {summary && Object.keys(summary.byCategory).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Expenses by Category ({monthName})
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amount]) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className={`text-xs ${categoryColors[cat] || ""}`}
                  >
                    {cat}: {amount.toLocaleString()} FCFA
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Wallet className="h-8 w-8" />
            No expenses recorded
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(e.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${categoryColors[e.category] || ""}`}
                    >
                      {e.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{e.description}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.supplier || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {e.paymentMethod || "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    {e.amount.toLocaleString()} FCFA
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
                        <DropdownMenuItem onClick={() => openEdit(e)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteExpense(e)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
