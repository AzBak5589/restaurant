'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeData {
  tableId: string;
  tableNumber: string;
  zone: string;
  menuUrl: string;
  qrCode: string;
}

export default function QRCodesPage() {
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState('http://localhost:3001');

  const fetchQRCodes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/digital-menu/qr', { params: { baseUrl } });
      setQrCodes(res.data);
    } catch {
      toast.error('Failed to generate QR codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQRCodes(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadQR = (qr: QRCodeData) => {
    const link = document.createElement('a');
    link.download = `table-${qr.tableNumber}-qr.png`;
    link.href = qr.qrCode;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">QR Codes</h1>
          <p className="text-muted-foreground">Digital menu QR codes for each table</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQRCodes}>
          <RefreshCw className="mr-1 h-4 w-4" /> Regenerate
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-end gap-3 p-4">
          <div className="flex-1 space-y-2">
            <Label>Base URL for menu links</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-app.com" />
          </div>
          <Button onClick={fetchQRCodes}>Generate</Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : qrCodes.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <QrCode className="h-8 w-8" />
            No tables found. Create tables first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {qrCodes.map((qr) => (
            <Card key={qr.tableId}>
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-base">Table {qr.tableNumber}</CardTitle>
                <p className="text-sm text-muted-foreground">{qr.zone}</p>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr.qrCode}
                  alt={`QR Code for Table ${qr.tableNumber}`}
                  className="h-48 w-48 rounded-lg border p-2"
                />
                <p className="max-w-full truncate text-xs text-muted-foreground">{qr.menuUrl}</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => downloadQR(qr)}>
                  <Download className="mr-1 h-4 w-4" /> Download
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
