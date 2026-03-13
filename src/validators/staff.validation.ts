import { ShiftStatus, UserRole } from "@prisma/client";
import { z } from "zod";

export const getStaffSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.enum(["true", "false"]).optional(),
    sort: z
      .enum([
        "firstName_asc",
        "firstName_desc",
        "lastName_asc",
        "lastName_desc",
        "createdAt_desc",
        "createdAt_asc",
      ])
      .optional(),
  }),
  params: z.object({}).optional(),
});

export const getStaffByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getShiftsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    userId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.nativeEnum(ShiftStatus).optional(),
    sort: z.enum(["startTime_asc", "startTime_desc"]).optional(),
  }),
  params: z.object({}).optional(),
});

export const getClockHistorySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    userId: z.string().uuid().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sort: z.enum(["clockIn_desc", "clockIn_asc"]).optional(),
  }),
  params: z.object({}).optional(),
});
