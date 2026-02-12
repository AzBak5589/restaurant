"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@demo-restaurant.com");
  const [password, setPassword] = useState("password123");
  const [restaurantId, setRestaurantId] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, restaurantId);
      toast.success(t("auth.welcomeBack"));
      router.push("/dashboard");
    } catch {
      toast.error(t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <ChefHat className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl text-white">{t("app.name")}</CardTitle>
          <CardDescription className="text-slate-400">
            {t("auth.loginSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurantId" className="text-slate-300">
                Restaurant ID{" "}
                <span className="text-xs text-slate-500 font-normal">
                  (Super Admin: laisser vide)
                </span>
              </Label>
              <Input
                id="restaurantId"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                placeholder="ID du restaurant"
                className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                {t("auth.email")}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@restaurant.com"
                required
                className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                {t("auth.password")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t("auth.loggingIn") : t("auth.loginButton")}
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-500">
            {t("auth.poweredBy")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
