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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  UserCheck,
  UserX,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getApiErrorMessage } from "@/lib/api-error";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
}

const roleBadge: Record<string, string> = {
  ADMIN: "bg-purple-500/10 text-purple-600",
  MANAGER: "bg-blue-500/10 text-blue-600",
  CASHIER: "bg-emerald-500/10 text-emerald-600",
  WAITER: "bg-amber-500/10 text-amber-600",
  CHEF: "bg-red-500/10 text-red-600",
  BARTENDER: "bg-teal-500/10 text-teal-600",
};

const roles = ["ADMIN", "MANAGER", "CASHIER", "WAITER", "CHEF", "BARTENDER"];

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "WAITER",
  password: "",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const { t } = useI18n();

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get("/staff");
      setStaff(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("common.noResults")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createStaff = async () => {
    if (!form.firstName.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error(t("staff.error.requiredCreate"));
      return;
    }
    setCreating(true);
    try {
      await api.post("/staff", form);
      toast.success(t("staff.addMember") + " ✓");
      setCreateOpen(false);
      setForm({ ...emptyForm });
      fetchStaff();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("staff.error.create")));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (s: StaffMember) => {
    setEditId(s.id);
    setEditForm({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone || "",
      role: s.role,
      password: "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.firstName.trim() || !editForm.email.trim()) {
      toast.error(t("staff.error.requiredUpdate"));
      return;
    }
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone || null,
        role: editForm.role,
      };
      if (editForm.password.trim()) {
        data.password = editForm.password;
      }
      await api.patch(`/staff/${editId}`, data);
      toast.success(t("staff.toast.updated"));
      setEditOpen(false);
      fetchStaff();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("staff.error.update")));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string) => {
    try {
      await api.patch(`/staff/${id}/toggle-active`);
      toast.success(t("common.save") + " ✓");
      fetchStaff();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("common.noResults")));
    }
  };

  const deleteStaff = async (s: StaffMember) => {
    if (!confirm(`${t("staff.confirm.deactivate")} "${s.firstName} ${s.lastName}"?`))
      return;
    if (s.isActive) {
      await toggleActive(s.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("staff.title")}</h1>
          <p className="text-muted-foreground">
            {staff.length} {t("staff.totalStaff")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStaff}>
            <RefreshCw className="mr-1 h-4 w-4" /> {t("common.refresh")}
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> {t("staff.addMember")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("staff.addMember")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("staff.firstName")} *</Label>
                    <Input
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("staff.lastName")}</Label>
                    <Input
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("common.email")} *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("common.phone")}</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("staff.role")}</Label>
                    <Select
                      value={form.role}
                      onValueChange={(v) => setForm({ ...form, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(`staff.${r}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("auth.password")} *</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={createStaff}
                  disabled={creating}
                >
                  {creating ? t("common.loading") : t("staff.addMember")}
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
              {t("staff.editMember")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("staff.firstName")} *</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("staff.lastName")}</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("common.email")} *</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("common.phone")}</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t("staff.role")}</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) => setEditForm({ ...editForm, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {t(`staff.${r}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("auth.password")}</Label>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) =>
                  setEditForm({ ...editForm, password: e.target.value })
                }
                placeholder={t("staff.passwordOptional")}
              />
            </div>
            <Button className="w-full" onClick={saveEdit} disabled={saving}>
              {saving ? t("common.saving") : t("customers.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((s) => (
            <Card key={s.id} className={!s.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {s.firstName} {s.lastName}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={roleBadge[s.role] || ""}
                    >
                      {t(`staff.${s.role}`)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(s)}>
                          <Pencil className="mr-2 h-4 w-4" /> {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(s.id)}>
                          {s.isActive ? (
                            <UserX className="mr-2 h-4 w-4" />
                          ) : (
                            <UserCheck className="mr-2 h-4 w-4" />
                          )}
                          {s.isActive
                            ? t("customers.deactivate")
                            : t("customers.activate")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteStaff(s)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{s.email}</p>
                {s.phone && (
                  <p className="text-sm text-muted-foreground">{s.phone}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <Badge variant={s.isActive ? "default" : "secondary"}>
                    {s.isActive ? t("common.active") : t("common.inactive")}
                  </Badge>
                  {s.lastLogin && (
                    <span className="text-xs text-muted-foreground">
                      {t("staff.lastLoginShort")}:{" "}
                      {new Date(s.lastLogin).toLocaleDateString()}
                    </span>
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
