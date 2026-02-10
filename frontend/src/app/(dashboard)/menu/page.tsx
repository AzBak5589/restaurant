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
import { Plus, RefreshCw, UtensilsCrossed } from "lucide-react";
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

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [catForm, setCatForm] = useState({ name: "", description: "" });
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: "",
    cost: "",
    preparationTime: "",
    categoryId: "",
  });

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

  const createCategory = async () => {
    try {
      await api.post("/menu/categories", catForm);
      toast.success("Category created");
      setCatDialogOpen(false);
      setCatForm({ name: "", description: "" });
      fetchMenu();
    } catch {
      toast.error("Failed to create category");
    }
  };

  const createItem = async () => {
    try {
      await api.post("/menu/items", {
        ...itemForm,
        categoryId: itemForm.categoryId || selectedCategoryId,
        price: parseFloat(itemForm.price),
        cost: itemForm.cost ? parseFloat(itemForm.cost) : undefined,
        preparationTime: itemForm.preparationTime
          ? parseInt(itemForm.preparationTime)
          : undefined,
      });
      toast.success("Menu item created");
      setItemDialogOpen(false);
      setItemForm({
        name: "",
        description: "",
        price: "",
        cost: "",
        preparationTime: "",
        categoryId: "",
      });
      fetchMenu();
    } catch {
      toast.error("Failed to create item");
    }
  };

  const toggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      await api.patch(`/menu/items/${itemId}`, { isAvailable: !isAvailable });
      toast.success(
        isAvailable ? "Item marked unavailable" : "Item marked available",
      );
      fetchMenu();
    } catch {
      toast.error("Failed to update item");
    }
  };

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const totalItems = categories.reduce(
    (s, c) => s + (c.menuItems?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
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
          <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" /> Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
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
                <Button className="w-full" onClick={createCategory}>
                  Create Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Menu Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
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
                    <Label>Price (FCFA)</Label>
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
                      setItemForm({
                        ...itemForm,
                        preparationTime: e.target.value,
                      })
                    }
                  />
                </div>
                <Button className="w-full" onClick={createItem}>
                  Create Item
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
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            No menu categories yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <TabsList className="flex-wrap">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
                {cat.name} ({cat.menuItems?.length ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>
          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id}>
              {(cat.menuItems?.length ?? 0) === 0 ? (
                <Card>
                  <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
                    No items in this category
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(cat.menuItems ?? []).map((item) => (
                    <Card
                      key={item.id}
                      className={!item.isAvailable ? "opacity-60" : ""}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">
                              {item.name}
                            </CardTitle>
                          </div>
                          <Badge
                            variant={item.isAvailable ? "default" : "secondary"}
                          >
                            {item.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">
                            {item.price.toLocaleString()} FCFA
                          </span>
                          {item.cost && (
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
                          {item.preparationTime && (
                            <Badge variant="outline" className="text-xs">
                              {item.preparationTime} min
                            </Badge>
                          )}
                          {item.calories && (
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
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            toggleAvailability(item.id, item.isAvailable)
                          }
                        >
                          {item.isAvailable
                            ? "Mark Unavailable"
                            : "Mark Available"}
                        </Button>
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
