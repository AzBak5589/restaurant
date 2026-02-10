"use client";

import { useI18n, Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

const localeLabels: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  const toggle = () => {
    setLocale(locale === "fr" ? "en" : "fr");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={locale === "fr" ? "Switch to English" : "Passer en Français"}
      className="h-8 w-8"
    >
      <span className="text-xs font-bold">{localeLabels[locale]}</span>
    </Button>
  );
}
