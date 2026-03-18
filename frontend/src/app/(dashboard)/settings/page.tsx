'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Building2, Globe, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';

interface RestaurantSettings {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number;
  timezone: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [settings, setSettings] = useState<RestaurantSettings>({
    name: '', slug: '', email: '', phone: '', address: '',
    currency: 'FCFA', taxRate: 19.25, timezone: 'Africa/Douala',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/restaurants/current');
        if (res.data) {
          setSettings({
            name: res.data.name || '',
            slug: res.data.slug || '',
            email: res.data.email || '',
            phone: res.data.phone || '',
            address: res.data.address || '',
            currency: res.data.currency || 'FCFA',
            taxRate: res.data.taxRate ?? 19.25,
            timezone: res.data.timezone || 'Africa/Douala',
          });
        }
      } catch {
        // Silently fail - use defaults
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api.patch('/restaurants/current', settings);
      toast.success(t('settings.toast.saved'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.error.save')));
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.patch('/staff/me', profileForm);
      toast.success(t('settings.profile.toast.updated'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('settings.profile.error.update')));
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* Restaurant Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> {t('settings.restaurantInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('settings.restaurantName')}</Label>
              <Input
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.slug')}</Label>
              <Input
                value={settings.slug}
                onChange={(e) => setSettings({ ...settings, slug: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.email')}</Label>
              <Input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.phone')}</Label>
              <Input
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('settings.address')}</Label>
            <Input
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('settings.currency')}</Label>
              <Select
                value={settings.currency}
                onValueChange={(v) => setSettings({ ...settings, currency: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FCFA">FCFA (XAF)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('settings.taxRate')} (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settings.timezone')}</Label>
              <Select
                value={settings.timezone}
                onValueChange={(v) => setSettings({ ...settings, timezone: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Douala">Africa/Douala (WAT)</SelectItem>
                  <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveSettings} disabled={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? t('common.saving') : t('settings.saveRestaurant')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> {t('settings.profile.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('staff.firstName')}</Label>
              <Input
                value={profileForm.firstName}
                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('staff.lastName')}</Label>
              <Input
                value={profileForm.lastName}
                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('common.email')}</Label>
            <Input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={saveProfile} disabled={savingProfile}>
              <Save className="mr-1 h-4 w-4" />
              {savingProfile ? t('common.saving') : t('settings.profile.updateAction')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" /> {t('settings.about.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p><strong>RestoPOS</strong> — {t('settings.about.description')}</p>
            <p>{t('settings.about.version')} 1.0.0</p>
            <p>
              {t('settings.about.publicMenuUrl')}{' '}
              <code className="rounded bg-muted px-1.5 py-0.5">
                /menu/{settings.slug}
              </code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
