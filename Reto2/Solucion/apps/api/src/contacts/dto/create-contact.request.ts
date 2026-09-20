import { z } from "zod";

const emailInputSchema = z.object({
  raw: z.string().min(1).max(254),
  isPrincipal: z.boolean().optional(),
});

const phoneInputSchema = z.object({
  raw: z.string().min(1).max(32),
  region: z.string().length(2).optional(),
  isPrincipal: z.boolean().optional(),
});

/** UC-01, paso 1: SYS valida el esquema con zod antes de delegar al caso de uso (RT-02). */
export const createContactRequestSchema = z
  .object({
    displayName: z.string().trim().min(1).max(500).optional(),
    company: z.string().trim().min(1).max(500).optional(),
    title: z.string().trim().min(1).max(500).optional(),
    notes: z.string().trim().min(1).max(500).optional(),
    emails: z.array(emailInputSchema).max(20).optional(),
    phones: z.array(phoneInputSchema).max(20).optional(),
  })
  .strict();

export type CreateContactRequest = z.infer<typeof createContactRequestSchema>;
