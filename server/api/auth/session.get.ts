import { defineEventHandler } from 'h3';
import { authSessionResponseSchema } from '~/shared/auth';
import { getAuthSessionRole } from '~/server/utils/auth';

export default defineEventHandler((event) =>
	authSessionResponseSchema.parse({
		role: getAuthSessionRole(event)
	})
);
