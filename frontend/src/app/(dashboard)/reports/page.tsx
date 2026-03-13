"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  BarChart3,
  RefreshCw,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Receipt,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/lib/i18n";

interface RevenueSummary {
  totalRevenue: number;
  totalOrders: number;
  totalTax: number;
  totalDiscount: number;
  averageTicket: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
  tax: number;
  avgTicket: number;
}

interface TopItem {
  menuItemId: string;
  name: string;
  quantity: number;
  revenue: number;
  profit: number | null;
}

interface PromotionPerformanceItem {
  code: string | null;
  orders: number;
  totalDiscount: number;
  revenueBeforeDiscount: number;
  revenueAfterDiscount: number;
  avgDiscountPerOrder: number;
}

interface PromotionPerformanceSummary {
  promoOrders: number;
  totalDiscount: number;
  revenueBeforeDiscount: number;
  revenueAfterDiscount: number;
}

const COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#d97706",
  "#059669",
  "#0891b2",
  "#4f46e5",
  "#be123c",
  "#15803d",
];

const fmt = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString();

export default function ReportsPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [daily, setDaily] = useState<DailyRevenue[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [promotionRows, setPromotionRows] = useState<PromotionPerformanceItem[]>([]);
  const [promotionSummary, setPromotionSummary] =
    useState<PromotionPerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [revRes, topRes, promoRes] = await Promise.all([
        api.get("/reports/revenue", { params: { period } }),
        api.get("/reports/top-items", { params: { limit: 10 } }),
        api.get("/reports/promotion-performance", { params: { period } }),
      ]);
      setSummary(revRes.data.summary);
      setDaily(revRes.data.daily || []);
      setTopItems(topRes.data || []);
      setPromotionRows(promoRes.data.promotions || []);
      setPromotionSummary(promoRes.data.summary || null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("reports.error.load")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const chartDaily = daily.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));

  const pieData = topItems.slice(0, 6).map((item) => ({
    name: item.name.length > 15 ? item.name.slice(0, 15) + "..." : item.name,
    value: item.revenue,
  }));

  const summaryCards = summary
    ? [
        {
          title: t("reports.cards.totalRevenue"),
          value: `${summary.totalRevenue.toLocaleString()} FCFA`,
          icon: DollarSign,
          color: "text-emerald-500",
        },
        {
          title: t("reports.cards.totalOrders"),
          value: summary.totalOrders.toString(),
          icon: ShoppingCart,
          color: "text-blue-500",
        },
        {
          title: t("reports.cards.averageTicket"),
          value: `${summary.averageTicket.toLocaleString()} FCFA`,
          icon: Receipt,
          color: "text-purple-500",
        },
        {
          title: t("reports.cards.totalTax"),
          value: `${summary.totalTax.toLocaleString()} FCFA`,
          icon: Percent,
          color: "text-amber-500",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
          <p className="text-muted-foreground">{t("reports.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("reports.period.week")}</SelectItem>
              <SelectItem value="month">{t("reports.period.month")}</SelectItem>
              <SelectItem value="year">{t("reports.period.year")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            <RefreshCw className="mr-1 h-4 w-4" /> {t("common.refresh")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {summaryCards.map((card) => (
                <Card key={card.title}>
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className={`rounded-lg bg-muted p-3 ${card.color}`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {card.title}
                      </p>
                      <p className="text-xl font-bold">{card.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {promotionSummary && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("reports.promotions.promoOrders")}
                  </p>
                  <p className="text-2xl font-bold">
                    {promotionSummary.promoOrders}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("reports.promotions.totalDiscount")}
                  </p>
                  <p className="text-2xl font-bold text-amber-600">
                    {promotionSummary.totalDiscount.toLocaleString()} FCFA
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("reports.promotions.revenueAfterPromo")}
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {promotionSummary.revenueAfterDiscount.toLocaleString()} FCFA
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {chartDaily.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4" /> {t("reports.trend")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartDaily}>
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#2563eb"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickFormatter={fmt}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number | undefined) => [
                        `${(value ?? 0).toLocaleString()} FCFA`,
                        t("reports.revenue"),
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" /> {t("reports.topItemsByRevenue")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topItems.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    {t("reports.emptySales")}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={topItems.slice(0, 8).map((i) => ({
                        ...i,
                        name:
                          i.name.length > 12
                            ? i.name.slice(0, 12) + "..."
                            : i.name,
                      }))}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis
                        type="number"
                        tickFormatter={fmt}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number | undefined) => [
                          `${(value ?? 0).toLocaleString()} FCFA`,
                        ]}
                      />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                        {topItems.slice(0, 8).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" /> {t("reports.revenueDistribution")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    {t("reports.emptySales")}
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number | undefined) => [
                          `${(value ?? 0).toLocaleString()} FCFA`,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" /> {t("reports.salesDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topItems.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {t("reports.emptySales")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>{t("reports.table.item")}</TableHead>
                      <TableHead className="text-right">{t("reports.table.qtySold")}</TableHead>
                      <TableHead className="text-right">{t("reports.table.revenue")}</TableHead>
                      <TableHead className="text-right">{t("reports.table.profit")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topItems.map((item, i) => (
                      <TableRow key={item.menuItemId}>
                        <TableCell>
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[i % COLORS.length],
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.revenue.toLocaleString()} FCFA
                        </TableCell>
                        <TableCell className="text-right">
                          {item.profit !== null
                            ? `${item.profit.toLocaleString()} FCFA`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Percent className="h-4 w-4" /> {t("reports.promotions.performance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {promotionRows.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {t("reports.promotions.empty")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("promotions.table.code")}</TableHead>
                      <TableHead className="text-right">{t("reports.promotions.table.orders")}</TableHead>
                      <TableHead className="text-right">
                        {t("reports.promotions.table.totalDiscount")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("reports.promotions.table.revenueAfter")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("reports.promotions.table.avgDiscount")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotionRows.map((row) => (
                      <TableRow key={row.code || "no-code"}>
                        <TableCell className="font-mono text-xs">
                          {row.code || "-"}
                        </TableCell>
                        <TableCell className="text-right">{row.orders}</TableCell>
                        <TableCell className="text-right text-amber-600">
                          {row.totalDiscount.toLocaleString()} FCFA
                        </TableCell>
                        <TableCell className="text-right">
                          {row.revenueAfterDiscount.toLocaleString()} FCFA
                        </TableCell>
                        <TableCell className="text-right">
                          {row.avgDiscountPerOrder.toLocaleString()} FCFA
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
