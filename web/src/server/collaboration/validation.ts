import { z } from "zod";

const singleLine = (max: number) => z.string().trim().min(1).max(max).refine((value) => !/[\r\n\u0000-\u001f\u007f]/.test(value));

export const collaborationSchema = z.strictObject({
  locale: z.enum(["ko", "en"]),
  type: z.enum(["event", "content", "community", "other"]),
  name: singleLine(80),
  email: z.email().max(254).refine((value) => !/[\r\n]/.test(value)),
  organization: z.string().trim().max(120).refine((value) => !/[\r\n\u0000-\u001f\u007f]/.test(value)),
  message: z.string().trim().min(10).max(3000).refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)),
  consent: z.literal(true),
});
