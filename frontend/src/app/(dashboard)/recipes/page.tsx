'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, ChefHat, DollarSign, Percent, Plus, RefreshCw, Trash2, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  unitCost: number | null;
  currentStock: number;
}

interface RecipeIngredient {
  id: string;
  quantity: number;
  unit: string;
  item: InventoryItem;
}

interface Recipe {
  id: string;
  menuItemId: string;
  portionSize: number;
  notes: string | null;
  menuItem: {
    id: string;
    name: string;
    price: number;
    cost: number | null;
    categoryId: string;
  };
  ingredients: RecipeIngredient[];
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
}

interface CostAnalysisItem {
  menuItemId: string;
  menuItemName: string;
  sellingPrice: number;
  foodCost: number;
  margin: number;
  marginPercent: number;
  costRatio: number;
}

interface CostAnalysis {
  averageCostRatio: number;
  itemCount: number;
  items: CostAnalysisItem[];
}

interface NewIngredient {
  itemId: string;
  quantity: string;
  unit: string;
}

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#d97706', '#059669', '#0891b2', '#4f46e5'];

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState<'recipes' | 'analysis'>('recipes');

  // Create form
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [portionSize, setPortionSize] = useState('1');
  const [notes, setNotes] = useState('');
  const [ingredients, setIngredients] = useState<NewIngredient[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [recipesRes, analysisRes] = await Promise.all([
        api.get('/recipes'),
        api.get('/recipes/cost-analysis'),
      ]);
      setRecipes(recipesRes.data);
      setCostAnalysis(analysisRes.data);
    } catch {
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormData = async () => {
    try {
      const [menuRes, invRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/inventory/items'),
      ]);
      const allItems: MenuItem[] = [];
      for (const cat of menuRes.data) {
        for (const item of cat.menuItems || []) {
          allItems.push(item);
        }
      }
      setMenuItems(allItems);
      setInventoryItems(invRes.data || []);
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    fetchAll();
    fetchFormData();
  }, []);

  const getRecipeCost = (recipe: Recipe) =>
    recipe.ingredients.reduce((sum, ing) => sum + ing.quantity * (ing.item.unitCost || 0), 0);

  const addIngredient = () => {
    setIngredients([...ingredients, { itemId: '', quantity: '', unit: '' }]);
  };

  const removeIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const updateIngredient = (idx: number, field: keyof NewIngredient, value: string) => {
    const updated = [...ingredients];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'itemId') {
      const inv = inventoryItems.find((i) => i.id === value);
      if (inv) updated[idx].unit = inv.unit;
    }
    setIngredients(updated);
  };

  const openCreate = () => {
    setSelectedMenuItemId('');
    setPortionSize('1');
    setNotes('');
    setIngredients([{ itemId: '', quantity: '', unit: '' }]);
    setCreateOpen(true);
  };

  const existingMenuItemIds = new Set(recipes.map((r) => r.menuItemId));
  const availableMenuItems = menuItems.filter((m) => !existingMenuItemIds.has(m.id));

  const createRecipe = async () => {
    if (!selectedMenuItemId || ingredients.length === 0) {
      toast.error('Select a menu item and add at least one ingredient');
      return;
    }
    const validIngredients = ingredients.filter((i) => i.itemId && parseFloat(i.quantity) > 0);
    if (validIngredients.length === 0) {
      toast.error('Add at least one valid ingredient');
      return;
    }
    setSaving(true);
    try {
      await api.post('/recipes', {
        menuItemId: selectedMenuItemId,
        portionSize: parseFloat(portionSize) || 1,
        notes: notes || undefined,
        ingredients: validIngredients.map((i) => ({
          itemId: i.itemId,
          quantity: parseFloat(i.quantity),
          unit: i.unit,
        })),
      });
      toast.success('Recipe created');
      setCreateOpen(false);
      fetchAll();
    } catch {
      toast.error('Failed to create recipe');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      await api.delete(`/recipes/${id}`);
      toast.success('Recipe deleted');
      fetchAll();
    } catch {
      toast.error('Failed to delete recipe');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recipes & Food Cost</h1>
          <p className="text-muted-foreground">Manage recipes and analyze food costs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New Recipe
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {costAnalysis && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-muted p-3 text-blue-500">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Recipes</p>
                <p className="text-xl font-bold">{costAnalysis.itemCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-muted p-3 text-amber-500">
                <Percent className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Food Cost Ratio</p>
                <p className="text-xl font-bold">{costAnalysis.averageCostRatio}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-muted p-3 text-emerald-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Profit Margin</p>
                <p className="text-xl font-bold">
                  {costAnalysis.items.length > 0
                    ? (costAnalysis.items.reduce((s, i) => s + i.marginPercent, 0) / costAnalysis.items.length).toFixed(1)
                    : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'recipes' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => setTab('recipes')}
        >
          <ChefHat className="mr-1 inline h-4 w-4" /> Recipes ({recipes.length})
        </button>
        <button
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === 'analysis' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          onClick={() => setTab('analysis')}
        >
          <DollarSign className="mr-1 inline h-4 w-4" /> Cost Analysis
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : tab === 'recipes' ? (
        <>
          {recipes.length === 0 ? (
            <Card>
              <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                <BookOpen className="h-8 w-8" />
                <p>No recipes yet. Create one to start tracking food costs.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {recipes.map((recipe) => {
                const cost = getRecipeCost(recipe);
                const margin = recipe.menuItem.price - cost;
                const marginPct = recipe.menuItem.price > 0 ? (margin / recipe.menuItem.price) * 100 : 0;
                return (
                  <Card key={recipe.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{recipe.menuItem.name}</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRecipe(recipe.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline">Sells: {recipe.menuItem.price.toLocaleString()} FCFA</Badge>
                        <Badge variant="secondary">Cost: {cost.toLocaleString()} FCFA</Badge>
                        <Badge className={marginPct >= 60 ? 'bg-emerald-100 text-emerald-700' : marginPct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                          Margin: {marginPct.toFixed(1)}%
                        </Badge>
                      </div>
                      {recipe.notes && <p className="text-sm text-muted-foreground">{recipe.notes}</p>}
                      <Separator />
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Ingredients ({recipe.ingredients.length})</p>
                        {recipe.ingredients.map((ing) => (
                          <div key={ing.id} className="flex items-center justify-between text-sm">
                            <span>{ing.item.name}</span>
                            <span className="text-muted-foreground">
                              {ing.quantity} {ing.unit} × {(ing.item.unitCost || 0).toLocaleString()} = {(ing.quantity * (ing.item.unitCost || 0)).toLocaleString()} FCFA
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Cost Analysis Tab */}
          {costAnalysis && costAnalysis.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profit Margin by Item</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={costAnalysis.items.slice(0, 10).map((i) => ({
                      ...i,
                      name: i.menuItemName.length > 15 ? i.menuItemName.slice(0, 15) + '...' : i.menuItemName,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Margin']}
                    />
                    <Bar dataKey="marginPercent" radius={[0, 4, 4, 0]}>
                      {costAnalysis.items.slice(0, 10).map((item, i) => (
                        <Cell
                          key={item.menuItemId}
                          fill={item.marginPercent >= 60 ? '#059669' : item.marginPercent >= 40 ? '#d97706' : '#dc2626'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {!costAnalysis || costAnalysis.items.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No cost data yet. Add recipes first.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Food Cost</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                      <TableHead className="text-right">Cost Ratio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costAnalysis.items.map((item) => (
                      <TableRow key={item.menuItemId}>
                        <TableCell className="font-medium">{item.menuItemName}</TableCell>
                        <TableCell className="text-right">{item.sellingPrice.toLocaleString()} FCFA</TableCell>
                        <TableCell className="text-right">{item.foodCost.toLocaleString()} FCFA</TableCell>
                        <TableCell className="text-right">
                          <Badge className={item.marginPercent >= 60 ? 'bg-emerald-100 text-emerald-700' : item.marginPercent >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                            {item.marginPercent}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.costRatio}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Recipe Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Menu Item</Label>
              <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
                <SelectTrigger><SelectValue placeholder="Select a menu item..." /></SelectTrigger>
                <SelectContent>
                  {availableMenuItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.price.toLocaleString()} FCFA)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Portion Size</Label>
                <Input type="number" value={portionSize} onChange={(e) => setPortionSize(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preparation notes..." />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Ingredients</Label>
                <Button variant="outline" size="sm" onClick={addIngredient}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Item</Label>
                    <Select value={ing.itemId} onValueChange={(v) => updateIngredient(idx, 'itemId', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {inventoryItems.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.name} ({inv.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input className="h-9" type="number" step="0.01" value={ing.quantity} onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="w-16 space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Input className="h-9" value={ing.unit} onChange={(e) => updateIngredient(idx, 'unit', e.target.value)} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive" onClick={() => removeIngredient(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={createRecipe} disabled={saving}>
              {saving ? 'Creating...' : 'Create Recipe'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
