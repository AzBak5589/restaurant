'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Flame, MapPin, Phone, Search, UtensilsCrossed } from 'lucide-react';
import { Input } from '@/components/ui/input';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  preparationTime: number | null;
  calories: number | null;
  tags: string[];
  allergens: string[];
  isAvailable: boolean;
}

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  items: MenuItem[];
}

interface Restaurant {
  name: string;
  logo: string | null;
  currency: string;
  address: string | null;
  phone: string | null;
}

export default function PublicMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tableNumber = searchParams.get('table');

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await axios.get(`${API_BASE}/digital-menu/public/${slug}`);
        setRestaurant(res.data.restaurant);
        setCategories(res.data.categories);
        if (res.data.categories.length > 0) {
          setActiveCategory(res.data.categories[0].id);
        }
      } catch {
        setError('Menu not found. Please check the link or scan the QR code again.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [slug]);

  const filteredCategories = categories.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter((cat) => cat.items.length > 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <UtensilsCrossed className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="text-xl font-bold">Menu Unavailable</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold">{restaurant.name}</h1>
            <div className="mt-1 flex items-center justify-center gap-4 text-sm text-muted-foreground">
              {restaurant.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {restaurant.address}
                </span>
              )}
              {restaurant.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {restaurant.phone}
                </span>
              )}
            </div>
            {tableNumber && (
              <Badge variant="secondary" className="mt-2">
                Table {tableNumber}
              </Badge>
            )}
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      {!search && (
        <div className="sticky top-[145px] z-10 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-1 overflow-x-auto px-4 py-2 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu Items */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {(search ? filteredCategories : categories).length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <UtensilsCrossed className="mx-auto mb-3 h-8 w-8" />
            <p>No items found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {(search ? filteredCategories : categories).map((cat) => (
              <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-48">
                <h2 className="mb-1 text-lg font-bold">{cat.name}</h2>
                {cat.description && (
                  <p className="mb-3 text-sm text-muted-foreground">{cat.description}</p>
                )}
                <Separator className="mb-4" />
                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <Card key={item.id} className={!item.isAvailable ? 'opacity-50' : ''}>
                      <CardContent className="flex gap-4 p-4">
                        {item.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold">{item.name}</h3>
                            <span className="shrink-0 font-bold text-primary">
                              {item.price.toLocaleString()} {restaurant.currency}
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.preparationTime && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="mr-1 h-3 w-3" /> {item.preparationTime} min
                              </Badge>
                            )}
                            {item.calories && (
                              <Badge variant="outline" className="text-xs">
                                <Flame className="mr-1 h-3 w-3" /> {item.calories} cal
                              </Badge>
                            )}
                            {item.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          {item.allergens.length > 0 && (
                            <p className="mt-1.5 text-xs text-amber-600">
                              Allergens: {item.allergens.join(', ')}
                            </p>
                          )}
                          {!item.isAvailable && (
                            <Badge variant="destructive" className="mt-1.5 text-xs">
                              Currently unavailable
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Powered by RestoPOS</p>
      </footer>
    </div>
  );
}
