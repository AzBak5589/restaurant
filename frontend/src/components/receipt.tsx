'use client';

import { forwardRef } from 'react';

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ReceiptData {
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  orderNumber: string;
  tableNumber?: string;
  serverName?: string;
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  amountPaid?: number;
  change?: number;
}

interface ReceiptProps {
  data: ReceiptData;
}

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(({ data }, ref) => {
  return (
    <div
      ref={ref}
      className="w-[300px] bg-white p-4 font-mono text-xs text-black"
      style={{ fontFamily: 'monospace' }}
    >
      {/* Header */}
      <div className="text-center">
        <h1 className="text-sm font-bold uppercase">{data.restaurantName}</h1>
        {data.restaurantAddress && <p>{data.restaurantAddress}</p>}
        {data.restaurantPhone && <p>Tel: {data.restaurantPhone}</p>}
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      {/* Order Info */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Order:</span>
          <span className="font-bold">{data.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{data.date}</span>
        </div>
        {data.tableNumber && (
          <div className="flex justify-between">
            <span>Table:</span>
            <span>{data.tableNumber}</span>
          </div>
        )}
        {data.serverName && (
          <div className="flex justify-between">
            <span>Server:</span>
            <span>{data.serverName}</span>
          </div>
        )}
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      {/* Column Headers */}
      <div className="flex justify-between font-bold">
        <span className="w-[120px]">Item</span>
        <span className="w-[30px] text-center">Qty</span>
        <span className="w-[50px] text-right">Price</span>
        <span className="w-[60px] text-right">Total</span>
      </div>

      <div className="my-1 border-t border-dashed border-black" />

      {/* Items */}
      <div className="space-y-1">
        {data.items.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span className="w-[120px] truncate">{item.name}</span>
            <span className="w-[30px] text-center">{item.quantity}</span>
            <span className="w-[50px] text-right">{item.unitPrice.toLocaleString()}</span>
            <span className="w-[60px] text-right">{item.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      {/* Totals */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{data.subtotal.toLocaleString()} FCFA</span>
        </div>
        {data.tax > 0 && (
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{data.tax.toLocaleString()} FCFA</span>
          </div>
        )}
        {data.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{data.discount.toLocaleString()} FCFA</span>
          </div>
        )}
        <div className="my-1 border-t border-double border-black" />
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL:</span>
          <span>{data.total.toLocaleString()} FCFA</span>
        </div>
      </div>

      {data.paymentMethod && (
        <>
          <div className="my-2 border-t border-dashed border-black" />
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span>Payment:</span>
              <span>{data.paymentMethod}</span>
            </div>
            {data.amountPaid !== undefined && (
              <div className="flex justify-between">
                <span>Paid:</span>
                <span>{data.amountPaid.toLocaleString()} FCFA</span>
              </div>
            )}
            {data.change !== undefined && data.change > 0 && (
              <div className="flex justify-between font-bold">
                <span>Change:</span>
                <span>{data.change.toLocaleString()} FCFA</span>
              </div>
            )}
          </div>
        </>
      )}

      <div className="my-2 border-t border-dashed border-black" />

      {/* Footer */}
      <div className="text-center">
        <p className="font-bold">Thank you!</p>
        <p>Please come again</p>
        <p className="mt-2 text-[10px] text-gray-500">Powered by RestoPOS</p>
      </div>
    </div>
  );
});

Receipt.displayName = 'Receipt';

export { Receipt };
export type { ReceiptData, ReceiptItem };
