"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  ShoppingCart,
  Users,
  UtensilsCrossed,
  CalendarClock,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";

interface DashboardData {
  today: {
    revenue: number;
    orders: number;
    paidOrders: number;
    averageTicket: number;
    guests: number;
  };
  active: {
    orders: number;
    reservations: number;
  };
  tables: Record<string, number>;
  alerts: {
    lowStockItems: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    api.get("/reports/dashboard").then((res) => setData(res.data));
  }, []);

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalTables = Object.values(data.tables).reduce((a, b) => a + b, 0);

  const stats = [
    {
      label: t("dashboard.todayRevenue"),
      value: `${data.today.revenue.toLocaleString()} FCFA`,
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: t("dashboard.activeOrders"),
      value: data.today.orders,
      sub: `${data.today.paidOrders} ${t("status.PAID").toLowerCase()}`,
      icon: ShoppingCart,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Ticket moyen",
      value: `${data.today.averageTicket.toLocaleString()} FCFA`,
      icon: TrendingUp,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: t("dashboard.totalCustomers"),
      value: data.today.guests,
      icon: Users,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("app.tagline")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}
              >
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
                {stat.sub && (
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UtensilsCrossed className="h-4 w-4" />
              {t("nav.tables")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t("common.total")}
              </span>
              <span className="font-semibold">{totalTables}</span>
            </div>
            {Object.entries(data.tables).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <Badge
                  variant={
                    status === "AVAILABLE"
                      ? "default"
                      : status === "OCCUPIED"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {t(`tables.${status}` as any)}
                </Badge>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              {t("dashboard.activeOrders")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-24 items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-bold">{data.active.orders}</p>
                <p className="text-sm text-muted-foreground">
                  {t("status.PREPARING").toLowerCase()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              {t("dashboard.todayReservations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-24 items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-bold">{data.active.reservations}</p>
                <p className="text-sm text-muted-foreground">
                  {t("reservations.CONFIRMED").toLowerCase()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.alerts.lowStockItems > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="font-medium text-amber-600">
              {data.alerts.lowStockItems}{" "}
              {t("inventory.lowStock").toLowerCase()}
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
