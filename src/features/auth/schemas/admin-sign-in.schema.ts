import { z } from 'zod';

// Messages are keys in admin.en.json › login.errors.
export const adminSignInSchema = z.object({
  email: z.email('emailInvalid'),
  password: z.string().min(1, 'passwordRequired'),
  remember: z.boolean(),
});

export const twoFactorSchema = z.object({
  kind: z.enum(['totp', 'backup']),
  code: z.string().trim().min(6, 'codeRequired'),
});

export const passwordResetSchema = z.object({ email: z.email('emailInvalid') });
