import { z } from "zod";

const emailSchema = z.string().trim().email("Enter a valid administrator email address.").max(254);

export const loginSchema = z.object({
  // Kept as "username" in the API contract for compatibility; it now represents an email address.
  username: emailSchema,
  // Existing accounts can still sign in and upgrade older passwords in Account Security.
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

export const updateSecuritySchema = z.object({
  email: emailSchema,
  confirmEmail: emailSchema,
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(14, "Use at least 14 characters for a new administrator password.").max(128).optional().or(z.literal("")),
}).superRefine((input, context) => {
  if (input.email.toLowerCase() !== input.confirmEmail.toLowerCase()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "The administrator email addresses do not match.",
      path: ["confirmEmail"],
    });
  }
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateSecurityInput = z.infer<typeof updateSecuritySchema>;
