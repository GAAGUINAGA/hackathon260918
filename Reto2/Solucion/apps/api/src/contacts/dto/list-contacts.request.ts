import { z } from "zod";

/** UC-11, paso 1: término de búsqueda, cursor y límite acotado. */
export const listContactsRequestSchema = z.object({
  searchTerm: z.string().trim().min(1).max(200).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListContactsRequest = z.infer<typeof listContactsRequestSchema>;
