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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  UtensilsCrossed,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number | null;
  preparationTime: number | null;
  calories: number | null;
  isAvailable: boolean;
  isActive: boolean;
  tags: string[];
  allergens: string[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  menuItems: MenuItem[];
}

const emptyItemForm = {
  name: "",
  description: "",
  price: "",
  cost: "",
  preparationTime: "",
  categoryId: "",
};

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Category dialogs
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catEditMode, setCatEditMode] = useState(false);
  const [editingCatId, setEditingCatId] = useState("");
  const [catForm, setCatForm] = useState({ name: "", description: "" });

  // Item dialogs
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemEditMode, setItemEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState("");
  const [itemForm, setItemForm] = useState({ ...emptyItemForm });

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await api.get("/menu/categories");
      setCategories(res.data);
      if (res.data.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(res.data[0].id);
      }
    } catch {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Category CRUD ──────────────────────────────────
  const openCreateCategory = () => {
    setCatEditMode(false);
    setEditingCatId("");
    setCatForm({ name: "", description: "" });
    setCatDialogOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setCatEditMode(true);
    setEditingCatId(cat.id);
    setCatForm({ name: cat.name, description: cat.description || "" });
    setCatDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!catForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      if (catEditMode) {
        await api.patch(`/menu/categories/${editingCatId}`, catForm);
        toast.success("Category updated");
      } else {
        await api.post("/menu/categories", catForm);
        toast.success("Category created");
      }
      setCatDialogOpen(false);
      fetchMenu();
    } catch {
      toast.error("Failed to save category");
    }
  };

  const deleteCategory = async (catId: string, catName: string) => {
    if (
      !confirm(
        `Delete category "${catName}" and all its items? This cannot be undone.`,
      )
    )
      return;
    try {
      await api.delete(`/menu/categories/${catId}`);
      toast.success(`"${catName}" deleted`);
      if (selectedCategoryId === catId) setSelectedCategoryId("");
      fetchMenu();
    } catch {
      toast.error("Failed to delete category");
    }
  };

  // ── Item CRUD ──────────────────────────────────────
  const openCreateItem = () => {
    setItemEditMode(false);
    setEditingItemId("");
    setItemForm({ ...emptyItemForm, categoryId: selectedCategoryId });
    setItemDialogOpen(true);
  };

  const openEditItem = (item: MenuItem) => {
    setItemEditMode(true);
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      cost: item.cost ? String(item.cost) : "",
      preparationTime: item.preparationTime ? String(item.preparationTime) : "",
      categoryId: selectedCategoryId,
    });
    setItemDialogOpen(true);
  };

  const saveItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price) {
      toast.error("Name and price are required");
      return;
    }
    const payload = {
      name: itemForm.name,
      description: itemForm.description,
      categoryId: itemForm.categoryId || selectedCategoryId,
      price: parseFloat(itemForm.price),
      cost: itemForm.cost ? parseFloat(itemForm.cost) : undefined,
      preparationTime: itemForm.preparationTime
        ? parseInt(itemForm.preparationTime)
        : undefined,
    };
    try {
      if (itemEditMode) {
        await api.patch(`/menu/items/${editingItemId}`, payload);
        toast.success("Item updated");
      } else {
        await api.post("/menu/items", payload);
        toast.success("Item created");
      }
      setItemDialogOpen(false);
      fetchMenu();
    } catch {
      toast.error("Failed to save item");
    }
  };

  const deleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`Delete "${itemName}"?`)) return;
    try {
      await api.delete(`/menu/items/${itemId}`);
      toast.success(`"${itemName}" deleted`);
      fetchMenu();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const toggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      await api.patch(`/menu/items/${itemId}`, { isAvailable: !isAvailable });
      toast.success(isAvailable ? "Marked unavailable" : "Marked available");
      fetchMenu();
    } catch {
      toast.error("Failed to update item");
    }
  };

  const totalItems = categories.reduce(
    (s, c) => s + (c.menuItems?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu</h1>
          <p className="text-muted-foreground">
            {categories.length} categories, {totalItems} items
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchMenu}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={openCreateCategory}>
            <Plus className="mr-1 h-4 w-4" /> Category
          </Button>
          <Button
            size="sm"
            onClick={openCreateItem}
            disabled={categories.length === 0}
          >
            <Plus className="mr-1 h-4 w-4" /> Item
          </Button>
        </div>
      </div>

      {/* Category Dialog (create / edit) */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {catEditMode ? "Edit Category" : "New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={catForm.name}
                onChange={(e) =>
                  setCatForm({ ...catForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={catForm.description}
                onChange={(e) =>
                  setCatForm({ ...catForm, description: e.target.value })
                }
              />
            </div>
            <Button className="w-full" onClick={saveCategory}>
              {catEditMode ? "Update Category" : "Create Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Dialog (create / edit) */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {itemEditMode ? "Edit Item" : "New Menu Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm({ ...itemForm, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price (FCFA) *</Label>
                <Input
                  type="number"
                  value={itemForm.price}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, price: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Cost (FCFA)</Label>
                <Input
                  type="number"
                  value={itemForm.cost}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, cost: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prep Time (min)</Label>
              <Input
                type="number"
                value={itemForm.preparationTime}
                onChange={(e) =>
                  setItemForm({ ...itemForm, preparationTime: e.target.value })
                }
              />
            </div>
            {!itemEditMode && categories.length > 1 && (
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={itemForm.categoryId}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, categoryId: e.target.value })
                  }
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button className="w-full" onClick={saveItem}>
              {itemEditMode ? "Update Item" : "Create Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            No menu categories yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <div className="flex items-center gap-2">
            <TabsList className="flex-wrap flex-1">
              {categories.map((cat) => {
                const unavailCount = (cat.menuItems ?? []).filter(
                  (i) => !i.isAvailable,
                ).length;
                return (
                  <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5">
                    {cat.name} ({cat.menuItems?.length ?? 0})
                    {unavailCount > 0 && (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500/15 px-1 text-[10px] font-medium text-red-600">
                        {unavailCount}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-4">
              {/* Category header with edit/delete */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
                <div>
                  <h2 className="font-semibold">{cat.name}</h2>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground">
                      {cat.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditCategory(cat)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteCategory(cat.id, cat.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {(cat.menuItems?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <UtensilsCrossed className="h-8 w-8" />
                    <p>No items in this category</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openCreateItem}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Add first item
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(cat.menuItems ?? []).map((item) => (
                    <Card
                      key={item.id}
                      className={
                        !item.isAvailable
                          ? "border-red-200 bg-red-50/30 dark:border-red-900/50 dark:bg-red-950/10"
                          : ""
                      }
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <UtensilsCrossed className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <CardTitle
                              className={`text-base truncate ${!item.isAvailable ? "line-through text-muted-foreground" : ""}`}
                            >
                              {item.name}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!item.isAvailable && (
                              <Badge
                                variant="destructive"
                                className="text-xs gap-1"
                              >
                                <Ban className="h-3 w-3" /> Unavailable
                              </Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditItem(item)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleAvailability(
                                      item.id,
                                      item.isAvailable,
                                    )
                                  }
                                >
                                  {item.isAvailable ? (
                                    <>
                                      <EyeOff className="mr-2 h-4 w-4" /> Mark
                                      Unavailable
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="mr-2 h-4 w-4" /> Mark
                                      Available
                                    </>
                                  )}
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
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-lg font-bold ${!item.isAvailable ? "text-muted-foreground" : ""}`}
                          >
                            {item.price.toLocaleString()} FCFA
                          </span>
                          {item.cost != null && item.cost > 0 && (
                            <span className="text-sm text-muted-foreground">
                              Cost: {item.cost.toLocaleString()} | Margin:{" "}
                              {Math.round(
                                ((item.price - item.cost) / item.price) * 100,
                              )}
                              %
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.preparationTime != null &&
                            item.preparationTime > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {item.preparationTime} min
                              </Badge>
                            )}
                          {item.calories != null && item.calories > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {item.calories} cal
                            </Badge>
                          )}
                          {item.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        {item.allergens.length > 0 && (
                          <p className="text-xs text-amber-600">
                            Allergens: {item.allergens.join(", ")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
