import { z } from "zod";
import { Role, UserStatus } from "@/types/enums";

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  phone: z.string().optional().nullable(),
});
