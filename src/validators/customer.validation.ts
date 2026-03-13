import { z } from 'zod';

export const getCustomersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    search: z.string().trim().min(1).max(100).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    sort: z
      .enum([
        'firstName_asc',
        'firstName_desc',
        'lastName_asc',
        'lastName_desc',
        'createdAt_desc',
        'createdAt_asc',
      ])
      .optional(),
  }),
  params: z.object({}).optional(),
});

export const getCustomerByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
  }),
});
