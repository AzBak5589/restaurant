"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  TicketPercent,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { validatePromotionForm } from "@/lib/promotion-form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type DiscountType = "PERCENTAGE" | "FIXED";

interface Promotion {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  minAmount: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const emptyForm = {
  code: "",
  name: "",
  description: "",
  discountType: "PERCENTAGE" as DiscountType,
  discountValue: "",
  minAmount: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
  isActive: true,
};

export default function PromotionsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(() => {
    const status = searchParams.get("status");
    return status === "active" || status === "inactive" ? status : "all";
  });
  const [search, setSearch] = useState(() => searchParams.get("q") || "");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const syncFiltersToUrl = (nextStatus: string, nextSearch: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextStatus === "all") {
      params.delete("status");
    } else {
      params.set("status", nextStatus);
    }

    if (!nextSearch) {
      params.delete("q");
    } else {
      params.set("q", nextSearch);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const fetchPromotions = async () => {
    const nextSearch = search.trim();
    syncFiltersToUrl(statusFilter, nextSearch);
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") {
        params.isActive = statusFilter === "active" ? "true" : "false";
      }
      if (nextSearch) {
        params.search = nextSearch;
      }
      const res = await api.get("/promotions", { params });
      setPromotions(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("promotions.error.load")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const nextStatus = searchParams.get("status");
    const normalizedStatus =
      nextStatus === "active" || nextStatus === "inactive" ? nextStatus : "all";
    const nextSearch = searchParams.get("q") || "";

    if (normalizedStatus !== statusFilter) {
      setStatusFilter(normalizedStatus);
    }
    if (nextSearch !== search) {
      setSearch(nextSearch);
    }
  }, [searchParams, statusFilter, search]);

  useEffect(() => {
    fetchPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const validateForm = (candidate: typeof emptyForm): boolean => {
    const validationError = validatePromotionForm(candidate);
    if (validationError) {
      toast.error(t(validationError));
      return false;
    }
    return true;
  };

  const createPromotion = async () => {
    if (!validateForm(form)) return;
    setCreating(true);
    try {
      await api.post("/promotions", {
        ...form,
        code: form.code ? form.code.trim().toUpperCase() : undefined,
        discountValue: Number(form.discountValue),
        minAmount: form.minAmount ? Number(form.minAmount) : undefined,
      });
      toast.success(t("promotions.toast.created"));
      setCreateOpen(false);
      setForm({ ...emptyForm });
      fetchPromotions();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("promotions.error.create")));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (promotion: Promotion) => {
    setEditId(promotion.id);
    setEditForm({
      name: promotion.name,
      code: promotion.code || "",
      description: promotion.description || "",
      discountType: promotion.discountType,
      discountValue: String(promotion.discountValue),
      minAmount: promotion.minAmount != null ? String(promotion.minAmount) : "",
      startDate: new Date(promotion.startDate).toISOString().split("T")[0],
      endDate: new Date(promotion.endDate).toISOString().split("T")[0],
      isActive: promotion.isActive,
    });
    setEditOpen(true);
  };

  const savePromotion = async () => {
    if (!validateForm(editForm)) return;
    setSaving(true);
    try {
      await api.patch(`/promotions/${editId}`, {
        ...editForm,
        code: editForm.code ? editForm.code.trim().toUpperCase() : null,
        discountValue: Number(editForm.discountValue),
        minAmount: editForm.minAmount ? Number(editForm.minAmount) : null,
      });
      toast.success(t("promotions.toast.updated"));
      setEditOpen(false);
      fetchPromotions();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("promotions.error.update")));
    } finally {
      setSaving(false);
    }
  };

