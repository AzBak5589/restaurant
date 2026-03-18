import { ReservationStatus } from "@prisma/client";
import { z } from "zod";

export const getReservationsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    date: z.string().optional(),
    status: z.nativeEnum(ReservationStatus).optional(),
    tableId: z.string().uuid().optional(),
    sort: z.enum(["startTime_asc", "startTime_desc"]).optional(),
  }),
  params: z.object({}).optional(),
});

export const getTodayReservationsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    sort: z.enum(["startTime_asc", "startTime_desc"]).optional(),
  }),
  params: z.object({}).optional(),
});

export const getAvailableTablesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    date: z.string(),
    startTime: z.string(),
    endTime: z.string().optional(),
    guestCount: z.coerce.number().int().positive().optional(),
    sort: z.enum(["capacity_asc", "capacity_desc"]).optional(),
  }),
  params: z.object({}).optional(),
});

export const getReservationByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});
