"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";

interface PlatformStats {
  totalRestaurants: number;
  activeRestaurants: number;
  totalUsers: number;
  totalOrders: number;
  todayOrders: number;
  todayRevenue: number;
}

interface RestaurantRow {
  id: string;
  name: string;
  todayRevenue: number;
  todayOrders: number;
  users: number;
  isActive: boolean;
}

interface LogEntry {
  type: string;
  action: string;
  user: string;
  details: string;
  timestamp: string;
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, restRes, logsRes] = await Promise.all([
        api.get("/super-admin/stats"),
        api.get("/super-admin/restaurants"),
        api.get("/super-admin/logs"),
      ]);
      setStats(statsRes.data);
      setRestaurants(restRes.data);
      setLogs(logsRes.data.slice(0, 10));
    } catch {
      toast.error("Failed to load platform data");
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-lg text-destructive font-semibold">Access denied</p>
      </div>
    );
  }

  const statCards = stats
    ? [
        {
          label: t("superAdmin.totalRestaurants"),
          value: stats.totalRestaurants,
          sub: `${stats.activeRestaurants} ${t("common.active").toLowerCase()}`,
          icon: Building2,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: t("superAdmin.totalUsers"),
          value: stats.totalUsers,
          icon: Users,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        {
          label: t("superAdmin.todayOrders"),
          value: stats.todayOrders,
          sub: `${stats.totalOrders} total`,
          icon: ShoppingCart,
          color: "text-violet-500",
          bg: "bg-violet-500/10",
        },
        {
          label: t("superAdmin.todayRevenue"),
          value: `${stats.todayRevenue.toLocaleString()} FCFA`,
          icon: DollarSign,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
      ]
    : [];

  const topRestaurants = [...restaurants]
    .sort((a, b) => b.todayRevenue - a.todayRevenue)
    .slice(0, 5);

  const logColors: Record<string, string> = {
    order: "bg-blue-500",
    user: "bg-emerald-500",
    restaurant: "bg-amber-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("superAdmin.platformOverview")}
          </h1>
          <p className="text-muted-foreground">
            {stats?.activeRestaurants || 0}/{stats?.totalRestaurants || 0}{" "}
            {t("superAdmin.activeRestaurants").toLowerCase()}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />{" "}
          {t("common.refresh")}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}
                  >
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    {"sub" in stat && stat.sub && (
                      <p className="text-xs text-muted-foreground">
                        {stat.sub}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="h-4 w-4" /> {t("superAdmin.systemHealth")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Server className="h-4 w-4 text-emerald-500" />{" "}
                    {t("superAdmin.serverUptime")}
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600"
                  >
                    Online
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4 text-blue-500" />{" "}
                    {t("superAdmin.dbConnections")}
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-blue-500/10 text-blue-600"
                  >
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <HardDrive className="h-4 w-4 text-violet-500" />{" "}
                    {t("superAdmin.memoryUsage")}
                  </div>
                  <span className="text-sm font-medium">Normal</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Cpu className="h-4 w-4 text-amber-500" />{" "}
                    {t("superAdmin.cpuUsage")}
                  </div>
                  <span className="text-sm font-medium">Low</span>
                </div>
              </CardContent>
            </Card>

            {/* Top Restaurants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />{" "}
                  {t("superAdmin.topRestaurants")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topRestaurants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("superAdmin.noRestaurants")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topRestaurants.map((r, i) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{r.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {r.todayOrders} orders · {r.users} users
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold">
                          {r.todayRevenue.toLocaleString()} FCFA
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />{" "}
                  {t("superAdmin.recentActivity")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("superAdmin.noLogs")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div
                          className={`mt-1.5 h-2 w-2 rounded-full ${logColors[log.type] || "bg-gray-400"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {log.action}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {log.details}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
