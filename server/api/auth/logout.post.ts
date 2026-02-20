import { defineEventHandler } from 'h3';
import { authSessionResponseSchema } from '~/shared/auth';
import { clearAdminSession } from '~/server/utils/auth';

export default defineEventHandler((event) => {
	clearAdminSession(event);
	return authSessionResponseSchema.parse({ role: 'guest' });
});
