"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Globe, Save } from "lucide-react";
import { toast } from "sonner";

export default function PlatformSettingsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    platformName: "RestoPOS",
    contactEmail: "sinbak0@outlook.fr",
    defaultPlan: "standard",
    defaultCurrency: "FCFA",
    defaultTimezone: "Africa/Abidjan",
    maintenanceMode: false,
  });

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-lg text-destructive font-semibold">Access denied</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    // Platform settings would be saved to a PlatformConfig table in a real implementation
    await new Promise((r) => setTimeout(r, 500));
    toast.success(t("superAdmin.savePlatformSettings") + " ✓");
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t("superAdmin.platformSettingsTitle")}
        </h1>
        <p className="text-muted-foreground">
          {t("superAdmin.platformSettingsSubtitle")}
        </p>
      </div>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" /> General
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("superAdmin.platformName")}</Label>
              <Input
                value={config.platformName}
                onChange={(e) =>
                  setConfig({ ...config, platformName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("superAdmin.contactEmail")}</Label>
              <Input
                type="email"
                value={config.contactEmail}
                onChange={(e) =>
                  setConfig({ ...config, contactEmail: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" /> Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("superAdmin.defaultPlan")}</Label>
              <Select
                value={config.defaultPlan}
                onValueChange={(v) => setConfig({ ...config, defaultPlan: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">
                    {t("superAdmin.planFree")}
                  </SelectItem>
                  <SelectItem value="standard">
                    {t("superAdmin.planStandard")}
                  </SelectItem>
                  <SelectItem value="premium">
                    {t("superAdmin.planPremium")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("superAdmin.defaultCurrency")}</Label>
              <Select
                value={config.defaultCurrency}
                onValueChange={(v) =>
                  setConfig({ ...config, defaultCurrency: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FCFA">FCFA (XOF)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("superAdmin.defaultTimezone")}</Label>
              <Select
                value={config.defaultTimezone}
                onValueChange={(v) =>
                  setConfig({ ...config, defaultTimezone: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Abidjan">
                    Africa/Abidjan (GMT)
                  </SelectItem>
                  <SelectItem value="Africa/Douala">
                    Africa/Douala (WAT)
                  </SelectItem>
                  <SelectItem value="Europe/Paris">
                    Europe/Paris (CET)
                  </SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {t("superAdmin.maintenanceMode")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("superAdmin.maintenanceModeDesc")}
              </p>
            </div>
            <Switch
              checked={config.maintenanceMode}
              onCheckedChange={(v: boolean) =>
                setConfig({ ...config, maintenanceMode: v })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Saving..." : t("superAdmin.savePlatformSettings")}
        </Button>
      </div>
    </div>
  );
}
