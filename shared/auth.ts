import { z } from 'zod';

export const authSessionRoleSchema = z.enum(['guest', 'admin']);
export type AuthSessionRole = z.infer<typeof authSessionRoleSchema>;

export const authLoginRequestSchema = z.object({
	user: authSessionRoleSchema,
	password: z.string().max(256).optional().default('')
});

export const authSessionResponseSchema = z.object({
	role: authSessionRoleSchema
});

export type AuthLoginRequest = z.infer<typeof authLoginRequestSchema>;
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