  const removePromotion = async (promotion: Promotion) => {
    if (!confirm(`${t("promotions.confirm.delete")} "${promotion.name}"?`)) return;
    try {
      await api.delete(`/promotions/${promotion.id}`);
      toast.success(t("promotions.toast.deleted"));
      fetchPromotions();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("promotions.error.delete")));
    }
  };

  const renderForm = (
    current: typeof emptyForm,
    setCurrent: (next: typeof emptyForm) => void,
  ) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("promotions.form.code")}</Label>
        <Input
          value={current.code}
          onChange={(e) =>
            setCurrent({ ...current, code: e.target.value.toUpperCase() })
          }
          placeholder={t("promotions.form.codePlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("promotions.form.name")} *</Label>
        <Input
          value={current.name}
          onChange={(e) => setCurrent({ ...current, name: e.target.value })}
          placeholder={t("promotions.form.namePlaceholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("promotions.form.description")}</Label>
        <Input
          value={current.description}
          onChange={(e) => setCurrent({ ...current, description: e.target.value })}
          placeholder={t("promotions.form.descriptionPlaceholder")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("promotions.form.discountType")} *</Label>
          <Select
            value={current.discountType}
            onValueChange={(value: DiscountType) =>
              setCurrent({ ...current, discountType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">
                {t("promotions.discountType.percentage")}
              </SelectItem>
              <SelectItem value="FIXED">{t("promotions.discountType.fixed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("promotions.form.discountValue")} *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={current.discountValue}
            onChange={(e) => setCurrent({ ...current, discountValue: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("promotions.form.startDate")} *</Label>
          <Input
            type="date"
            value={current.startDate}
            onChange={(e) => setCurrent({ ...current, startDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("promotions.form.endDate")} *</Label>
          <Input
            type="date"
            value={current.endDate}
            onChange={(e) => setCurrent({ ...current, endDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("promotions.form.minAmount")}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={current.minAmount}
            onChange={(e) => setCurrent({ ...current, minAmount: e.target.value })}
            placeholder={t("promotions.form.minAmountPlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("common.status")}</Label>
          <Select
            value={current.isActive ? "active" : "inactive"}
            onValueChange={(value) =>
              setCurrent({ ...current, isActive: value === "active" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("common.active")}</SelectItem>
              <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("promotions.title")}</h1>
          <p className="text-muted-foreground">
            {promotions.length} {t("promotions.loaded")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPromotions}>
            <RefreshCw className="mr-1 h-4 w-4" /> {t("common.refresh")}
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> {t("promotions.addPromotion")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("promotions.createTitle")}</DialogTitle>
              </DialogHeader>
              {renderForm(form, setForm)}
              <Button onClick={createPromotion} disabled={creating}>
                {creating ? t("common.creating") : t("promotions.createAction")}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Pencil className="mr-2 inline h-4 w-4" />
              {t("promotions.editTitle")}
            </DialogTitle>
          </DialogHeader>
          {renderForm(editForm, setEditForm)}
          <Button onClick={savePromotion} disabled={saving}>
            {saving ? t("common.saving") : t("promotions.saveChanges")}
          </Button>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              fetchPromotions();
            }
          }}
          placeholder={t("promotions.searchPlaceholder")}
        />
        <Button variant="outline" onClick={fetchPromotions}>
          {t("common.search")}
        </Button>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("promotions.filter.allStatuses")}</SelectItem>
            <SelectItem value="active">{t("common.active")}</SelectItem>
            <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : promotions.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <TicketPercent className="h-8 w-8" />
            {t("promotions.empty")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("promotions.table.code")}</TableHead>
                <TableHead>{t("promotions.table.name")}</TableHead>
                <TableHead>{t("promotions.table.discount")}</TableHead>
                <TableHead>{t("promotions.table.period")}</TableHead>
                <TableHead>{t("promotions.table.minimum")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell className="font-mono text-xs">
                    {promotion.code || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{promotion.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {promotion.description || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="inline-flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {promotion.discountType === "PERCENTAGE"
                        ? `${promotion.discountValue}%`
                        : `${promotion.discountValue.toLocaleString()} FCFA`}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(promotion.startDate).toLocaleDateString()} -{" "}
                    {new Date(promotion.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {promotion.minAmount != null
                      ? `${promotion.minAmount.toLocaleString()} FCFA`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={promotion.isActive ? "default" : "outline"}>
                      {promotion.isActive ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(promotion)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => removePromotion(promotion)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common.delete")}
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

