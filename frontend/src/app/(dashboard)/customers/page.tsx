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
  Plus,
  RefreshCw,
  Search,
  Heart,
  Star,
  MoreVertical,
  Pencil,
  Trash2,
  UserX,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/lib/i18n";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  isActive: boolean;
}

const emptyForm = { firstName: "", lastName: "", phone: "", email: "" };

export default function CustomersPage() {
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const res = await api.get("/customers", { params });
      setCustomers(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("customers.error.load")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCustomer = async () => {
    if (!form.firstName.trim() || !form.phone.trim()) {
      toast.error(t("customers.error.requiredNamePhone"));
      return;
    }
    setCreating(true);
    try {
      await api.post("/customers", {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email || undefined,
      });
      toast.success(t("customers.toast.created"));
      setCreateOpen(false);
      setForm({ ...emptyForm });
      fetchCustomers();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("customers.error.create")));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setEditForm({
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      email: c.email || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.firstName.trim() || !editForm.phone.trim()) {
      toast.error(t("customers.error.requiredNamePhone"));
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/customers/${editId}`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phone: editForm.phone,
        email: editForm.email || null,
      });
      toast.success(t("customers.toast.updated"));
      setEditOpen(false);
      fetchCustomers();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("customers.error.update")));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Customer) => {
    try {
      await api.patch(`/customers/${c.id}`, { isActive: !c.isActive });
      toast.success(
        c.isActive
          ? t("customers.toast.deactivated")
          : t("customers.toast.activated"),
      );
      fetchCustomers();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("customers.error.update")));
    }
  };

  const deleteCustomer = async (c: Customer) => {
    if (
      !confirm(
        `${t("customers.confirm.deactivate")} "${c.firstName} ${c.lastName}"?`,
      )
    )
      return;
    try {
      await api.patch(`/customers/${c.id}`, { isActive: false });
      toast.success(t("customers.toast.deactivated"));
      fetchCustomers();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("customers.error.delete")));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const renderFormFields = (
    f: typeof emptyForm,
    setF: (v: typeof emptyForm) => void,
  ) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("staff.firstName")} *</Label>
          <Input
            value={f.firstName}
            onChange={(e) => setF({ ...f, firstName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("staff.lastName")}</Label>
          <Input
            value={f.lastName}
            onChange={(e) => setF({ ...f, lastName: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("common.phone")} *</Label>
        <Input
          value={f.phone}
          onChange={(e) => setF({ ...f, phone: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("common.email")}</Label>
        <Input
          type="email"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
        />
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("customers.title")}</h1>
          <p className="text-muted-foreground">
            {customers.length} {t("customers.totalCustomers")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCustomers}>
            <RefreshCw className="mr-1 h-4 w-4" /> {t("common.refresh")}
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> {t("customers.addCustomer")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("customers.addCustomer")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {renderFormFields(form, setForm)}
                <Button
                  className="w-full"
                  onClick={createCustomer}
                  disabled={creating}
                >
                  {creating ? t("common.creating") : t("customers.addCustomer")}
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
              {t("customers.editCustomer")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {renderFormFields(editForm, setEditForm)}
            <Button className="w-full" onClick={saveEdit} disabled={saving}>
              {saving ? t("common.saving") : t("customers.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("customers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          {t("common.search")}
        </Button>
      </form>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Heart className="h-8 w-8" />
            {t("customers.noCustomers")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("common.phone")}</TableHead>
                <TableHead>{t("common.email")}</TableHead>
                <TableHead className="text-right">{t("customers.visitCount")}</TableHead>
                <TableHead className="text-right">{t("customers.totalSpent")}</TableHead>
                <TableHead className="text-right">{t("customers.loyaltyPoints")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow
                  key={c.id}
                  className={!c.isActive ? "opacity-50" : ""}
                >
                  <TableCell className="font-medium">
                    {c.firstName} {c.lastName}
                  </TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.email || "-"}
                  </TableCell>
                  <TableCell className="text-right">{c.visitCount}</TableCell>
                  <TableCell className="text-right">
                    {c.totalSpent.toLocaleString()} FCFA
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <Star className="h-3 w-3 text-amber-500" />
                      {c.loyaltyPoints}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? "default" : "secondary"}>
                      {c.isActive ? t("common.active") : t("common.inactive")}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => openEdit(c)}>
                          <Pencil className="mr-2 h-4 w-4" /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(c)}>
                          {c.isActive ? (
                            <UserX className="mr-2 h-4 w-4" />
                          ) : (
                            <UserCheck className="mr-2 h-4 w-4" />
                          )}
                          {c.isActive ? t("customers.deactivate") : t("customers.activate")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteCustomer(c)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
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
