import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

export const processPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    amount: z.number().positive(),
    method: z.nativeEnum(PaymentMethod),
    reference: z.string().max(255).optional(),
    notes: z.string().max(1000).optional(),
    idempotencyKey: z.string().min(8).max(255).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const splitPaymentSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    splits: z
      .array(
        z.object({
          amount: z.number().positive(),
          method: z.nativeEnum(PaymentMethod),
          reference: z.string().max(255).optional(),
        }),
      )
      .min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getOrderPaymentsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    orderId: z.string().uuid(),
  }),
});

export const refundPaymentSchema = z.object({
  body: z.object({
    amount: z.number().positive().optional(),
    notes: z.string().max(1000).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    paymentId: z.string().uuid(),
  }),
});

export const getReceiptDataSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    orderId: z.string().uuid(),
  }),
});

export const openCashSessionSchema = z.object({
  body: z.object({
    registerId: z.string().uuid(),
    openingAmount: z.number().min(0).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const closeCashSessionSchema = z.object({
  body: z.object({
    closingAmount: z.number().min(0),
    notes: z.string().max(1000).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    sessionId: z.string().uuid(),
  }),
});

export const getCashSessionHistorySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
  params: z.object({}).optional(),
});

export const generateZReportSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    date: z.string().optional(),
  }),
  params: z.object({}).optional(),
});
