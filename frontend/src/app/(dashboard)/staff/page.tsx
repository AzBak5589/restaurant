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
import { Plus, RefreshCw, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

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

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "WAITER",
    password: "",
  });
  const { t } = useI18n();

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get("/staff");
      setStaff(res.data);
    } catch {
      toast.error(t("common.noResults"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const createStaff = async () => {
    setCreating(true);
    try {
      await api.post("/staff", form);
      toast.success(t("staff.addMember") + " ✓");
      setCreateOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "WAITER",
        password: "",
      });
      fetchStaff();
    } catch {
      toast.error(t("common.noResults"));
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string) => {
    try {
      await api.patch(`/staff/${id}/toggle-active`);
      toast.success(t("common.save") + " ✓");
      fetchStaff();
    } catch {
      toast.error(t("common.noResults"));
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
                    <Label>{t("staff.firstName")}</Label>
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
                  <Label>{t("common.email")}</Label>
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
                        {[
                          "ADMIN",
                          "MANAGER",
                          "CASHIER",
                          "WAITER",
                          "CHEF",
                          "BARTENDER",
                        ].map((r) => (
                          <SelectItem key={r} value={r}>
                            {t(`staff.${r}` as any)}
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
                  <Badge variant="outline" className={roleBadge[s.role] || ""}>
                    {t(`staff.${s.role}` as any)}
                  </Badge>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActive(s.id)}
                  >
                    {s.isActive ? (
                      <UserX className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
